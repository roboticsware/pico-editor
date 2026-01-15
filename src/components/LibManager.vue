<script setup lang="ts">
import { ref } from 'vue';
import { AVAILABLE_LIBRARIES } from '../constants/libraries';

defineProps<{
  show: boolean;
  isConnected: boolean;
  installedFiles: string[];
  isProcessing: boolean;
}>();

const libraries = ref(AVAILABLE_LIBRARIES);

const isInstalled = (fileName: string) => {
  // 실제 보드 내 파일 목록에 존재하는지 확인
  return false; // TODO: picoStore 연동
};

const handleInstall = (lib: any) => { /* TODO: SerialService 연동 */ };
const handleDelete = (fileName: string) => { /* TODO: SerialService 연동 */ };
</script>

<template>
  <dialog id="lib_manager_modal" class="modal" :class="{ 'modal-open': show }">
    <div class="modal-box w-11/12 max-w-3xl bg-base-100 shadow-2xl border border-base-300">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-2xl flex items-center gap-2">
          <span class="text-3xl">📦</span> {{ $t('lib.title') || 'Library Manager' }}
        </h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="$emit('close')">✕</button>
      </div>

      <div v-if="!isConnected" class="alert alert-warning mb-4">
        <span>Connect your Pico to manage libraries.</span>
      </div>

      <div class="overflow-x-auto min-h-[300px]">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Library Name</th>
              <th>Status</th>
              <th class="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lib in libraries" :key="lib.fileName" class="hover">
              <td>
                <div class="font-bold text-primary">{{ lib.name }}</div>
                <div class="text-xs opacity-60">{{ lib.description }}</div>
                <div class="text-[10px] mt-1">Version: {{ lib.version }}</div>
              </td>
              <td>
                <div v-if="isInstalled(lib.fileName)" class="badge badge-success gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-4 h-4 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                  Installed
                </div>
                <div v-else class="badge badge-ghost opacity-50">Not Found</div>
              </td>
              <td class="text-center">
                <button 
                  v-if="!isInstalled(lib.fileName)"
                  @click="handleInstall(lib)"
                  class="btn btn-primary btn-sm px-6"
                  :disabled="!isConnected || isProcessing"
                >
                  Install
                </button>
                <button 
                  v-else
                  @click="handleDelete(lib.fileName)"
                  class="btn btn-outline btn-error btn-sm"
                  :disabled="!isConnected || isProcessing"
                >
                  Remove
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-action border-t pt-4">
        <div class="flex-1 text-sm opacity-50 self-center italic">
          * Libraries are stored directly on the Pico's flash memory.
        </div>
        <button class="btn btn-ghost" @click="$emit('close')">Close</button>
      </div>
    </div>
  </dialog>
</template>

