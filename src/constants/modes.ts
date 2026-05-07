// Import images
import socopicoIcon from '@/assets/modes/socopico-icon.png';
import socopicoImg from '@/assets/modes/socopico.png';
import esp32s3Icon from '@/assets/modes/esp32s3-icon.png';
import esp32s3Img from '@/assets/modes/esp32s3.png';
import rpipicoIcon from '@/assets/modes/rpipico-icon.png';
import rpipicoImg from '@/assets/modes/rpipico.png';

export type CodingMode = 'socopico' | 'esp32s3' | 'rpipico';

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
    id: 'esp32s3',
    name: 'ESP32-S3',
    icon: esp32s3Icon,
    image: esp32s3Img,
    description: 'ESP32-S3 N16R8 Camera mode'
  },
  {
    id: 'rpipico',
    name: 'RPi Pico',
    icon: rpipicoIcon,
    image: rpipicoImg,
    description: 'Control Raspberry Pi Pico GPIO'
  }
];