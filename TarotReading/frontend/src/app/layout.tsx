/**
 * Root Layout
 * Wraps entire app with SessionProvider and global styles
 */

import React from 'react';
import { SessionProvider } from '../contexts/SessionContext';
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Tarot Friend - Compassionate Guidance',
  description: 'Your compassionate companion for reflection and guidance through tarot readings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
