import defineBlocks from './definitions';
import defineGenerators from './generators';
import toolboxData from './toolbox.json';

export const basicModule = {
  definitions: defineBlocks,
  generators: defineGenerators,
  toolbox: toolboxData,
  i18n: {
    ko: { BASIC: "기본" },
    en: { BASIC: "Basic" }
  }  
};