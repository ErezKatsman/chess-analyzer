import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// routes that require a signed-in user
// /user is intentionally NOT protected — browse mode works without auth
const isProtectedRoute = createRouteMatcher(['/game(.*)', '/drills(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // skip next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
