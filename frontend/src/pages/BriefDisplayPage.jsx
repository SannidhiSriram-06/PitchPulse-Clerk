import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bookmark, BookmarkCheck, Share2, RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Sun, Moon, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import api from '../lib/api'
import usePrefsStore from '../store/prefsStore'
import useAuthStore from '../store/authStore'
import useIsMobile from '../hooks/useIsMobile'
import useThemeStore from '../store/themeStore'
import CustomizePanel from '../components/CustomizePanel'

const SECTION_LABELS = {
    summary: 'Summary',
    news: 'News',
    financials: 'Financials',
    social_sentiment: 'Social Sentiment',
    talking_points: 'Talking Points',
    watch_out_for: 'Watch Out For',
    custom_focus: 'Custom Focus',
    company1_summary: 'Company 1',
    company2_summary: 'Company 2',
    financial_comparison: 'Financials',
    market_position: 'Market Position',
    recent_developments: 'Recent News',
    strengths_weaknesses: 'Strengths & Weaknesses',
    recommendation: 'Recommendation',
}

const CONFIDENCE_COLORS = {
    high: '#22C55E',
    medium: 'var(--accent)',
    low: '#EF4444',
}

export default function BriefDisplayPage() {
    const { id, token } = useParams()
    const navigate = useNavigate()
    const { defaultView, showSources } = usePrefsStore()
    const { user } = useAuthStore()
    const isMobile = useIsMobile()
    const { theme, toggleTheme } = useThemeStore()
    const isShareView = !!token

    const [brief, setBrief] = useState(null)
    const [briefMeta, setBriefMeta] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [view, setView] = useState(defaultView || 'tabs')
    const [activeTab, setActiveTab] = useState('summary')
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState({})
    const [sourcesOpen, setSourcesOpen] = useState(showSources ?? false)
    const [copied, setCopied] = useState(false)
    const [poorQualityCount, setPoorQualityCount] = useState(0)
    const [showCustomize, setShowCustomize] = useState(false)
    const [exportingPDF, setExportingPDF] = useState(false)
    const [showSchedule, setShowSchedule] = useState(false)
    const [meetingTime, setMeetingTime] = useState('')
    const [meetingEmail, setMeetingEmail] = useState(user?.email || '')
    const [scheduleStatus, setScheduleStatus] = useState('')
    const [diffData, setDiffData] = useState(null)
    const [showDiff, setShowDiff] = useState(false)

    useEffect(() => {
        if (user?.email && !meetingEmail) setMeetingEmail(user.email)
    }, [user])

    useEffect(() => {
        fetchBrief()
    }, [id, token])

    const fetchBrief = async () => {
        try {
            let res
            if (token) {
                res = await api.get(`/api/share/${token}`)
            } else {
                res = await api.get(`/api/briefs/${id}`)
            }
            const data = res.data
            setBriefMeta(data)
            setSaved(data.saved || false)
            setBrief(data.brief || {})
            const keys = Object.keys(data.brief || {})
            if (keys.length > 0) setActiveTab(keys[0])

            if (data.feedback_summary) {
                try {
                    const parsedFeedback = typeof data.feedback_summary === 'string' 
                        ? JSON.parse(data.feedback_summary) 
                        : data.feedback_summary;
                    setFeedback(parsedFeedback)
                    setPoorQualityCount(Object.values(parsedFeedback).filter(v => v === 'down').length)
                } catch (e) {
                    console.error('Failed to parse feedback_summary', e)
                }
            }
            if (data.company_name && !isShareView) {
                try {
                    const diffRes = await api.get(`/api/briefs/company/${encodeURIComponent(data.company_name)}/diff`)
                    setDiffData(diffRes.data)
                } catch (e) {
                    console.error('Failed to fetch diff', e)
                }
            }
        } catch (e) {
            setError(e.response?.data?.error || 'Could not load brief.')
        }
        setLoading(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await api.patch(`/api/briefs/${id}/save`)
            setSaved(!saved)
        } catch (e) { }
        setSaving(false)
    }

    const handleSchedule = async () => {
        if (!meetingTime || !meetingEmail) {
            setScheduleStatus("Please fill out all fields.")
            return
        }
        try {
            await api.post(`/api/briefs/${id}/schedule`, {
                meeting_time: meetingTime,
                meeting_email: meetingEmail
            })
            setScheduleStatus("✓ Brief sent to your email!")
            setTimeout(() => {
                setScheduleStatus('')
                setShowSchedule(false)
            }, 3000)
        } catch (e) {
            setScheduleStatus("Failed to send. Try again.")
        }
    }

    const handleShare = async () => {
        try {
            const res = await api.post(`/api/briefs/${id}/share`)
            const shareUrl = `${window.location.origin}/brief/share/${res.data.share_token}`
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (e) { }
    }

    const handleFeedback = async (section, value) => {
        const newFeedback = { ...feedback, [section]: value }
        setFeedback(newFeedback)
        const downCount = Object.values(newFeedback).filter(v => v === 'down').length
        setPoorQualityCount(downCount)
        try {
            await api.post(`/api/briefs/${id}/feedback`, { section, rating: value })
        } catch (e) { }
    }

    const exportToPDF = async () => {
        if (!briefMeta) return
        setExportingPDF(true)
        try {
            const el = document.getElementById('brief-content')
            if (!el) throw new Error('Content not found')
            const canvas = await html2canvas(el, { scale: 2 })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width
            let heightLeft = pdfHeight
            let position = 0

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
            heightLeft -= pdf.internal.pageSize.getHeight()

            while (heightLeft >= 0) {
                position = heightLeft - pdfHeight
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
                heightLeft -= pdf.internal.pageSize.getHeight()
            }

            const dateStr = new Date().toISOString().split('T')[0]
            pdf.save(`${briefMeta.company_name.replace(/\s+/g, '-')}-brief-${dateStr}.pdf`)
        } catch (e) {
            console.error('PDF Export failed', e)
        }
        setExportingPDF(false)
    }

    const formatDate = (iso) => {
        if (!iso) return ''
        return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const sections = brief ? Object.keys(brief).sort((a, b) => {
        if (a === 'custom_focus') return 1
        if (b === 'custom_focus') return -1
        return 0
    }) : []
    const sources = briefMeta?.sources_used || []

    if (loading) return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-sec)' }}>
            Loading brief...
        </div>
    )

    if (error) return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
            <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => navigate('/dashboard')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', padding: 0 }}>
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                </div>
            </nav>
            <div style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 56px)' }}>
                <p style={{ color: '#EF4444', fontSize: '1rem' }}>{error}</p>
            </div>
        </div>
    )

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
            {isShareView && !user && (
                <div className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>
                    <span>Generated with PitchPulse</span>
                    <a href="/register" className="underline font-bold">Get your free account →</a>
                </div>
            )}

            {/* Nav */}
            <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button onClick={() => navigate('/dashboard')}
                        style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', padding: 0 }}>
                        <ArrowLeft size={16} /> {!isMobile && 'Dashboard'}
                    </button>
                    {!isMobile && <span style={{ color: 'var(--border)', marginLeft: '0.5rem', marginRight: '0.5rem' }}>|</span>}
                    <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                        Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
                    </span>
                </div>

                {/* Action bar */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button onClick={() => setShowCustomize(true)} title="Customize"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sec)', padding: '0.25rem' }}>
                        ⚙
                    </button>
                    <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                {!isShareView && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={handleSave} disabled={saving}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: saved ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                            {!isMobile && (saved ? 'Saved' : 'Save')}
                        </button>
                        <button onClick={exportToPDF} disabled={exportingPDF}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: exportingPDF ? 'var(--accent)' : 'var(--text-sec)', cursor: exportingPDF ? 'wait' : 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Download size={14} />
                            {!isMobile && (exportingPDF ? 'Exporting...' : 'Export PDF')}
                        </button>
                        <button onClick={() => setShowSchedule(!showSchedule)}
                            style={{ background: showSchedule ? 'var(--accent-15)' : 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: showSchedule ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            📅 {!isMobile && 'Schedule'}
                        </button>
                        {diffData?.has_diff && (
                            <button onClick={() => setShowDiff(!showDiff)}
                                style={{ background: showDiff ? 'var(--accent-15)' : 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: showDiff ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🔄 {!isMobile && "What's New"}
                            </button>
                        )}
                        <button onClick={handleShare}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: copied ? '#22C55E' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Share2 size={14} />
                            {!isMobile && (copied ? 'Copied!' : 'Share')}
                        </button>
                        <button onClick={() => navigate(`/brief/new?company=${encodeURIComponent(briefMeta?.company_name || '')}`)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: isMobile ? '0.4rem' : '0.4rem 0.75rem', color: 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <RefreshCw size={14} /> {!isMobile && 'Regenerate'}
                        </button>
                    </div>
                )}
                </div>
            </nav>

            {/* Schedule Panel */}
            {showSchedule && (
                <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.25rem' }}>Meeting time</label>
                            <input type="datetime-local" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.25rem' }}>Send to</label>
                            <input type="email" value={meetingEmail} onChange={(e) => setMeetingEmail(e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.875rem', minWidth: '200px' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={handleSchedule} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Send Brief to My Email</button>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>We'll send this brief to your email right away</span>
                    </div>
                    {scheduleStatus && <div style={{ fontSize: '0.875rem', color: scheduleStatus.includes('✓') ? '#22C55E' : '#EF4444' }}>{scheduleStatus}</div>}
                </div>
            )}

            <div id="brief-content" style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem', background: 'var(--bg)' }}>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: '800', letterSpacing: '-1px', margin: 0 }}>
                            {briefMeta?.company_name}
                        </h1>
                        {saved && <BookmarkCheck size={20} style={{ color: 'var(--accent)' }} />}
                    </div>
                    <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem', margin: 0 }}>
                        Generated {formatDate(briefMeta?.created_at)} · {briefMeta?.length} brief · {sections.length} sections
                    </p>
                </div>

                {/* Poor quality banner */}
                {poorQualityCount >= 3 && (
                    <div style={{ background: 'var(--accent-15)', border: '1px solid var(--accent-40)', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--accent)' }}>Brief quality was poor? Let us know →</span>
                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>
                            Give feedback
                        </span>
                    </div>
                )}

                {/* Diff Panel */}
                {showDiff && diffData?.has_diff && (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent-40)', borderRadius: '6px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative' }}>
                        <button onClick={() => setShowDiff(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text)' }}>Changes since {formatDate(diffData.compared_dates[1])}</h3>
                        
                        {['summary', 'news'].map(section => {
                            const added = diffData.changes[section]?.added || []
                            const removed = diffData.changes[section]?.removed || []
                            if (added.length === 0 && removed.length === 0) return null
                            
                            return (
                                <div key={section} style={{ marginBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-sec)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{SECTION_LABELS[section] || section}</h4>
                                    {added.map((text, i) => (
                                        <div key={`add-${i}`} style={{ display: 'flex', gap: '0.5rem', color: '#22C55E', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                            <span>+</span><span>{text}.</span>
                                        </div>
                                    ))}
                                    {removed.map((text, i) => (
                                        <div key={`rem-${i}`} style={{ display: 'flex', gap: '0.5rem', color: '#EF4444', opacity: 0.8, fontSize: '0.875rem', marginBottom: '0.25rem', textDecoration: 'line-through' }}>
                                            <span>−</span><span>{text}.</span>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                        {['summary', 'news'].every(section => (diffData.changes[section]?.added || []).length === 0 && (diffData.changes[section]?.removed || []).length === 0) && (
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-sec)' }}>No significant changes detected.</p>
                        )}
                    </div>
                )}

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
                    {['tabs', 'cards'].map((v) => (
                        <button key={v} onClick={() => setView(v)}
                            style={{ padding: '0.35rem 0.85rem', borderRadius: '4px', border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`, background: view === v ? 'var(--accent-15)' : 'transparent', color: view === v ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'capitalize' }}>
                            {v}
                        </button>
                    ))}
                </div>

                {/* TABS VIEW */}
                {view === 'tabs' && (
                    <div>
                        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
                            {sections.map((s) => (
                                <button key={s} onClick={() => setActiveTab(s)}
                                    style={{ padding: '0.6rem 1rem', border: 'none', borderBottom: `2px solid ${activeTab === s ? 'var(--accent)' : 'transparent'}`, background: 'transparent', color: activeTab === s ? 'var(--text)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: activeTab === s ? '700' : '400', whiteSpace: 'nowrap' }}>
                                    {SECTION_LABELS[s] || s}
                                </button>
                            ))}
                        </div>
                        {brief[activeTab] && (
                            <SectionCard section={activeTab} data={brief[activeTab]} feedback={feedback} onFeedback={handleFeedback} isShareView={isShareView} />
                        )}
                    </div>
                )}

                {/* CARDS VIEW */}
                {view === 'cards' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1rem' }}>
                        {sections.map((s) => (
                            <SectionCard key={s} section={s} data={brief[s]} feedback={feedback} onFeedback={handleFeedback} isShareView={isShareView} />
                        ))}
                    </div>
                )}

                {/* Sources */}
                {sources.length > 0 && (
                    <div style={{ marginTop: '2rem', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                        <button onClick={() => setSourcesOpen(!sourcesOpen)}
                            style={{ width: '100%', background: 'var(--surface)', border: 'none', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'var(--text-sec)', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                            <span>{sources.length} sources used</span>
                            {sourcesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {sourcesOpen && (
                            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg)' }}>
                                {sources.map((url, i) => (
                                    <div key={i} style={{ marginBottom: '0.4rem' }}>
                                        <a href={url} target="_blank" rel="noreferrer"
                                            style={{ color: '#3B82F6', fontSize: '0.75rem', textDecoration: 'none', wordBreak: 'break-all' }}>
                                            {url}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            {showCustomize && <CustomizePanel onClose={() => setShowCustomize(false)} />}
        </div>
    )
}

function SectionCard({ section, data, feedback, onFeedback, isShareView }) {
    if (!data) return null
    const content = typeof data === 'string' ? data : data.content
    const confidence = typeof data === 'object' ? data.confidence : null

    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
                    {SECTION_LABELS[section] || section}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {confidence && (
                        <span style={{ fontSize: '0.65rem', color: CONFIDENCE_COLORS[confidence] || 'var(--text-sec)', border: `1px solid ${CONFIDENCE_COLORS[confidence] || 'var(--text-sec)'}`, borderRadius: '3px', padding: '0.1rem 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {confidence}
                        </span>
                    )}
                    {!isShareView && (
                        <>
                            <button onClick={() => onFeedback(section, feedback[section] === 'up' ? null : 'up')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: feedback[section] === 'up' ? '#22C55E' : '#444444', padding: '0.2rem' }}>
                                <ThumbsUp size={13} />
                            </button>
                            <button onClick={() => onFeedback(section, feedback[section] === 'down' ? null : 'down')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: feedback[section] === 'down' ? '#EF4444' : '#444444', padding: '0.2rem' }}>
                                <ThumbsDown size={13} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            {(() => {
                if (!content) return null
                if (typeof content === 'string') {
                    return <p style={{ color: '#CCCCCC', fontSize: '0.875rem', lineHeight: '1.7', margin: 0 }}>{content}</p>
                }
                if (Array.isArray(content)) {
                    return content.map((item, idx) => {
                        if (!item) return null
                        if (typeof item === 'string') {
                            return (
                                <p key={idx} style={{ color: '#CCCCCC', fontSize: '0.875rem', lineHeight: '1.7', margin: idx === content.length - 1 ? 0 : '0 0 0.5rem 0' }}>
                                    {item}
                                </p>
                            )
                        }
                        if (typeof item === 'object') {
                            const entries = Object.entries(item)
                            return (
                                <div key={idx} style={{ marginBottom: idx === content.length - 1 ? 0 : '1rem' }}>
                                    {entries.map(([k, v], i) => (
                                        <p key={i} style={{ color: '#CCCCCC', fontSize: '0.875rem', lineHeight: '1.7', margin: '0 0 0.25rem 0' }}>
                                            <strong>{k}:</strong> {String(v)}
                                        </p>
                                    ))}
                                </div>
                            )
                        }
                        return null
                    })
                }
                if (typeof content === 'object') {
                    const entries = Object.entries(content)
                    return entries.map(([k, v], idx) => (
                        <p key={idx} style={{ color: '#CCCCCC', fontSize: '0.875rem', lineHeight: '1.7', margin: idx === entries.length - 1 ? 0 : '0 0 0.5rem 0' }}>
                            <strong>{k}:</strong> {String(v)}
                        </p>
                    ))
                }
                return null
            })()}
        </div>
    )
}