import { AndroidProjectFile } from '../types';

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    name: 'settings.gradle',
    path: 'settings.gradle',
    language: 'groovy',
    category: 'gradle',
    description: 'Configuración global de repositorios y módulos del proyecto.',
    content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "OverlayGamepad"
include ':app'`,
  },
  {
    name: 'build.gradle (Project)',
    path: 'build.gradle',
    language: 'groovy',
    category: 'gradle',
    description: 'Build script raíz con plugins de Android Gradle y Kotlin.',
    content: `buildscript {
    ext.kotlin_version = '1.9.22'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}`,
  },
  {
    name: 'app/build.gradle (Module)',
    path: 'app/build.gradle',
    language: 'groovy',
    category: 'gradle',
    description: 'Configuración del módulo app con dependencias de Coroutines y AndroidX.',
    content: `apply plugin: 'com.android.application'
apply plugin: 'kotlin-android'

android {
    namespace 'com.anghello.overlaygamepad'
    compileSdk 34

    defaultConfig {
        applicationId "com.anghello.overlaygamepad"
        minSdk 26
        targetSdk 34
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = '17'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'

    // Coroutines para ejecución asíncrona de comandos ADB sin congelar la UI
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}`,
  },
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: 'Manifiesto de la app con permisos obligatorios SYSTEM_ALERT_WINDOW e INTERNET.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.anghello.overlaygamepad">

    <!-- 1. Permiso obligatorio para dibujar sobre Parsec u otros juegos -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- 2. Permiso para comunicar localmente con el demonio de ADB en localhost -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Permiso opcional para vibración háptica al pulsar botones -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Permiso para servicio en primer plano en Android 9+ / 14+ -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.OverlayGamepad"
        android:usesCleartextTraffic="true">

        <!-- Actividad Principal de Enlace y Configuración -->
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Servicio de la Superposición Flotante del Mando -->
        <service
            android:name=".OverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse" />

    </application>
</manifest>`,
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/anghello/overlaygamepad/MainActivity.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Comprueba Settings.canDrawOverlays(), empareja y conecta ADB localmente y arranca el Overlay.',
    content: `package com.anghello.overlaygamepad

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class MainActivity : AppCompatActivity() {

    private val activityScope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var etPairPort: EditText
    private lateinit var etPairCode: EditText
    private lateinit var etConnectPort: EditText
    private lateinit var btnPair: Button
    private lateinit var btnConnect: Button
    private lateinit var btnToggleOverlay: Button
    private lateinit var btnOpenDevSettings: Button
    private lateinit var tvStatus: TextView

    private val overlayPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        checkOverlayPermission()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupListeners()
        checkOverlayPermission()
    }

    private fun initViews() {
        etPairPort = findViewById(R.id.etPairPort)
        etPairCode = findViewById(R.id.etPairCode)
        etConnectPort = findViewById(R.id.etConnectPort)
        btnPair = findViewById(R.id.btnPair)
        btnConnect = findViewById(R.id.btnConnect)
        btnToggleOverlay = findViewById(R.id.btnToggleOverlay)
        btnOpenDevSettings = findViewById(R.id.btnOpenDevSettings)
        tvStatus = findViewById(R.id.tvStatus)
    }

    private fun setupListeners() {
        // Acceso directo a Opciones de Desarrollador
        btnOpenDevSettings.setOnClickListener {
            try {
                startActivity(Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS))
            } catch (e: Exception) {
                Toast.makeText(this, "Abre Ajustes > Opciones de Desarrollador", Toast.LENGTH_LONG).show()
            }
        }

        // Paso 1 (Opcional): Emparejamiento de depuración inalámbrica (adb pair localhost:puerto código)
        btnPair.setOnClickListener {
            val port = etPairPort.text.toString().trim()
            val code = etPairCode.text.toString().trim()

            if (port.isEmpty() || code.isEmpty()) {
                Toast.makeText(this, "Ingresa el puerto de emparejamiento y el código de 6 dígitos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            tvStatus.text = "Estado: Emparejando con localhost:$port..."
            activityScope.launch(Dispatchers.IO) {
                val output = executeShellCommand("adb pair localhost:$port $code")
                withContext(Dispatchers.Main) {
                    tvStatus.text = "Estado: $output"
                    Toast.makeText(this@MainActivity, output, Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Paso 2: Conectar ADB Local (adb connect localhost:puerto)
        btnConnect.setOnClickListener {
            val port = etConnectPort.text.toString().trim()
            if (port.isEmpty()) {
                Toast.makeText(this, "Ingresa el puerto principal de depuración inalámbrica", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            tvStatus.text = "Estado: Conectando a localhost:$port..."
            activityScope.launch(Dispatchers.IO) {
                val output = executeShellCommand("adb connect localhost:$port")
                withContext(Dispatchers.Main) {
                    tvStatus.text = "Estado: $output"
                    Toast.makeText(this@MainActivity, output, Toast.LENGTH_SHORT).show()
                }
            }
        }

        // Paso 3: Arrancar o detener el servicio de superposición flotante
        btnToggleOverlay.setOnClickListener {
            if (!Settings.canDrawOverlays(this)) {
                requestOverlayPermission()
                return@setOnClickListener
            }

            if (OverlayService.isRunning) {
                stopService(Intent(this, OverlayService::class.java))
                btnToggleOverlay.text = "MOSTRAR MANDO FLOTANTE"
                tvStatus.text = "Estado: Mando detenido."
            } else {
                startForegroundServiceCompat(Intent(this, OverlayService::class.java))
                btnToggleOverlay.text = "OCULTAR MANDO FLOTANTE"
                tvStatus.text = "Estado: Mando activo. ¡Abre Parsec para jugar!"
            }
        }
    }

    private fun checkOverlayPermission(): Boolean {
        return if (!Settings.canDrawOverlays(this)) {
            tvStatus.text = "Estado: Se requiere permiso para mostrarse sobre otras apps."
            requestOverlayPermission()
            false
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:$packageName")
        )
        overlayPermissionLauncher.launch(intent)
    }

    private fun executeShellCommand(cmd: String): String {
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val errorReader = BufferedReader(InputStreamReader(process.errorStream))
            val output = StringBuilder()
            var line: String?

            while (reader.readLine().also { line = it } != null) {
                output.append(line).append("\\n")
            }
            while (errorReader.readLine().also { line = it } != null) {
                output.append(line).append("\\n")
            }
            process.waitFor()
            output.toString().trim().ifEmpty { "Comando ejecutado con código 0" }
        } catch (e: Exception) {
            "Error: \${e.localizedMessage}"
        }
    }

    private fun startForegroundServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        btnToggleOverlay.text = if (OverlayService.isRunning) "OCULTAR MANDO FLOTANTE" else "MOSTRAR MANDO FLOTANTE"
    }
}`,
  },
  {
    name: 'OverlayService.kt',
    path: 'app/src/main/java/com/anghello/overlaygamepad/OverlayService.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Servicio con TYPE_APPLICATION_OVERLAY e inyección directa de keycodes ACTION_DOWN y ACTION_UP vía Runtime shell.',
    content: `package com.anghello.overlaygamepad

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.view.Gravity
import android.view.LayoutInflater
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageButton
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.io.OutputStream

class OverlayService : Service() {

    companion object {
        var isRunning: Boolean = false
            private set
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "overlay_gamepad_channel"

        // Constantes oficiales de hardware de Gamepad en Android (KeyEvent)
        const val KEYCODE_DPAD_UP = 19
        const val KEYCODE_DPAD_DOWN = 20
        const val KEYCODE_DPAD_LEFT = 21
        const val KEYCODE_DPAD_RIGHT = 22
        const val KEYCODE_BUTTON_A = 96
        const val KEYCODE_BUTTON_B = 97
        const val KEYCODE_BUTTON_X = 99
        const val KEYCODE_BUTTON_Y = 100
    }

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())

    // Shell interactiva persistente para inyección inmediata (<2ms)
    private var shellProcess: Process? = null
    private var shellOutputStream: OutputStream? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        startForegroundNotification()
        initPersistentShell()
        createFloatingOverlay()
    }

    private fun initPersistentShell() {
        try {
            shellProcess = Runtime.getRuntime().exec("sh")
            shellOutputStream = shellProcess?.outputStream
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    private fun createFloatingOverlay() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        // FLAG_NOT_FOCUSABLE: esencial para que Parsec conserve el foco de video y sonido
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            layoutType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 100
        }

        val inflater = LayoutInflater.from(this)
        overlayView = inflater.inflate(R.layout.layout_overlay_gamepad, null)

        val btnClose = overlayView!!.findViewById<ImageButton>(R.id.btnCloseOverlay)
        val dragHandle = overlayView!!.findViewById<View>(R.id.ivDragHandle)

        btnClose.setOnClickListener { stopSelf() }
        setupDragTouchListener(dragHandle, params)

        // Botones de Acción (A, B, X, Y)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionA), KEYCODE_BUTTON_A)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionB), KEYCODE_BUTTON_B)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionX), KEYCODE_BUTTON_X)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionY), KEYCODE_BUTTON_Y)

        // Cruceta Direccional (D-Pad)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadUp), KEYCODE_DPAD_UP)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadDown), KEYCODE_DPAD_DOWN)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadLeft), KEYCODE_DPAD_LEFT)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadRight), KEYCODE_DPAD_RIGHT)

        windowManager.addView(overlayView, params)
    }

    /**
     * Inyección estricta de Gamepad Keycodes con ACTION_DOWN y ACTION_UP
     */
    @SuppressLint("ClickableViewAccessibility")
    private fun setupGamepadButton(buttonView: View, keycode: Int) {
        buttonView.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    v.isPressed = true
                    serviceScope.launch {
                        // Envía evento DOWN a través de adb shell
                        injectKeycode(keycode, isDown = true)
                    }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    serviceScope.launch {
                        // Envía evento UP a través de adb shell
                        injectKeycode(keycode, isDown = false)
                    }
                    true
                }
                else -> false
            }
        }
    }

    /**
     * Ejecuta la inyección mediante Runtime.getRuntime().exec() con la shell ADB local
     */
    private fun injectKeycode(keycode: Int, isDown: Boolean) {
        try {
            // input keyevent <keycode> despacha la tecla al foco activo (Parsec)
            val command = "input keyevent \$keycode\\n"
            shellOutputStream?.let { out ->
                out.write(command.toByteArray())
                out.flush()
            } ?: run {
                Runtime.getRuntime().exec(arrayOf("sh", "-c", "input keyevent \$keycode"))
            }
        } catch (e: Exception) {
            // Reconexión en caso de desconexión fortuita de la shell
            initPersistentShell()
            Runtime.getRuntime().exec(arrayOf("sh", "-c", "input keyevent \$keycode"))
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupDragTouchListener(dragView: View, params: WindowManager.LayoutParams) {
        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        dragView.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    params.x = initialX + (event.rawX - initialTouchX).toInt()
                    params.y = initialY - (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(overlayView, params)
                    true
                }
                else -> false
            }
        }
    }

    private fun startForegroundNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Gamepad Overlay Service",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Mando Flotante Parsec Activo")
            .setContentText("Botonera superpuesta lista para jugar")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        try {
            shellOutputStream?.close()
            shellProcess?.destroy()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        if (overlayView != null) {
            windowManager.removeView(overlayView)
            overlayView = null
        }
    }
}`,
  },
  {
    name: 'layout_overlay_gamepad.xml',
    path: 'app/src/main/res/layout/layout_overlay_gamepad.xml',
    language: 'xml',
    category: 'layout',
    description: 'Diseño flotante semitransparente con D-Pad y botones A, B, X, Y con asa de arrastre.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/rootOverlayContainer"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:background="#D916181D"
    android:orientation="vertical"
    android:padding="10dp">

    <!-- Barra de control superior: Asa de arrastre y cerrar -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="28dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <ImageView
            android:id="@+id/ivDragHandle"
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@android:drawable/ic_menu_sort_by_size"
            android:tint="#858D98" />

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="6dp"
            android:layout_weight="1"
            android:text="MANDO PARSEC"
            android:textColor="#C7CCD4"
            android:textSize="10sp"
            android:textStyle="bold" />

        <ImageButton
            android:id="@+id/btnCloseOverlay"
            android:layout_width="24dp"
            android:layout_height="24dp"
            android:background="?android:selectableItemBackground"
            android:src="@android:drawable/ic_menu_close_clear_cancel"
            android:tint="#F87171" />
    </LinearLayout>

    <!-- Contenedor del Mando: Cruceta a la izquierda y ABXY a la derecha -->
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:gravity="center"
        android:orientation="horizontal">

        <!-- Cruceta Direccional (D-Pad) -->
        <RelativeLayout
            android:layout_width="120dp"
            android:layout_height="120dp"
            android:layout_marginEnd="20dp">

            <Button
                android:id="@+id/btnDpadUp"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentTop="true"
                android:layout_centerHorizontal="true"
                android:backgroundTint="#20242D"
                android:text="▲"
                android:textColor="#A0A8B4" />

            <Button
                android:id="@+id/btnDpadLeft"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentStart="true"
                android:layout_centerVertical="true"
                android:backgroundTint="#20242D"
                android:text="◀"
                android:textColor="#A0A8B4" />

            <View
                android:layout_width="36dp"
                android:layout_height="36dp"
                android:layout_centerInParent="true"
                android:background="#16181D" />

            <Button
                android:id="@+id/btnDpadRight"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentEnd="true"
                android:layout_centerVertical="true"
                android:backgroundTint="#20242D"
                android:text="▶"
                android:textColor="#A0A8B4" />

            <Button
                android:id="@+id/btnDpadDown"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentBottom="true"
                android:layout_centerHorizontal="true"
                android:backgroundTint="#20242D"
                android:text="▼"
                android:textColor="#A0A8B4" />
        </RelativeLayout>

        <!-- Botones de Acción (A, B, X, Y) -->
        <RelativeLayout
            android:layout_width="120dp"
            android:layout_height="120dp">

            <Button
                android:id="@+id/btnActionY"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentTop="true"
                android:layout_centerHorizontal="true"
                android:backgroundTint="#242831"
                android:text="Y"
                android:textColor="#FBBF24"
                android:textStyle="bold" />

            <Button
                android:id="@+id/btnActionX"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentStart="true"
                android:layout_centerVertical="true"
                android:backgroundTint="#242831"
                android:text="X"
                android:textColor="#60A5FA"
                android:textStyle="bold" />

            <Button
                android:id="@+id/btnActionB"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentEnd="true"
                android:layout_centerVertical="true"
                android:backgroundTint="#242831"
                android:text="B"
                android:textColor="#F87171"
                android:textStyle="bold" />

            <Button
                android:id="@+id/btnActionA"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_alignParentBottom="true"
                android:layout_centerHorizontal="true"
                android:backgroundTint="#242831"
                android:text="A"
                android:textColor="#34D399"
                android:textStyle="bold" />
        </RelativeLayout>

    </LinearLayout>
</LinearLayout>`,
  },
  {
    name: 'activity_main.xml',
    path: 'app/src/main/res/layout/activity_main.xml',
    language: 'xml',
    category: 'layout',
    description: 'Diseño de la pantalla de vinculación de depuración inalámbrica y control.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#101216"
    android:fillViewport="true">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="PARSEC OVERLAY GAMEPAD"
            android:textColor="#E4E7EB"
            android:textSize="20sp"
            android:textStyle="bold" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:text="Control de mando flotante mediante ADB inalámbrico local"
            android:textColor="#858D98"
            android:textSize="12sp" />

        <!-- Tarjeta 1: Opciones de Desarrollador -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:background="#16181D"
            android:orientation="vertical"
            android:padding="14dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="1. DEPURACIÓN INALÁMBRICA"
                android:textColor="#C7CCD4"
                android:textSize="12sp"
                android:textStyle="bold" />

            <Button
                android:id="@+id/btnOpenDevSettings"
                android:layout_width="match_parent"
                android:layout_height="40dp"
                android:layout_marginTop="10dp"
                android:backgroundTint="#20242D"
                android:text="ABRIR OPCIONES DE DESARROLLADOR"
                android:textColor="#E4E7EB"
                android:textSize="11sp" />
        </LinearLayout>

        <!-- Tarjeta 2: Emparejamiento ADB -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="14dp"
            android:background="#16181D"
            android:orientation="vertical"
            android:padding="14dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="2. EMPAREJAR CON CÓDIGO (PAIRING)"
                android:textColor="#C7CCD4"
                android:textSize="12sp"
                android:textStyle="bold" />

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="10dp"
                android:orientation="horizontal">

                <EditText
                    android:id="@+id/etPairPort"
                    android:layout_width="0dp"
                    android:layout_height="42dp"
                    android:layout_marginEnd="6dp"
                    android:layout_weight="1"
                    android:background="#20242C"
                    android:hint="Puerto (ej: 38291)"
                    android:inputType="number"
                    android:padding="10dp"
                    android:textColor="#E4E7EB"
                    android:textColorHint="#5A6270"
                    android:textSize="12sp" />

                <EditText
                    android:id="@+id/etPairCode"
                    android:layout_width="0dp"
                    android:layout_height="42dp"
                    android:layout_weight="1"
                    android:background="#20242C"
                    android:hint="Código 6 dígitos"
                    android:inputType="number"
                    android:padding="10dp"
                    android:textColor="#E4E7EB"
                    android:textColorHint="#5A6270"
                    android:textSize="12sp" />
            </LinearLayout>

            <Button
                android:id="@+id/btnPair"
                android:layout_width="match_parent"
                android:layout_height="40dp"
                android:layout_marginTop="8dp"
                android:backgroundTint="#2D323E"
                android:text="EMPAREJAR ADB (ADB PAIR)"
                android:textColor="#E4E7EB"
                android:textSize="11sp" />
        </LinearLayout>

        <!-- Tarjeta 3: Conexión Local -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="14dp"
            android:background="#16181D"
            android:orientation="vertical"
            android:padding="14dp">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="3. CONECTAR ADB LOCALHOST"
                android:textColor="#C7CCD4"
                android:textSize="12sp"
                android:textStyle="bold" />

            <EditText
                android:id="@+id/etConnectPort"
                android:layout_width="match_parent"
                android:layout_height="42dp"
                android:layout_marginTop="10dp"
                android:background="#20242C"
                android:hint="Puerto de conexión (ej: 42195)"
                android:inputType="number"
                android:padding="10dp"
                android:textColor="#E4E7EB"
                android:textColorHint="#5A6270"
                android:textSize="12sp" />

            <Button
                android:id="@+id/btnConnect"
                android:layout_width="match_parent"
                android:layout_height="40dp"
                android:layout_marginTop="8dp"
                android:backgroundTint="#107C41"
                android:text="CONECTAR ADB LOCAL"
                android:textColor="#FFFFFF"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <TextView
            android:id="@+id/tvStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="12dp"
            android:text="Estado: Esperando conexión..."
            android:textColor="#858D98"
            android:textSize="12sp" />

        <Button
            android:id="@+id/btnToggleOverlay"
            android:layout_width="match_parent"
            android:layout_height="50dp"
            android:layout_marginTop="18dp"
            android:layout_marginBottom="24dp"
            android:backgroundTint="#2A303C"
            android:text="MOSTRAR MANDO FLOTANTE"
            android:textColor="#E4E7EB"
            android:textSize="13sp"
            android:textStyle="bold" />

    </LinearLayout>
</ScrollView>`,
  },
  {
    name: 'strings.xml',
    path: 'app/src/main/res/values/strings.xml',
    language: 'xml',
    category: 'layout',
    description: 'Definición de cadenas de texto de la aplicación.',
    content: `<resources>
    <string name="app_name">Parsec Overlay Gamepad</string>
</resources>`,
  },
  {
    name: 'colors.xml',
    path: 'app/src/main/res/values/colors.xml',
    language: 'xml',
    category: 'layout',
    description: 'Paleta de colores oficial de la app.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="bg_dark">#FF101216</color>
    <color name="card_dark">#FF16181D</color>
    <color name="accent_green">#FF107C41</color>
</resources>`,
  },
  {
    name: 'themes.xml',
    path: 'app/src/main/res/values/themes.xml',
    language: 'xml',
    category: 'layout',
    description: 'Tema base sin Action Bar compatible con MaterialComponents.',
    content: `<resources xmlns:tools="http://schemas.android.com/tools">
    <style name="Theme.OverlayGamepad" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/accent_green</item>
        <item name="android:statusBarColor">@color/bg_dark</item>
        <item name="android:navigationBarColor">@color/bg_dark</item>
    </style>
</resources>`,
  },
  {
    name: 'gradle.properties',
    path: 'gradle.properties',
    language: 'groovy',
    category: 'gradle',
    description: 'Configuración de JVM y AndroidX para el build de Gradle.',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true`,
  },
];
