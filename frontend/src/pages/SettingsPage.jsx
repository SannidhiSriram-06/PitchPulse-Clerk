import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sun, Moon } from 'lucide-react'
import useAuthStore from '../store/authStore'
import usePrefsStore from '../store/prefsStore'
import api from '../lib/api'
import useIsMobile from '../hooks/useIsMobile'
import useThemeStore from '../store/themeStore'

export default function SettingsPage() {
    const navigate = useNavigate()
    const isMobile = useIsMobile()
    const { user, logout } = useAuthStore()
    const { defaultLength, defaultView, setPrefs } = usePrefsStore()
    const { theme, toggleTheme } = useThemeStore()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [pwMsg, setPwMsg] = useState('')
    const [pwError, setPwError] = useState('')
    const [pwLoading, setPwLoading] = useState(false)

    const [length, setLength] = useState(defaultLength || 'medium')
    const [view, setView] = useState(defaultView || 'tabs')
    const [prefsSaved, setPrefsSaved] = useState(false)

    const [deleteModal, setDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)

    const handleChangePassword = async () => {
        setPwMsg(''); setPwError('')
        if (!currentPassword || !newPassword) { setPwError('Both fields are required.'); return }
        if (newPassword.length < 8) { setPwError('New password must be at least 8 characters.'); return }
        setPwLoading(true)
        try {
            await api.post('/api/auth/change-password', { current_password: currentPassword, new_password: newPassword })
            setPwMsg('Password updated successfully.')
            setCurrentPassword(''); setNewPassword('')
        } catch (err) {
            setPwError(err.response?.data?.error || 'Failed to update password.')
        }
        setPwLoading(false)
    }

    const handleSavePrefs = async () => {
        setPrefs({ defaultLength: length, defaultView: view })
        try {
            await api.patch('/api/user/preferences', { default_length: length, default_view: view })
        } catch (e) { }
        setPrefsSaved(true)
        setTimeout(() => setPrefsSaved(false), 2000)
    }

    const handleDeleteAccount = async () => {
        setDeleteLoading(true)
        try {
            await api.delete('/api/auth/account')
            logout()
            navigate('/')
        } catch (e) { }
        setDeleteLoading(false)
    }

    const sectionStyle = {
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '1.5rem',
        marginBottom: '1rem'
    }

    const labelStyle = {
        fontSize: '0.7rem',
        color: 'var(--text-sec)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        display: 'block',
        marginBottom: '0.5rem'
    }

    const inputStyle = {
        width: '100%',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '4px',
        padding: '0.75rem',
        color: 'var(--text)',
        fontSize: '0.875rem',
        fontFamily: 'Space Grotesk, sans-serif',
        outline: 'none',
        boxSizing: 'border-box',
        marginBottom: '0.75rem'
    }

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

            <div style={{ maxWidth: '600px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2rem 1.5rem' }}>
                <h1 style={{ fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', fontWeight: '800', letterSpacing: '-1px', marginBottom: '1.5rem' }}>Settings</h1>

                {/* Account */}
                <div style={sectionStyle}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Account</p>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-sec)' }}>
                        {user?.email}
                    </div>

                    <p style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.75rem' }}>Change Password</p>
                    <label style={labelStyle}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password" style={inputStyle} />
                    <label style={labelStyle}>New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                        placeholder="Min. 8 characters" style={{ ...inputStyle, marginBottom: '1rem' }} />

                    {pwError && <div style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{pwError}</div>}
                    {pwMsg && <div style={{ color: '#22C55E', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{pwMsg}</div>}

                    <button onClick={handleChangePassword} disabled={pwLoading}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.6rem 1.25rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                        {pwLoading ? 'Updating...' : 'Update Password'}
                    </button>
                </div>

                {/* Preferences */}
                <div style={sectionStyle}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Preferences</p>

                    <label style={labelStyle}>Default Brief Length</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {['short', 'medium', 'long'].map(l => (
                            <button key={l} onClick={() => setLength(l)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: `1px solid ${length === l ? 'var(--accent)' : 'var(--border)'}`, background: length === l ? 'var(--accent-15)' : 'var(--bg)', color: length === l ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: length === l ? '700' : '400', textTransform: 'capitalize' }}>
                                {l}
                            </button>
                        ))}
                    </div>

                    <label style={labelStyle}>Default View</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        {['tabs', 'cards'].map(v => (
                            <button key={v} onClick={() => setView(v)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`, background: view === v ? 'var(--accent-15)' : 'var(--bg)', color: view === v ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: view === v ? '700' : '400', textTransform: 'capitalize' }}>
                                {v}
                            </button>
                        ))}
                    </div>

                    <button onClick={handleSavePrefs}
                        style={{ background: prefsSaved ? '#22C55E' : 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.6rem 1.25rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', transition: 'background 0.2s' }}>
                        {prefsSaved ? 'Saved ✓' : 'Save Preferences'}
                    </button>
                </div>

                {/* Subscription */}
                <div style={sectionStyle}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Subscription</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <p style={{ fontWeight: '700', margin: 0 }}>Free Plan</p>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>3 briefs per hour</p>
                        </div>
                        <span style={{ background: 'var(--border)', color: 'var(--text-sec)', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '3px' }}>CURRENT</span>
                    </div>

                    <div style={{ background: 'var(--bg)', border: '1px solid #333333', borderRadius: '6px', padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <p style={{ fontWeight: '700', margin: 0, color: 'var(--accent)' }}>Pro Plan</p>
                                <p style={{ color: 'var(--text-sec)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>Unlimited briefs · Priority generation</p>
                            </div>
                            <span style={{ background: 'var(--accent-20)', color: 'var(--accent)', fontSize: '0.65rem', padding: '0.2rem 0.6rem', borderRadius: '3px', border: '1px solid var(--accent-40)', whiteSpace: 'nowrap' }}>COMING SOON</span>
                        </div>
                        <button disabled
                            style={{ background: 'var(--border)', border: 'none', borderRadius: '4px', padding: '0.6rem 1.25rem', color: '#555555', cursor: 'not-allowed', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700' }}>
                            Upgrade — Coming Soon
                        </button>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 }}>
                            Pro tier coming soon. <a href="mailto:hello@pitchpulse.app" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Join the waitlist →</a>
                        </p>
                    </div>
                </div>

                {/* Danger Zone */}
                <div style={{ ...sectionStyle, border: '1px solid #2a1010' }}>
                    <p style={{ fontSize: '0.7rem', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Danger Zone</p>
                    <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1rem' }}>Permanently delete your account and all briefs. This cannot be undone.</p>
                    <button onClick={() => setDeleteModal(true)}
                        style={{ background: 'none', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.6rem 1.25rem', color: '#EF4444', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700' }}>
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Delete modal */}
            {deleteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid #2a1010', borderRadius: '8px', padding: '2rem', maxWidth: '400px', width: '100%' }}>
                        <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>Delete your account?</h3>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>All your briefs and data will be permanently deleted. There's no going back.</p>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => setDeleteModal(false)}
                                style={{ flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.6rem', color: 'var(--text-sec)', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif' }}>
                                Cancel
                            </button>
                            <button onClick={handleDeleteAccount} disabled={deleteLoading}
                                style={{ flex: 1, background: '#EF4444', border: 'none', borderRadius: '4px', padding: '0.6rem', color: 'var(--text)', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '700' }}>
                                {deleteLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}