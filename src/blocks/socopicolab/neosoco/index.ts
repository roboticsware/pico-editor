import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const neosocoModule = {
    definitions: defineBlocks,
    generators: defineGenerators,
    toolbox: toolboxData,
    i18n: {
        ko: {
            "NeoSoCo": "NeoSoCo"
        },
        en: {
            "NeoSoCo": "NeoSoCo"
        }
    }
};
