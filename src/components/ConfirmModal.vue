<template>
  <dialog class="modal" :class="{ 'modal-open': isConfirmOpen }">
    <div class="modal-box">
      <h3 class="font-bold text-lg">{{ confirmOptions.title }}</h3>
      <p class="py-4">{{ confirmOptions.message }}</p>
      <div class="modal-action">
        <button class="btn" @click="handleConfirmResponse(false)">취소</button>
        <button class="btn btn-error" @click="handleConfirmResponse(true)">확인</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { isConfirmOpen, confirmOptions, handleConfirmResponse } from '../services/modal-confirm';
</script>