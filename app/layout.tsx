import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthSection from '@/shared/components/AuthSection/AuthSection';

/**
 * Viewport configuration — theme color for mobile browsers.
 */
export const viewport: Viewport = {
  themeColor: '#0A0F1C',
};

/**
 * Root metadata for SEO — title and description.
 */
export const metadata: Metadata = {
  title: 'MoodMap — Find Places That Match Your Mood',
  description:
    'AI-powered location discovery based on your current mood. Drop a vibe, get a place.',
};

/**
 * RootLayout is the top-level layout for the entire application.
 * It wraps all pages with:
 * - Global CSS with Tailwind v4 design tokens
 * - HTML lang attribute for accessibility
 * - AuthSection: fixed top-right Sign In / avatar nav (guest-first)
 *
 * @param props.children - Page content rendered inside the layout
 * @returns The root HTML document shell
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Global auth nav — guest Sign In pill / authenticated avatar */}
        <AuthSection />
        {children}
      </body>
    </html>
  );
}
