import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Heebo } from 'next/font/google'
import { DirectionProvider } from '@/components/ui/direction'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'STATIC LAB | אימוני קליסטניקס והחזקות',
  description:
    'אפליקציית אימון אישית לקליסטניקס: מעלים סרטון החזקה, מקבלים משוב מהמאמן ועוקבים אחרי ההתקדמות.',
  generator: 'v0.app',
  // Browser translators rewrite text nodes, which breaks React hydration and updates.
  other: { google: 'notranslate' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#14171c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" translate="no" className={`dark notranslate ${heebo.variable}`}>
      <body className="min-h-dvh antialiased">
        <DirectionProvider direction="rtl">{children}</DirectionProvider>
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
