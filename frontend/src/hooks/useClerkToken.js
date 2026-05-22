import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { setAuthToken } from '../lib/api'

export function useClerkToken() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthToken(getToken)
    return () => setAuthToken(null)
  }, [getToken])
}
