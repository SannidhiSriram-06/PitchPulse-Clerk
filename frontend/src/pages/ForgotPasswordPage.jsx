import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle') // idle, loading, success
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        setError('')
        if (!email) {
            setError('Please enter your email address.')
            return
        }

        setStatus('loading')
        try {
            await api.post('/api/auth/forgot-password', { email })
            setStatus('success')
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send reset link.')
            setStatus('idle')
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
                    Forgot your password?
                </h2>
                
                {status === 'success' ? (
                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: 'var(--text)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            Check your inbox — a reset link is on its way. If you don't see it, check your spam folder.
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                            Enter your email and we'll send you a reset link.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Email</label>
                            <input
                                type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder="you@company.com"
                                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {error && (
                            <div style={{ background: '#1a0a0a', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.75rem', marginBottom: '1.5rem', color: '#EF4444', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <button onClick={handleSubmit} disabled={status === 'loading'}
                            style={{ width: '100%', background: status === 'loading' ? 'var(--text-sec)' : 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.875rem', color: 'var(--accent-text)', fontSize: '0.875rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', cursor: status === 'loading' ? 'not-allowed' : 'pointer', letterSpacing: '-0.3px' }}>
                            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </>
                )}
            </div>

            <p style={{ marginTop: '1.5rem' }}>
                <span onClick={() => navigate('/login')} style={{ color: 'var(--text-sec)', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none' }}>
                    ← Back to login
                </span>
            </p>
        </div>
    )
}
