import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'Chess Analyzer',
    template: '%s | Chess Analyzer',
  },
  description: 'Analyze PGN games and positions with engine-style evaluations and move grades.',
  applicationName: 'Chess Analyzer',
  keywords: ['chess', 'pgn', 'fen', 'analysis', 'stockfish', 'engine', 'chess.com'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <head>
          {/* apply saved theme before first paint to avoid flash */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}})()`,
            }}
          />
        </head>
        <body className="min-h-screen bg-background text-foreground antialiased">
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
