<template>
  <dialog class="modal" :class="{ 'modal-open': !modeStore.currentMode }">
    <div class="modal-box w-11/12 max-w-4xl">
      <h3 class="font-bold text-2xl text-center mb-8">Select your mode</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="mode in modeStore.allModes" :key="mode.id" 
             class="card bg-base-100 border border-base-300 hover:shadow-lg transition-all p-4">
          <h4 class="font-bold text-center mb-4">{{ mode.name }}</h4>
          <img :src="mode.image" class="h-24 object-contain mx-auto mb-6" />
          <button @click="modeStore.setMode(mode.id)" class="btn btn-primary btn-block">
            Select
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { useModeStore } from '../stores/modeStore';
const modeStore = useModeStore();
</script>