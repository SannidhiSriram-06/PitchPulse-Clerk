import { useNavigate } from 'react-router-dom'
import { Zap, Search, FileText, TrendingUp } from 'lucide-react'
import useIsMobile from '../hooks/useIsMobile'

export default function LandingPage() {
    const navigate = useNavigate()

    const isMobile = useIsMobile()

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)' }}>

            {/* Nav */}
            <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 1rem' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                        Pitch<span style={{ color: 'var(--accent)' }}>Pulse</span>
                    </span>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={() => navigate('/login')}
                            style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            style={{ background: 'var(--accent)', border: 'none', color: 'var(--accent-text)', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '4rem 1rem 3rem' : '6rem 2rem 4rem' }}>
                <div style={{ maxWidth: '800px' }}>
                    <div style={{ display: 'inline-block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.25rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-sec)', marginBottom: '2rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        AI-powered sales intelligence
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 8vw, 4.5rem)', fontWeight: '800', lineHeight: '1.05', letterSpacing: '-2px', marginBottom: '1.5rem' }}>
                        Know your prospect<br />
                        <span style={{ color: 'var(--accent)' }}>before you walk in</span><br />
                        the door.
                    </h1>
                    <p style={{ fontSize: '1.125rem', color: 'var(--text-sec)', lineHeight: '1.7', marginBottom: '2.5rem', maxWidth: '540px' }}>
                        Type a company name. Get a structured pre-meeting brief in under 60 seconds — news, financials, talking points, risks. Everything you need, nothing you don't.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate('/register')}
                            style={{ background: 'var(--accent)', border: 'none', color: 'var(--accent-text)', padding: '0.875rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.3px' }}
                        >
                            Get Started — it's free
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            style={{ background: 'none', border: '1px solid #333333', color: 'var(--text)', padding: '0.875rem 2rem', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            See Demo →
                        </button>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                <div style={{ borderTop: '1px solid var(--border)' }} />
            </div>

            {/* Features */}
            <section style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '3rem 1rem' : '4rem 2rem' }}>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3rem' }}>
                    What you get in every brief
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)' }}>
                    {[
                        { icon: <Search size={20} />, title: 'Live Company Research', desc: 'Three AI agents search the web in real time. News from the last 7 days, leadership changes, product launches — always current.' },
                        { icon: <TrendingUp size={20} />, title: 'Financial Signals', desc: 'Revenue trends, funding rounds, cost-cutting moves. Know if they\'re in growth mode or tightening budgets before you pitch.' },
                        { icon: <FileText size={20} />, title: 'Ready-to-Use Talking Points', desc: 'Not summaries — actual conversation starters. Angles that connect your product to what\'s happening in their world right now.' },
                        { icon: <Zap size={20} />, title: 'Watch Out For', desc: 'Risks, sensitivities, and landmines. Know what not to say, and what objections are likely coming before they do.' },
                    ].map((f, i) => (
                        <div key={i} style={{ background: 'var(--bg)', padding: '2rem' }}>
                            <div style={{ color: 'var(--accent)', marginBottom: '1rem' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.3px' }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '2rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.75rem', margin: 0 }}>
                    PitchPulse — Built for B2B sales reps who prep.
                </p>
            </footer>

        </div>
    )
}