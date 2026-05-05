import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [token, setToken] = useState(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [status, setStatus] = useState('idle') // idle, loading, success, invalid
    const [error, setError] = useState('')

    useEffect(() => {
        const urlToken = new URLSearchParams(window.location.search).get('token')
        if (!urlToken) {
            setStatus('invalid')
            setError('Invalid reset link.')
        } else {
            setToken(urlToken)
        }
    }, [])

    const passwordReqs = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*]/.test(password)
    }
    const isPasswordValid = Object.values(passwordReqs).every(Boolean)

    const handleSubmit = async () => {
        setError('')
        if (!isPasswordValid) {
            setError('Password does not meet all requirements.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setStatus('loading')
        try {
            await api.post('/api/auth/reset-password', { token, new_password: password })
            setStatus('success')
            setTimeout(() => {
                navigate('/login')
            }, 2000)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password.')
            setStatus('idle')
        }
    }

    if (status === 'invalid') {
        return (
            <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1rem', color: '#EF4444' }}>Invalid Link</h2>
                    <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{error}</p>
                    <button onClick={() => navigate('/login')}
                        style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.875rem', color: 'var(--accent-text)', fontSize: '0.875rem', fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif', cursor: 'pointer' }}>
                        Go to Login
                    </button>
                </div>
            </div>
        )
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
                    Set new password
                </h2>
                
                {status === 'success' ? (
                    <div style={{ marginTop: '1rem' }}>
                        <p style={{ color: '#22C55E', fontSize: '0.875rem', marginBottom: '1.5rem', fontWeight: '600' }}>
                            Password reset! Redirecting to login...
                        </p>
                    </div>
                ) : (
                    <>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                            Please enter your new password below.
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>New Password</label>
                            <input
                                type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
                                placeholder="Min. 8 characters"
                                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                            />
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                <div style={{ fontSize: '0.75rem', color: passwordReqs.length ? '#22C55E' : 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>{passwordReqs.length ? '✓' : '○'}</span> Min. 8 characters
                                </div>
                                <div style={{ fontSize: '0.75rem', color: passwordReqs.uppercase ? '#22C55E' : 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>{passwordReqs.uppercase ? '✓' : '○'}</span> One uppercase letter
                                </div>
                                <div style={{ fontSize: '0.75rem', color: passwordReqs.number ? '#22C55E' : 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>{passwordReqs.number ? '✓' : '○'}</span> One number
                                </div>
                                <div style={{ fontSize: '0.75rem', color: passwordReqs.special ? '#22C55E' : 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span>{passwordReqs.special ? '✓' : '○'}</span> One special character (!@#$%^&*)
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Confirm Password</label>
                            <input
                                type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder="Confirm your new password"
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
                            {status === 'loading' ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
