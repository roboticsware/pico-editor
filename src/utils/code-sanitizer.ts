export const sanitizeCode = (code: string): string => {
  return code
    .split('\n')
    .map(line => line.trimEnd())            // 줄 끝 불필요한 공백 제거
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')             // 너무 많은 빈 줄은 2줄로 축소
    .replace(/\(\(([^()]+)\)\)/g, '($1)')   // 이중 괄호 ((x)) -> (x) 축소
    .replace(/\[\s+/g, '[')                 // 대괄호 공백 제거
    .replace(/\s+\]/g, ']')
    .replace(/\r\n/g, '\n')                 // 줄바꿈 통일
    .trim();
};