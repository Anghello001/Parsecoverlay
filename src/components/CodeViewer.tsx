import React, { useState } from 'react';
import { ANDROID_PROJECT_FILES } from '../data/projectFiles';
import { AndroidProjectFile } from '../types';
import { downloadAndroidProjectZip } from '../utils/zipExporter';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  FolderTree, 
  Code2
} from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(ANDROID_PROJECT_FILES[0]);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      await downloadAndroidProjectZip();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-[#14161a] border border-[#262a33] rounded-sm overflow-hidden shadow-xl">
      {/* Barra Superior */}
      <div className="bg-[#181a20] px-5 py-3.5 border-b border-[#262a33] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#e4e7eb] flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[#107C41]" />
            Estructura del Proyecto Android Nativo (Kotlin / XML)
          </h3>
          <p className="text-[11px] text-[#858d98] mt-0.5 font-mono">
            Mando Xbox Flotante • Joysticks Táctiles • Game Hub Launcher • ADB Local
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-none bg-[#22262f] hover:bg-[#2b303b] text-[#e4e7eb] border border-[#333946] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34d399]" />
                <span className="text-[#34d399]">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Archivo</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="px-3.5 py-1.5 rounded-none bg-[#107C41] hover:bg-[#128a49] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Generando ZIP...' : 'Descargar .ZIP'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Sidebar Archivos */}
        <div className="lg:col-span-4 bg-[#111317] border-r border-[#262a33] p-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-[#6d7582] uppercase tracking-wider px-3 py-2">
            Archivos del Módulo (:app)
          </div>

          {ANDROID_PROJECT_FILES.map((file) => {
            const isSelected = selectedFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2.5 rounded-none transition-all flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-[#1e222a] border-l-2 border-[#107C41] text-white'
                    : 'text-[#858d98] hover:bg-[#16181f] border-l-2 border-transparent'
                }`}
              >
                <div className="mt-0.5">
                  {file.category === 'manifest' && <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                  {file.category === 'kotlin' && <Code2 className="w-3.5 h-3.5 text-sky-400" />}
                  {file.category === 'layout' && <FileCode className="w-3.5 h-3.5 text-amber-400" />}
                  {file.category === 'gradle' && <FileCode className="w-3.5 h-3.5 text-purple-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate">
                      {file.name}
                    </span>
                    <span className="text-[8px] uppercase font-mono px-1 py-0.2 bg-[#1c1f26] text-[#858d98]">
                      {file.language}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6d7582] truncate font-mono mt-0.5">
                    {file.path}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Visor de Código */}
        <div className="lg:col-span-8 flex flex-col bg-[#0c0d10]">
          <div className="px-4 py-2 bg-[#14161a] border-b border-[#262a33] flex items-center justify-between text-xs">
            <span className="font-mono text-[#38bdf8] text-xs font-semibold">
              {selectedFile.path}
            </span>
            <span className="text-[10px] text-[#858d98] italic">
              {selectedFile.description}
            </span>
          </div>

          <div className="relative flex-1 overflow-x-auto p-4 font-mono text-xs text-[#c7ccd4] leading-relaxed max-h-[640px] overflow-y-auto">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
