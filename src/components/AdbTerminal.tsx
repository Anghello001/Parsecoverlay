import React, { useState } from 'react';
import { Terminal, CornerDownLeft, Play, RotateCcw } from 'lucide-react';
import { GamepadKeyEvent } from '../types';

interface AdbTerminalProps {
  onInjectEvent: (event: GamepadKeyEvent) => void;
}

export const AdbTerminal: React.FC<AdbTerminalProps> = ({ onInjectEvent }) => {
  const [command, setCommand] = useState('input keyevent 96');
  const [history, setHistory] = useState<string[]>([
    'adb connect localhost:5555 -> connected to localhost:5555',
    'sh persistent process spawned (UID 2000 shell)',
    'input keyevent 96 -> Xbox A [Dispatched]',
  ]);

  const runCommand = (cmdToRun?: string) => {
    const cmd = cmdToRun || command;
    if (!cmd.trim()) return;

    let output = '';
    const now = Date.now();
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (cmd.startsWith('input keyevent')) {
      const parts = cmd.trim().split(/\s+/);
      const code = parseInt(parts[2], 10);
      if (!isNaN(code)) {
        output = `[${timeStr}] $ ${cmd} -> Injected KeyEvent(${code}) to Parsec / Active Game`;
        onInjectEvent({
          id: `${now}-${Math.random()}`,
          timestamp: timeStr,
          action: 'ACTION_DOWN',
          buttonName: `Custom (${code})`,
          androidKeycode: `KEYCODE_${code}`,
          androidKeycodeInt: code,
          adbCommand: cmd,
          sendeventCommand: `sendevent /dev/input/event3 1 ${code} 1`,
        });
      } else {
        output = `[${timeStr}] $ ${cmd} -> Error: keycode no válido`;
      }
    } else {
      output = `[${timeStr}] $ ${cmd} -> OK (status 0)`;
    }

    setHistory((prev) => [...prev, output]);
    if (!cmdToRun) setCommand('');
  };

  const presets = [
    { label: 'Xbox A (96)', cmd: 'input keyevent 96' },
    { label: 'Xbox B (97)', cmd: 'input keyevent 97' },
    { label: 'Xbox X (99)', cmd: 'input keyevent 99' },
    { label: 'Xbox Y (100)', cmd: 'input keyevent 100' },
    { label: 'L3 Stick Click (106)', cmd: 'input keyevent 106' },
    { label: 'R3 Stick Click (107)', cmd: 'input keyevent 107' },
    { label: 'Xbox Guide (110)', cmd: 'input keyevent 110' },
  ];

  return (
    <div className="bg-[#14161a] border border-[#262a33] rounded-none shadow-xl flex flex-col">
      <div className="bg-[#181a20] px-4 py-3 border-b border-[#262a33] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#107C41]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e4e7eb]">
            Terminal de Inyección ADB Shell Local
          </h3>
        </div>
        <button
          onClick={() => setHistory([])}
          className="text-xs text-[#858d98] hover:text-[#e4e7eb] flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Limpiar
        </button>
      </div>

      <div className="p-2.5 bg-[#16181d] border-b border-[#262a33] flex flex-wrap gap-1.5 text-xs">
        <span className="text-[#858d98] text-[10px] self-center mr-1 uppercase font-bold">Comandos rápidos:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => runCommand(p.cmd)}
            className="px-2 py-1 rounded-none bg-[#20242d] hover:bg-[#282d38] text-[#c7ccd4] border border-[#2c313d] text-[10px] font-mono transition-all flex items-center gap-1"
          >
            <Play className="w-2 h-2 text-[#107C41]" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="p-4 bg-[#0e1014] font-mono text-xs text-[#34d399] h-60 overflow-y-auto space-y-1">
        <div className="text-[#555c68]">// Consola directa conectada a localhost adbd</div>
        {history.map((h, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {h}
          </div>
        ))}
      </div>

      <div className="p-2.5 bg-[#14161a] border-t border-[#262a33] flex items-center gap-2">
        <div className="text-[#6d7582] font-mono text-xs px-2">$</div>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runCommand()}
          placeholder="input keyevent 96, input keyevent 106..."
          className="flex-1 bg-[#0e1014] border border-[#262a33] rounded-none px-3 py-1.5 text-xs text-[#e4e7eb] font-mono focus:border-[#107C41] outline-none"
        />
        <button
          onClick={() => runCommand()}
          className="px-4 py-1.5 bg-[#107C41] hover:bg-[#128a49] text-white text-xs font-bold uppercase rounded-none flex items-center gap-1.5"
        >
          <span>Enviar</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
