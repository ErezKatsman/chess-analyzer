'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessBoard } from '@/components/ChessBoard';
import { Button } from './ui/button';
import { OnboardingModal } from './OnboardingModal';

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
  const [showModal, setShowModal] = useState(false);

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
                Your personal AI coach — analyzes every game, finds your patterns,
                and builds a plan to get you to your next rating milestone.
              </p>
            </div>

            {/* feature chips */}
            <div className="flex flex-wrap gap-2">
              {['engine analysis', 'AI coaching', 'progress tracking'].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-400"
                >
                  <span className="text-emerald-400">✓</span> {f}
                </span>
              ))}
            </div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-fit"
            >
              <Button
                onClick={() => setShowModal(true)}
                className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-100 font-semibold rounded-xl shadow-lg shadow-white/10"
              >
                Analyze My Games →
              </Button>
            </motion.div>

            <p className="text-xs text-slate-500">Free to start · 3 analyses/month on the free plan</p>
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

      {/* onboarding modal */}
      <AnimatePresence>
        {showModal && <OnboardingModal onClose={() => setShowModal(false)} />}
      </AnimatePresence>
    </section>
  );
}
