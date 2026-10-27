import './bootstrap'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@figma/astraui'
import ErrorBoundary from './components/ErrorBoundary'
import AdminConsole from './screens/AdminConsole'
import AdminSignInScreen from './screens/AdminSignInScreen'
import { SessionProvider, useSession } from './session'
import './index.css'

function AdminGate() {
  const { status, session, expiresAt, signIn, signOut, signOutReason } = useSession()

  if (status === 'loading') return null
  if (!session) {
    return <AdminSignInScreen onSignIn={signIn} signOutReason={signOutReason} />
  }
  return <AdminConsole session={session} expiresAt={expiresAt} onSignOut={() => void signOut()} />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fullScreen>
      <ThemeProvider>
        <SessionProvider>
          <AdminGate />
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
