import React, { useState } from 'react';
import { 
  Wifi, 
  ShieldCheck, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight
} from 'lucide-react';

export const WirelessGuide: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  const steps = [
    {
      num: 1,
      title: 'Habilitar Opciones de Desarrollador',
      subtitle: 'Ajustes del teléfono Android',
      details: [
        'Abre Ajustes en tu dispositivo Android.',
        'Entra a "Información del teléfono" (o Acerca del dispositivo).',
        'Toca 7 veces seguidas el "Número de compilación" hasta ver el mensaje de confirmación.',
      ],
      tip: 'En teléfonos Xiaomi/Redmi/POCO, activa también "Depuración USB (Ajustes de seguridad)" para autorizar la entrada de eventos simulados.',
    },
    {
      num: 2,
      title: 'Activar Depuración Inalámbrica',
      subtitle: 'Protocolo adbd sobre TCP (Android 11 - 15)',
      details: [
        'Entra a Ajustes > Sistema > Opciones para desarrolladores.',
        'Activa el interruptor "Depuración inalámbrica" (Wireless Debugging).',
        'Marca la casilla "Permitir siempre en esta red" al confirmar.',
      ],
      tip: 'Debes estar conectado a Wi-Fi (o activar tu Zona Wi-Fi / Hotspot local si juegas con datos móviles fuera de casa).',
    },
    {
      num: 3,
      title: 'Emparejar con Código de 6 dígitos',
      subtitle: 'Comprender el Puerto de Pairing vs Conexión',
      details: [
        'Toca en "Vincular con código de vinculación".',
        'Aparecerán el código de 6 dígitos y una IP con puerto (ej: 192.168.1.45:37281).',
        'En nuestra app, escribe el puerto (los últimos 5 dígitos) y el código de 6 dígitos en la sección "Emparejar ADB".',
        'Presiona "Emparejar ADB". Este paso solo se realiza una sola vez.',
      ],
      tip: 'Este diálogo solo sirve para autorizar la clave criptográfica RSA de la aplicación. Una vez emparejado, se cierra.',
    },
    {
      num: 4,
      title: 'Conectar ADB Local a localhost',
      subtitle: 'Sesión activa de control',
      details: [
        'Vuelve a la pantalla principal de "Depuración inalámbrica".',
        'Revisa el puerto que aparece en "Dirección IP y puerto" de la lista (ej: 42195).',
        'Escribe ese puerto en el campo "Conectar ADB Localhost" de nuestra app.',
        'Pulsa "Conectar ADB Local". Verás el estado verde de conexión confirmada.',
      ],
      tip: 'La conexión se realiza a 127.0.0.1 (localhost). Ningún dato sale de tu dispositivo.',
    },
    {
      num: 5,
      title: 'Lanzar Juego y Mando Flotante Xbox',
      subtitle: 'Integración automática',
      details: [
        'En el Game Hub de la app, pulsa "JUGAR" en Parsec, Moonlight o tu juego favorito.',
        'La app abrirá el juego y superpondrá automáticamente el mando Xbox con sus joysticks analógicos.',
        'Los botones A, B, X, Y, los gatillos y los joysticks funcionarán de forma fluida y sin retraso.',
      ],
      tip: 'Puedes arrastrar el mando con el asa superior o cambiar la opacidad para ver el juego con total claridad.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Banner de Arquitectura */}
      <div className="bg-[#14161a] border border-[#262a33] rounded-sm p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#1a2e22] text-[#34d399] border border-[#107C41]/40 text-[10px] font-bold uppercase tracking-wider mb-2 rounded-none">
              <ShieldCheck className="w-3.5 h-3.5" />
              Arquitectura de Inyección Directa
            </div>
            <h2 className="text-base font-bold text-[#e4e7eb] uppercase tracking-wide mb-1">
              ¿Por qué ADB local es la única forma de controlar Parsec sin root?
            </h2>
            <p className="text-xs text-[#858d98] leading-relaxed">
              El sandbox de Android no permite que una app inyecte toques en la ventana de Parsec. 
              Sin embargo, al conectar ADB a <code className="text-[#38bdf8] font-mono">localhost</code>, la app adquiere privilegios de 
              <strong>Shell (UID 2000)</strong>, inyectando eventos nativos de mando físico que Parsec reconoce de inmediato como un controlador de Xbox.
            </p>
          </div>

          <div className="bg-[#101216] border border-[#22262f] p-3 text-[11px] font-mono text-[#858d98] space-y-1 rounded-none min-w-[220px]">
            <div className="text-[#107C41] font-bold">// Cadena de Entrada</div>
            <div>Mando Touch Overlay</div>
            <div className="flex items-center gap-1 text-[#e4e7eb]">
              <ChevronRight className="w-3 h-3 text-[#107C41]" />
              <span>Shell Local (UID 2000)</span>
            </div>
            <div className="flex items-center gap-1 text-[#34d399] font-bold">
              <ChevronRight className="w-3 h-3 text-[#34d399]" />
              <span>Parsec Client Android</span>
            </div>
            <div className="flex items-center gap-1 text-[#38bdf8] font-bold">
              <ChevronRight className="w-3 h-3 text-[#38bdf8]" />
              <span>Host PC (XInput Xbox 360)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pasos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 space-y-2">
          {steps.map((s) => {
            const isActive = activeStep === s.num;
            return (
              <button
                key={s.num}
                onClick={() => setActiveStep(s.num)}
                className={`w-full text-left p-3.5 rounded-none transition-all border ${
                  isActive
                    ? 'bg-[#1a1e27] border-[#107C41] border-l-4 text-white'
                    : 'bg-[#14161a] border-[#262a33] text-[#858d98] hover:bg-[#181a20]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 flex items-center justify-center font-bold text-xs rounded-none ${
                      isActive ? 'bg-[#107C41] text-white' : 'bg-[#22262f] text-[#858d98]'
                    }`}
                  >
                    {s.num}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-[#6d7582] mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-7 bg-[#14161a] border border-[#262a33] p-5 rounded-none flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-[#22262f]">
              <span className="w-6 h-6 bg-[#107C41] text-white font-bold flex items-center justify-center text-xs rounded-none">
                {steps[activeStep - 1].num}
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase text-[#e4e7eb]">
                  {steps[activeStep - 1].title}
                </h3>
                <span className="text-[11px] text-[#858d98]">
                  {steps[activeStep - 1].subtitle}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 mb-5 text-xs text-[#c7ccd4]">
              {steps[activeStep - 1].details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-[#107C41] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#101216] border border-[#282d37] text-xs text-[#858d98] flex items-start gap-2.5 rounded-none">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#e4e7eb] font-semibold block mb-0.5">Nota Técnica:</strong>
                {steps[activeStep - 1].tip}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-5 border-t border-[#22262f]">
            <button
              onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
              disabled={activeStep === 1}
              className="px-3 py-1.5 bg-[#1e222a] hover:bg-[#252933] disabled:opacity-30 text-xs font-bold uppercase rounded-none text-[#c7ccd4]"
            >
              ← Anterior
            </button>

            <span className="text-[11px] text-[#6d7582] font-mono">
              {activeStep} de {steps.length}
            </span>

            <button
              onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
              disabled={activeStep === steps.length}
              className="px-3 py-1.5 bg-[#107C41] hover:bg-[#128a49] disabled:opacity-30 text-xs font-bold uppercase rounded-none text-white"
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
