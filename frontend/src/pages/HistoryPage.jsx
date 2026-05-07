import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Bookmark, Search, Sun, Moon } from 'lucide-react'
import api from '../lib/api'
import useIsMobile from '../hooks/useIsMobile'
import useThemeStore from '../store/themeStore'
import { BriefCardSkeleton } from '../components/Skeletons'

const DATE_FILTERS = ['all', 'today', 'this week', 'this month']

export default function HistoryPage() {
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    const { theme, toggleTheme } = useThemeStore()
    const [briefs, setBriefs] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [savedOnly, setSavedOnly] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    useEffect(() => { fetchBriefs() }, [])

    const fetchBriefs = async () => {
        try {
            const res = await api.get('/api/briefs')
            setBriefs(res.data.briefs || [])
        } catch (e) { }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        try {
            await api.delete(`/api/briefs/${id}`)
            setBriefs(briefs.filter(b => b.id !== id))
            setDeleteConfirm(null)
        } catch (e) { }
    }

    const filterByDate = (brief) => {
        if (dateFilter === 'all') return true
        const created = new Date(brief.created_at.endsWith('Z') || brief.created_at.includes('+') ? brief.created_at : brief.created_at + 'Z')
        const now = new Date()
        if (dateFilter === 'today') {
            return created.toDateString() === now.toDateString()
        }
        if (dateFilter === 'this week') {
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
            return created >= weekAgo
        }
        if (dateFilter === 'this month') {
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        }
        return true
    }

    const filtered = briefs
        .filter(b => b.company_name.toLowerCase().includes(search.toLowerCase()))
        .filter(filterByDate)
        .filter(b => savedOnly ? b.saved : true)

    const formatDate = (iso) => {
        if (!iso) return ''
        return new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>
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

            <div style={{ maxWidth: '800px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '1.5rem' }}>Brief History</h1>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: isMobile ? 'none' : 1, width: isMobile ? '100%' : 'auto', minWidth: '200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-sec)' }} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by company..."
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.5rem 0.75rem 0.5rem 2rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: isMobile ? 'wrap' : 'nowrap', overflowX: 'auto' }}>
                        {DATE_FILTERS.map(f => (
                            <button key={f} onClick={() => setDateFilter(f)}
                                style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: `1px solid ${dateFilter === f ? 'var(--accent)' : 'var(--border)'}`, background: dateFilter === f ? 'var(--accent-15)' : 'transparent', color: dateFilter === f ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                {f}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setSavedOnly(!savedOnly)}
                        style={{ padding: '0.4rem 0.75rem', borderRadius: '4px', border: `1px solid ${savedOnly ? 'var(--accent)' : 'var(--border)'}`, background: savedOnly ? 'var(--accent-15)' : 'transparent', color: savedOnly ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Space Grotesk, sans-serif', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                        <Bookmark size={12} /> Saved only
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => <BriefCardSkeleton key={i} />)
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>No briefs match your search.</p>
                        </div>
                    ) : (
                        filtered.map(brief => (
                            <div key={brief.id}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>

                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/brief/${brief.id}`)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{brief.company_name}</span>
                                    {brief.saved && <Bookmark size={13} style={{ color: 'var(--accent)' }} fill="var(--accent)" />}
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-sec)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '3px', padding: '0.1rem 0.4rem', textTransform: 'capitalize' }}>{brief.length}</span>
                                </div>
                                <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem', margin: 0 }}>{formatDate(brief.created_at)}</p>
                            </div>

                            <button onClick={() => setDeleteConfirm(brief.id)}
                                style={{ background: 'none', border: 'none', color: '#444444', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#444444'}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    )))}
                </div>
            </div>

            {/* Delete confirmation modal */}
            {deleteConfirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2rem', maxWidth: '380px', width: '90%' }}>
                        <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Delete this brief?</h3>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>This can't be undone.</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setDeleteConfirm(null)}
                                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.6rem', color: 'var(--text-sec)', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.875rem' }}>
                                Cancel
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm)}
                                style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.6rem', color: 'var(--text)', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.875rem', fontWeight: '700' }}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}