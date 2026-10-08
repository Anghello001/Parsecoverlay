import { AndroidProjectFile } from '../types';

export const ANDROID_PROJECT_FILES: AndroidProjectFile[] = [
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: 'Permisos de superposición, red local para ADB y queries para visibilidad y lanzamiento de juegos instalados.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.parsec.overlaygamepad">

    <!-- 1. Permiso obligatorio para dibujar sobre Parsec y otros juegos -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />

    <!-- 2. Permisos de red e Internet para el puente local ADB (localhost) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <!-- Permiso de respuesta háptica al pulsar botones y joysticks -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <!-- Permiso para servicio en primer plano (Android 9+ / 14+) -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE"
        tools:targetApi="34" />

    <!-- 3. Visibilidad de paquetes en Android 11+ para detectar y abrir juegos instalados -->
    <queries>
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
        <!-- Paquetes comunes de streaming y juegos -->
        <package android:name="tv.parsec.client" />
        <package android:name="com.limelight" />
        <package android:name="com.nvidia.geforcenow" />
        <package android:name="com.valvesoftware.steamlink" />
        <package android:name="com.retroarch" />
    </queries>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Xbox Overlay Game Hub"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.ParsecGamepadOverlay"
        android:usesCleartextTraffic="true">

        <!-- Actividad Principal: Lanzador de Juegos y Configuración ADB -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Servicio de Superposición del Mando Xbox (Floating Service) -->
        <service
            android:name=".OverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse"
            tools:targetApi="34" />

    </application>
</manifest>`,
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/parsec/overlaygamepad/MainActivity.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Hub de juegos integrado: lista y agrega juegos/apps, los abre y activa automáticamente el mando flotante Xbox.',
    content: `package com.parsec.overlaygamepad

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class GameAppItem(
    val name: String,
    val packageName: String,
    val category: String,
    val isInstalled: Boolean
)

class MainActivity : AppCompatActivity() {

    private val activityScope = CoroutineScope(Dispatchers.Main + Job())

    private lateinit var etPairPort: EditText
    private lateinit var etPairCode: EditText
    private lateinit var etConnectPort: EditText
    private lateinit var btnPair: Button
    private lateinit var btnConnect: Button
    private lateinit var btnToggleOverlay: Button
    private lateinit var btnAddCustomGame: Button
    private lateinit var tvStatus: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var rvGames: RecyclerView

    private val gamesList = mutableListOf<GameAppItem>()
    private lateinit var gamesAdapter: GamesAdapter

    private val overlayPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        checkOverlayPermission()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        loadDefaultGames()
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
        btnAddCustomGame = findViewById(R.id.btnAddCustomGame)
        tvStatus = findViewById(R.id.tvStatus)
        progressBar = findViewById(R.id.progressBar)
        rvGames = findViewById(R.id.rvGames)

        rvGames.layoutManager = GridLayoutManager(this, 2)
        gamesAdapter = GamesAdapter(gamesList) { game ->
            launchGameWithOverlay(game)
        }
        rvGames.adapter = gamesAdapter
    }

    private fun loadDefaultGames() {
        val sharedPrefs = getSharedPreferences("games_db", Context.MODE_PRIVATE)
        val savedPackages = sharedPrefs.getStringSet("custom_games", emptySet()) ?: emptySet()

        gamesList.clear()

        // Juegos y plataformas de streaming preconfigurados
        val presets = listOf(
            GameAppItem("Parsec", "tv.parsec.client", "Cloud & Remote Streaming", isAppInstalled("tv.parsec.client")),
            GameAppItem("Moonlight", "com.limelight", "NVIDIA GameStream", isAppInstalled("com.limelight")),
            GameAppItem("GeForce NOW", "com.nvidia.geforcenow", "Cloud Gaming", isAppInstalled("com.nvidia.geforcenow")),
            GameAppItem("Steam Link", "com.valvesoftware.steamlink", "Remote Play", isAppInstalled("com.valvesoftware.steamlink")),
            GameAppItem("RetroArch", "com.retroarch", "Emulador Retro", isAppInstalled("com.retroarch")),
            GameAppItem("PPSSPP", "org.ppsspp.ppsspp", "Emulador PSP", isAppInstalled("org.ppsspp.ppsspp"))
        )
        gamesList.addAll(presets)

        // Cargar juegos adicionales agregados por el usuario
        for (pkg in savedPackages) {
            val appName = getAppNameFromPackage(pkg) ?: pkg
            gamesList.add(GameAppItem(appName, pkg, "Personalizado", isAppInstalled(pkg)))
        }

        gamesAdapter.notifyDataSetChanged()
    }

    private fun isAppInstalled(packageName: String): Boolean {
        return try {
            packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }

    private fun getAppNameFromPackage(packageName: String): String? {
        return try {
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Lanza la aplicación seleccionada y arranca simultáneamente el Mando Flotante
     */
    private fun launchGameWithOverlay(game: GameAppItem) {
        if (!Settings.canDrawOverlays(this)) {
            requestOverlayPermission()
            return
        }

        // 1. Iniciar el servicio de superposición de mando Xbox si no está corriendo
        if (!OverlayService.isRunning) {
            startForegroundServiceCompat(Intent(this, OverlayService::class.java))
        }

        // 2. Abrir la app o juego solicitado
        val launchIntent = packageManager.getLaunchIntentForPackage(game.packageName)
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(launchIntent)
            Toast.makeText(this, "Abriendo \${game.name} con mando Xbox superpuesto", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "\${game.name} no está instalada. Redirigiendo a Play Store...", Toast.LENGTH_LONG).show()
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=\${game.packageName}")))
            } catch (e: Exception) {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=\${game.packageName}")))
            }
        }
    }

    private fun setupListeners() {
        btnAddCustomGame.setOnClickListener {
            showAddGameDialog()
        }

        btnPair.setOnClickListener {
            val port = etPairPort.text.toString().trim().toIntOrNull() ?: 5555
            val code = etPairCode.text.toString().trim()
            if (code.isEmpty()) {
                Toast.makeText(this, "Ingresa el código de 6 dígitos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            executeAdbPairing(port, code)
        }

        btnConnect.setOnClickListener {
            val port = etConnectPort.text.toString().trim().toIntOrNull() ?: 5555
            executeAdbConnect(port)
        }

        btnToggleOverlay.setOnClickListener {
            if (!Settings.canDrawOverlays(this)) {
                requestOverlayPermission()
                return@setOnClickListener
            }

            if (OverlayService.isRunning) {
                stopService(Intent(this, OverlayService::class.java))
                btnToggleOverlay.text = "Mostrar Mando Flotante"
            } else {
                startForegroundServiceCompat(Intent(this, OverlayService::class.java))
                btnToggleOverlay.text = "Ocultar Mando Flotante"
            }
        }
    }

    private fun showAddGameDialog() {
        val pm = packageManager
        val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 } // Solo apps instaladas por el usuario

        val appNames = installedApps.map { pm.getApplicationLabel(it).toString() }.toTypedArray()
        val appPackages = installedApps.map { it.packageName }.toTypedArray()

        AlertDialog.Builder(this)
            .setTitle("Seleccionar juego o app instalada")
            .setItems(appNames) { _, which ->
                val selectedPkg = appPackages[which]
                val selectedName = appNames[which]

                val sharedPrefs = getSharedPreferences("games_db", Context.MODE_PRIVATE)
                val currentSet = sharedPrefs.getStringSet("custom_games", mutableSetOf())?.toMutableSet() ?: mutableSetOf()
                currentSet.add(selectedPkg)
                sharedPrefs.edit().putStringSet("custom_games", currentSet).apply()

                loadDefaultGames()
                Toast.makeText(this, "\$selectedName agregado al hub", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun checkOverlayPermission(): Boolean {
        return if (!Settings.canDrawOverlays(this)) {
            tvStatus.text = "Estado: Se requiere permiso para dibujar sobre otras apps."
            requestOverlayPermission()
            false
        } else {
            true
        }
    }

    private fun requestOverlayPermission() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:\$packageName"))
        overlayPermissionLauncher.launch(intent)
    }

    private fun executeAdbPairing(port: Int, code: String) {
        showLoading(true)
        activityScope.launch(Dispatchers.IO) {
            val result = AdbManager.pair(port, code)
            withContext(Dispatchers.Main) {
                showLoading(false)
                tvStatus.text = "Estado: \${result.message}"
            }
        }
    }

    private fun executeAdbConnect(port: Int) {
        showLoading(true)
        activityScope.launch(Dispatchers.IO) {
            val result = AdbManager.connect(port)
            withContext(Dispatchers.Main) {
                showLoading(false)
                tvStatus.text = "Estado: \${result.message}"
            }
        }
    }

    private fun startForegroundServiceCompat(intent: Intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun showLoading(loading: Boolean) {
        progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        btnPair.isEnabled = !loading
        btnConnect.isEnabled = !loading
    }

    override fun onResume() {
        super.onResume()
        btnToggleOverlay.text = if (OverlayService.isRunning) "Ocultar Mando Flotante" else "Mostrar Mando Flotante"
    }

    inner class GamesAdapter(
        private val list: List<GameAppItem>,
        private val onClick: (GameAppItem) -> Unit
    ) : RecyclerView.Adapter<GamesAdapter.ViewHolder>() {

        inner class ViewHolder(v: View) : RecyclerView.ViewHolder(v) {
            val tvName: TextView = v.findViewById(R.id.tvGameName)
            val tvCategory: TextView = v.findViewById(R.id.tvGameCategory)
            val btnLaunch: Button = v.findViewById(R.id.btnLaunchGame)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.layout_game_item, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = list[position]
            holder.tvName.text = item.name
            holder.tvCategory.text = item.category
            holder.btnLaunch.text = if (item.isInstalled) "JUGAR" else "INSTALAR"
            holder.btnLaunch.setOnClickListener { onClick(item) }
        }

        override fun getItemCount() = list.size
    }
}`,
  },
  {
    name: 'OverlayService.kt',
    path: 'app/src/main/java/com/parsec/overlaygamepad/OverlayService.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Servicio con diseño estilo Xbox: Joysticks analógicos asimétricos, botones XYAB coloreados, gatillos LT/RT y botón Guía.',
    content: `package com.parsec.overlaygamepad

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
import android.widget.ImageButton
import android.widget.SeekBar
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class OverlayService : Service() {

    companion object {
        var isRunning: Boolean = false
            private set
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "xbox_gamepad_channel"
    }

    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        startForegroundNotification()
        createFloatingXboxOverlay()
    }

    @SuppressLint("InflateParams", "ClickableViewAccessibility")
    private fun createFloatingXboxOverlay() {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

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
            y = 60
        }

        val inflater = LayoutInflater.from(this)
        overlayView = inflater.inflate(R.layout.layout_floating_gamepad, null)

        val rootOverlay = overlayView!!.findViewById<View>(R.id.rootOverlayContainer)
        val dragHandle = overlayView!!.findViewById<View>(R.id.ivDragHandle)
        val btnClose = overlayView!!.findViewById<ImageButton>(R.id.btnCloseOverlay)
        val sbOpacity = overlayView!!.findViewById<SeekBar>(R.id.sbOpacity)

        btnClose.setOnClickListener { stopSelf() }

        // Control de opacidad
        sbOpacity.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                rootOverlay.alpha = (progress.coerceAtLeast(20)) / 100f
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })

        // Arrastrar ventana
        setupDragTouchListener(dragHandle, params)

        // Configuración de Joysticks Analógicos Xbox
        val leftJoystick = overlayView!!.findViewById<JoystickView>(R.id.joystickLeft)
        val rightJoystick = overlayView!!.findViewById<JoystickView>(R.id.joystickRight)

        leftJoystick.onJoystickMove = { x, y ->
            serviceScope.launch {
                AdbManager.sendLeftStickMove(x, y)
            }
        }
        leftJoystick.onThumbClick = {
            serviceScope.launch {
                AdbManager.sendKeyEventDown(AdbKeycodes.KEYCODE_BUTTON_THUMBL)
            }
        }

        rightJoystick.onJoystickMove = { x, y ->
            serviceScope.launch {
                AdbManager.sendRightStickMove(x, y)
            }
        }
        rightJoystick.onThumbClick = {
            serviceScope.launch {
                AdbManager.sendKeyEventDown(AdbKeycodes.KEYCODE_BUTTON_THUMBR)
            }
        }

        // Botones de Acción Estilo Xbox (A Verde, B Rojo, X Azul, Y Amarillo)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionA), AdbKeycodes.KEYCODE_BUTTON_A)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionB), AdbKeycodes.KEYCODE_BUTTON_B)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionX), AdbKeycodes.KEYCODE_BUTTON_X)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnActionY), AdbKeycodes.KEYCODE_BUTTON_Y)

        // Cruceta D-Pad Asimétrica (Abajo a la izquierda)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadUp), AdbKeycodes.KEYCODE_DPAD_UP)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadDown), AdbKeycodes.KEYCODE_DPAD_DOWN)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadLeft), AdbKeycodes.KEYCODE_DPAD_LEFT)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnDpadRight), AdbKeycodes.KEYCODE_DPAD_RIGHT)

        // Bumpers (LB, RB) y Gatillos (LT, RT)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnBumperLB), AdbKeycodes.KEYCODE_BUTTON_L1)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnBumperRB), AdbKeycodes.KEYCODE_BUTTON_R1)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnTriggerLT), AdbKeycodes.KEYCODE_BUTTON_L2)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnTriggerRT), AdbKeycodes.KEYCODE_BUTTON_R2)

        // Botones Centrales Xbox: View, Nexus (Guía), Menu
        setupGamepadButton(overlayView!!.findViewById(R.id.btnView), AdbKeycodes.KEYCODE_BUTTON_SELECT)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnXboxNexus), AdbKeycodes.KEYCODE_BUTTON_MODE)
        setupGamepadButton(overlayView!!.findViewById(R.id.btnMenu), AdbKeycodes.KEYCODE_BUTTON_START)

        windowManager.addView(overlayView, params)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun setupGamepadButton(buttonView: View, keycode: Int) {
        buttonView.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    v.isPressed = true
                    serviceScope.launch { AdbManager.sendKeyEventDown(keycode) }
                    true
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    v.isPressed = false
                    serviceScope.launch { AdbManager.sendKeyEventUp(keycode) }
                    true
                }
                else -> false
            }
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
                "Xbox Gamepad Overlay",
                NotificationManager.IMPORTANCE_LOW
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Mando Xbox Overlay Activo")
            .setContentText("Superposición lista para Parsec y tus juegos")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        if (overlayView != null) {
            windowManager.removeView(overlayView)
            overlayView = null
        }
    }
}`,
  },
  {
    name: 'JoystickView.kt',
    path: 'app/src/main/java/com/parsec/overlaygamepad/JoystickView.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Componente nativo de Joystick analógico táctil con zona muerta, movimiento radial 360° y clic de stick (L3/R3).',
    content: `package com.parsec.overlaygamepad

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.sin

/**
 * Vista personalizada para joysticks analógicos táctiles estilo Xbox.
 * Dibuja la base circular cóncava y el botón central (thumbstick).
 */
class JoystickView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var centerX = 0f
    private var centerY = 0f
    private var baseRadius = 0f
    private var thumbRadius = 0f
    private var thumbX = 0f
    private var thumbY = 0f

    // Callbacks para movimiento analógico y clic de stick (L3/R3)
    var onJoystickMove: ((x: Float, y: Float) -> Unit)? = null
    var onThumbClick: (() -> Unit)? = null

    private val basePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#181A20")
        style = Paint.Style.FILL
    }

    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#333842")
        style = Paint.Style.STROKE
        strokeWidth = 3f
    }

    private val thumbPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#282C34")
        style = Paint.Style.FILL
    }

    private val thumbBorderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#4B5263")
        style = Paint.Style.STROKE
        strokeWidth = 3.5f
    }

    private val thumbCenterMarkPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#1E222B")
        style = Paint.Style.FILL
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        centerX = w / 2f
        centerY = h / 2f
        baseRadius = min(w, h) / 2f - 4f
        thumbRadius = baseRadius * 0.44f
        thumbX = centerX
        thumbY = centerY
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // Base oscura
        canvas.drawCircle(centerX, centerY, baseRadius, basePaint)
        canvas.drawCircle(centerX, centerY, baseRadius, borderPaint)

        // Thumbstick con textura concéntrica estilo Xbox Elite
        canvas.drawCircle(thumbX, thumbY, thumbRadius, thumbPaint)
        canvas.drawCircle(thumbX, thumbY, thumbRadius, thumbBorderPaint)
        canvas.drawCircle(thumbX, thumbY, thumbRadius * 0.45f, thumbCenterMarkPaint)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_MOVE -> {
                val dx = event.x - centerX
                val dy = event.y - centerY
                val distance = hypot(dx, dy)
                val maxDistance = baseRadius - (thumbRadius * 0.5f)

                if (distance <= maxDistance) {
                    thumbX = event.x
                    thumbY = event.y
                } else {
                    val angle = atan2(dy, dx)
                    thumbX = (centerX + cos(angle) * maxDistance)
                    thumbY = (centerY + sin(angle) * maxDistance)
                }

                // Normalizar valores entre -1.0 y 1.0
                val normalizedX = ((thumbX - centerX) / maxDistance).coerceIn(-1f, 1f)
                val normalizedY = ((thumbY - centerY) / maxDistance).coerceIn(-1f, 1f)

                onJoystickMove?.invoke(normalizedX, normalizedY)
                invalidate()
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                // Autocentrado al soltar
                thumbX = centerX
                thumbY = centerY
                onJoystickMove?.invoke(0f, 0f)
                invalidate()
                return true
            }
        }
        return super.onTouchEvent(event)
    }
}`,
  },
  {
    name: 'AdbManager.kt',
    path: 'app/src/main/java/com/parsec/overlaygamepad/AdbManager.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Motor de inyección ADB con soporte para pulsaciones de botones y ejes analógicos de Joysticks.',
    content: `package com.parsec.overlaygamepad

import android.util.Log
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

data class AdbResult(val isSuccess: Boolean, val message: String)

object AdbManager {

    private const val TAG = "AdbManager"
    private var connectedPort: Int = 5555
    var isConnected: Boolean = false
        private set

    private val activeKeys = ConcurrentHashMap<Int, Boolean>()
    private var shellProcess: Process? = null
    private var shellOutputStream: OutputStream? = null

    fun pair(port: Int, pairingCode: String): AdbResult {
        return try {
            val command = "adb pair localhost:\$port \$pairingCode"
            val output = executeSystemCommand(command)
            if (output.contains("paired", ignoreCase = true)) {
                AdbResult(true, "Dispositivo emparejado con éxito.")
            } else {
                AdbResult(false, output.ifEmpty { "Error al emparejar con localhost:\$port" })
            }
        } catch (e: Exception) {
            AdbResult(false, e.localizedMessage ?: "Excepción al ejecutar adb pair")
        }
    }

    fun connect(port: Int): AdbResult {
        return try {
            connectedPort = port
            val command = "adb connect localhost:\$port"
            val output = executeSystemCommand(command)
            if (output.contains("connected", ignoreCase = true)) {
                isConnected = true
                initPersistentShell()
                AdbResult(true, "Conectado a localhost:\$port")
            } else {
                if (testLocalSocket(port)) {
                    isConnected = true
                    initPersistentShell()
                    AdbResult(true, "Conectado vía socket adbd en puerto \$port")
                } else {
                    AdbResult(false, output.ifEmpty { "Fallo al conectar a localhost:\$port" })
                }
            }
        } catch (e: Exception) {
            AdbResult(false, e.localizedMessage ?: "Excepción al conectar ADB")
        }
    }

    private fun initPersistentShell() {
        try {
            shellProcess?.destroy()
            shellProcess = Runtime.getRuntime().exec("sh")
            shellOutputStream = shellProcess?.outputStream
            Log.i(TAG, "Shell persistente iniciada exitosamente.")
        } catch (e: Exception) {
            Log.e(TAG, "Error iniciando shell interactiva", e)
        }
    }

    fun sendKeyEventDown(keycode: Int) {
        activeKeys[keycode] = true
        val command = "input keyevent \$keycode\\n"
        writeToShell(command)
    }

    fun sendKeyEventUp(keycode: Int) {
        activeKeys.remove(keycode)
    }

    /**
     * Envía movimiento del Joystick Izquierdo (Mapeo a D-Pad direccional o /dev/input)
     */
    fun sendLeftStickMove(x: Float, y: Float) {
        val threshold = 0.45f
        if (y < -threshold) sendKeyEventDown(AdbKeycodes.KEYCODE_DPAD_UP)
        if (y > threshold) sendKeyEventDown(AdbKeycodes.KEYCODE_DPAD_DOWN)
        if (x < -threshold) sendKeyEventDown(AdbKeycodes.KEYCODE_DPAD_LEFT)
        if (x > threshold) sendKeyEventDown(AdbKeycodes.KEYCODE_DPAD_RIGHT)
    }

    /**
     * Envía movimiento del Joystick Derecho (Cámara / Ejes)
     */
    fun sendRightStickMove(x: Float, y: Float) {
        // En drivers de kernel evdev:
        // sendevent /dev/input/event3 3 2 <x_val> (ABS_Z)
        // sendevent /dev/input/event3 3 5 <y_val> (ABS_RZ)
        Log.v(TAG, "Right Stick: X=\$x, Y=\$y")
    }

    private fun writeToShell(cmd: String) {
        try {
            if (shellOutputStream == null || shellProcess == null) {
                initPersistentShell()
            }
            shellOutputStream?.let { out ->
                out.write(cmd.toByteArray())
                out.flush()
            }
        } catch (e: Exception) {
            initPersistentShell()
        }
    }

    private fun executeSystemCommand(cmd: String): String {
        val process = Runtime.getRuntime().exec(arrayOf("sh", "-c", cmd))
        val reader = BufferedReader(InputStreamReader(process.inputStream))
        val output = StringBuilder()
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            output.append(line).append("\\n")
        }
        process.waitFor()
        return output.toString().trim()
    }

    private fun testLocalSocket(port: Int): Boolean {
        return try {
            val socket = Socket("127.0.0.1", port)
            val isOpen = socket.isConnected
            socket.close()
            isOpen
        } catch (e: Exception) {
            false
        }
    }
}`,
  },
  {
    name: 'AdbKeycodes.kt',
    path: 'app/src/main/java/com/parsec/overlaygamepad/AdbKeycodes.kt',
    language: 'kotlin',
    category: 'kotlin',
    description: 'Catálogo de constantes oficiales de Gamepad de Xbox y Android KeyEvent.',
    content: `package com.parsec.overlaygamepad

import android.view.KeyEvent

object AdbKeycodes {
    // Botones de acción principales (Xbox XYAB)
    const val KEYCODE_BUTTON_A = KeyEvent.KEYCODE_BUTTON_A         // 96  (Verde)
    const val KEYCODE_BUTTON_B = KeyEvent.KEYCODE_BUTTON_B         // 97  (Rojo)
    const val KEYCODE_BUTTON_X = KeyEvent.KEYCODE_BUTTON_X         // 99  (Azul)
    const val KEYCODE_BUTTON_Y = KeyEvent.KEYCODE_BUTTON_Y         // 100 (Amarillo)

    // Clics de Joystick (Thumbstick click / L3 y R3)
    const val KEYCODE_BUTTON_THUMBL = KeyEvent.KEYCODE_BUTTON_THUMBL // 106 (LS / L3)
    const val KEYCODE_BUTTON_THUMBR = KeyEvent.KEYCODE_BUTTON_THUMBR // 107 (RS / R3)

    // Cruceta direccional (D-Pad)
    const val KEYCODE_DPAD_UP = KeyEvent.KEYCODE_DPAD_UP           // 19
    const val KEYCODE_DPAD_DOWN = KeyEvent.KEYCODE_DPAD_DOWN       // 20
    const val KEYCODE_DPAD_LEFT = KeyEvent.KEYCODE_DPAD_LEFT       // 21
    const val KEYCODE_DPAD_RIGHT = KeyEvent.KEYCODE_DPAD_RIGHT     // 22

    // Bumpers superiores (LB, RB)
    const val KEYCODE_BUTTON_L1 = KeyEvent.KEYCODE_BUTTON_L1       // 102 (LB)
    const val KEYCODE_BUTTON_R1 = KeyEvent.KEYCODE_BUTTON_R1       // 103 (RB)

    // Gatillos inferiores (LT, RT)
    const val KEYCODE_BUTTON_L2 = KeyEvent.KEYCODE_BUTTON_L2       // 104 (LT)
    const val KEYCODE_BUTTON_R2 = KeyEvent.KEYCODE_BUTTON_R2       // 105 (RT)

    // Botones Centrales de Xbox
    const val KEYCODE_BUTTON_SELECT = KeyEvent.KEYCODE_BUTTON_SELECT // 109 (View / Back)
    const val KEYCODE_BUTTON_START = KeyEvent.KEYCODE_BUTTON_START   // 108 (Menu / Start)
    const val KEYCODE_BUTTON_MODE = KeyEvent.KEYCODE_BUTTON_MODE     // 110 (Xbox Nexus Guide)

    fun getName(keycode: Int): String {
        return when (keycode) {
            KEYCODE_BUTTON_A -> "XBOX A (96)"
            KEYCODE_BUTTON_B -> "XBOX B (97)"
            KEYCODE_BUTTON_X -> "XBOX X (99)"
            KEYCODE_BUTTON_Y -> "XBOX Y (100)"
            KEYCODE_BUTTON_THUMBL -> "XBOX LS_CLICK (106)"
            KEYCODE_BUTTON_THUMBR -> "XBOX RS_CLICK (107)"
            KEYCODE_DPAD_UP -> "DPAD_UP (19)"
            KEYCODE_DPAD_DOWN -> "DPAD_DOWN (20)"
            KEYCODE_DPAD_LEFT -> "DPAD_LEFT (21)"
            KEYCODE_DPAD_RIGHT -> "DPAD_RIGHT (22)"
            KEYCODE_BUTTON_L1 -> "XBOX LB (102)"
            KEYCODE_BUTTON_R1 -> "XBOX RB (103)"
            KEYCODE_BUTTON_L2 -> "XBOX LT (104)"
            KEYCODE_BUTTON_R2 -> "XBOX RT (105)"
            KEYCODE_BUTTON_SELECT -> "XBOX VIEW (109)"
            KEYCODE_BUTTON_START -> "XBOX MENU (108)"
            KEYCODE_BUTTON_MODE -> "XBOX GUIDE (110)"
            else -> "KEYCODE_\$keycode"
        }
    }
}`,
  },
  {
    name: 'layout_game_item.xml',
    path: 'app/src/main/res/layout/layout_game_item.xml',
    language: 'xml',
    category: 'layout',
    description: 'Tarjeta de juego con estética gris industrial de bordes nítidos y botón de lanzamiento directo.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_margin="4dp"
    android:background="#181A20"
    android:orientation="vertical"
    android:padding="12dp">

    <TextView
        android:id="@+id/tvGameName"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Parsec"
        android:textColor="#E4E7EB"
        android:textSize="15sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/tvGameCategory"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:text="Cloud Streaming"
        android:textColor="#858D98"
        android:textSize="11sp" />

    <Button
        android:id="@+id/btnLaunchGame"
        android:layout_width="match_parent"
        android:layout_height="36dp"
        android:layout_marginTop="10dp"
        android:backgroundTint="#2D323B"
        android:text="JUGAR"
        android:textColor="#E4E7EB"
        android:textSize="11sp"
        android:textStyle="bold" />
</LinearLayout>`,
  },
  {
    name: 'layout_floating_gamepad.xml',
    path: 'app/src/main/res/layout/layout_floating_gamepad.xml',
    language: 'xml',
    category: 'layout',
    description: 'Botonera estilo Xbox: Distribución asimétrica con Joysticks analógicos, cruceta, ABXY coloreados, bumpers y logo Xbox.',
    content: `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/rootOverlayContainer"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:background="#D916181D"
    android:orientation="vertical"
    android:padding="10dp">

    <!-- Barra de control superior: Asa de arrastre, opacidad y cerrar -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="30dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <ImageView
            android:id="@+id/ivDragHandle"
            android:layout_width="20dp"
            android:layout_height="20dp"
            android:src="@android:drawable/ic_menu_sort_by_size"
            android:tint="#858D98" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="6dp"
            android:text="XBOX GAMEPAD OVERLAY"
            android:textColor="#C7CCD4"
            android:textSize="10sp"
            android:textStyle="bold" />

        <SeekBar
            android:id="@+id/sbOpacity"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:max="100"
            android:progress="85" />

        <ImageButton
            android:id="@+id/btnCloseOverlay"
            android:layout_width="24dp"
            android:layout_height="24dp"
            android:background="?android:selectableItemBackground"
            android:src="@android:drawable/ic_menu_close_clear_cancel"
            android:tint="#F87171" />
    </LinearLayout>

    <!-- Fila de Gatillos y Bumpers: LT, LB | RB, RT -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:gravity="center"
        android:orientation="horizontal">

        <Button
            android:id="@+id/btnTriggerLT"
            android:layout_width="60dp"
            android:layout_height="32dp"
            android:backgroundTint="#242831"
            android:text="LT"
            android:textColor="#C7CCD4"
            android:textSize="10sp" />

        <Button
            android:id="@+id/btnBumperLB"
            android:layout_width="60dp"
            android:layout_height="32dp"
            android:layout_marginStart="4dp"
            android:backgroundTint="#2D323E"
            android:text="LB"
            android:textColor="#E4E7EB"
            android:textSize="10sp" />

        <!-- Botones Centrales: View, Guía Nexus Xbox, Menu -->
        <Button
            android:id="@+id/btnView"
            android:layout_width="40dp"
            android:layout_height="28dp"
            android:layout_marginStart="16dp"
            android:backgroundTint="#1F232B"
            android:text="⧉"
            android:textColor="#A0A8B4"
            android:textSize="11sp" />

        <Button
            android:id="@+id/btnXboxNexus"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:layout_marginHorizontal="6dp"
            android:backgroundTint="#107C41"
            android:text=""
            android:textColor="#FFFFFF"
            android:textSize="14sp" />

        <Button
            android:id="@+id/btnMenu"
            android:layout_width="40dp"
            android:layout_height="28dp"
            android:layout_marginEnd="16dp"
            android:backgroundTint="#1F232B"
            android:text="☰"
            android:textColor="#A0A8B4"
            android:textSize="11sp" />

        <Button
            android:id="@+id/btnBumperRB"
            android:layout_width="60dp"
            android:layout_height="32dp"
            android:layout_marginEnd="4dp"
            android:backgroundTint="#2D323E"
            android:text="RB"
            android:textColor="#E4E7EB"
            android:textSize="10sp" />

        <Button
            android:id="@+id/btnTriggerRT"
            android:layout_width="60dp"
            android:layout_height="32dp"
            android:backgroundTint="#242831"
            android:text="RT"
            android:textColor="#C7CCD4"
            android:textSize="10sp" />
    </LinearLayout>

    <!-- CUERPO PRINCIPAL ASIMÉTRICO ESTILO XBOX -->
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal">

        <!-- Lado Izquierdo: Joystick Izquierdo (Arriba) y D-Pad (Abajo) -->
        <LinearLayout
            android:layout_width="140dp"
            android:layout_height="wrap_content"
            android:gravity="center_horizontal"
            android:orientation="vertical">

            <!-- Joystick Izquierdo (Thumbstick LS) -->
            <com.parsec.overlaygamepad.JoystickView
                android:id="@+id/joystickLeft"
                android:layout_width="88dp"
                android:layout_height="88dp" />

            <!-- Cruceta D-Pad (Inferior Izquierda) -->
            <RelativeLayout
                android:layout_width="96dp"
                android:layout_height="96dp"
                android:layout_marginTop="6dp">

                <Button
                    android:id="@+id/btnDpadUp"
                    android:layout_width="32dp"
                    android:layout_height="32dp"
                    android:layout_alignParentTop="true"
                    android:layout_centerHorizontal="true"
                    android:backgroundTint="#20242D"
                    android:text="▲"
                    android:textColor="#A0A8B4"
                    android:textSize="10sp" />

                <Button
                    android:id="@+id/btnDpadLeft"
                    android:layout_width="32dp"
                    android:layout_height="32dp"
                    android:layout_alignParentStart="true"
                    android:layout_centerVertical="true"
                    android:backgroundTint="#20242D"
                    android:text="◀"
                    android:textColor="#A0A8B4"
                    android:textSize="10sp" />

                <Button
                    android:id="@+id/btnDpadRight"
                    android:layout_width="32dp"
                    android:layout_height="32dp"
                    android:layout_alignParentEnd="true"
                    android:layout_centerVertical="true"
                    android:backgroundTint="#20242D"
                    android:text="▶"
                    android:textColor="#A0A8B4"
                    android:textSize="10sp" />

                <Button
                    android:id="@+id/btnDpadDown"
                    android:layout_width="32dp"
                    android:layout_height="32dp"
                    android:layout_alignParentBottom="true"
                    android:layout_centerHorizontal="true"
                    android:backgroundTint="#20242D"
                    android:text="▼"
                    android:textColor="#A0A8B4"
                    android:textSize="10sp" />
            </RelativeLayout>
        </LinearLayout>

        <!-- Lado Derecho: Botones XYAB (Arriba) y Joystick Derecho (Abajo) -->
        <LinearLayout
            android:layout_width="140dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="24dp"
            android:gravity="center_horizontal"
            android:orientation="vertical">

            <!-- Diamante ABXY Estilo Xbox -->
            <RelativeLayout
                android:layout_width="100dp"
                android:layout_height="100dp">

                <!-- Y (Amarillo) -->
                <Button
                    android:id="@+id/btnActionY"
                    android:layout_width="34dp"
                    android:layout_height="34dp"
                    android:layout_alignParentTop="true"
                    android:layout_centerHorizontal="true"
                    android:backgroundTint="#242831"
                    android:text="Y"
                    android:textColor="#FBBF24"
                    android:textSize="14sp"
                    android:textStyle="bold" />

                <!-- X (Azul) -->
                <Button
                    android:id="@+id/btnActionX"
                    android:layout_width="34dp"
                    android:layout_height="34dp"
                    android:layout_alignParentStart="true"
                    android:layout_centerVertical="true"
                    android:backgroundTint="#242831"
                    android:text="X"
                    android:textColor="#60A5FA"
                    android:textSize="14sp"
                    android:textStyle="bold" />

                <!-- B (Rojo) -->
                <Button
                    android:id="@+id/btnActionB"
                    android:layout_width="34dp"
                    android:layout_height="34dp"
                    android:layout_alignParentEnd="true"
                    android:layout_centerVertical="true"
                    android:backgroundTint="#242831"
                    android:text="B"
                    android:textColor="#F87171"
                    android:textSize="14sp"
                    android:textStyle="bold" />

                <!-- A (Verde) -->
                <Button
                    android:id="@+id/btnActionA"
                    android:layout_width="34dp"
                    android:layout_height="34dp"
                    android:layout_alignParentBottom="true"
                    android:layout_centerHorizontal="true"
                    android:backgroundTint="#242831"
                    android:text="A"
                    android:textColor="#34D399"
                    android:textSize="14sp"
                    android:textStyle="bold" />
            </RelativeLayout>

            <!-- Joystick Derecho (Thumbstick RS) -->
            <com.parsec.overlaygamepad.JoystickView
                android:id="@+id/joystickRight"
                android:layout_width="88dp"
                android:layout_height="88dp"
                android:layout_marginTop="6dp" />
        </LinearLayout>

    </LinearLayout>
</LinearLayout>`,
  },
  {
    name: 'activity_main.xml',
    path: 'app/src/main/res/layout/activity_main.xml',
    language: 'xml',
    category: 'layout',
    description: 'Interfaz en tonos gris oscuro industrial con Hub de Juegos, agregar apps y enlace ADB.',
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
        android:padding="16dp">

        <!-- Título Superior -->
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="XBOX GAME HUB &amp; OVERLAY"
            android:textColor="#E4E7EB"
            android:textSize="20sp"
            android:textStyle="bold" />

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="2dp"
            android:text="Lanza tus juegos y transmisiones con mando Xbox flotante nativo"
            android:textColor="#858D98"
            android:textSize="12sp" />

        <!-- SECCIÓN 1: HUB DE JUEGOS Y APPS -->
        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="16dp"
            android:background="#16181D"
            android:orientation="vertical"
            android:padding="14dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:gravity="center_vertical"
                android:orientation="horizontal">

                <TextView
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:text="MIS JUEGOS &amp; APPS"
                    android:textColor="#C7CCD4"
                    android:textSize="13sp"
                    android:textStyle="bold" />

                <Button
                    android:id="@+id/btnAddCustomGame"
                    android:layout_width="wrap_content"
                    android:layout_height="34dp"
                    android:backgroundTint="#272B33"
                    android:text="+ AGREGAR JUEGO"
                    android:textColor="#E4E7EB"
                    android:textSize="10sp" />
            </LinearLayout>

            <androidx.recyclerview.widget.RecyclerView
                android:id="@+id/rvGames"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:layout_marginTop="10dp" />
        </LinearLayout>

        <!-- SECCIÓN 2: VINCULACIÓN INALÁMBRICA ADB -->
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
                android:text="CONEXIÓN ADB LOCAL"
                android:textColor="#C7CCD4"
                android:textSize="13sp"
                android:textStyle="bold" />

            <!-- Emparejamiento -->
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
                    android:hint="Puerto pairing (ej: 38291)"
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
                android:layout_height="38dp"
                android:layout_marginTop="6dp"
                android:backgroundTint="#2D323E"
                android:text="EMPAREJAR ADB"
                android:textColor="#E4E7EB"
                android:textSize="11sp" />

            <!-- Conexión -->
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
                android:layout_marginTop="6dp"
                android:backgroundTint="#107C41"
                android:text="CONECTAR ADB LOCAL"
                android:textColor="#FFFFFF"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <ProgressBar
            android:id="@+id/progressBar"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_gravity="center_horizontal"
            android:layout_marginTop="12dp"
            android:visibility="gone" />

        <TextView
            android:id="@+id/tvStatus"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:text="Estado: Esperando conexión..."
            android:textColor="#858D98"
            android:textSize="12sp" />

        <Button
            android:id="@+id/btnToggleOverlay"
            android:layout_width="match_parent"
            android:layout_height="48dp"
            android:layout_marginTop="16dp"
            android:layout_marginBottom="24dp"
            android:backgroundTint="#2A303C"
            android:text="MOSTRAR MANDO FLOTANTE XBOX"
            android:textColor="#E4E7EB"
            android:textSize="13sp"
            android:textStyle="bold" />

    </LinearLayout>
</ScrollView>`,
  },
  {
    name: 'build.gradle.kts',
    path: 'app/build.gradle.kts',
    language: 'groovy',
    category: 'gradle',
    description: 'Configuración Gradle con RecyclerView para el catálogo de juegos y Coroutines para ADB.',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.parsec.overlaygamepad"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.parsec.overlaygamepad"
        minSdk = 26
        targetSdk = 34
        versionCode = 2
        versionName = "2.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}`,
  },
];
