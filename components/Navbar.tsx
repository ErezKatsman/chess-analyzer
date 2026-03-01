'use client';

// global navbar — logo + auth controls + theme toggle.

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity"
        >
          <span className="text-lg leading-none" aria-hidden="true">♟</span>
          <span>Chess Analyzer</span>
        </Link>

        {/* right side */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link
              href="/drills"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              my drills
            </Link>
          </SignedIn>
          <ThemeToggle />

          {/* show sign-in button when logged out, avatar when logged in */}
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
