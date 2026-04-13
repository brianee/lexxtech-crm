import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'LexxTech — Personal Workspace',
  description: 'Your personal CRM, task tracker, and network manager.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'LexxTech — Personal Workspace',
    description: 'Your personal CRM, task tracker, and network manager.',
    url: 'https://lexxtech.crm',
    siteName: 'LexxTech',
    images: [
      {
        url: '/icon.png',
        width: 512,
        height: 512,
        alt: 'LexxTech Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LexxTech — Personal Workspace',
    description: 'Your personal CRM, task tracker, and network manager.',
    images: ['/icon.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0d12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
