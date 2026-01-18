// Import images
import socopicolabIcon from '@/assets/modes/socopicolab-icon.png';
import socopicolabImg from '@/assets/modes/socopicolab.png';
import raufIcon from '@/assets/modes/rauf-icon.png';
import raufImg from '@/assets/modes/rauf.png';
import rpipicoIcon from '@/assets/modes/rpipico-icon.png';
import rpipicoImg from '@/assets/modes/rpipico.png';

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
    icon: socopicolabIcon,
    image: socopicolabImg,
    description: 'Neopia Neo Soco PicoLab mode'
  },
  {
    id: 'rauf',
    name: 'Rauf',
    icon: raufIcon,
    image: raufImg,
    description: 'Roboticsware Rauf mode'
  },
  {
    id: 'rpipico',
    name: 'RPi Pico',
    icon: rpipicoIcon,
    image: rpipicoImg,
    description: 'Control Raspberry Pi Pico GPIO'
  }
];