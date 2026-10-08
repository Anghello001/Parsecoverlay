import React, { useState } from 'react';
import { GamepadKeyEvent } from './types';
import { Simulator } from './components/Simulator';
import { CodeViewer } from './components/CodeViewer';
import { WirelessGuide } from './components/WirelessGuide';
import { KeycodeReference } from './components/KeycodeReference';
import { AdbTerminal } from './components/AdbTerminal';
import { downloadAndroidProjectZip } from './utils/zipExporter';
import { 
  Gamepad2, 
  Code2, 
  Wifi, 
  Terminal, 
  BookOpen, 
  Download, 
  Layers, 
  CheckCircle,
  Plus
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide' | 'keycodes' | 'terminal'>('simulator');
  const [logs, setLogs] = useState<GamepadKeyEvent[]>([
    {
      id: 'init-1',
      timestamp: '19:40:02.100',
      action: 'ACTION_DOWN',
      buttonName: 'Xbox A (Sur)',
      androidKeycode: 'KeyEvent.KEYCODE_BUTTON_A',
      androidKeycodeInt: 96,
      adbCommand: 'input keyevent 96',
      sendeventCommand: 'sendevent /dev/input/event3 1 304 1',
    },
    {
      id: 'init-2',
      timestamp: '19:40:02.340',
      action: 'AXIS_MOVE',
      buttonName: 'Left Stick (LS)',
      androidKeycode: 'AXIS_X / AXIS_Y',
      androidKeycodeInt: 106,
      adbCommand: '# STICK LEFT: X=0.82, Y=-0.45',
      sendeventCommand: 'sendevent /dev/input/event3 3 0 26868',
      axisValue: { x: 0.82, y: -0.45 },
    },
  ]);

  const handleAddLog = (event: GamepadKeyEvent) => {
    setLogs((prev) => [event, ...prev.slice(0, 49)]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#0e1014] text-[#e4e7eb] flex flex-col font-sans selection:bg-[#107C41] selection:text-white">
      {/* Header Industrial Estilo Xbox / Dark Slate */}
      <header className="sticky top-0 z-50 bg-[#121419]/95 backdrop-blur-md border-b border-[#22262f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo y Branding */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#107C41] flex items-center justify-center text-white font-black text-sm rounded-none shadow-sm">
                ✕
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-sm sm:text-base tracking-wider uppercase text-[#f0f2f5]">
                    Xbox Gamepad Overlay
                  </h1>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-[#1a2e22] text-[#34d399] border border-[#107C41]/40 rounded-none uppercase">
                    Game Hub + Joysticks
                  </span>
                </div>
                <p className="text-[10px] text-[#858d98] hidden sm:block">
                  Mando flotante nativo de Xbox para Parsec y juegos Android con inyección ADB local
                </p>
              </div>
            </div>

            {/* Descarga del Proyecto Android */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadAndroidProjectZip()}
                className="px-3.5 py-1.5 rounded-none bg-[#107C41] hover:bg-[#128a49] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Descargar Proyecto (.zip)</span>
                <span className="sm:hidden">ZIP</span>
              </button>
            </div>
          </div>

          {/* Selector de Pestañas con Bordes Nítidos */}
          <div className="flex items-center space-x-1 border-t border-[#1e222a] overflow-x-auto py-1.5 no-scrollbar">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'simulator'
                  ? 'bg-[#1e222b] text-white border-b-2 border-[#107C41]'
                  : 'text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#16181f]'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-[#107C41]" />
              <span>Game Hub &amp; Mando Xbox</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'code'
                  ? 'bg-[#1e222b] text-white border-b-2 border-[#107C41]'
                  : 'text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#16181f]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Código Fuente Android</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'guide'
                  ? 'bg-[#1e222b] text-white border-b-2 border-[#107C41]'
                  : 'text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#16181f]'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Guía ADB Inalámbrico</span>
            </button>

            <button
              onClick={() => setActiveTab('keycodes')}
              className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'keycodes'
                  ? 'bg-[#1e222b] text-white border-b-2 border-[#107C41]'
                  : 'text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#16181f]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>Mapeo Xbox Keycodes</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                activeTab === 'terminal'
                  ? 'bg-[#1e222b] text-white border-b-2 border-[#107C41]'
                  : 'text-[#858d98] hover:text-[#e4e7eb] hover:bg-[#16181f]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#f87171]" />
              <span>Terminal ADB</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full">
        {activeTab === 'simulator' && (
          <Simulator
            onAddLog={handleAddLog}
            logs={logs}
            onClearLogs={handleClearLogs}
          />
        )}

        {activeTab === 'code' && <CodeViewer />}

        {activeTab === 'guide' && <WirelessGuide />}

        {activeTab === 'keycodes' && <KeycodeReference />}

        {activeTab === 'terminal' && <AdbTerminal onInjectEvent={handleAddLog} />}
      </main>

      {/* Footer */}
      <footer className="bg-[#101216] border-t border-[#1c1f26] py-4 text-center text-xs text-[#6d7582]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="uppercase tracking-wider font-mono text-[11px]">
            Xbox Asymmetric Gamepad Overlay • Android 11 to 15 (No Root Required)
          </span>
          <span className="text-[11px] text-[#858d98]">
            Inyección continua de eventos de mando de hardware (UID 2000 Shell)
          </span>
        </div>
      </footer>
    </div>
  );
}
