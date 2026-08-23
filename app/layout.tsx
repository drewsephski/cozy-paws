import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { getAppOrigin } from '@/lib/app-url';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppOrigin()),
  title: {
    default: 'Sitterfolio | Website for Pet Sitters',
    template: '%s | Sitterfolio'
  },
  description:
    'Build a simple website for your pet-sitting business. Publish your services and service area, then collect availability requests in one inbox.',
  icons: {
    icon: '/brand/sitterfolio-paw.png',
    shortcut: '/brand/sitterfolio-paw.png',
    apple: '/brand/sitterfolio-paw.png'
  },
  keywords: [
    'website for pet sitters',
    'pet sitter contact page',
    'pet sitter portfolio',
    'pet sitter availability form',
    'pet sitting website',
    'independent pet sitter website'
  ],
  openGraph: {
    title: 'Sitterfolio | Website for Pet Sitters',
    description: 'Build a pet-sitting website with your services, service area, and a form for availability requests.',
    type: 'website',
    url: '/',
    siteName: 'Sitterfolio',
    images: [{ url: '/brand/sitterfolio-logo.png', alt: 'Sitterfolio' }]
  },
  twitter: {
    card: 'summary',
    title: 'Sitterfolio | Website for Pet Sitters',
    description:
      'Build a pet-sitting website and give clients one link to ask about availability.'
  }
};

const themeScript = `(() => { try { const saved = localStorage.getItem('theme'); const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; } catch {} })()`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="sitterfolio-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className={`${geistSans.className} ${geistSans.variable} antialiased`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
