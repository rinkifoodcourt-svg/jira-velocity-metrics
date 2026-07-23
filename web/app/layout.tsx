import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

const font = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Jira Velocity Dashboard',
  description: 'AI Usage Metrics and Developer Commit Analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={font.variable}>
      <body className={font.className}>{children}</body>
    </html>
  )
}

