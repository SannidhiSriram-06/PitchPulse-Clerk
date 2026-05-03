import { create } from 'zustand'

const applyTheme = (theme) => {
    if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
    }
}

const useThemeStore = create((set) => {
    const initialTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'dark'
    applyTheme(initialTheme)

    return {
        theme: initialTheme,
        toggleTheme: () => set((state) => {
            const next = state.theme === 'dark' ? 'light' : 'dark'
            if (typeof localStorage !== 'undefined') localStorage.setItem('theme', next)
            applyTheme(next)
            return { theme: next }
        })
    }
})

export default useThemeStore
