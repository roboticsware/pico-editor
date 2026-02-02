import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const neosocoModule = {
    definitions: defineBlocks,
    generators: defineGenerators,
    toolbox: toolboxData,
    i18n: {
        ko: {
            "NEOSOCO_TITLE": "🤖 네오쏘코",
            "NEOSOCO_GENERAL": "⚙️ 일반",
            "NEOSOCO_LED": "💡 LED",
            "NEOSOCO_COLOR_LED": "🌈 컬러 LED",
            "NEOSOCO_DC_MOTOR": "🚙 DC 모터",
            "NEOSOCO_ANGLE": "📐 각도",
            "NEOSOCO_SERVO_MOTOR": "🦾 서보 모터",
            "NEOSOCO_BUZZER": "🔊 부저",
            "NEOSOCO_REMOTE_CONTROLLER": "🎮 리모컨"
        },
        en: {
            "NEOSOCO_TITLE": "🤖 NeoSoCo",
            "NEOSOCO_GENERAL": "⚙️ General",
            "NEOSOCO_LED": "💡 LED",
            "NEOSOCO_COLOR_LED": "🌈 Color LED",
            "NEOSOCO_DC_MOTOR": "🚙 DC Motor",
            "NEOSOCO_ANGLE": "📐 Angle",
            "NEOSOCO_SERVO_MOTOR": "🦾 Servo Motor",
            "NEOSOCO_BUZZER": "🔊 Buzzer",
            "NEOSOCO_REMOTE_CONTROLLER": "🎮 Remote controller"
        }
    }
};
