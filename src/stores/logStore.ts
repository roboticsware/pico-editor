import { defineStore } from 'pinia';
import { ref } from 'vue';

interface LogItem {
  type: 'system' | 'error' | 'output';
  text: string;
  time: string;
}

export const useLogStore = defineStore('log', () => {
  const logs = ref([] as LogItem[]);

  const addLog = (type: 'system' | 'error' | 'output', message: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
    logs.value.push({ type, text: message, time });
    if (logs.value.length > 20) logs.value.shift(); // 아주 적은 양만 유지
  };

  const clearLogs = () => { logs.value = []; };

  return { logs, addLog, clearLogs };
});