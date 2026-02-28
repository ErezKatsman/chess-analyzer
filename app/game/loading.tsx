// skeleton shown by next.js app router while the game page server component fetches
export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* left column: board skeleton */}
          <div className="flex-shrink-0 w-full xl:w-auto animate-pulse">
            {/* game header */}
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="h-5 w-48 rounded-md bg-muted" />
              <div className="h-4 w-24 rounded-md bg-muted" />
            </div>

            {/* board */}
            <div className="aspect-square w-full max-w-[560px] rounded-xl bg-muted" />

            {/* nav buttons */}
            <div className="mt-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="h-9 w-28 rounded-lg bg-muted ml-auto" />
            </div>

            {/* eval graph placeholder */}
            <div className="mt-3 h-20 rounded-xl bg-muted" />
          </div>

          {/* right column: move list skeleton */}
          <div className="flex-1 min-w-0 animate-pulse">
            {/* game meta */}
            <div className="space-y-2 mb-4">
              <div className="h-5 w-56 rounded-md bg-muted" />
              <div className="h-4 w-32 rounded-md bg-muted" />
            </div>

            {/* analyze button */}
            <div className="h-9 w-32 rounded-lg bg-muted mb-4" />

            {/* move table */}
            <div className="rounded-xl border bg-background overflow-hidden">
              {/* header row */}
              <div className="grid grid-cols-[64px,1fr,1fr] px-3 py-2 border-b">
                <div className="h-3 w-4 rounded bg-muted" />
                <div className="h-3 w-10 rounded bg-muted" />
                <div className="h-3 w-10 rounded bg-muted" />
              </div>

              <div className="divide-y">
                {Array.from({ length: 15 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[64px,1fr,1fr] px-3 py-2"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="h-4 w-6 rounded bg-muted" />
                    <div className="h-4 w-14 rounded bg-muted" />
                    {/* every other row has a black move */}
                    {i % 7 !== 6 ? <div className="h-4 w-14 rounded bg-muted" /> : <div />}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
