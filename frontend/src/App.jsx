import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import { SignIn, SignUp } from '@clerk/clerk-react'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import BriefGeneratorPage from './pages/BriefGeneratorPage'
import BriefDisplayPage from './pages/BriefDisplayPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import PWAInstallBanner from './components/PWAInstallBanner'
import useIsMobile from './hooks/useIsMobile'

function OnboardingCheck() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!localStorage.getItem('onboarded')) {
      navigate('/onboarding', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [])
  return null
}

export default function App() {
  const isMobile = useIsMobile(768)

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Navigate to="/sign-in" replace />} />
        <Route path="/register" element={<Navigate to="/sign-up" replace />} />
        <Route path="/sign-in/*" element={
          <div style={{
            minHeight: '100vh',
            background: '#0A0A0A',
            display: 'flex',
          }}>
            {/* Left panel - branding */}
            {!isMobile && (
              <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 40%, #1a1a0a 100%)',
                borderRight: '1px solid #222222',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  left: '-100px',
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, #C8FF0015 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-50px',
                  right: '-50px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, #C8FF0008 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />

                {/* Logo */}
                <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#FFFFFF' }}>
                  Pitch<span style={{ color: '#C8FF00' }}>Pulse</span>
                </div>

                {/* Main pitch */}
                <div>
                  <h1 style={{
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: '800',
                    letterSpacing: '-2px',
                    lineHeight: '1.1',
                    color: '#FFFFFF',
                    marginBottom: '1.5rem',
                  }}>
                    Know your prospect.<br />
                    <span style={{ color: '#C8FF00' }}>Before you walk in.</span>
                  </h1>
                  <p style={{ color: '#888888', fontSize: '1rem', lineHeight: '1.7', maxWidth: '420px', marginBottom: '3rem' }}>
                    AI-powered sales briefs in under 60 seconds. News, financials, talking points, and risks — everything you need before any meeting.
                  </p>

                  {/* Feature pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { icon: '⚡', text: 'Brief any company in under 60 seconds' },
                      { icon: '🎯', text: 'Tailored talking points for your pitch' },
                      { icon: '📊', text: 'Live financials and recent news' },
                      { icon: '🔒', text: 'Free to use — no credit card needed' },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#C8FF0015',
                          border: '1px solid #C8FF0030',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}>
                          {f.icon}
                        </div>
                        <span style={{ color: '#CCCCCC', fontSize: '0.9rem' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom quote */}
                <div style={{ borderTop: '1px solid #222222', paddingTop: '1.5rem' }}>
                  <p style={{ color: '#555555', fontSize: '0.8rem' }}>
                    Trusted by sales reps who prep.
                  </p>
                </div>
              </div>
            )}

            {/* Right panel - Clerk component */}
            <div style={{
              width: isMobile ? '100%' : '480px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              background: '#0A0A0A',
            }}>
              <SignIn routing="path" path="/sign-in" forceRedirectUrl="/onboarding-check" />
            </div>
          </div>
        } />
        <Route path="/sign-up/*" element={
          <div style={{
            minHeight: '100vh',
            background: '#0A0A0A',
            display: 'flex',
          }}>
            {/* Left panel - branding */}
            {!isMobile && (
              <div style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0A0A0A 0%, #111111 40%, #1a1a0a 100%)',
                borderRight: '1px solid #222222',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  top: '-100px',
                  left: '-100px',
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, #C8FF0015 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-50px',
                  right: '-50px',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, #C8FF0008 0%, transparent 70%)',
                  pointerEvents: 'none',
                }} />

                {/* Logo */}
                <div style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.5px', color: '#FFFFFF' }}>
                  Pitch<span style={{ color: '#C8FF00' }}>Pulse</span>
                </div>

                {/* Main pitch */}
                <div>
                  <h1 style={{
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: '800',
                    letterSpacing: '-2px',
                    lineHeight: '1.1',
                    color: '#FFFFFF',
                    marginBottom: '1.5rem',
                  }}>
                    Know your prospect.<br />
                    <span style={{ color: '#C8FF00' }}>Before you walk in.</span>
                  </h1>
                  <p style={{ color: '#888888', fontSize: '1rem', lineHeight: '1.7', maxWidth: '420px', marginBottom: '3rem' }}>
                    AI-powered sales briefs in under 60 seconds. News, financials, talking points, and risks — everything you need before any meeting.
                  </p>

                  {/* Feature pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { icon: '⚡', text: 'Brief any company in under 60 seconds' },
                      { icon: '🎯', text: 'Tailored talking points for your pitch' },
                      { icon: '📊', text: 'Live financials and recent news' },
                      { icon: '🔒', text: 'Free to use — no credit card needed' },
                    ].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: '#C8FF0015',
                          border: '1px solid #C8FF0030',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}>
                          {f.icon}
                        </div>
                        <span style={{ color: '#CCCCCC', fontSize: '0.9rem' }}>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom quote */}
                <div style={{ borderTop: '1px solid #222222', paddingTop: '1.5rem' }}>
                  <p style={{ color: '#555555', fontSize: '0.8rem' }}>
                    Trusted by sales reps who prep.
                  </p>
                </div>
              </div>
            )}

            {/* Right panel - Clerk component */}
            <div style={{
              width: isMobile ? '100%' : '480px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              background: '#0A0A0A',
            }}>
              <SignUp routing="path" path="/sign-up" forceRedirectUrl="/onboarding-check" />
            </div>
          </div>
        } />
        <Route path="/onboarding-check" element={<OnboardingCheck />} />
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/brief/new" element={<ProtectedRoute><BriefGeneratorPage /></ProtectedRoute>} />
        <Route path="/brief/:id" element={<ProtectedRoute><BriefDisplayPage /></ProtectedRoute>} />
        <Route path="/brief/share/:token" element={<BriefDisplayPage />} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      </Routes>
      <PWAInstallBanner />
    </>
  )
}