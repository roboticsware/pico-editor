import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
    const isDarkMode = ref(localStorage.getItem('theme') !== 'light'); // Default to dark

    const toggleTheme = () => {
        isDarkMode.value = !isDarkMode.value;
    };

    const setTheme = (isDark: boolean) => {
        isDarkMode.value = isDark;
    };

    // Apply theme to document
    watch(isDarkMode, (newVal) => {
        const el = document.documentElement;
        if (newVal) {
            el.classList.add('dark');
            el.classList.add('ion-palette-dark');
            el.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            el.classList.remove('dark');
            el.classList.remove('ion-palette-dark');
            el.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    }, { immediate: true });

    return {
        isDarkMode,
        toggleTheme,
        setTheme
    };
});
