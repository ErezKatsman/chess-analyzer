'use client';

// global navbar — logo + auth controls + theme toggle.

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ThemeToggle';

const NAV_TABS = [
  { key: 'coach', label: 'Coach' },
  { key: 'progress', label: 'Progress' },
  { key: 'games', label: 'Games' },
  { key: 'profile', label: 'My Profile' },
  { key: 'settings', label: 'Settings' },
] as const;

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity shrink-0"
        >
          <span className="text-lg leading-none" aria-hidden="true">♟</span>
          <span className="hidden sm:inline">Chess Analyzer</span>
        </Link>

        {/* center nav tabs — signed-in only */}
        <SignedIn>
          <div className="flex items-center gap-0.5 mx-4">
            {NAV_TABS.map(({ key, label }) => (
              <Link
                key={key}
                href={`/?tab=${key}`}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>
        </SignedIn>

        {/* right side */}
        <div className="flex items-center gap-3 shrink-0">
          <ThemeToggle />

          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 transition-colors">
                sign in
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-7 w-7',
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
