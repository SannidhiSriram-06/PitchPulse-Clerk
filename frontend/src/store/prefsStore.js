import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePrefsStore = create(
    persist(
        (set) => ({
            defaultLength: 'medium',
            defaultView: 'tabs',
            theme: 'dark',
            showWatchlist: true,
            showSources: true,

            setTheme: (val) => set({ theme: val }),
            setDefaultView: (val) => set({ defaultView: val }),
            setShowWatchlist: (val) => set({ showWatchlist: val }),
            setShowSources: (val) => set({ showSources: val }),

            setPrefs: ({ defaultLength, defaultView }) => {
                set({ defaultLength, defaultView })
            },
            
            loadPrefs: (prefs) => set({ ...prefs }),
        }),
        {
            name: 'pitchpulse-prefs',
        }
    )
)

export default usePrefsStore