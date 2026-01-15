export type CodingMode = 'socopicolab' | 'rauf' | 'rpipico';

export interface ModeDetail {
  id: CodingMode;
  name: string;
  icon: string;
  image: string;
  description: string;
}

export const AVAILABLE_MODES: ModeDetail[] = [
  { 
    id: 'socopicolab', 
    name: 'NeoSoCo Pico Lab', 
    icon: '/assets/modes/socopicolab-icon.png', 
    image: '/assets/modes/socopicolab.png',
    description: 'Neopia Neo Soco PicoLab mode'
  },
  { 
    id: 'rauf', 
    name: 'Rauf', 
    icon: '/assets/modes/rauf-icon.png', 
    image: '/assets/modes/rauf.png',
    description: 'Roboticsware Rauf mode'
  },
  { 
    id: 'rpipico', 
    name: 'RPi Pico', 
    icon: '/assets/modes/rpipico-icon.png', 
    image: '/assets/modes/rpipico.png',
    description: 'Control Raspberry Pi Pico GPIO'
  }
];