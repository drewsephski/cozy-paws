import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: {
    default: 'Sitterfolio | Website for Pet Sitters',
    template: '%s | Sitterfolio'
  },
  description:
    'Create a pet-sitting site with your services, service area, and a form clients can use to ask about availability.',
  icons: {
    icon: '/brand/sitterfolio-paw.png',
    shortcut: '/brand/sitterfolio-paw.png',
    apple: '/brand/sitterfolio-paw.png'
  },
  keywords: [
    'website for pet sitters',
    'pet sitter contact page',
    'take Rover clients direct',
    'pet sitting website',
    'independent pet sitter website'
  ],
  openGraph: {
    title: 'Sitterfolio | Website for Pet Sitters',
    description:
      'A shareable website with services, service areas, and availability requests for independent pet sitters.',
    type: 'website'
  },
  twitter: {
    card: 'summary',
    title: 'Sitterfolio | Website for Pet Sitters',
    description:
      'Create a pet-sitting site and give clients one link to ask about availability.'
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
