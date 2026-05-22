import { Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'

export default function ProtectedRoute({ children }) {
    const { isSignedIn, isLoaded } = useAuth()
    
    if (!isLoaded) return (
        <div style={{
            minHeight: '100vh',
            background: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-sec)',
            fontSize: '0.875rem'
        }}>
            Loading...
        </div>
    )
    if (!isSignedIn) return <Navigate to="/sign-in" replace />
    
    return children
}