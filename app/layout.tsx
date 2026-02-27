import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
