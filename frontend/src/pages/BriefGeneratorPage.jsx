import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Sun, Moon } from 'lucide-react'
import useBriefStore from '../store/briefStore'
import usePrefsStore from '../store/prefsStore'
import useIsMobile from '../hooks/useIsMobile'
import useThemeStore from '../store/themeStore'
import RateLimitModal from '../components/RateLimitModal'

const STATUS_MESSAGES = (company) => [
    `Searching for recent news on ${company}...`,
    'Analyzing financial signals...',
    'Checking social sentiment...',
    'Writing your brief...',
    'Almost done...',
]

const ALL_SECTIONS = [
    { key: 'summary', label: 'Summary' },
    { key: 'news', label: 'News' },
    { key: 'financials', label: 'Financials' },
    { key: 'social_sentiment', label: 'Social Sentiment' },
    { key: 'talking_points', label: 'Talking Points' },
    { key: 'watch_out_for', label: 'Watch Out For' },
]

export default function BriefGeneratorPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { generating, statusMessage, generateBrief, setStatusMessage } = useBriefStore()
    const { defaultLength, defaultView } = usePrefsStore()
    const { theme, toggleTheme } = useThemeStore()

    const [company, setCompany] = useState(searchParams.get('company') || '')
    const [length, setLength] = useState(defaultLength || 'medium')
    const [sections, setSections] = useState(ALL_SECTIONS.map((s) => s.key))
    const [error, setError] = useState('')
    const [rateLimitData, setRateLimitData] = useState(null)
    const statusInterval = useRef(null)

    const toggleSection = (key) => {
        setSections((prev) =>
            prev.includes(key) ? (prev.length > 1 ? prev.filter((s) => s !== key) : prev) : [...prev, key]
        )
    }

    const startStatusCycle = (companyName) => {
        const messages = STATUS_MESSAGES(companyName)
        let i = 0
        setStatusMessage(messages[0])
        statusInterval.current = setInterval(() => {
            i++
            if (i < messages.length) setStatusMessage(messages[i])
            else clearInterval(statusInterval.current)
        }, 3000)
    }

    const handleGenerate = async () => {
        if (!company.trim()) { setError('Enter a company name.'); return }
        setError('')
        startStatusCycle(company.trim())
        try {
            const result = await generateBrief(company.trim(), length, sections)
            clearInterval(statusInterval.current)
            navigate(`/brief/${result.brief_id}`)
        } catch (err) {
            clearInterval(statusInterval.current)
            if (err.response?.status === 429) {
                setRateLimitData({ resetInMinutes: err.response.data?.reset_in_minutes })
                return
            }
            setError(err.response?.data?.error || 'Generation failed. Try again.')
        }
    }

    useEffect(() => () => clearInterval(statusInterval.current), [])

    const isMobile = useIsMobile()

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>

            {/* Nav */}
            <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', display: 'flex', alignItems: 'center', height: '56px', gap: '1rem' }}>
                <button onClick={() => navigate('/dashboard')}
                    style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', padding: 0 }}>
                    <ArrowLeft size={16} /> Dashboard
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <span style={{ color: 'var(--border)' }}>|</span>
                <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                    Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
                </span>
            </nav>

            {/* Loading overlay */}
            {generating && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)ee', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: '600' }}>{statusMessage}</p>
                    <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem' }}>This takes 20–60 seconds. Don't close the tab.</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {/* Content */}
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: isMobile ? '2rem 1rem' : '3rem 1.5rem' }}>

                <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '0.5rem' }}>Generate a Brief</h1>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '2.5rem' }}>Enter a company name and we'll do the rest.</p>

                {/* Company input */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>Company Name</label>
                    <input
                        value={company} onChange={(e) => setCompany(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        placeholder="e.g. Razorpay, Infosys, Zomato..."
                        autoFocus
                        style={{ width: '100%', background: 'var(--surface)', border: '1px solid #333333', borderRadius: '6px', padding: '1rem', color: 'var(--text)', fontSize: '1.1rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.3px' }}
                    />
                </div>

                {/* Length */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>Brief Length</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['short', 'medium', 'long'].map((l) => (
                            <button key={l} onClick={() => setLength(l)}
                                style={{ flex: 1, padding: '0.6rem', borderRadius: '4px', border: `1px solid ${length === l ? 'var(--accent)' : 'var(--border)'}`, background: length === l ? 'var(--accent-15)' : 'var(--surface)', color: length === l ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: length === l ? '700' : '400', textTransform: 'capitalize' }}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <p style={{ color: '#444444', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                        {length === 'short' ? '~15–20 seconds' : length === 'medium' ? '~30–45 seconds' : '~60–90 seconds'}
                    </p>
                </div>

                {/* Sections */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem' }}>Sections to include</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {ALL_SECTIONS.map((s) => {
                            const active = sections.includes(s.key)
                            return (
                                <button key={s.key} onClick={() => toggleSection(s.key)}
                                    style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-15)' : 'var(--surface)', color: active ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: isMobile ? '0.75rem' : '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: active ? '600' : '400' }}>
                                    {s.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {error && (
                    <div style={{ background: '#1a0a0a', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.75rem', marginBottom: '1.5rem', color: '#EF4444', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                <button onClick={handleGenerate} disabled={generating}
                    style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '1rem', color: 'var(--accent-text)', fontSize: '1rem', fontWeight: '800', fontFamily: 'Space Grotesk, sans-serif', cursor: generating ? 'not-allowed' : 'pointer', letterSpacing: '-0.3px' }}>
                    ⚡ Generate Brief
                </button>

            </div>
            {rateLimitData && (
                <RateLimitModal
                    resetInMinutes={rateLimitData.resetInMinutes}
                    onClose={() => setRateLimitData(null)}
                />
            )}
        </div>
    )
}