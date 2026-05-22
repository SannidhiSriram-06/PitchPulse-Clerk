import { create } from 'zustand'
import useBriefStore from './briefStore'

const useAuthStore = create((set) => ({
    user: null,

    syncClerkUser: (clerkUser) => {
        if (!clerkUser) {
            set({ user: null })
            return
        }
        set({
            user: {
                id: clerkUser.id,
                email: clerkUser.primaryEmailAddress?.emailAddress,
            }
        })
    },

    logout: () => {
        set({ user: null })
        const { setCurrentBrief } = useBriefStore.getState()
        setCurrentBrief(null)
    },
}))

export default useAuthStore