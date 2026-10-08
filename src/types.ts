export interface AndroidProjectFile {
  name: string;
  path: string;
  language: 'xml' | 'kotlin' | 'groovy' | 'json';
  category: 'manifest' | 'kotlin' | 'layout' | 'gradle';
  description: string;
  content: string;
}

export interface GamepadKeyEvent {
  id: string;
  timestamp: string;
  action: 'ACTION_DOWN' | 'ACTION_UP' | 'AXIS_MOVE';
  buttonName: string;
  androidKeycode: string;
  androidKeycodeInt: number;
  adbCommand: string;
  sendeventCommand: string;
  durationMs?: number;
  axisValue?: { x: number; y: number };
}

export interface KeycodeInfo {
  name: string;
  codeInt: number;
  constant: string;
  linuxEventCode: number;
  linuxEventName: string;
  parsecMapping: string;
  description: string;
  xboxEquivalent: string;
}

export interface GameApp {
  id: string;
  name: string;
  packageName: string;
  category: 'Streaming' | 'Emulador' | 'Juego Nativo' | 'Cloud Gaming' | 'Personalizado';
  iconUrl: string;
  color: string;
  isFavorite: boolean;
  isCustom?: boolean;
  description?: string;
}
