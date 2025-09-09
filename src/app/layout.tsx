import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { LoginModalProvider } from '@/context/LoginModalContext'
import ErrorBoundary from '@/components/ErrorBoundary'
import { HideOnAdmin, MainWithDynamicPadding } from '@/components/AdminRouteGuards'

export const metadata: Metadata = {
  title: 'Anbudsmarkedet',
  description: 'Anbudsmarkedet AS',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <LoginModalProvider>
          <ErrorBoundary>
            {/* Skjul global Navbar på /admin */}
            <HideOnAdmin>
              <Navbar />
            </HideOnAdmin>

            {/* Dynamisk top-padding: kun utenfor /admin */}
            <MainWithDynamicPadding>{children}</MainWithDynamicPadding>
          </ErrorBoundary>
        </LoginModalProvider>
      </body>
    </html>
  )
}
