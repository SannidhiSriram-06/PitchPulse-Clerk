import { useState, useEffect } from 'react'
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

    useEffect(() => {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('sidebar_open', sidebarOpen)
        }
    }, [sidebarOpen])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [briefsRes, watchlistRes] = await Promise.all([
                api.get('/api/briefs'),
                api.get('/api/watchlist')
            ])
            setBriefs(briefsRes.data.briefs || [])
            setWatchlist(watchlistRes.data.watchlist || [])

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
        const d = new Date(iso)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const formatLastBriefed = (isoString) => {
        if (!isoString) return null
        const date = new Date(isoString)
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
        return (new Date() - new Date(isoString)) / (1000 * 60 * 60 * 24) <= 7
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

                    <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search briefs..."
                        style={{ flex: 1, maxWidth: '400px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem 0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none' }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <button onClick={() => setShowCustomize(true)} title="Customize"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-sec)', padding: '0.25rem' }}>
                            ⚙
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
                    <aside style={{ width: sidebarOpen ? '240px' : '48px', borderRight: '1px solid var(--border)', padding: sidebarOpen ? '1.25rem' : '1.25rem 0.25rem', overflowY: 'auto', flexShrink: 0, transition: 'width 0.2s ease', position: 'relative' }}>
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
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: sidebarOpen ? 'space-between' : 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', gap: '0.5rem' }}>
                                {sidebarOpen && (
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.company_name}</div>
                                        {item.last_briefed_at ? (
                                            <div style={{ fontSize: '0.65rem', color: '#444444' }}>Briefed {formatLastBriefed(item.last_briefed_at)}</div>
                                        ) : (
                                            <div style={{ fontSize: '0.65rem', color: '#555555' }}>Never briefed</div>
                                        )}
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: sidebarOpen ? 'row' : 'column', gap: '0.25rem', flexShrink: 0, alignItems: 'center' }}>
                                    <button onClick={() => navigate(`/brief/new?company=${encodeURIComponent(item.company_name)}`)}
                                        style={{ background: 'var(--accent-15)', border: '1px solid var(--accent-30)', borderRadius: '3px', padding: '0.2rem 0.4rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                        <Zap size={10} />
                                    </button>
                                    {!sidebarOpen && (
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isWithin7Days(item.last_briefed_at) ? '#22C55E' : '#444444', marginTop: '2px' }} />
                                    )}
                                    {sidebarOpen && (
                                    <button onClick={() => removeFromWatchlist(item.id)}
                                        style={{ background: 'none', border: 'none', color: '#444444', cursor: 'pointer', padding: '0.2rem' }}>
                                        <X size={12} />
                                    </button>
                                    )}
                                </div>
                            </div>
                        )))}

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
                {isMobile && mobileDrawerOpen && (
                    <>
                        <div onClick={() => setMobileDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: '#0A0A0A99', zIndex: 499 }} />
                        <div style={{ position: 'fixed', left: 0, top: 0, height: '100vh', width: '280px', background: 'var(--surface)', borderRight: '1px solid var(--border)', zIndex: 500, transition: 'transform 0.25s ease', transform: 'translateX(0)', padding: '1.25rem', overflowY: 'auto' }}>
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
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', gap: '0.5rem' }}>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.company_name}</div>
                                        {item.last_briefed_at ? (
                                            <div style={{ fontSize: '0.65rem', color: '#444444' }}>Briefed {formatLastBriefed(item.last_briefed_at)}</div>
                                        ) : (
                                            <div style={{ fontSize: '0.65rem', color: '#555555' }}>Never briefed</div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                        <button onClick={() => { setMobileDrawerOpen(false); navigate(`/brief/new?company=${encodeURIComponent(item.company_name)}`) }}
                                            style={{ background: 'var(--accent-15)', border: '1px solid var(--accent-30)', borderRadius: '3px', padding: '0.2rem 0.4rem', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                            <Zap size={10} />
                                        </button>
                                        <button onClick={() => removeFromWatchlist(item.id)}
                                            style={{ background: 'none', border: 'none', color: '#444444', cursor: 'pointer', padding: '0.2rem' }}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                            )))}

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
                <main style={{ flex: 1, padding: isMobile ? '1.5rem 1rem' : '1.5rem', overflowY: 'auto', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
                        <div>
                            <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', fontWeight: '700', letterSpacing: '-0.5px', marginBottom: '0.2rem' }}>Recent Briefs</h1>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem' }}>{briefs.length} brief{briefs.length !== 1 ? 's' : ''} generated</p>
                        </div>
                        <button onClick={() => navigate('/brief/new')}
                            style={{ width: isMobile ? '100%' : 'auto', background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.6rem 1.25rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                            + Generate Brief
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', paddingBottom: isMobile ? '60px' : '0' }}>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => <BriefCardSkeleton key={i} />)
                        ) : filteredBriefs.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 0', textAlign: 'center', gap: '1rem' }}>
                                <p style={{ color: 'var(--text-sec)' }}>No briefs yet. Generate your first brief to get started.</p>
                                <button onClick={() => navigate('/brief/new')}
                                    style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'var(--accent)', color: '#000', fontWeight: '600', fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}>
                                    + Generate Brief
                                </button>
                            </div>
                        ) : (
                            filteredBriefs.map((brief) => {
                            const parsed = brief.brief || null
                            const rawSnippet = parsed?.summary?.content || parsed?.news?.content || Object.values(parsed || {}).find(s => s?.content)?.content || null
                            const snippet = rawSnippet ? (rawSnippet.length > 120 ? rawSnippet.slice(0, 120) + '...' : rawSnippet) : 'No preview available.'
                            return (
                                <div key={brief.id} onClick={() => navigate(`/brief/${brief.id}`)}
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#333333'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <h3 style={{ fontWeight: '700', fontSize: '0.95rem', letterSpacing: '-0.3px' }}>{brief.company_name}</h3>
                                        {brief.saved && (
                                            <Bookmark size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} fill="var(--accent)" />
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-1.5rem', marginBottom: '0.5rem', position: 'relative', zIndex: 10 }}>
                                        <button onClick={(e) => deleteBrief(e, brief.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-sec)', cursor: 'pointer', padding: '0.2rem', marginLeft: '0.5rem' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem', lineHeight: '1.5', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {snippet}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#444444' }}>{formatDate(brief.created_at)}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'capitalize', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0.15rem 0.4rem' }}>{brief.length}</span>
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