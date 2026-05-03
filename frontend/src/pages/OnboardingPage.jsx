import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import usePrefsStore from '../store/prefsStore'
import api from '../lib/api'

export default function OnboardingPage() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const setPrefs = usePrefsStore((s) => s.setPrefs)

    const [step, setStep] = useState(1)
    const [company, setCompany] = useState('')
    const [companies, setCompanies] = useState([])
    const [length, setLength] = useState('medium')
    const [view, setView] = useState('tabs')
    const [loading, setLoading] = useState(false)

    const addCompany = () => {
        const trimmed = company.trim()
        if (!trimmed || companies.includes(trimmed) || companies.length >= 5) return
        setCompanies([...companies, trimmed])
        setCompany('')
    }

    const removeCompany = (c) => setCompanies(companies.filter((x) => x !== c))

    const finish = async () => {
        setLoading(true)
        setPrefs({ defaultLength: length, defaultView: view })
        try {
            for (const c of companies) {
                await api.post('/api/watchlist', { company_name: c })
            }
        } catch (e) { /* non-fatal */ }
        localStorage.setItem('onboarded', 'true')
        navigate('/dashboard')
    }

    const stepLabel = ['Add companies', 'Set preferences', "You're ready"]

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

            {/* Logo */}
            <div style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '3rem', letterSpacing: '-0.5px' }}>
                Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
            </div>

            {/* Step indicators */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', alignItems: 'center' }}>
                {[1, 2, 3].map((s) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: '700',
                            background: step === s ? 'var(--accent)' : step > s ? 'var(--border)' : 'var(--surface)',
                            color: step === s ? 'var(--bg)' : step > s ? 'var(--text-sec)' : '#444444',
                            border: step > s ? '1px solid #333' : 'none'
                        }}>
                            {step > s ? '✓' : s}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: step === s ? 'var(--text)' : '#444444' }}>{stepLabel[s - 1]}</span>
                        {s < 3 && <div style={{ width: '2rem', height: '1px', background: 'var(--border)', marginLeft: '0.25rem' }} />}
                    </div>
                ))}
            </div>

            {/* Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2.5rem', width: '100%', maxWidth: '480px' }}>

                {/* Step 1 */}
                {step === 1 && (
                    <>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>Add companies you meet often</h2>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>These go on your watchlist for quick one-click briefs. Add up to 5.</p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                value={company} onChange={(e) => setCompany(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCompany()}
                                placeholder="e.g. Infosys, Razorpay..."
                                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', outline: 'none' }}
                            />
                            <button onClick={addCompany} disabled={companies.length >= 5}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.75rem 1rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                Add
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '2rem', marginBottom: '1.5rem' }}>
                            {companies.map((c) => (
                                <div key={c} style={{ background: 'var(--bg)', border: '1px solid #333', borderRadius: '4px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {c}
                                    <span onClick={() => removeCompany(c)} style={{ color: 'var(--text-sec)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</span>
                                </div>
                            ))}
                            {companies.length === 0 && <span style={{ color: '#444', fontSize: '0.8rem' }}>No companies added yet</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span onClick={() => setStep(2)} style={{ color: 'var(--text-sec)', fontSize: '0.8rem', cursor: 'pointer' }}>Skip</span>
                            <button onClick={() => setStep(2)}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.75rem 1.5rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                Continue →
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2 */}
                {step === 2 && (
                    <>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>Set your brief preferences</h2>
                        <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>You can change these any time in settings.</p>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>Default brief length</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['short', 'medium', 'long'].map((l) => (
                                    <button key={l} onClick={() => setLength(l)}
                                        style={{ flex: 1, padding: '0.6rem', borderRadius: '4px', border: `1px solid ${length === l ? 'var(--accent)' : 'var(--border)'}`, background: length === l ? 'var(--accent-15)' : 'var(--bg)', color: length === l ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: length === l ? '700' : '400', textTransform: 'capitalize' }}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.75rem' }}>Default view style</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {['tabs', 'cards'].map((v) => (
                                    <button key={v} onClick={() => setView(v)}
                                        style={{ flex: 1, padding: '0.6rem', borderRadius: '4px', border: `1px solid ${view === v ? 'var(--accent)' : 'var(--border)'}`, background: view === v ? 'var(--accent-15)' : 'var(--bg)', color: view === v ? 'var(--accent)' : 'var(--text-sec)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif', fontWeight: view === v ? '700' : '400', textTransform: 'capitalize' }}>
                                        {v === 'tabs' ? 'Tabs' : 'Cards'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={() => setStep(1)}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem 1.25rem', color: 'var(--text-sec)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                ← Back
                            </button>
                            <button onClick={() => setStep(3)}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.75rem 1.5rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                Continue →
                            </button>
                        </div>
                    </>
                )}

                {/* Step 3 */}
                {step === 3 && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>You're all set</h2>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>Here's what we saved for you.</p>
                        </div>

                        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '1.25rem', marginBottom: '2rem' }}>
                            {[
                                { label: 'Watchlist', value: companies.length > 0 ? companies.join(', ') : 'None added' },
                                { label: 'Default length', value: length },
                                { label: 'Default view', value: view },
                            ].map((item) => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' }}>
                                    <span style={{ color: 'var(--text-sec)', fontSize: '0.875rem' }}>{item.label}</span>
                                    <span style={{ fontSize: '0.875rem', textTransform: 'capitalize', color: 'var(--text)' }}>{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={() => setStep(2)}
                                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.75rem 1.25rem', color: 'var(--text-sec)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                ← Back
                            </button>
                            <button onClick={finish} disabled={loading}
                                style={{ background: 'var(--accent)', border: 'none', borderRadius: '4px', padding: '0.75rem 1.5rem', color: 'var(--accent-text)', fontWeight: '700', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Space Grotesk, sans-serif' }}>
                                {loading ? 'Saving...' : 'Go to Dashboard →'}
                            </button>
                        </div>
                    </>
                )}

            </div>
        </div>
    )
}