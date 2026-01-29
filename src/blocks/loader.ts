// src/blocks/loader.ts
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import { useLangStore } from '../stores/langStore';

interface BlockModule {
  definitions: (Blocks: any) => void;
  generators: (P: any) => void;
  toolbox: any; // 카테고리 정보 또는 블록 목록
  i18n?: { [lang: string]: { [key: string]: string } };
}

export async function loadModeBlocks(modeId: string | null) {
  if (!modeId) return null;

  const langStore = useLangStore();
  const currentLang = langStore.currentLang;

  try {
    let modules: BlockModule[] = [];

    // 공통 블록 모듈
    const { basicModule } = await import(`./common/basic/index.ts`);
    modules.push(basicModule);

    switch (modeId) {
      case 'socopicolab':
        const { neosocoModule } = await import(`./${modeId}/neosoco/index.ts`);
        modules.push(neosocoModule);
        break
      case 'rauf':
        const { ledModule } = await import(`./${modeId}/led/index.ts`);
        modules.push(ledModule);
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
        Object.assign(Blockly.Msg, mod.i18n[currentLang]);
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
