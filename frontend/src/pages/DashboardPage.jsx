import { useState, useEffect } from 'react'
import { startTour } from '../hooks/useTour'
import { useNavigate } from 'react-router-dom'
import { Plus, LogOut, Settings, Clock, Bookmark, Zap, X, Sun, Moon, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import useAuthStore from '../store/authStore'
import api from '../lib/api'
import useIsMobile from '../hooks/useIsMobile'
import useThemeStore from '../store/themeStore'
import CustomizePanel from '../components/CustomizePanel'
import { BriefCardSkeleton, WatchlistItemSkeleton } from '../components/Skeletons'
import usePrefsStore from '../store/prefsStore'

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const { loadPrefs, showWatchlist } = usePrefsStore()

    const [briefs, setBriefs] = useState([])
    const [watchlist, setWatchlist] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [newCompany, setNewCompany] = useState('')
    const [userMenuOpen, setUserMenuOpen] = useState(false)
    const { theme, toggleTheme } = useThemeStore()
    const [sidebarOpen, setSidebarOpen] = useState(showWatchlist ?? true)
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
    const [showCustomize, setShowCustomize] = useState(false)
    const [alerts, setAlerts] = useState({})
    const [openNote, setOpenNote] = useState(null)
    const [noteTexts, setNoteTexts] = useState({})
    const [noteSaved, setNoteSaved] = useState({})



    useEffect(() => {
        fetchData()
        if (!localStorage.getItem('tour_completed')) {
            setTimeout(() => startTour(), 1500)
        }
    }, [])

    const fetchData = async () => {
        try {
            const [briefsRes, watchlistRes] = await Promise.all([
                api.get('/api/briefs'),
                api.get('/api/watchlist')
            ])
            const watchlistData = watchlistRes.data.watchlist || []
            setBriefs(briefsRes.data.briefs || [])
            setWatchlist(watchlistData)

            try {
                const alertRes = await api.get('/api/watchlist/alerts')
                const alertMap = {}
                ;(alertRes.data.alerts || []).forEach((a) => {
                    alertMap[a.company_name] = a
                })
                setAlerts(alertMap)
            } catch (e) { /* silent fail */ }

            for (const entry of watchlistData) {
                try {
                    const r = await api.get(`/api/watchlist/notes/${encodeURIComponent(entry.company_name)}`)
                    if (r.data.note_text) {
                        setNoteTexts((prev) => ({ ...prev, [entry.company_name]: r.data.note_text }))
                    }
                } catch (e) { /* silent fail */ }
            }

            try {
                const prefsRes = await api.get('/api/user/preferences')
                if (prefsRes.data?.preferences) loadPrefs(prefsRes.data.preferences)
            } catch (e) { /* silent fail */ }
        } catch (e) { }
        setLoading(false)
    }

    const addToWatchlist = async () => {
        const trimmed = newCompany.trim()
        if (!trimmed || watchlist.length >= 20) return
        try {
            await api.post('/api/watchlist', { company_name: trimmed })
            setNewCompany('')
            fetchData()
        } catch (e) { }
    }

    const removeFromWatchlist = async (id) => {
        try {
            await api.delete(`/api/watchlist/${id}`)
            fetchData()
        } catch (e) { }
    }

    const deleteBrief = async (e, id) => {
        e.stopPropagation()
        if (window.confirm("Delete this brief?")) {
            try {
                await api.delete(`/api/briefs/${id}`)
                setBriefs(prev => prev.filter(b => b.id !== id))
            } catch (err) { console.error(err) }
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    const filteredBriefs = briefs.filter((b) =>
        b.company_name.toLowerCase().includes(search.toLowerCase())
    )

    const formatDate = (iso) => {
        if (!iso) return ''
        return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatLastBriefed = (isoString) => {
        if (!isoString || isoString === 'null' || isoString === 'undefined') return null
        const dateStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : isoString + 'Z'
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return null
        const diffMs = new Date() - date
        const diffMins = Math.floor(diffMs / 60000)
        
        if (diffMins < 1) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        
        const diffHours = Math.floor(diffMins / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays < 7) return `${diffDays}d ago`
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const isWithin7Days = (isoString) => {
        if (!isoString) return false
        return (new Date() - new Date(isoString.endsWith('Z') || isoString.includes('+') ? isoString : isoString + 'Z')) / (1000 * 60 * 60 * 24) <= 7
    }

    const isMobile = useIsMobile()

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>

            {/* Top bar */}
            <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', gap: '0.5rem' }}>

                    {isMobile ? (
                        <button onClick={() => setMobileDrawerOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center' }}>
                            <Menu size={20} />
                        </button>
                    ) : (
                        <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.5px', flexShrink: 0 }}>
                            Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
                        </span>
                    )}

                    <input id="search-bar"
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search briefs..."
                        style={{ flex: 1, maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <button id="customize-btn" onClick={() => setShowCustomize(true)} title="Customize"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sec)', padding: '0.25rem' }}>
                            ⚙
                        </button>
                        <button id="tour-help-btn" onClick={startTour} title="Need a refresher?"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sec)', padding: '0.25rem', fontSize: '1rem', fontWeight: 'bold' }}>
                            ?
                        </button>
                        <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem', color: 'var(--text-sec)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={() => navigate('/brief/new')}
                            style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: isMobile ? '0.5rem' : '0.5rem 1rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Plus size={14} /> {!isMobile && 'New Brief'}
                        </button>

                        <div style={{ position: 'relative' }}>
                            <div onClick={() => setUserMenuOpen(!userMenuOpen)}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--accent-text)', fontWeight: '700', fontSize: '0.8rem' }}>
                                {user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            {userMenuOpen && (
                                <div style={{ position: 'absolute', right: 0, top: '40px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', minWidth: '180px', zIndex: 200 }}>
                                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user?.email}
                                    </div>
                                    <div onClick={() => { navigate('/history'); setUserMenuOpen(false) }}
                                        style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <Clock size={14} /> History
                                    </div>
                                    <div onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}
                                        style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <Settings size={14} /> Settings
                                    </div>
                                    <div onClick={handleLogout}
                                        style={{ padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid var(--border)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        <LogOut size={14} /> Log out
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

                {/* Sidebar */}
                {!isMobile && (
                    <aside id="watchlist-sidebar" style={{ width: sidebarOpen ? '240px' : '48px', borderRight: '1px solid var(--border)', padding: sidebarOpen ? '1.25rem' : '1.25rem 0.25rem', overflowY: 'auto', flexShrink: 0, transition: 'width 0.2s ease', position: 'relative' }}>
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ position: 'absolute', top: '0.75rem', right: '0.25rem', background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', padding: '0.2rem', zIndex: 10 }}>
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {sidebarOpen && <p style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', marginTop: '1.5rem' }}>Watchlist</p>}
                        {!sidebarOpen && <div style={{ height: '2.5rem' }} />}

                        {loading ? (
                            sidebarOpen ? Array.from({ length: 3 }).map((_, i) => <WatchlistItemSkeleton key={i} />) : null
                        ) : watchlist.length === 0 && sidebarOpen ? (
                            <p style={{ color: '#444444', fontSize: '0.8rem', marginBottom: '1rem' }}>No companies pinned yet. Add a company below to get started.</p>
                        ) : (
                            watchlist.map((item) => (
                                <div key={item.id}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '0.5rem', borderRadius: '6px', transition: 'background 0.2s', margin: '0 -0.5rem' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                        {sidebarOpen && (
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem', display: 'flex', alignItems: 'center' }}>
                                                    {item.company_name}
                                                    {alerts[item.company_name]?.has_recent_news && (
                                                        <span
                                                            style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 6 }}
                                                            title={alerts[item.company_name]?.headline || 'Recent news available'}
                                                        />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: item.last_briefed_at ? '#666' : '#444' }}>
                                                    {item.last_briefed_at && formatLastBriefed(item.last_briefed_at) ? `Last briefed ${formatLastBriefed(item.last_briefed_at)}` : 'Never briefed'}
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', flexDirection: sidebarOpen ? 'row' : 'column', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                                            <button onClick={() => navigate(`/brief/new?company=${encodeURIComponent(item.company_name)}`)}
                                                style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--accent)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(200,255,0,0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(200,255,0,0.1)'}
                                                title="Brief Me">
                                                <Zap size={12} />
                                            </button>
                                            <button
                                                onClick={() => setOpenNote(openNote === item.company_name ? null : item.company_name)}
                                                style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', padding: '0.3rem 0.5rem', color: (noteTexts[item.company_name] || '').trim() ? '#C8FF00' : '#666', cursor: 'pointer', transition: 'color 0.2s' }}
                                                title="Notes"
                                            >
                                                📝
                                            </button>
                                            {!sidebarOpen && (
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isWithin7Days(item.last_briefed_at) ? '#C8FF00' : '#444444', marginTop: '4px' }} />
                                            )}
                                            {sidebarOpen && (
                                                <button onClick={() => removeFromWatchlist(item.id)}
                                                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0.3rem', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#FF4444'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                                                    title="Remove">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {openNote === item.company_name && (
                                        <div style={{ marginTop: 4, marginBottom: 8 }}>
                                            <textarea
                                                value={noteTexts[item.company_name] || ''}
                                                onChange={(e) => setNoteTexts((prev) => ({ ...prev, [item.company_name]: e.target.value }))}
                                                onBlur={async () => {
                                                    try {
                                                        await api.post(`/api/watchlist/notes/${encodeURIComponent(item.company_name)}`, {
                                                            note_text: noteTexts[item.company_name] || '',
                                                        })
                                                        setNoteSaved((prev) => ({ ...prev, [item.company_name]: true }))
                                                        setTimeout(() => {
                                                            setNoteSaved((prev) => ({ ...prev, [item.company_name]: false }))
                                                        }, 2000)
                                                    } catch (e) { /* silent fail */ }
                                                }}
                                                placeholder="Add private notes about this company..."
                                                rows={3}
                                                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: 'var(--text)', fontSize: '0.75rem', padding: '6px 8px', marginTop: 4, resize: 'vertical' }}
                                            />
                                            {noteSaved[item.company_name] && <span style={{ fontSize: '0.7rem', color: '#C8FF00' }}>Saved ✓</span>}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem', justifyContent: sidebarOpen ? 'flex-start' : 'center' }}>
                            {sidebarOpen ? (
                                <>
                                    <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                                        placeholder="Add company..."
                                        style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem 0.5rem', color: 'var(--text)', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', minWidth: 0 }}
                                    />
                                    <button onClick={addToWatchlist}
                                        style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                        +
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setSidebarOpen(true)}
                                    style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                    +
                                </button>
                            )}
                        </div>
                    </aside>
                )}

                {/* Mobile Drawer */}
                {isMobile && (
                    <>
                        {mobileDrawerOpen && <div onClick={() => setMobileDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: '#0A0A0A99', zIndex: 499 }} />}
                        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)', zIndex: 500, transition: 'transform 0.25s ease', transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)', padding: '1.25rem', overflowY: 'auto', pointerEvents: mobileDrawerOpen ? 'auto' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                                    Watchlist
                                </span>
                                <button onClick={() => setMobileDrawerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', padding: 0 }}>
                                    <X size={18} />
                                </button>
                            </div>
                            
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => <WatchlistItemSkeleton key={i} />)
                            ) : watchlist.length === 0 ? (
                                <p style={{ color: '#444444', fontSize: '0.8rem', marginBottom: '1rem' }}>No companies pinned yet. Add a company below to get started.</p>
                            ) : (
                                watchlist.map((item) => (
                                    <div key={item.id}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '0.5rem', borderRadius: '6px', transition: 'background 0.2s', margin: '0 -0.5rem' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem', display: 'flex', alignItems: 'center' }}>
                                                    {item.company_name}
                                                    {alerts[item.company_name]?.has_recent_news && (
                                                        <span
                                                            style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', marginLeft: 6 }}
                                                            title={alerts[item.company_name]?.headline || 'Recent news available'}
                                                        />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: item.last_briefed_at ? '#666' : '#444' }}>
                                                    {item.last_briefed_at && formatLastBriefed(item.last_briefed_at) ? `Last briefed ${formatLastBriefed(item.last_briefed_at)}` : 'Never briefed'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                                <button onClick={() => { setMobileDrawerOpen(false); navigate(`/brief/new?company=${encodeURIComponent(item.company_name)}`) }}
                                                    style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)', borderRadius: '4px', padding: '0.3rem 0.5rem', color: 'var(--accent)', cursor: 'pointer', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(200,255,0,0.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(200,255,0,0.1)'}
                                                    title="Brief Me">
                                                    <Zap size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setOpenNote(openNote === item.company_name ? null : item.company_name)}
                                                    style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', padding: '0.3rem 0.5rem', color: (noteTexts[item.company_name] || '').trim() ? '#C8FF00' : '#666', cursor: 'pointer', transition: 'color 0.2s' }}
                                                    title="Notes"
                                                >
                                                    📝
                                                </button>
                                                <button onClick={() => removeFromWatchlist(item.id)}
                                                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '0.3rem', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#FF4444'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                                                    title="Remove">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        {openNote === item.company_name && (
                                            <div style={{ marginTop: 4, marginBottom: 8 }}>
                                                <textarea
                                                    value={noteTexts[item.company_name] || ''}
                                                    onChange={(e) => setNoteTexts((prev) => ({ ...prev, [item.company_name]: e.target.value }))}
                                                    onBlur={async () => {
                                                        try {
                                                            await api.post(`/api/watchlist/notes/${encodeURIComponent(item.company_name)}`, {
                                                                note_text: noteTexts[item.company_name] || '',
                                                            })
                                                            setNoteSaved((prev) => ({ ...prev, [item.company_name]: true }))
                                                            setTimeout(() => {
                                                                setNoteSaved((prev) => ({ ...prev, [item.company_name]: false }))
                                                            }, 2000)
                                                        } catch (e) { /* silent fail */ }
                                                    }}
                                                    placeholder="Add private notes about this company..."
                                                    rows={3}
                                                    style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: 'var(--text)', fontSize: '0.75rem', padding: '6px 8px', marginTop: 4, resize: 'vertical' }}
                                                />
                                                {noteSaved[item.company_name] && <span style={{ fontSize: '0.7rem', color: '#C8FF00' }}>Saved ✓</span>}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}

                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '1rem' }}>
                                <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
                                    placeholder="Add company..."
                                    style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.4rem 0.5rem', color: 'var(--text)', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', minWidth: 0 }}
                                />
                                <button onClick={addToWatchlist}
                                    style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.4rem 0.6rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                    +
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Main */}
                <main style={{ flex: 1, padding: isMobile ? '1.5rem 1rem' : '2.5rem', overflowY: 'auto', width: '100%', background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '0.4rem' }}>Dashboard</h1>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.9rem' }}>Welcome back. Here's your intelligence overview.</p>
                        </div>
                        <button id="generate-brief-btn" onClick={() => navigate('/brief/new')}
                            style={{ width: isMobile ? '100%' : 'auto', background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', color: '#000', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', boxShadow: '0 4px 14px 0 rgba(200,255,0,0.15)', transition: 'transform 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                            + Generate Brief
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
                        <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                            <div style={{ color: 'var(--text-sec)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Briefs</div>
                            <div style={{ color: '#C8FF00', fontSize: '2.5rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' }}>{briefs.length}</div>
                        </div>
                        <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                            <div style={{ color: 'var(--text-sec)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Watchlist</div>
                            <div style={{ color: '#C8FF00', fontSize: '2.5rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' }}>{watchlist.length}</div>
                        </div>
                        <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ color: 'var(--text-sec)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Last Brief Generated</div>
                            <div style={{ color: '#C8FF00', fontSize: '1.5rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', marginTop: 'auto', lineHeight: '1.2' }}>
                                {briefs.length > 0 ? (
                                    formatLastBriefed(briefs[0].created_at) ||
                                    new Date(briefs[0].created_at.endsWith('Z') || briefs[0].created_at.includes('+') ? briefs[0].created_at : briefs[0].created_at + 'Z').toLocaleDateString(undefined, {month:'short', day:'numeric'})
                                ) : 'None yet'}
                            </div>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem', letterSpacing: '-0.3px' }}>Recent Briefs</h2>
                    <div id="briefs-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', paddingBottom: isMobile ? '60px' : '0' }}>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <BriefCardSkeleton key={i} />)
                        ) : filteredBriefs.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 1rem', textAlign: 'center', gap: '1.5rem', background: '#111111', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <div style={{ background: 'rgba(200,255,0,0.1)', padding: '1.25rem', borderRadius: '50%' }}>
                                    <Zap size={40} color="#C8FF00" />
                                </div>
                                <div>
                                    <h3 style={{ color: 'var(--text)', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>No briefs yet</h3>
                                    <p style={{ color: 'var(--text-sec)' }}>Generate your first brief to see it here. Takes under 60 seconds.</p>
                                </div>
                                <button onClick={() => navigate('/brief/new')}
                                    style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif' }}>
                                    + Generate Brief
                                </button>
                            </div>
                        ) : (
                            filteredBriefs.map((brief) => {
                            const parsed = brief.brief || null
                            const rawSnippet = parsed?.summary?.content || parsed?.news?.content || Object.values(parsed || {}).find(s => s?.content)?.content || null
                            const snippet = rawSnippet ? (rawSnippet.length > 150 ? rawSnippet.slice(0, 150) + '...' : rawSnippet) : 'No preview available.'
                            const sections = (Array.isArray(brief.sections_requested) ? brief.sections_requested : (brief.sections_requested || '').split(',')).filter(Boolean).map(s => s.trim())
                            
                            return (
                                <div key={brief.id} onClick={() => navigate(`/brief/${brief.id}`)}
                                    style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', minHeight: '260px' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8FF00'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontWeight: '700', fontSize: '1.25rem', letterSpacing: '-0.3px', color: 'var(--text)', flex: 1, paddingRight: '1rem' }}>{brief.company_name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            {brief.saved && (
                                                <Bookmark size={16} style={{ color: 'var(--accent)' }} fill="var(--accent)" />
                                            )}
                                            <button onClick={(e) => deleteBrief(e, brief.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', padding: '0.2rem', transition: 'color 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = '#FF4444'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-sec)'}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <p style={{ color: 'var(--text-sec)', fontSize: '0.9rem', lineHeight: '1.6', flex: 1, marginBottom: '1.25rem', position: 'relative' }}>
                                        {snippet}
                                        <span style={{ position: 'absolute', bottom: 0, right: 0, width: '100%', height: '2rem', background: 'linear-gradient(transparent, #111111)' }} />
                                    </p>
                                    
                                    {sections.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                                            {sections.map(sec => (
                                                <span key={sec} style={{ fontSize: '0.7rem', color: '#888', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '0.2rem 0.6rem', textTransform: 'capitalize' }}>
                                                    {sec}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem', marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666' }}>
                                            <Clock size={12} />
                                            <span style={{ fontSize: '0.75rem' }}>{formatDate(brief.created_at)}</span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#000', fontWeight: '600', textTransform: 'capitalize', background: 'var(--accent)', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>
                                            {brief.length}
                                        </span>
                                    </div>
                                </div>
                            )
                        }))}
                    </div>
                </main>
            </div>
            {showCustomize && <CustomizePanel onClose={() => setShowCustomize(false)} />}
            {isMobile && (
              <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', padding: '0.5rem 0', zIndex: 100 }}>
                <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--accent)', fontSize: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🏠</span>Home
                </button>
                <button onClick={() => navigate('/brief/new')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-sec)', fontSize: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚡</span>New Brief
                </button>
                <button onClick={() => navigate('/history')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-sec)', fontSize: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🕐</span>History
                </button>
                <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: 'var(--text-sec)', fontSize: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>⚙</span>Settings
                </button>
              </nav>
            )}
        </div>
    )
}