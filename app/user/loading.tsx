// skeleton shown by next.js app router while the server component fetches chess.com data
export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">

        {/* header skeleton */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm animate-pulse">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-md bg-muted" />
              <div className="h-4 w-64 rounded-md bg-muted" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-32 rounded-lg bg-muted" />
              <div className="h-4 w-16 rounded-md bg-muted" />
            </div>
          </div>
        </div>

        {/* table skeleton */}
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          <div className="p-5 border-b flex items-center justify-between animate-pulse">
            <div className="space-y-1">
              <div className="h-5 w-16 rounded-md bg-muted" />
              <div className="h-3 w-20 rounded-md bg-muted" />
            </div>
            <div className="h-4 w-32 rounded-md bg-muted" />
          </div>

          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3 animate-pulse"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="h-6 w-12 rounded-full bg-muted flex-shrink-0" />
                <div className="h-6 w-12 rounded-full bg-muted flex-shrink-0" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="h-4 w-36 rounded-md bg-muted" />
                  <div className="h-3 w-20 rounded-md bg-muted" />
                </div>
                <div className="h-4 w-48 rounded-md bg-muted hidden md:block" />
                <div className="h-4 w-20 rounded-md bg-muted hidden sm:block" />
                <div className="h-4 w-32 rounded-md bg-muted ml-auto" />
                <div className="h-8 w-20 rounded-lg bg-muted flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}
