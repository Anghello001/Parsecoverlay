import React, { useState, useRef } from 'react';
import { GamepadKeyEvent, GameApp } from '../types';
import { 
  Play, 
  RotateCcw, 
  X, 
  Sliders, 
  Terminal, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles
} from 'lucide-react';

interface SimulatorProps {
  onAddLog: (event: GamepadKeyEvent) => void;
  logs: GamepadKeyEvent[];
  onClearLogs: () => void;
}

// Simulador de aplicaciones instaladas en un dispositivo Android real
const INSTALLED_ANDROID_APPS: GameApp[] = [
  {
    id: 'parsec',
    name: 'Parsec',
    packageName: 'tv.parsec.client',
    category: 'Streaming',
    iconUrl: '🎮',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
  },
  {
    id: 'moonlight',
    name: 'Moonlight GameStream',
    packageName: 'com.limelight',
    category: 'Streaming',
    iconUrl: '🌙',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
  },
  {
    id: 'geforce-now',
    name: 'GeForce NOW Cloud',
    packageName: 'com.nvidia.geforcenow',
    category: 'Cloud Gaming',
    iconUrl: '⚡',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
  },
  {
    id: 'steam-link',
    name: 'Steam Link',
    packageName: 'com.valvesoftware.steamlink',
    category: 'Streaming',
    iconUrl: '🕹️',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
  },
  {
    id: 'retroarch',
    name: 'RetroArch Multi-Emulator',
    packageName: 'com.retroarch',
    category: 'Emulador',
    iconUrl: '👾',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
  },
  {
    id: 'minecraft',
    name: 'Minecraft Bedrock',
    packageName: 'com.mojang.minecraftpe',
    category: 'Juego Nativo',
    iconUrl: '⛏️',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
  },
  {
    id: 'ppsspp',
    name: 'PPSSPP PlayStation Portable',
    packageName: 'org.ppsspp.ppsspp',
    category: 'Emulador',
    iconUrl: '🕹️',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
  },
  {
    id: 'roblox',
    name: 'Roblox',
    packageName: 'com.roblox.client',
    category: 'Juego Nativo',
    iconUrl: '🧱',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
  },
];

type LayoutMode = 'xbox-official' | 'symmetrical-top' | 'symmetrical-bottom';

export const Simulator: React.FC<SimulatorProps> = ({ onAddLog, logs, onClearLogs }) => {
  // Lista de juegos guardados en el hub
  const [userGames, setUserGames] = useState<GameApp[]>([
    INSTALLED_ANDROID_APPS[0], // Parsec
    INSTALLED_ANDROID_APPS[1], // Moonlight
    INSTALLED_ANDROID_APPS[4], // RetroArch
  ]);

  const [activeGame, setActiveGame] = useState<GameApp>(INSTALLED_ANDROID_APPS[0]);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [opacity, setOpacity] = useState(70);
  
  // Control de tamaño / escala del mando Xbox SIN COLISIÓN (0.70x a 1.35x)
  const [controllerScale, setControllerScale] = useState<number>(1.0);
  
  // Modo de distribución
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('xbox-official');

  const [pressedButtons, setPressedButtons] = useState<{ [key: string]: boolean }>({});
  const [showAndroidAppPicker, setShowAndroidAppPicker] = useState(false);

  // Estados independientes de Joysticks con Multitouch
  const [leftStickPos, setLeftStickPos] = useState({ x: 0, y: 0 });
  const [rightStickPos, setRightStickPos] = useState({ x: 0, y: 0 });
  const activePointers = useRef<Map<number, string>>(new Map());

  // Input de código de 6 dígitos
  const [pairCode, setPairCode] = useState('582914');
  const [connectPort, setConnectPort] = useState('38291');
  const [isConnected, setIsConnected] = useState(true);

  // Despacho de eventos de teclado con ACTION_DOWN y ACTION_UP
  const triggerKeyEvent = (action: 'ACTION_DOWN' | 'ACTION_UP', name: string, code: number, constant: string, linuxCode: number) => {
    const isDown = action === 'ACTION_DOWN';
    setPressedButtons((prev) => ({ ...prev, [name]: isDown }));

    if (isDown && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignorar si vibración no está disponible
      }
    }

    const now = Date.now();
    const event: GamepadKeyEvent = {
      id: `${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }),
      action,
      buttonName: name,
      androidKeycode: constant,
      androidKeycodeInt: code,
      adbCommand: isDown ? `input keyevent ${code}` : `# RELEASE keycode ${code}`,
      sendeventCommand: `sendevent /dev/input/event3 1 ${linuxCode} ${isDown ? 1 : 0}`,
    };
    onAddLog(event);
  };

  // MULTITOUCH POINTER HANDLERS PARA JOYSTICK IZQUIERDO (LS)
  const handleLeftStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, 'left-stick');
    updateStickPos(true, e);
  };

  const handleLeftStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.get(e.pointerId) === 'left-stick') {
      updateStickPos(true, e);
    }
  };

  const handleLeftStickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    setLeftStickPos({ x: 0, y: 0 });
  };

  // MULTITOUCH POINTER HANDLERS PARA JOYSTICK DERECHO (RS)
  const handleRightStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, 'right-stick');
    updateStickPos(false, e);
  };

  const handleRightStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointers.current.get(e.pointerId) === 'right-stick') {
      updateStickPos(false, e);
    }
  };

  const handleRightStickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    setRightStickPos({ x: 0, y: 0 });
  };

  const updateStickPos = (isLeft: boolean, e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const maxRadius = rect.width / 2 - 10;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const x = Math.cos(angle) * clampedDist;
    const y = Math.sin(angle) * clampedDist;

    if (isLeft) {
      setLeftStickPos({ x, y });
    } else {
      setRightStickPos({ x, y });
    }

    const normX = Math.round((x / maxRadius) * 100) / 100;
    const normY = Math.round((y / maxRadius) * 100) / 100;

    if (Math.abs(normX) > 0.45 || Math.abs(normY) > 0.45) {
      const now = Date.now();
      onAddLog({
        id: `${now}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'AXIS_MOVE',
        buttonName: isLeft ? 'Left Stick (LS)' : 'Right Stick (RS)',
        androidKeycode: isLeft ? 'AXIS_X / AXIS_Y' : 'AXIS_Z / AXIS_RZ',
        androidKeycodeInt: isLeft ? 106 : 107,
        adbCommand: `# STICK: X=${normX}, Y=${normY}`,
        sendeventCommand: `sendevent /dev/input/event3 3 ${isLeft ? 0 : 2} ${Math.round(normX * 32767)}`,
        axisValue: { x: normX, y: normY },
      });
    }
  };

  const handleLaunchGame = (game: GameApp) => {
    setActiveGame(game);
    setIsOverlayVisible(true);
    const now = Date.now();
    onAddLog({
      id: `${now}-app-intent`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: 'ACTION_DOWN',
      buttonName: `Lanzar ${game.name}`,
      androidKeycode: 'START_ACTIVITY_WITH_OVERLAY',
      androidKeycodeInt: 0,
      adbCommand: `am start -n ${game.packageName}/.MainActivity && am startservice com.anghello.overlaygamepad/.OverlayService`,
      sendeventCommand: `# Intent lanzado para ${game.packageName}`,
    });
  };

  const handleSelectAndroidApp = (app: GameApp) => {
    if (!userGames.some((g) => g.packageName === app.packageName)) {
      setUserGames([...userGames, app]);
    }
    handleLaunchGame(app);
    setShowAndroidAppPicker(false);
  };

  // Cálculo de dimensiones proporcionales sin colisión
  const baseStickSize = Math.round(86 * controllerScale);
  const baseDpadSize = Math.round(82 * controllerScale);
  const baseDiamondSize = Math.round(86 * controllerScale);
  const baseActionButtonSize = Math.round(30 * controllerScale);
  const baseDpadButtonSize = Math.round(26 * controllerScale);
  const clusterGap = Math.max(12, Math.round(18 * controllerScale));

  return (
    <div className="space-y-4 select-none touch-manipulation">
      {/* SECCIÓN 1: VINCULACIÓN INALÁMBRICA DE 6 DÍGITOS Y SELECTOR DE APPS */}
      <div className="bg-[#14161a] border border-[#262a33] p-3.5 text-xs shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Conexión de 6 Dígitos */}
          <div className="md:col-span-6 bg-[#101216] border border-[#22262f] p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#e4e7eb] uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#107C41]"></span>
                Conexión Inalámbrica de 6 Dígitos
              </span>
              <span className="text-[10px] text-[#34d399] font-mono">
                {isConnected ? 'CONECTADO A LOCALHOST' : 'DESCONECTADO'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-1/3">
                <label className="text-[9px] text-[#858d98] block uppercase">Puerto</label>
                <input
                  type="text"
                  value={connectPort}
                  onChange={(e) => setConnectPort(e.target.value)}
                  placeholder="38291"
                  className="w-full bg-[#181a20] border border-[#2b313d] p-1.5 text-xs font-mono text-[#e4e7eb] outline-none"
                />
              </div>

              <div className="w-2/3">
                <label className="text-[9px] text-[#858d98] block uppercase">Código de 6 dígitos</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    placeholder="582914"
                    className="w-full bg-[#181a20] border border-[#2b313d] p-1.5 text-xs font-mono text-[#e4e7eb] tracking-widest text-center font-bold outline-none"
                  />
                  <button
                    onClick={() => {
                      setIsConnected(true);
                      onAddLog({
                        id: `${Date.now()}-connect`,
                        timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        action: 'ACTION_DOWN',
                        buttonName: 'ADB Connect',
                        androidKeycode: 'ADB_PAIR_AND_CONNECT',
                        androidKeycodeInt: 0,
                        adbCommand: `adb pair localhost:${connectPort} ${pairCode} && adb connect localhost:${connectPort}`,
                        sendeventCommand: '# Vinculado exitosamente a adbd local',
                      });
                    }}
                    className="px-3 bg-[#107C41] hover:bg-[#128a49] text-white font-bold uppercase text-[10px] tracking-wide shrink-0"
                  >
                    Vincular
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de Apps de Android */}
          <div className="md:col-span-6 flex flex-col justify-between h-full bg-[#101216] border border-[#22262f] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#e4e7eb] uppercase text-[11px] tracking-wide">
                Juegos de tu Teléfono Android
              </span>
              <button
                onClick={() => setShowAndroidAppPicker(true)}
                className="px-2.5 py-1 bg-[#22262f] hover:bg-[#2b303b] border border-[#333a46] text-[#e4e7eb] font-bold text-[10px] uppercase flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-[#107C41]" />
                <span>Escanear Apps de Android</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {userGames.map((game) => (
                <button
                  key={game.packageName}
                  onClick={() => handleLaunchGame(game)}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide border flex items-center gap-1.5 transition-all ${
                    activeGame.packageName === game.packageName
                      ? 'bg-[#1a2e22] text-[#34d399] border-[#107C41]'
                      : 'bg-[#181a20] text-[#858d98] border-[#2b313d] hover:text-[#e4e7eb]'
                  }`}
                >
                  <span>{game.iconUrl}</span>
                  <span>{game.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: LISTA DE APLICACIONES DE ANDROID */}
      {showAndroidAppPicker && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#14161a] border border-[#2d323e] max-w-lg w-full p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262a33]">
              <div>
                <h3 className="text-sm font-bold uppercase text-[#e4e7eb]">
                  Aplicaciones Instaladas en este Dispositivo
                </h3>
                <p className="text-[10px] text-[#858d98]">
                  Selecciona la aplicación de Android que deseas abrir con el mando flotante
                </p>
              </div>
              <button onClick={() => setShowAndroidAppPicker(false)} className="text-[#858d98] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#22262f] my-3">
              {INSTALLED_ANDROID_APPS.map((app) => (
                <div
                  key={app.packageName}
                  onClick={() => handleSelectAndroidApp(app)}
                  className="p-2.5 hover:bg-[#1c2028] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{app.iconUrl}</span>
                    <div>
                      <h4 className="font-bold text-xs text-[#e4e7eb]">{app.name}</h4>
                      <p className="text-[10px] text-[#858d98] font-mono">{app.packageName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#107C41] border border-[#107C41]/40 px-2 py-0.5">
                    Seleccionar
                  </span>
                </div>
              ))}
            </div>

            <div className="text-right pt-2 border-t border-[#262a33]">
              <button
                onClick={() => setShowAndroidAppPicker(false)}
                className="px-4 py-1.5 text-xs text-[#858d98] hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: CONTROL DE ESCALA SIN COLISIÓN Y PANTALLA 100% TRANSPARENTE DEL JUEGO */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Teléfono Android con Overlay Flotante */}
        <div className="xl:col-span-8 flex flex-col items-center">
          {/* BARRA SUPERIOR DE HERRAMIENTAS: TAMAÑO SIN COLISIÓN, MODO Y TRANSPARENCIA */}
          <div className="w-full bg-[#14161a] border border-[#262a33] p-2.5 mb-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Información y Modo de Mando */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#107C41]"></span>
              <span className="font-bold text-[#e4e7eb] uppercase text-[11px]">
                {activeGame.name}
              </span>
              <span className="text-[9px] bg-[#1a2e22] text-[#34d399] border border-[#107C41]/40 px-1.5 py-0.5 font-bold uppercase">
                Xbox Layout
              </span>
            </div>

            {/* Selector de Modo de Disposición */}
            <div className="flex items-center gap-1 bg-[#101216] px-2 py-1 border border-[#22262f]">
              <Layers className="w-3 h-3 text-[#107C41]" />
              <span className="text-[9px] text-[#858d98] uppercase font-bold">Disposición:</span>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
                className="bg-[#181a20] text-[#e4e7eb] border border-[#2b313d] text-[10px] py-0.5 px-1 outline-none font-sans"
              >
                <option value="xbox-official">Xbox Oficial (LS Arriba + XYAB Arriba)</option>
                <option value="symmetrical-top">Joysticks Simétricos Arriba</option>
                <option value="symmetrical-bottom">Joysticks Simétricos Abajo</option>
              </select>
            </div>

            {/* CONTROL INTELIGENTE DE TAMAÑO / ESCALA SIN COLISIÓN */}
            <div className="flex items-center gap-1.5 bg-[#101216] px-2 py-1 border border-[#22262f]">
              <span className="text-[9px] text-[#858d98] uppercase font-bold">Tamaño:</span>
              
              {/* Botón Disminuir (-) */}
              <button
                onClick={() => setControllerScale((prev) => Math.max(0.70, Math.round((prev - 0.05) * 100) / 100))}
                className="w-5 h-5 bg-[#181a20] hover:bg-[#22262f] border border-[#2b313d] flex items-center justify-center text-[#e4e7eb] font-bold text-xs"
                title="Reducir tamaño del mando"
              >
                -
              </button>

              {/* Slider de Escala */}
              <input
                type="range"
                min="0.70"
                max="1.35"
                step="0.05"
                value={controllerScale}
                onChange={(e) => setControllerScale(parseFloat(e.target.value))}
                className="w-16 accent-[#107C41] cursor-pointer"
                title="Ajustar tamaño del mando sin colisión"
              />

              {/* Botón Aumentar (+) */}
              <button
                onClick={() => setControllerScale((prev) => Math.min(1.35, Math.round((prev + 0.05) * 100) / 100))}
                className="w-5 h-5 bg-[#181a20] hover:bg-[#22262f] border border-[#2b313d] flex items-center justify-center text-[#e4e7eb] font-bold text-xs"
                title="Aumentar tamaño del mando"
              >
                +
              </button>

              <span className="font-mono text-[#34d399] font-bold text-[10px] w-8 text-center">
                {Math.round(controllerScale * 100)}%
              </span>

              {/* Botones Rápidos de Escala */}
              <div className="flex gap-1 ml-0.5">
                {[
                  { label: 'S', val: 0.75 },
                  { label: 'M', val: 1.0 },
                  { label: 'L', val: 1.20 },
                  { label: 'XL', val: 1.35 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setControllerScale(p.val)}
                    className={`px-1.5 py-0.5 text-[9px] font-mono border transition-all ${
                      Math.abs(controllerScale - p.val) < 0.03
                        ? 'bg-[#107C41] text-white border-[#107C41] font-bold'
                        : 'text-[#858d98] border-[#2b313d] hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacidad y Visibilidad */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-[#858d98]">
                <Sliders className="w-3 h-3" />
                <span>Opacidad:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-14 accent-[#107C41] cursor-pointer"
                />
                <span className="font-mono text-[#c7ccd4] text-[10px]">{opacity}%</span>
              </div>

              {/* Botón Ocultar/Mostrar Overlay */}
              <button
                onClick={() => setIsOverlayVisible(!isOverlayVisible)}
                className={`px-2 py-1 font-bold text-[9px] uppercase flex items-center gap-1 border ${
                  isOverlayVisible
                    ? 'bg-[#1e222a] text-[#e4e7eb] border-[#383e4c]'
                    : 'bg-[#107C41] text-white border-[#107C41]'
                }`}
              >
                {isOverlayVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{isOverlayVisible ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
          </div>

          {/* Indicador de Anti-Colisión Activo */}
          <div className="w-full mb-1 flex items-center justify-between text-[10px] text-[#858d98] px-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>Espaciado Anti-Colisión Activo: Las teclas y joysticks nunca colisionan al cambiar tamaño.</span>
            </span>
            <span className="font-mono">Multitouch habilitado</span>
          </div>

          {/* PANTALLA DEL DISPOSITIVO: 100% FONDO TRANSPARENTE DEL JUEGO (SIN CAJA GRIS) */}
          <div className="relative w-full aspect-[16/9] bg-black border-2 border-[#262a33] shadow-2xl overflow-hidden select-none touch-none">
            {/* Fondo del Stream del Juego (Simulación de Parsec / Juego en Curso) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-zinc-900 to-stone-900 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center px-4 opacity-40">
                <span className="text-2xl font-black tracking-widest uppercase font-mono text-white block">
                  {activeGame.name.toUpperCase()} (JUEGO ACTIVO)
                </span>
                <span className="text-xs text-emerald-400 font-mono mt-1 block">
                  🎮 Streaming Parsec Activo • Overlay Transparente Xbox • Escala: {Math.round(controllerScale * 100)}%
                </span>
              </div>
            </div>

            {/* BOTÓN BURBUJA FLOTANTE PARA MINIMIZAR / EXPANDIR MANDO */}
            <div className="absolute top-2 right-2 z-40">
              <button
                onClick={() => setIsOverlayVisible(!isOverlayVisible)}
                className="w-7 h-7 rounded-full bg-black/60 border border-white/30 backdrop-blur-md flex items-center justify-center text-white text-xs hover:bg-[#107C41]/80 transition-colors shadow-lg"
                title={isOverlayVisible ? 'Ocultar controles' : 'Mostrar controles'}
              >
                {isOverlayVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* OVERLAY DEL MANDO XBOX: 100% PANTALLA COMPLETA TRANSPARENTE CON DISTRIBUCIÓN ERGONÓMICA EXACTA */}
            {isOverlayVisible && (
              <div 
                style={{ opacity: opacity / 100 }}
                className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 select-none touch-none"
              >
                {/* FILA SUPERIOR: GATILLOS FLOTANTES LT/LB, BOTONES CENTRALES XBOX Y RB/RT */}
                <div className="flex items-center justify-between pointer-events-auto w-full px-2 pt-0.5">
                  {/* Gatillo LT y Bumper LB (Superior Izquierdo) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'LT', 104, 'KEYCODE_BUTTON_L2', 312)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'LT', 104, 'KEYCODE_BUTTON_L2', 312)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'LT', 104, 'KEYCODE_BUTTON_L2', 312)}
                      className={`w-14 h-8 text-[10px] font-bold border backdrop-blur-sm transition-all select-none touch-none ${
                        pressedButtons['LT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                      }`}
                    >
                      LT
                    </button>
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'LB', 102, 'KEYCODE_BUTTON_L1', 310)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'LB', 102, 'KEYCODE_BUTTON_L1', 310)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'LB', 102, 'KEYCODE_BUTTON_L1', 310)}
                      className={`w-14 h-8 text-[10px] font-bold border backdrop-blur-sm transition-all select-none touch-none ${
                        pressedButtons['LB'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                      }`}
                    >
                      LB
                    </button>
                  </div>

                  {/* Botones Centrales: View, Logo Nexus Xbox, Menu */}
                  <div className="flex items-center gap-2">
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'VIEW', 109, 'KEYCODE_BUTTON_SELECT', 314)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'VIEW', 109, 'KEYCODE_BUTTON_SELECT', 314)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'VIEW', 109, 'KEYCODE_BUTTON_SELECT', 314)}
                      className="w-8 h-6 bg-black/60 border border-white/20 text-white/80 text-[9px] backdrop-blur-sm select-none touch-none"
                      title="View"
                    >
                      ⧉
                    </button>

                    {/* Botón Nexus Guía Xbox Central */}
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'XBOX_GUIDE', 110, 'KEYCODE_BUTTON_MODE', 316)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'XBOX_GUIDE', 110, 'KEYCODE_BUTTON_MODE', 316)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'XBOX_GUIDE', 110, 'KEYCODE_BUTTON_MODE', 316)}
                      className="w-7 h-7 rounded-full bg-[#107C41]/85 border border-white/40 flex items-center justify-center text-white font-black text-xs shadow-md select-none touch-none"
                      title="Xbox Guide"
                    >
                      ✕
                    </button>

                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'MENU', 108, 'KEYCODE_BUTTON_START', 315)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'MENU', 108, 'KEYCODE_BUTTON_START', 315)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'MENU', 108, 'KEYCODE_BUTTON_START', 315)}
                      className="w-8 h-6 bg-black/60 border border-white/20 text-white/80 text-[9px] backdrop-blur-sm select-none touch-none"
                      title="Menu"
                    >
                      ☰
                    </button>
                  </div>

                  {/* Bumper RB y Gatillo RT (Superior Derecho) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'RB', 103, 'KEYCODE_BUTTON_R1', 311)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'RB', 103, 'KEYCODE_BUTTON_R1', 311)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'RB', 103, 'KEYCODE_BUTTON_R1', 311)}
                      className={`w-14 h-8 text-[10px] font-bold border backdrop-blur-sm transition-all select-none touch-none ${
                        pressedButtons['RB'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                      }`}
                    >
                      RB
                    </button>
                    <button
                      onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'RT', 105, 'KEYCODE_BUTTON_R2', 313)}
                      onPointerUp={() => triggerKeyEvent('ACTION_UP', 'RT', 105, 'KEYCODE_BUTTON_R2', 313)}
                      onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'RT', 105, 'KEYCODE_BUTTON_R2', 313)}
                      className={`w-14 h-8 text-[10px] font-bold border backdrop-blur-sm transition-all select-none touch-none ${
                        pressedButtons['RT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white/90 border-white/20 hover:bg-black/80'
                      }`}
                    >
                      RT
                    </button>
                  </div>
                </div>

                {/* ZONA PRINCIPAL DE CONTROLES: DISTRIBUCIÓN ERGONÓMICA XBOX
                    FILA SUPERIOR SIMÉTRICA: LS a la izquierda y XYAB a la derecha (Exactamente a la misma altura superior)
                    FILA INFERIOR SIMÉTRICA: D-Pad a la izquierda y RS a la derecha (Exactamente a la misma altura inferior) */}
                <div className="flex items-end justify-between pointer-events-auto px-2 pb-2 w-full">
                  
                  {/* CLUSTER IZQUIERDO: LS Y D-PAD */}
                  <div 
                    style={{ gap: `${clusterGap}px` }}
                    className="flex flex-col items-center shrink-0"
                  >
                    {/* ELEMENTO SUPERIOR IZQUIERDO: JOYSTICK IZQUIERDO EN XBOX (O D-PAD EN PS) */}
                    {layoutMode !== 'symmetrical-bottom' ? (
                      /* JOYSTICK ANALÓGICO IZQUIERDO (LS) ARRIBA */
                      <div className="flex flex-col items-center">
                        <div
                          onPointerDown={handleLeftStickPointerDown}
                          onPointerMove={handleLeftStickPointerMove}
                          onPointerUp={handleLeftStickPointerUp}
                          onPointerCancel={handleLeftStickPointerUp}
                          style={{
                            width: `${baseStickSize}px`,
                            height: `${baseStickSize}px`,
                          }}
                          className="relative rounded-full bg-black/50 border-2 border-white/30 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-lg touch-none"
                        >
                          <div
                            style={{ 
                              transform: `translate(${leftStickPos.x}px, ${leftStickPos.y}px)`,
                              width: `${Math.round(baseStickSize * 0.48)}px`,
                              height: `${Math.round(baseStickSize * 0.48)}px`,
                            }}
                            className="rounded-full bg-zinc-800/90 border-2 border-white/50 shadow-md flex items-center justify-center pointer-events-none"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-black/80 border border-white/30"></div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-white/70 uppercase mt-0.5">Left Stick (LS)</span>
                      </div>
                    ) : (
                      /* CRUCETA D-PAD ARRIBA EN MODO SIMÉTRICO INFERIOR */
                      <div 
                        style={{
                          width: `${baseDpadSize}px`,
                          height: `${baseDpadSize}px`,
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_UP'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▲
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_DOWN'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▼
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_LEFT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ◀
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_RIGHT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▶
                        </button>
                        <div className="w-5 h-5 bg-black/80 border border-white/10"></div>
                      </div>
                    )}

                    {/* ELEMENTO INFERIOR IZQUIERDO: D-PAD EN XBOX (O JOYSTICK EN PS) */}
                    {layoutMode !== 'symmetrical-bottom' ? (
                      /* CRUCETA D-PAD DIRECCIONAL (ABAJO) */
                      <div 
                        style={{
                          width: `${baseDpadSize}px`,
                          height: `${baseDpadSize}px`,
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_UP'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▲
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_DOWN'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▼
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_LEFT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ◀
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                          style={{ width: `${baseDpadButtonSize}px`, height: `${baseDpadButtonSize}px` }}
                          className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-xs border backdrop-blur-sm select-none touch-none ${
                            pressedButtons['DPAD_RIGHT'] ? 'bg-[#107C41] text-white border-white scale-95' : 'bg-black/60 text-white border-white/20'
                          }`}
                        >
                          ▶
                        </button>
                        <div className="w-5 h-5 bg-black/80 border border-white/10"></div>
                      </div>
                    ) : (
                      /* JOYSTICK ANALÓGICO IZQUIERDO ABAJO EN MODO PS */
                      <div className="flex flex-col items-center">
                        <div
                          onPointerDown={handleLeftStickPointerDown}
                          onPointerMove={handleLeftStickPointerMove}
                          onPointerUp={handleLeftStickPointerUp}
                          onPointerCancel={handleLeftStickPointerUp}
                          style={{
                            width: `${baseStickSize}px`,
                            height: `${baseStickSize}px`,
                          }}
                          className="relative rounded-full bg-black/50 border-2 border-white/30 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-lg touch-none"
                        >
                          <div
                            style={{ 
                              transform: `translate(${leftStickPos.x}px, ${leftStickPos.y}px)`,
                              width: `${Math.round(baseStickSize * 0.48)}px`,
                              height: `${Math.round(baseStickSize * 0.48)}px`,
                            }}
                            className="rounded-full bg-zinc-800/90 border-2 border-white/50 shadow-md flex items-center justify-center pointer-events-none"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-black/80 border border-white/30"></div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-white/70 uppercase mt-0.5">Left Stick (LS)</span>
                      </div>
                    )}
                  </div>

                  {/* CLUSTER DERECHO: XYAB Y RS */}
                  <div 
                    style={{ gap: `${clusterGap}px` }}
                    className="flex flex-col items-center shrink-0"
                  >
                    {/* ELEMENTO SUPERIOR DERECHO: BOTONES XYAB EN XBOX (O JOYSTICK EN SIMÉTRICO SUPERIOR) */}
                    {layoutMode !== 'symmetrical-top' ? (
                      /* DIAMANTE DE BOTONES XYAB (ARRIBA EN XBOX OFICIAL) */
                      <div 
                        style={{
                          width: `${baseDiamondSize}px`,
                          height: `${baseDiamondSize}px`,
                        }}
                        className="relative flex items-center justify-center"
                      >
                        {/* Y: Amarillo (Arriba) */}
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute top-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['Y'] ? 'bg-amber-400 text-black border-white shadow-lg scale-95' : 'bg-black/60 text-amber-300 border-amber-400/40 hover:bg-black/80'
                          }`}
                        >
                          Y
                        </button>

                        {/* X: Azul (Izquierda) */}
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute left-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['X'] ? 'bg-blue-500 text-white border-white shadow-lg scale-95' : 'bg-black/60 text-blue-300 border-blue-400/40 hover:bg-black/80'
                          }`}
                        >
                          X
                        </button>

                        {/* B: Rojo (Derecha) */}
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute right-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['B'] ? 'bg-rose-500 text-white border-white shadow-lg scale-95' : 'bg-black/60 text-rose-300 border-rose-400/40 hover:bg-black/80'
                          }`}
                        >
                          B
                        </button>

                        {/* A: Verde (Abajo) */}
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute bottom-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['A'] ? 'bg-[#107C41] text-white border-white shadow-lg scale-95' : 'bg-black/60 text-emerald-300 border-emerald-400/40 hover:bg-black/80'
                          }`}
                        >
                          A
                        </button>
                      </div>
                    ) : (
                      /* JOYSTICK ANALÓGICO DERECHO ARRIBA EN MODO SIMÉTRICO SUPERIOR */
                      <div className="flex flex-col items-center">
                        <div
                          onPointerDown={handleRightStickPointerDown}
                          onPointerMove={handleRightStickPointerMove}
                          onPointerUp={handleRightStickPointerUp}
                          onPointerCancel={handleRightStickPointerUp}
                          style={{
                            width: `${baseStickSize}px`,
                            height: `${baseStickSize}px`,
                          }}
                          className="relative rounded-full bg-black/50 border-2 border-white/30 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-lg touch-none"
                        >
                          <div
                            style={{ 
                              transform: `translate(${rightStickPos.x}px, ${rightStickPos.y}px)`,
                              width: `${Math.round(baseStickSize * 0.48)}px`,
                              height: `${Math.round(baseStickSize * 0.48)}px`,
                            }}
                            className="rounded-full bg-zinc-800/90 border-2 border-white/50 shadow-md flex items-center justify-center pointer-events-none"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-black/80 border border-white/30"></div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-white/70 uppercase mt-0.5">Right Stick (RS)</span>
                      </div>
                    )}

                    {/* ELEMENTO INFERIOR DERECHO: JOYSTICK DERECHO EN XBOX (O XYAB EN SIMÉTRICO SUPERIOR) */}
                    {layoutMode !== 'symmetrical-top' ? (
                      /* JOYSTICK ANALÓGICO DERECHO (ABAJO EN XBOX OFICIAL) CON R3 CLICK */
                      <div className="flex flex-col items-center">
                        <div
                          onPointerDown={handleRightStickPointerDown}
                          onPointerMove={handleRightStickPointerMove}
                          onPointerUp={handleRightStickPointerUp}
                          onPointerCancel={handleRightStickPointerUp}
                          style={{
                            width: `${baseStickSize}px`,
                            height: `${baseStickSize}px`,
                          }}
                          className="relative rounded-full bg-black/50 border-2 border-white/30 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-lg touch-none"
                        >
                          <div
                            style={{ 
                              transform: `translate(${rightStickPos.x}px, ${rightStickPos.y}px)`,
                              width: `${Math.round(baseStickSize * 0.48)}px`,
                              height: `${Math.round(baseStickSize * 0.48)}px`,
                            }}
                            className="rounded-full bg-zinc-800/90 border-2 border-white/50 shadow-md flex items-center justify-center pointer-events-none"
                          >
                            <div className="w-3.5 h-3.5 rounded-full bg-black/80 border border-white/30"></div>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-white/70 uppercase mt-0.5">Right Stick (RS)</span>
                      </div>
                    ) : (
                      /* DIAMANTE DE BOTONES XYAB ABAJO EN MODO SIMÉTRICO SUPERIOR */
                      <div 
                        style={{
                          width: `${baseDiamondSize}px`,
                          height: `${baseDiamondSize}px`,
                        }}
                        className="relative flex items-center justify-center"
                      >
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute top-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['Y'] ? 'bg-amber-400 text-black border-white shadow-lg scale-95' : 'bg-black/60 text-amber-300 border-amber-400/40'
                          }`}
                        >
                          Y
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute left-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['X'] ? 'bg-blue-500 text-white border-white shadow-lg scale-95' : 'bg-black/60 text-blue-300 border-blue-400/40'
                          }`}
                        >
                          X
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute right-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['B'] ? 'bg-rose-500 text-white border-white shadow-lg scale-95' : 'bg-black/60 text-rose-300 border-rose-400/40'
                          }`}
                        >
                          B
                        </button>
                        <button
                          onPointerDown={() => triggerKeyEvent('ACTION_DOWN', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          onPointerUp={() => triggerKeyEvent('ACTION_UP', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          onPointerCancel={() => triggerKeyEvent('ACTION_UP', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                          style={{ width: `${baseActionButtonSize}px`, height: `${baseActionButtonSize}px` }}
                          className={`absolute bottom-0 rounded-full flex items-center justify-center font-black text-sm border backdrop-blur-sm transition-all select-none touch-none ${
                            pressedButtons['A'] ? 'bg-[#107C41] text-white border-white shadow-lg scale-95' : 'bg-black/60 text-emerald-300 border-emerald-400/40'
                          }`}
                        >
                          A
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Consola Monitor ADB Lateral */}
        <div className="xl:col-span-4 flex flex-col bg-[#14161a] border border-[#262a33]">
          <div className="p-3 bg-[#181a20] border-b border-[#262a33] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#107C41]" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#e4e7eb]">
                Monitor Multitouch ADB
              </h4>
            </div>
            <button onClick={onClearLogs} className="p-1 text-[#858d98] hover:text-white" title="Limpiar registros">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-[460px] font-mono text-xs space-y-2 bg-[#101216]">
            {logs.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-[#555c68] text-center text-xs">
                Mueve el joystick y pulsa A o B simultáneamente para verificar que no se cancelan (Multitouch).
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-2 bg-[#16181d] border border-[#262a33] text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#e4e7eb]">{log.buttonName}</span>
                    <span className="text-[10px] text-[#858d98]">{log.timestamp}</span>
                  </div>
                  <div className="mt-1 bg-black/60 p-1 text-[#34d399] text-[10px] truncate">
                    $ {log.adbCommand}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-[#16181d] border-t border-[#262a33] text-[10px] text-[#858d98] space-y-1">
            <div>
              <span className="text-[#34d399] font-bold">✔ Disposición Xbox:</span> Stick Izquierdo y XYAB arriba simétricos; D-Pad y Stick Derecho abajo simétricos.
            </div>
            <div>
              <span className="text-emerald-400 font-bold">✔ Anti-Colisión:</span> Escala libre (70%-135%) sin solapamiento de botones.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
