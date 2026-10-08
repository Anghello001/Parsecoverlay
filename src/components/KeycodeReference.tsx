import React, { useState } from 'react';
import { GAMEPAD_KEYCODES } from '../data/keycodesData';
import { Search, Gamepad2, Info, CheckCircle2, Copy } from 'lucide-react';

export const KeycodeReference: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filtered = GAMEPAD_KEYCODES.filter(
    (k) =>
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.constant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.codeInt.toString().includes(searchTerm) ||
      k.parsecMapping.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.xboxEquivalent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="bg-[#14161a] border border-[#262a33] rounded-none shadow-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e4e7eb] flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-[#107C41]" />
            Mapeo Oficial de Keycodes Xbox en Android (KeyEvent)
          </h3>
          <p className="text-[11px] text-[#858d98] mt-0.5">
            Equivalencia entre botones físicos de Xbox, constantes de Android y comandos ADB
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#6d7582] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar botón, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-none bg-[#101216] border border-[#262a33] text-xs text-[#e4e7eb] placeholder-[#6d7582] focus:border-[#107C41] outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-[#262a33]">
        <table className="w-full text-left text-xs text-[#c7ccd4]">
          <thead className="bg-[#101216] text-[#858d98] uppercase text-[10px] tracking-wider border-b border-[#262a33] font-mono">
            <tr>
              <th className="py-2.5 px-3">Botón Xbox</th>
              <th className="py-2.5 px-3">Código</th>
              <th className="py-2.5 px-3">Constante Android</th>
              <th className="py-2.5 px-3">Comando ADB Shell</th>
              <th className="py-2.5 px-3">Mapeo Parsec / PC</th>
              <th className="py-2.5 px-3">Función</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22262f] font-sans">
            {filtered.map((item) => (
              <tr key={item.codeInt} className="hover:bg-[#181a20] transition-colors">
                <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#107C41]"></span>
                  {item.xboxEquivalent}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                  {item.codeInt}
                </td>
                <td className="py-2.5 px-3 font-mono text-[#858d98] text-[11px]">
                  {item.constant}
                </td>
                <td className="py-2.5 px-3 font-mono text-[#34d399] bg-black/30">
                  <button
                    onClick={() => copyCode(`input keyevent ${item.codeInt}`, `adb-${item.codeInt}`)}
                    className="hover:underline inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>input keyevent {item.codeInt}</span>
                    {copiedKey === `adb-${item.codeInt}` ? (
                      <CheckCircle2 className="w-3 h-3 text-[#107C41]" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#6d7582]" />
                    )}
                  </button>
                </td>
                <td className="py-2.5 px-3 font-medium text-[#38bdf8]">
                  {item.parsecMapping}
                </td>
                <td className="py-2.5 px-3 text-[#858d98] text-[11px]">
                  {item.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#101216] border border-[#262a33] text-xs text-[#858d98] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Los joysticks analógicos utilizan eventos combinados de eje <code className="text-[#e4e7eb]">AXIS_X / AXIS_Y</code> para el stick izquierdo 
          y <code className="text-[#e4e7eb]">AXIS_Z / AXIS_RZ</code> para el stick derecho. Parsec traduce estos eventos al controlador virtual XInput en el host.
        </p>
      </div>
    </div>
  );
};
