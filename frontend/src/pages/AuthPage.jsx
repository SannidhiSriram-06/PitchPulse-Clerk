import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../lib/api'

export default function AuthPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const login = useAuthStore((s) => s.login)

    const isRegister = location.pathname === '/register'
    const [mode, setMode] = useState(isRegister ? 'register' : 'login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        setError('')
        if (!email || !password) { setError('Email and password are required.'); return }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

        setLoading(true)
        try {
            if (mode === 'register') {
                const res = await api.post('/api/auth/register', { email, password })
                login(res.data.token, { email })
                navigate('/onboarding')
            } else {
                const res = await api.post('/api/auth/login', { email, password })
                login(res.data.token, res.data.user)
                navigate('/dashboard')
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

            {/* Logo */}
            <div onClick={() => navigate('/')} style={{ cursor: 'pointer', fontSize: '1.25rem', fontWeight: '700', marginBottom: '2.5rem', letterSpacing: '-0.5px' }}>
                Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
            </div>

            {/* Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

                {/* Toggle */}
                <div style={{ display: 'flex', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '2rem', padding: '4px', gap: '4px' }}>
                    {['login', 'register'].map((m) => (
                        <button key={m} onClick={() => { setMode(m); setError('') }}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', fontFamily: 'Space Grotesk, sans-serif', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? 'var(--bg)' : 'var(--text-sec)', transition: 'all 0.15s' }}>
                            {m === 'login' ? 'Log in' : 'Register'}
                        </button>
                    ))}
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
                    {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                    {mode === 'login' ? 'Log in to access your briefs.' : 'Free forever. No credit card needed.'}
                </p>

                {/* Fields */}
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
                    <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="you@company.com"
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Password</label>
                    <input
                        type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        placeholder="Min. 8 characters"
                        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: '#1a0a0a', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.75rem', marginBottom: '1rem', color: '#EF4444', fontSize: '0.875rem' }}>
                        {error}
                    </div>
                )}

                {/* Submit */}
                <button onClick={handleSubmit} disabled={loading}
                    style={{ width: '100%', background: loading ? 'var(--text-sec)' : 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.875rem', color: 'var(--accent-text)', fontSize: '0.875rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '-0.3px' }}>
                    {loading ? 'Please wait...' : mode === 'login' ? 'Log in →' : 'Create account →'}
                </button>

            </div>

            <p style={{ color: 'var(--text-sec)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ color: 'var(--accent)', cursor: 'pointer' }}>
                    {mode === 'login' ? 'Register' : 'Log in'}
                </span>
            </p>

        </div>
    )
}