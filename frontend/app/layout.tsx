import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'STEM Idea Adventure - AI-Powered Project Generator',
  description: 'An immersive 3D platform combining AI intelligence with stunning visuals to revolutionize STEM education',
  authors: [{ name: 'Hardik Bhaskar' }],
  keywords: ['STEM', 'AI', 'Projects', 'Education', 'Robotics', 'Arduino', 'Three.js'],
  openGraph: {
    title: 'STEM Idea Adventure',
    description: 'Transform your ideas into reality with AI-powered project suggestions',
    type: 'website',
    images: ['/images/og-portrait.png'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@lovable_dev',
    images: ['/images/og-portrait.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
