// Import images
import socopicoIcon from '@/assets/modes/socopico-icon.png';
import socopicoImg from '@/assets/modes/socopico.png';
import raufIcon from '@/assets/modes/rauf-icon.png';
import raufImg from '@/assets/modes/rauf.png';
import rpipicoIcon from '@/assets/modes/rpipico-icon.png';
import rpipicoImg from '@/assets/modes/rpipico.png';

export type CodingMode = 'socopico' | 'rauf' | 'rpipico';

export interface ModeDetail {
  id: CodingMode;
  name: string;
  icon: string;
  image: string;
  description: string;
}

export const AVAILABLE_MODES: ModeDetail[] = [
  {
    id: 'socopico',
    name: 'SoCo Pico',
    icon: socopicoIcon,
    image: socopicoImg,
    description: 'Roboticsware SoCo Pico board'
  },
  {
    id: 'rauf',
    name: 'Rauf',
    icon: raufIcon,
    image: raufImg,
    description: 'Roboticsware Rauf board'
  },
  {
    id: 'rpipico',
    name: 'RPi Pico',
    icon: rpipicoIcon,
    image: rpipicoImg,
    description: 'Control Raspberry Pi Pico GPIO'
  }
];