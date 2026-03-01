export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-6 w-40 rounded bg-muted mb-2" />
          <div className="h-4 w-64 rounded bg-muted/60" />
          <div className="flex gap-3 mt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-16 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b animate-pulse"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted/60" />
              <div className="h-4 w-8 rounded bg-muted/60" />
              <div className="h-4 w-28 rounded bg-muted/40 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
