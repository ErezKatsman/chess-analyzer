'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useClerk } from '@clerk/nextjs';
import { X, ChevronLeft } from 'lucide-react';
import { checkUserExists } from '@/lib/services/chesscom';
import { Button } from './ui/button';
import { Input } from './ui/input';

// stored in sessionStorage so ConnectAccount can auto-submit after auth
export type OnboardingStoredData = {
  chessUsername: string;
  targetRating?: number;
  timePreference?: 'bullet' | 'blitz' | 'rapid' | 'classical';
  experience?: 'beginner' | 'intermediate' | 'experienced';
  selfReportedWeakness?: string;
};

export const ONBOARDING_KEY = 'chess_onboarding';

type Step = 0 | 1 | 2 | 3 | 4 | 5;
type ChessStats = { blitz?: number; rapid?: number; bullet?: number };
type ChessStatsRes = {
  chess_blitz?: { last?: { rating?: number } };
  chess_rapid?: { last?: { rating?: number } };
  chess_bullet?: { last?: { rating?: number } };
};

const STEPS = 6;

export function OnboardingModal({ onClose }: { onClose: () => void }) {
  const { openSignIn } = useClerk();
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [data, setData] = useState<OnboardingStoredData>({ chessUsername: '' });

  // step 0 local state
  const [usernameInput, setUsernameInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [stats, setStats] = useState<ChessStats | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  // which rating type the user wants to improve (step 1)
  const [selectedRatingType, setSelectedRatingType] = useState<'blitz' | 'rapid' | 'bullet' | null>(null);

  // direction-aware slide animation
  const slide = {
    initial: { opacity: 0, x: 32 * direction },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -32 * direction },
    transition: { duration: 0.22, ease: 'easeInOut' as const },
  };

  async function handleValidateUsername() {
    const name = usernameInput.trim();
    if (!name || validating) return;
    setValidating(true);
    setUsernameError(null);
    try {
      const exists = await checkUserExists(name);
      if (!exists) {
        setUsernameError('Username not found on chess.com');
        return;
      }
      const [statsRes, checkRes] = await Promise.all([
        fetch(`https://api.chess.com/pub/player/${encodeURIComponent(name)}/stats`),
        fetch(`/api/user/check-chess-com?userName=${encodeURIComponent(name)}`),
      ]);
      if (statsRes.ok) {
        const d = (await statsRes.json()) as ChessStatsRes;
        const parsed: ChessStats = {
          blitz: d.chess_blitz?.last?.rating,
          rapid: d.chess_rapid?.last?.rating,
          bullet: d.chess_bullet?.last?.rating,
        };
        setStats(parsed);
        // default to the first available rating type
        const defaultType = parsed.blitz ? 'blitz' : parsed.rapid ? 'rapid' : parsed.bullet ? 'bullet' : null;
        setSelectedRatingType(defaultType);
      }
      if (checkRes.ok) {
        const { hasAccount } = (await checkRes.json()) as { hasAccount: boolean };
        setHasExistingAccount(hasAccount);
      }
      setData(prev => ({ ...prev, chessUsername: name }));
      setStatsLoaded(true);
    } catch {
      setUsernameError('Something went wrong. Try again.');
    } finally {
      setValidating(false);
    }
  }

  function next(update?: Partial<OnboardingStoredData>) {
    if (update) setData(prev => ({ ...prev, ...update }));
    setDirection(1);
    setStep(s => (s < 5 ? ((s + 1) as Step) : s));
  }

  function skip() {
    setDirection(1);
    setStep(s => (s < 5 ? ((s + 1) as Step) : s));
  }

  function back() {
    setDirection(-1);
    if (step === 1 && statsLoaded) {
      // going back to step 0 — re-show the stats view (don't reset it)
      setStep(0);
      return;
    }
    setStep(s => (s > 0 ? ((s - 1) as Step) : s));
  }

  function handleSignIn() {
    sessionStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    openSignIn({ afterSignInUrl: '/', afterSignUpUrl: '/' });
  }

  // current rating for the selected type — drives step 1 context
  const RATING_TYPE_LABEL: Record<string, string> = { blitz: 'Blitz', rapid: 'Rapid', bullet: 'Bullet' };
  const currentRating = selectedRatingType ? (stats?.[selectedRatingType] ?? null) : null;
  const currentRatingLabel = selectedRatingType ? (RATING_TYPE_LABEL[selectedRatingType] ?? '') : '';

  const stepLabel = `Step ${step + 1} of ${STEPS}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl ring-1 ring-white/10 overflow-hidden"
      >
        {/* progress bar */}
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-white"
            animate={{ width: `${(step / (STEPS - 1)) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        <div className="p-8">
          {/* top controls: back (left) + close (right) */}
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={back} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm">
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <span />
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              {/* ── Step 0: Username ── */}
              {step === 0 && (
                <motion.div key="s0" {...slide} className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">{"What's your chess.com username?"}</h2>
                    <p className="text-slate-400 mt-2 text-sm">{"We'll analyze your games and build a personal coaching plan."}</p>
                  </div>
                  {!statsLoaded ? (
                    <div className="space-y-3">
                      <Input
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-12"
                        placeholder="your-username"
                        value={usernameInput}
                        onChange={e => { setUsernameInput(e.target.value); setUsernameError(null); }}
                        onKeyDown={e => { if (e.key === 'Enter') void handleValidateUsername(); }}
                        autoFocus
                      />
                      {usernameError && <p className="text-sm text-red-400">{usernameError}</p>}
                      <Button
                        onClick={() => void handleValidateUsername()}
                        disabled={!usernameInput.trim() || validating}
                        className="w-full h-11 bg-white text-slate-950 hover:bg-slate-100 font-semibold"
                      >
                        {validating ? 'Checking…' : 'Continue →'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <p className="text-emerald-400 font-medium text-sm">{data.chessUsername} ✓</p>
                        <button onClick={() => setStatsLoaded(false)} className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors">change</button>
                      </div>
                      {(stats?.blitz ?? stats?.rapid ?? stats?.bullet) && (
                        <div className="grid grid-cols-3 gap-3">
                          {([['Blitz', stats?.blitz], ['Rapid', stats?.rapid], ['Bullet', stats?.bullet]] as [string, number | undefined][])
                            .filter(([, r]) => r !== undefined)
                            .map(([label, rating]) => (
                              <div key={label} className="bg-slate-800 rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-white">{rating}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                              </div>
                            ))}
                        </div>
                      )}
                      {hasExistingAccount ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                          <p className="text-amber-300 text-sm">👋 This username is already linked to an account!</p>
                          <div className="flex gap-2">
                            <Button onClick={handleSignIn} size="sm" className="flex-1 bg-amber-500 text-slate-950 hover:bg-amber-400">
                              Sign In
                            </Button>
                            <Button onClick={() => setHasExistingAccount(false)} size="sm" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:text-white">
                              Continue anyway
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => next()} className="w-full h-11 bg-white text-slate-950 hover:bg-slate-100 font-semibold">
                          Looks good →
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Step 1: Target rating ── */}
              {step === 1 && (
                <motion.div key="s1" {...slide} className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">{"What's your rating goal?"}</h2>
                    <p className="text-slate-400 mt-2 text-sm">{"We'll tailor your lessons to get you there."}</p>
                  </div>
                  {/* rating type selector — pick which time control to track */}
                  {stats && (['blitz', 'rapid', 'bullet'] as const).some(t => stats[t] != null) && (
                    <div>
                      <p className="text-xs text-slate-500 mb-2">which rating do you want to improve?</p>
                      <div className="flex gap-2">
                        {(['blitz', 'rapid', 'bullet'] as const)
                          .filter(t => stats[t] != null)
                          .map(t => (
                            <button
                              key={t}
                              onClick={() => setSelectedRatingType(t)}
                              className={[
                                'flex-1 rounded-xl p-3 text-sm transition-colors border',
                                selectedRatingType === t
                                  ? 'bg-white text-slate-950 border-white font-semibold'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-white/30',
                              ].join(' ')}
                            >
                              <div className="font-bold text-lg">{stats[t]}</div>
                              <div className="capitalize text-xs mt-0.5 opacity-70">{RATING_TYPE_LABEL[t]}</div>
                            </button>
                          ))}
                      </div>
                      {currentRating != null && (
                        <p className="text-slate-400 mt-2 text-xs">
                          {"You're at "}
                          <span className="font-semibold text-white">{currentRating} {currentRatingLabel}</span>
                          {'. Pick a goal below.'}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {[1000, 1200, 1500, 2000].map(r => {
                      const isAboveCurrent = currentRating == null || r > currentRating;
                      return (
                        <button
                          key={r}
                          onClick={() => next({ targetRating: r, timePreference: selectedRatingType ?? undefined })}
                          className={[
                            'rounded-xl p-4 text-xl font-bold transition-colors border',
                            isAboveCurrent
                              ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 hover:border-white/30'
                              : 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-pointer hover:bg-slate-800 hover:text-white',
                          ].join(' ')}
                        >
                          {r === 2000 ? '2000+' : r}
                          {currentRating != null && r <= currentRating && (
                            <span className="block text-xs font-normal text-slate-600 mt-0.5">already reached</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={skip} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">Skip this step</button>
                </motion.div>
              )}

              {/* ── Step 2: Time preference ── */}
              {step === 2 && (
                <motion.div key="s2" {...slide} className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">How do you prefer to play?</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {([['bullet', '⚡ Bullet', '< 3 min'], ['blitz', '🔥 Blitz', '3–10 min'], ['rapid', '⏱ Rapid', '10–30 min'], ['classical', '♟ Classical', '30+ min']] as const).map(([val, label, sub]) => (
                      <button key={val} onClick={() => next({ timePreference: val })} className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-4 text-left transition-colors border border-slate-700 hover:border-white/30">
                        <div className="font-semibold">{label}</div>
                        <div className="text-xs text-slate-400 mt-1">{sub}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={skip} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">Skip this step</button>
                </motion.div>
              )}

              {/* ── Step 3: Experience ── */}
              {step === 3 && (
                <motion.div key="s3" {...slide} className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">How long have you been playing?</h2>
                  </div>
                  <div className="space-y-3">
                    {([['beginner', 'Just started', 'Under 1 year'], ['intermediate', 'A few years', '1–5 years'], ['experienced', 'Experienced', '5+ years']] as const).map(([val, label, sub]) => (
                      <button key={val} onClick={() => next({ experience: val })} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-4 text-left transition-colors border border-slate-700 hover:border-white/30 flex justify-between items-center">
                        <span className="font-semibold">{label}</span>
                        <span className="text-sm text-slate-400">{sub}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={skip} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">Skip this step</button>
                </motion.div>
              )}

              {/* ── Step 4: Self-reported weakness ── */}
              {step === 4 && (
                <motion.div key="s4" {...slide} className="space-y-5">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">Where do you struggle most?</h2>
                    <p className="text-slate-400 mt-2 text-sm">Our engine will verify this — your gut feeling helps us start faster.</p>
                  </div>
                  <div className="space-y-2">
                    {(['Openings', 'Tactics', 'Endgames', 'Time pressure', 'Not sure'] as const).map(w => (
                      <button key={w} onClick={() => next({ selfReportedWeakness: w })} className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-3 text-left transition-colors border border-slate-700 hover:border-white/30 font-medium">
                        {w}
                      </button>
                    ))}
                  </div>
                  <button onClick={skip} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">Skip this step</button>
                </motion.div>
              )}

              {/* ── Step 5: Sign in ── */}
              {step === 5 && (
                <motion.div key="s5" {...slide} className="space-y-6 text-center py-4">
                  <div className="text-6xl select-none">♟</div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{stepLabel}</p>
                    <h2 className="text-2xl font-bold text-white">Ready to meet your coach?</h2>
                    <p className="text-slate-400 mt-2 text-sm">Sign in to save your progress and get personalized analysis.</p>
                  </div>
                  <div className="space-y-3">
                    <Button onClick={handleSignIn} className="w-full h-12 text-base bg-white text-slate-950 hover:bg-slate-100 font-semibold">
                      Continue with Google
                    </Button>
                    <p className="text-xs text-slate-500">More sign-in options coming soon</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
