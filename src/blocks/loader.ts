// src/blocks/loader.ts
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { useLangStore } from '../stores/langStore';

interface BlockModule {
  definitions: (Blocks: any) => void;
  generators: (P: any) => void;
  toolbox: any; // 카테고리 정보 또는 블록 목록
  i18n?: { [lang: string]: any }; // Allow any structure for now to support nested difficulty keys
}

import { useModeStore } from '../stores/modeStore';

export async function loadModeBlocks(modeId: string | null) {
  if (!modeId) return null;

  const langStore = useLangStore();
  const modeStore = useModeStore();
  const currentLang = langStore.currentLang;
  // Fallback to beginner if not set (though store handles default)
  const currentDifficulty = modeStore.difficulty || 'beginner';


  try {
    let modules: BlockModule[] = [];

    // 공통 블록 모듈
    const { basicModule } = await import(`./common/basic/index.ts`);
    modules.push(basicModule);

    switch (modeId) {
      case 'socopico':
        const { neosocoModule } = await import(`./${modeId}/neosoco/index.ts`);
        modules.push(neosocoModule);
        break
      case 'esp32s3':
        const { ledModule } = await import(`./${modeId}/led/index.ts`);
        const { visionModule } = await import(`./${modeId}/vision/index.ts`);
        modules.push(ledModule);
        modules.push(visionModule);
        break;
      case 'rpipico':
        const { picoLedModule } = await import(`./${modeId}/pico_led/index.ts`);
        modules.push(picoLedModule);
        break;
      default:
        console.warn(`Unknown modeId: ${modeId}`);
        return null;
    }

    // 툴박스 구성
    const fullToolbox = {
      kind: 'categoryToolbox',
      contents: [] as any[]
    };

    modules.forEach(mod => {
      // 1. i18n 언어팩 등록 (가장 먼저 수행)
      if (mod.i18n && mod.i18n[currentLang]) {
        // Base keys - we filter out objects (difficulty levels) to avoid pollution if necessary, 
        // or just Object.assign everything.
        // However, Blockly.Msg expects string values. 
        // So we should only assign string values from the root of lang object.

        const langPack = mod.i18n[currentLang];

        // 1. Assign base string keys
        Object.keys(langPack).forEach(key => {
          if (typeof langPack[key] === 'string') {
            Blockly.Msg[key] = langPack[key];
          }
        });

        // 2. Difficulty specific keys (beginner/intermediate)
        // Check if the module has difficulty specific keys under the language
        if (langPack[currentDifficulty]) {
          const diffPack = langPack[currentDifficulty];
          Object.keys(diffPack).forEach(key => {
            if (typeof diffPack[key] === 'string') {
              Blockly.Msg[key] = diffPack[key];
            }
          });
        }
      }
      // 2. 블록 정의 및 코드 생성기 등록
      if (mod.definitions) mod.definitions(Blockly.Blocks);
      if (mod.generators) mod.generators(pythonGenerator);
      // 3. 툴박스 구성 취합
      if (mod.toolbox) {
        fullToolbox.contents.push({
          ...mod.toolbox,
          // mod.toolbox.name이 "BASIC"이라면 등록된 Msg에서 가져옴
          name: Blockly.Msg[mod.toolbox.name] || mod.toolbox.name
        });
      }
    });

    return fullToolbox;
  } catch (error) {
    console.error("Block loading failed:", error);
    return null;
  }
}
