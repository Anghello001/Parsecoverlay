import React, { useState, useRef, useEffect } from 'react';
import { GamepadKeyEvent, GameApp } from '../types';
import { 
  Play, 
  RotateCcw, 
  GripHorizontal, 
  X, 
  Sliders, 
  Cpu, 
  Terminal, 
  Wifi, 
  BatteryMedium,
  CheckCircle2,
  Trash2,
  Copy,
  Layers,
  Plus,
  Tv,
  Gamepad,
  Sparkles,
  ArrowRight,
  Minimize2,
  ExternalLink
} from 'lucide-react';

interface SimulatorProps {
  onAddLog: (event: GamepadKeyEvent) => void;
  logs: GamepadKeyEvent[];
  onClearLogs: () => void;
}

const DEFAULT_GAMES: GameApp[] = [
  {
    id: 'parsec',
    name: 'Parsec',
    packageName: 'tv.parsec.client',
    category: 'Streaming',
    iconUrl: '🎮',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
    description: 'Baja latencia 60fps para streaming desde PC.',
  },
  {
    id: 'moonlight',
    name: 'Moonlight GameStream',
    packageName: 'com.limelight',
    category: 'Streaming',
    iconUrl: '🌙',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
    description: 'Cliente open-source para NVIDIA GeForce / Sunshine.',
  },
  {
    id: 'geforce-now',
    name: 'GeForce NOW',
    packageName: 'com.nvidia.geforcenow',
    category: 'Cloud Gaming',
    iconUrl: '⚡',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
    description: 'Juegos en la nube con trazado de rayos RTX.',
  },
  {
    id: 'steam-link',
    name: 'Steam Link',
    packageName: 'com.valvesoftware.steamlink',
    category: 'Streaming',
    iconUrl: '🕹️',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
    description: 'Transmite tu biblioteca de Steam en la red local.',
  },
  {
    id: 'retroarch',
    name: 'RetroArch',
    packageName: 'com.retroarch',
    category: 'Emulador',
    iconUrl: '👾',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: true,
    description: 'Emulador multi-sistema todo en uno.',
  },
  {
    id: 'minecraft',
    name: 'Minecraft Bedrock',
    packageName: 'com.mojang.minecraftpe',
    category: 'Juego Nativo',
    iconUrl: '⛏️',
    color: 'from-zinc-800 to-zinc-900',
    isFavorite: false,
    description: 'Soporte nativo para mando Xbox inalámbrico.',
  },
];

export const Simulator: React.FC<SimulatorProps> = ({ onAddLog, logs, onClearLogs }) => {
  // Game list state
  const [games, setGames] = useState<GameApp[]>(DEFAULT_GAMES);
  const [activeGame, setActiveGame] = useState<GameApp | null>(DEFAULT_GAMES[0]);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(true);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [opacity, setOpacity] = useState(85);
  const [overlayPos, setOverlayPos] = useState({ x: 0, y: 70 });
  const [pressedButtons, setPressedButtons] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal for adding games
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGameName, setNewGameName] = useState('');
  const [newGamePackage, setNewGamePackage] = useState('');
  const [newGameCategory, setNewGameCategory] = useState<'Streaming' | 'Emulador' | 'Juego Nativo' | 'Cloud Gaming' | 'Personalizado'>('Juego Nativo');

  // Joysticks State
  const [leftStickPos, setLeftStickPos] = useState({ x: 0, y: 0 });
  const [rightStickPos, setRightStickPos] = useState({ x: 0, y: 0 });
  const leftStickDragging = useRef(false);
  const rightStickDragging = useRef(false);

  // Dragging overlay ref
  const dragRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startDragPos = useRef({ x: 0, y: 0 });
  const startElemPos = useRef({ x: 0, y: 0 });

  // Dispatches button event
  const handleButtonEvent = (action: 'ACTION_DOWN' | 'ACTION_UP', name: string, code: number, constant: string, linuxCode: number) => {
    const isDown = action === 'ACTION_DOWN';
    setPressedButtons((prev) => ({ ...prev, [name]: isDown }));

    if (isDown && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(20);
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

  // Drag listeners for the whole overlay
  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startDragPos.current = { x: clientX, y: clientY };
    startElemPos.current = { ...overlayPos };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - startDragPos.current.x;
      const dy = clientY - startDragPos.current.y;
      setOverlayPos({
        x: Math.max(-140, Math.min(140, startElemPos.current.x + dx)),
        y: Math.max(-80, Math.min(140, startElemPos.current.y + dy)),
      });
    };

    const onUp = () => {
      isDragging.current = false;
      if (leftStickDragging.current) {
        leftStickDragging.current = false;
        setLeftStickPos({ x: 0, y: 0 });
      }
      if (rightStickDragging.current) {
        rightStickDragging.current = false;
        setRightStickPos({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const handleStickMove = (isLeft: boolean, e: React.MouseEvent | React.TouchEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2 - 12;
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

    // Log direction if meaningful
    const normX = Math.round((x / maxRadius) * 100) / 100;
    const normY = Math.round((y / maxRadius) * 100) / 100;
    if (Math.abs(normX) > 0.6 || Math.abs(normY) > 0.6) {
      const now = Date.now();
      onAddLog({
        id: `${now}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: 'AXIS_MOVE',
        buttonName: isLeft ? 'Left Stick (LS)' : 'Right Stick (RS)',
        androidKeycode: isLeft ? 'AXIS_X / AXIS_Y' : 'AXIS_Z / AXIS_RZ',
        androidKeycodeInt: isLeft ? 106 : 107,
        adbCommand: `# STICK ${isLeft ? 'LEFT' : 'RIGHT'}: X=${normX}, Y=${normY}`,
        sendeventCommand: `sendevent /dev/input/event3 3 ${isLeft ? 0 : 2} ${Math.round(normX * 32767)}`,
        axisValue: { x: normX, y: normY },
      });
    }
  };

  const handleLaunchGame = (game: GameApp) => {
    setActiveGame(game);
    setIsGameRunning(true);
    setIsOverlayVisible(true);
    // Notification log
    const now = Date.now();
    onAddLog({
      id: `${now}-launch`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: 'ACTION_DOWN',
      buttonName: `Lanzar ${game.name}`,
      androidKeycode: 'START_OVERLAY_SERVICE',
      androidKeycodeInt: 0,
      adbCommand: `am start -n ${game.packageName}/.MainActivity && am startservice com.parsec.overlaygamepad/.OverlayService`,
      sendeventCommand: `# Intent for ${game.packageName} dispatched with TYPE_APPLICATION_OVERLAY`,
    });
  };

  const handleAddNewGame = () => {
    if (!newGameName.trim()) return;
    const newGame: GameApp = {
      id: `custom-${Date.now()}`,
      name: newGameName.trim(),
      packageName: newGamePackage.trim() || `com.game.${newGameName.toLowerCase().replace(/\s+/g, '')}`,
      category: newGameCategory,
      iconUrl: '🎮',
      color: 'from-zinc-800 to-zinc-900',
      isFavorite: true,
      isCustom: true,
      description: 'Juego agregado manualmente por el usuario.',
    };
    setGames([newGame, ...games]);
    setNewGameName('');
    setNewGamePackage('');
    setShowAddModal(false);
  };

  const copyLogText = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: HUB DE JUEGOS Y APPS (AGREGAR / LANZAR CON OVERLAY) */}
      <div className="bg-[#14161a] border border-[#262a33] rounded-sm p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#22262f]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#107C41] rounded-none"></span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#e4e7eb]">
                Catálogo de Juegos y Aplicaciones (Game Hub)
              </h2>
            </div>
            <p className="text-xs text-[#858d98] mt-0.5">
              Selecciona cualquier juego o añade nuevos: al abrirse, el mando flotante Xbox se activará automáticamente.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-sm bg-[#22262f] hover:bg-[#2d323e] border border-[#343a46] text-[#e4e7eb] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#107C41]" />
            <span>Agregar Juego / App</span>
          </button>
        </div>

        {/* Tarjetas de Juegos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {games.map((g) => {
            const isSelected = activeGame?.id === g.id && isGameRunning;
            return (
              <div
                key={g.id}
                className={`group relative p-3 rounded-sm border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1b1f26] border-[#107C41] shadow-md shadow-[#107C41]/10 ring-1 ring-[#107C41]'
                    : 'bg-[#181a20] border-[#262a33] hover:border-[#383e4c]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{g.iconUrl}</span>
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-[#22262f] text-[#858d98] font-mono rounded-none">
                      {g.category}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-[#e4e7eb] mt-2 truncate">
                    {g.name}
                  </h4>
                  <p className="text-[10px] text-[#6d7582] truncate font-mono mt-0.5">
                    {g.packageName}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-[#22262f]">
                  <button
                    onClick={() => handleLaunchGame(g)}
                    className={`w-full py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-none flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-[#107C41] text-white shadow-sm'
                        : 'bg-[#22262f] hover:bg-[#2b303b] text-[#c7ccd4]'
                    }`}
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{isSelected ? 'Activo' : 'Jugar'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: AGREGAR JUEGO / APP PERSONALIZADA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#16181d] border border-[#2d323e] rounded-sm max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#262a33]">
              <h3 className="text-sm font-bold uppercase text-[#e4e7eb] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#107C41]" />
                Agregar Nuevo Juego o Aplicación
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#858d98] hover:text-[#e4e7eb]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 my-4 text-xs">
              <div>
                <label className="block text-[#858d98] font-semibold mb-1 uppercase tracking-wide text-[10px]">
                  Nombre del Juego / App
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cyberpunk 2077 Stream, PPSSPP Gold, Minecraft..."
                  value={newGameName}
                  onChange={(e) => setNewGameName(e.target.value)}
                  className="w-full bg-[#1e222a] border border-[#2e3440] p-2 text-xs text-[#e4e7eb] focus:border-[#107C41] outline-none rounded-none"
                />
              </div>

              <div>
                <label className="block text-[#858d98] font-semibold mb-1 uppercase tracking-wide text-[10px]">
                  Package Name de Android (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. com.developer.gameapp (si se omite se autogenera)"
                  value={newGamePackage}
                  onChange={(e) => setNewGamePackage(e.target.value)}
                  className="w-full bg-[#1e222a] border border-[#2e3440] p-2 text-xs font-mono text-[#e4e7eb] focus:border-[#107C41] outline-none rounded-none"
                />
              </div>

              <div>
                <label className="block text-[#858d98] font-semibold mb-1 uppercase tracking-wide text-[10px]">
                  Categoría
                </label>
                <select
                  value={newGameCategory}
                  onChange={(e) => setNewGameCategory(e.target.value as any)}
                  className="w-full bg-[#1e222a] border border-[#2e3440] p-2 text-xs text-[#e4e7eb] focus:border-[#107C41] outline-none rounded-none"
                >
                  <option value="Juego Nativo">Juego Nativo</option>
                  <option value="Streaming">Streaming (Parsec, Moonlight, Sunshine)</option>
                  <option value="Emulador">Emulador (RetroArch, PPSSPP, AetherSX2)</option>
                  <option value="Cloud Gaming">Cloud Gaming (GeForce NOW, Xbox Cloud)</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#262a33]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs text-[#858d98] hover:text-[#e4e7eb]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddNewGame}
                disabled={!newGameName.trim()}
                className="px-4 py-1.5 bg-[#107C41] hover:bg-[#128a49] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wide rounded-none"
              >
                Guardar y Añadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 2: SIMULADOR DE MANDO XBOX FLOTANTE SOBRE EL JUEGO */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Columna Izquierda: Teléfono y Overlay Xbox */}
        <div className="xl:col-span-7 flex flex-col items-center">
          {/* Barra de Controles Superiores */}
          <div className="w-full max-w-[620px] bg-[#14161a] border border-[#262a33] p-3 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs rounded-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#107C41] rounded-none animate-pulse"></span>
              <span className="font-bold text-[#e4e7eb] uppercase text-[11px] tracking-wide">
                {activeGame?.name || 'Parsec'} en ejecución
              </span>
              <span className="px-1.5 py-0.2 bg-[#1e222a] text-[#858d98] font-mono text-[10px] border border-[#282d37]">
                60 FPS • 4ms ADB
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#858d98]" />
                <span className="text-[#858d98] text-[11px]">Opacidad:</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-20 accent-[#107C41] cursor-pointer"
                />
                <span className="text-[#c7ccd4] font-mono text-[11px]">{opacity}%</span>
              </div>

              <button
                onClick={() => setIsOverlayVisible(!isOverlayVisible)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border rounded-none transition-colors ${
                  isOverlayVisible
                    ? 'bg-[#1e222a] text-[#e4e7eb] border-[#383e4c]'
                    : 'bg-[#107C41] text-white border-[#107C41]'
                }`}
              >
                {isOverlayVisible ? 'Ocultar' : 'Mostrar'}
              </button>

              <button
                onClick={() => setOverlayPos({ x: 0, y: 70 })}
                title="Centrar Mando"
                className="p-1 text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#1e222a]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Teléfono Android en Modo Horizontal con Estética Gris Industrial */}
          <div className="relative w-full max-w-[620px] aspect-[16/9] bg-[#0c0d10] p-2.5 border-2 border-[#262a33] shadow-2xl select-none overflow-hidden rounded-sm">
            {/* Pantalla del Teléfono */}
            <div className="relative w-full h-full bg-[#121418] overflow-hidden flex flex-col rounded-none">
              {/* Barra de Estado Android */}
              <div className="absolute top-0 left-0 right-0 h-5 bg-black/80 z-20 flex items-center justify-between px-3 text-[9px] text-[#858d98] font-mono pointer-events-none border-b border-[#1c1f26]">
                <div className="flex items-center gap-2">
                  <span>19:45</span>
                  <span className="text-[#107C41] font-bold">ADB 127.0.0.1:5555</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>98%</span>
                  <BatteryMedium className="w-3 h-3 text-[#107C41]" />
                </div>
              </div>

              {/* Vista del Juego Activo en Transmisión */}
              <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121419] via-[#161a22] to-[#101216]">
                <div className="text-center p-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1a1e27] border border-[#2b303c] text-xs text-[#c7ccd4] font-mono mb-2">
                    <span className="w-2 h-2 bg-[#107C41] rounded-none"></span>
                    <span>STREAMING: {activeGame?.name.toUpperCase()}</span>
                  </div>
                  <h3 className="text-lg font-black tracking-widest text-[#e4e7eb] uppercase">
                    XBOX REMOTE CLOUD SESSION
                  </h3>
                  <p className="text-[11px] text-[#6d7582] mt-1 max-w-sm">
                    Los controles flotantes envían códigos de hardware de gamepad nativos de Xbox directamente por ADB local.
                  </p>
                </div>

                {/* OVERLAY FLOTANTE ESTILO XBOX (Asimétrico con Joysticks, ABXY, Bumpers y Gatillos) */}
                {isOverlayVisible && (
                  <div
                    ref={dragRef}
                    style={{
                      transform: `translate(${overlayPos.x}px, ${overlayPos.y}px)`,
                      opacity: opacity / 100,
                    }}
                    className="absolute z-30 bg-[#16181df2] border border-[#2d323e] p-2.5 shadow-2xl w-[460px] max-w-[95%] rounded-sm backdrop-blur-md"
                  >
                    {/* Barra de Arrastre Superior y Logo Xbox */}
                    <div
                      onMouseDown={onDragStart}
                      onTouchStart={onDragStart}
                      className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#252933] cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-1.5 text-[#858d98]">
                        <GripHorizontal className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#c7ccd4]">
                          Xbox Controller Overlay
                        </span>
                        <span className="text-[8px] bg-[#22262f] text-[#858d98] px-1 py-0.2 uppercase font-mono">
                          Mover
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setIsOverlayVisible(false)}
                          className="p-0.5 text-[#858d98] hover:text-rose-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Fila de Gatillos y Bumpers: LT, LB | Guía | RB, RT */}
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="flex items-center gap-1">
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'LT', 104, 'KEYCODE_BUTTON_L2', 312)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'LT', 104, 'KEYCODE_BUTTON_L2', 312)}
                          className={`px-2.5 py-1 text-[10px] font-bold border transition-all rounded-none ${
                            pressedButtons['LT'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#1f232b] text-[#858d98] border-[#2c313c]'
                          }`}
                        >
                          LT
                        </button>
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'LB', 102, 'KEYCODE_BUTTON_L1', 310)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'LB', 102, 'KEYCODE_BUTTON_L1', 310)}
                          className={`px-3 py-1 text-[10px] font-bold border transition-all rounded-none ${
                            pressedButtons['LB'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#252933] text-[#c7ccd4] border-[#343a46]'
                          }`}
                        >
                          LB
                        </button>
                      </div>

                      {/* Botones Centrales: View, Guía Xbox Nexus, Menu */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'VIEW', 109, 'KEYCODE_BUTTON_SELECT', 314)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'VIEW', 109, 'KEYCODE_BUTTON_SELECT', 314)}
                          className="px-2 py-0.5 text-[9px] bg-[#1e222a] border border-[#2b303b] text-[#858d98] hover:text-white rounded-none"
                          title="View / Back"
                        >
                          ⧉
                        </button>

                        {/* Botón Nexus / Guía Xbox con Iluminación Verde */}
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'XBOX_GUIDE', 110, 'KEYCODE_BUTTON_MODE', 316)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'XBOX_GUIDE', 110, 'KEYCODE_BUTTON_MODE', 316)}
                          className="w-7 h-7 rounded-full bg-[#107C41] border border-[#169a52] flex items-center justify-center text-white font-black text-[11px] shadow-sm shadow-[#107C41]/50 active:scale-95 transition-all"
                          title="Xbox Guide"
                        >
                          ✕
                        </button>

                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'MENU', 108, 'KEYCODE_BUTTON_START', 315)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'MENU', 108, 'KEYCODE_BUTTON_START', 315)}
                          className="px-2 py-0.5 text-[9px] bg-[#1e222a] border border-[#2b303b] text-[#858d98] hover:text-white rounded-none"
                          title="Menu / Start"
                        >
                          ☰
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'RB', 103, 'KEYCODE_BUTTON_R1', 311)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'RB', 103, 'KEYCODE_BUTTON_R1', 311)}
                          className={`px-3 py-1 text-[10px] font-bold border transition-all rounded-none ${
                            pressedButtons['RB'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#252933] text-[#c7ccd4] border-[#343a46]'
                          }`}
                        >
                          RB
                        </button>
                        <button
                          onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'RT', 105, 'KEYCODE_BUTTON_R2', 313)}
                          onMouseUp={() => handleButtonEvent('ACTION_UP', 'RT', 105, 'KEYCODE_BUTTON_R2', 313)}
                          className={`px-2.5 py-1 text-[10px] font-bold border transition-all rounded-none ${
                            pressedButtons['RT'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#1f232b] text-[#858d98] border-[#2c313c]'
                          }`}
                        >
                          RT
                        </button>
                      </div>
                    </div>

                    {/* CUERPO ASIMÉTRICO ESTILO XBOX */}
                    <div className="grid grid-cols-2 gap-4 px-2">
                      {/* LADO IZQUIERDO: JOYSTICK IZQUIERDO (ARRIBA) + D-PAD (ABAJO) */}
                      <div className="flex flex-col items-center space-y-2">
                        {/* JOYSTICK IZQUIERDO (LS / L3) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-mono text-[#6d7582] uppercase mb-0.5">Left Stick (LS)</span>
                          <div
                            onMouseDown={(e) => {
                              leftStickDragging.current = true;
                              handleStickMove(true, e);
                            }}
                            onMouseMove={(e) => leftStickDragging.current && handleStickMove(true, e)}
                            onTouchStart={(e) => {
                              leftStickDragging.current = true;
                              handleStickMove(true, e);
                            }}
                            onTouchMove={(e) => leftStickDragging.current && handleStickMove(true, e)}
                            className="relative w-20 h-20 rounded-full bg-[#181a20] border-2 border-[#2b303c] flex items-center justify-center cursor-pointer shadow-inner"
                          >
                            {/* Thumbstick Stick */}
                            <div
                              style={{
                                transform: `translate(${leftStickPos.x}px, ${leftStickPos.y}px)`,
                              }}
                              className="w-10 h-10 rounded-full bg-[#272b34] border-2 border-[#454c5a] shadow-md flex items-center justify-center transition-transform duration-75 active:border-[#107C41]"
                              onClick={() => handleButtonEvent('ACTION_DOWN', 'L3_CLICK', 106, 'KEYCODE_BUTTON_THUMBL', 317)}
                            >
                              <div className="w-3.5 h-3.5 rounded-full bg-[#1b1e25] border border-[#363c49]"></div>
                            </div>
                          </div>
                        </div>

                        {/* CRUCETA D-PAD ASIMÉTRICA XBOX (ABAJO) */}
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'DPAD_UP', 19, 'KEYCODE_DPAD_UP', 544)}
                            className={`absolute top-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] rounded-none border ${
                              pressedButtons['DPAD_UP'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#20242d] text-[#858d98] border-[#2b313d]'
                            }`}
                          >
                            ▲
                          </button>
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'DPAD_DOWN', 20, 'KEYCODE_DPAD_DOWN', 545)}
                            className={`absolute bottom-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] rounded-none border ${
                              pressedButtons['DPAD_DOWN'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#20242d] text-[#858d98] border-[#2b313d]'
                            }`}
                          >
                            ▼
                          </button>
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'DPAD_LEFT', 21, 'KEYCODE_DPAD_LEFT', 546)}
                            className={`absolute left-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] rounded-none border ${
                              pressedButtons['DPAD_LEFT'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#20242d] text-[#858d98] border-[#2b313d]'
                            }`}
                          >
                            ◀
                          </button>
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'DPAD_RIGHT', 22, 'KEYCODE_DPAD_RIGHT', 547)}
                            className={`absolute right-0 w-6 h-6 flex items-center justify-center font-mono text-[10px] rounded-none border ${
                              pressedButtons['DPAD_RIGHT'] ? 'bg-[#107C41] text-white border-[#107C41]' : 'bg-[#20242d] text-[#858d98] border-[#2b313d]'
                            }`}
                          >
                            ▶
                          </button>
                          <div className="w-5 h-5 bg-[#171920] border border-[#2b313d]"></div>
                        </div>
                      </div>

                      {/* LADO DERECHO: BOTONES XYAB (ARRIBA) + JOYSTICK DERECHO (ABAJO) */}
                      <div className="flex flex-col items-center space-y-2">
                        {/* BOTONES XBOX XYAB (ARRIBA) */}
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          {/* Y: Amarillo (Arriba) */}
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'Y', 100, 'KEYCODE_BUTTON_Y', 308)}
                            className={`absolute top-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all active:scale-95 ${
                              pressedButtons['Y'] ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-400/40' : 'bg-[#22262f] text-amber-400 border-[#323846]'
                            }`}
                          >
                            Y
                          </button>

                          {/* X: Azul (Izquierda) */}
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'X', 99, 'KEYCODE_BUTTON_X', 307)}
                            className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all active:scale-95 ${
                              pressedButtons['X'] ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/40' : 'bg-[#22262f] text-blue-400 border-[#323846]'
                            }`}
                          >
                            X
                          </button>

                          {/* B: Rojo (Derecha) */}
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'B', 97, 'KEYCODE_BUTTON_B', 305)}
                            className={`absolute right-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all active:scale-95 ${
                              pressedButtons['B'] ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/40' : 'bg-[#22262f] text-rose-400 border-[#323846]'
                            }`}
                          >
                            B
                          </button>

                          {/* A: Verde (Abajo) */}
                          <button
                            onMouseDown={() => handleButtonEvent('ACTION_DOWN', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                            onMouseUp={() => handleButtonEvent('ACTION_UP', 'A', 96, 'KEYCODE_BUTTON_A', 304)}
                            className={`absolute bottom-0 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs border transition-all active:scale-95 ${
                              pressedButtons['A'] ? 'bg-[#107C41] text-white border-[#169a52] shadow-md shadow-[#107C41]/50' : 'bg-[#22262f] text-emerald-400 border-[#323846]'
                            }`}
                          >
                            A
                          </button>
                        </div>

                        {/* JOYSTICK DERECHO (RS / R3) */}
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-mono text-[#6d7582] uppercase mb-0.5">Right Stick (RS)</span>
                          <div
                            onMouseDown={(e) => {
                              rightStickDragging.current = true;
                              handleStickMove(false, e);
                            }}
                            onMouseMove={(e) => rightStickDragging.current && handleStickMove(false, e)}
                            onTouchStart={(e) => {
                              rightStickDragging.current = true;
                              handleStickMove(false, e);
                            }}
                            onTouchMove={(e) => rightStickDragging.current && handleStickMove(false, e)}
                            className="relative w-20 h-20 rounded-full bg-[#181a20] border-2 border-[#2b303c] flex items-center justify-center cursor-pointer shadow-inner"
                          >
                            {/* Thumbstick Stick */}
                            <div
                              style={{
                                transform: `translate(${rightStickPos.x}px, ${rightStickPos.y}px)`,
                              }}
                              className="w-10 h-10 rounded-full bg-[#272b34] border-2 border-[#454c5a] shadow-md flex items-center justify-center transition-transform duration-75 active:border-[#107C41]"
                              onClick={() => handleButtonEvent('ACTION_DOWN', 'R3_CLICK', 107, 'KEYCODE_BUTTON_THUMBR', 318)}
                            >
                              <div className="w-3.5 h-3.5 rounded-full bg-[#1b1e25] border border-[#363c49]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Consola ADB con Estética Gris Oscuro */}
        <div className="xl:col-span-5 flex flex-col bg-[#14161a] border border-[#262a33] rounded-sm overflow-hidden shadow-lg">
          <div className="p-3 bg-[#181a20] border-b border-[#262a33] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#107C41]" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#e4e7eb]">
                Monitor ADB Localhost (UID 2000)
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#858d98] font-mono">
                {logs.length} eventos
              </span>
              <button
                onClick={onClearLogs}
                title="Limpiar"
                className="p-1 text-[#858d98] hover:text-[#e4e7eb]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-[460px] font-mono text-xs space-y-2 bg-[#101216]">
            {logs.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-[#555c68] text-center px-4">
                <Cpu className="w-7 h-7 mb-2 stroke-1" />
                <p className="text-xs">Esperando pulsaciones en el mando Xbox...</p>
                <p className="text-[10px] text-[#474d57] mt-1">
                  Mueve los joysticks analógicos o pulsa A, B, X, Y para ver la inyección de comandos.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-none bg-[#16181d] border border-[#262a33] text-[11px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 text-[9px] font-bold rounded-none ${
                          log.action === 'ACTION_DOWN'
                            ? 'bg-[#107C41]/30 text-[#34d399] border border-[#107C41]'
                            : log.action === 'AXIS_MOVE'
                            ? 'bg-sky-950/60 text-sky-400 border border-sky-800'
                            : 'bg-[#252a35] text-[#858d98]'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-bold text-[#e4e7eb]">
                        {log.buttonName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#6d7582]">
                        {log.timestamp}
                      </span>
                      <button
                        onClick={() => copyLogText(log.adbCommand, log.id)}
                        className="text-[#6d7582] hover:text-[#e4e7eb]"
                      >
                        {copiedId === log.id ? (
                          <CheckCircle2 className="w-3 h-3 text-[#107C41]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 bg-black/50 p-1.5 text-[#34d399] text-[10px] truncate">
                    $ {log.adbCommand}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-[#16181d] border-t border-[#262a33] text-[10px] text-[#858d98]">
            <span className="text-[#34d399] font-bold">✔ Xbox Mapping:</span> Joysticks y botones coinciden con el driver XInput de PC.
          </div>
        </div>
      </div>
    </div>
  );
};
