import { create } from 'zustand'
import api from '../lib/api'

const useBriefStore = create((set) => ({
    currentBrief: null,
    history: [],
    generating: false,
    statusMessage: '',

    generateBrief: async (companyName, length, sections, customPrompt = '') => {
        set({ generating: true, statusMessage: `Searching for recent news on ${companyName}...` })
        try {
            const res = await api.post('/api/brief', { company_name: companyName, length, sections, custom_prompt: customPrompt })
            set({ currentBrief: res.data, generating: false, statusMessage: '' })
            return res.data
        } catch (err) {
            set({ generating: false, statusMessage: '' })
            throw err
        }
    },

    saveBrief: async (briefId) => {
        const res = await api.patch(`/api/briefs/${briefId}/save`)
        return res.data
    },

    setStatusMessage: (msg) => set({ statusMessage: msg }),
    setCurrentBrief: (brief) => set({ currentBrief: brief }),
    setHistory: (history) => set({ history }),
}))

export default useBriefStore