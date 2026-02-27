'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ChessBoard } from '@/components/ChessBoard';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { checkAndSetUserExist } from '@/lib/userUtils';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// decorative pieces scattered at fixed positions — purely visual
const SCATTERED_PIECES = [
  { piece: '♟', top: '8%',  left: '3%',  size: '7xl' },
  { piece: '♜', top: '15%', right: '5%', size: '8xl' },
  { piece: '♞', bottom: '20%', left: '6%', size: '6xl' },
  { piece: '♝', top: '55%', left: '1%', size: '7xl' },
  { piece: '♛', bottom: '10%', right: '3%', size: '8xl' },
  { piece: '♚', top: '5%',  right: '18%', size: '6xl' },
  { piece: '♕', bottom: '30%', right: '8%', size: '7xl' },
  { piece: '♗', top: '40%', right: '2%', size: '6xl' },
] as const;

export function Hero() {
  const [userName, setUserName] = useState('');
  const [isClickable, setIsClickable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedUserName = userName.trim();

    if (!normalizedUserName) {
      setIsClickable(false);
      setError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkAndSetUserExist(setIsClickable, setError, normalizedUserName);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [userName]);

  return (
    <section className="relative min-h-screen bg-slate-950 flex items-center overflow-hidden">
      {/* scattered chess pieces — decorative only */}
      {SCATTERED_PIECES.map(({ piece, size, ...pos }) => (
        <span
          key={piece}
          aria-hidden="true"
          className={`absolute select-none pointer-events-none text-${size} text-white opacity-[0.07]`}
          style={pos}
        >
          {piece}
        </span>
      ))}

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* left — content */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-3">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Be a better<br />chess player
              </h1>
              <p className="text-lg text-slate-400 sm:text-xl">
                Analyze all your chess.com games for free.
                Engine-first insights, lessons, and drills.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {error && (
                <p className="text-sm font-medium text-red-400">{error}</p>
              )}

              <div className="flex gap-3 items-center">
                <Input
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-slate-500 h-12 text-base"
                  placeholder="chess.com username"
                  value={userName}
                  onChange={(e) => {
                    setIsClickable(false);
                    setError(null);
                    setUserName(e.target.value);
                  }}
                />

                <Link
                  aria-disabled={!isClickable}
                  href={{
                    pathname: '/user',
                    query: { userName: userName.trim() },
                  }}
                  className={!isClickable ? 'pointer-events-none' : ''}
                >
                  <Button
                    disabled={!isClickable}
                    className="h-12 px-6 text-base bg-white text-slate-950 hover:bg-slate-100"
                  >
                    Start
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* right — chess board, desktop only */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:flex justify-center"
          >
            <div className="w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
              <ChessBoard fen={START_FEN} orientation="white" showCoords={true} />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
