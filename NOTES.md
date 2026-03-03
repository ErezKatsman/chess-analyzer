# chess-analyzer — product notes

## what this app is

**chess improvement platform** — not just game analysis.

the key insight: chess.com and lichess show you mistakes *per game*. nobody tells you
"across your last 30 games, you always blunder in endgames with rooks" — that's what a
real coach does. that's what this app does.

---

## who pays and why

### they WON'T pay for:
- raw game analysis (lichess is free and excellent)
- just seeing blunders (chess.com does this for free for 1 game/day)

### they WILL pay for:
- seeing their accuracy curve going UP over time — proof the app is working
- "you always blunder in time trouble" — insight chess.com never gives them
- drills built from THEIR OWN recurring mistakes, not generic puzzles
- feeling like they have a personal coach, not just an engine

---

## monetization

- **free**: connect 1 chess.com account, 3 analyses per month, browse mode for any player
- **paid ($5/month)**: full progress graph, cross-game weakness summary, unlimited analyses, personalized drill generation

---

## what is already built ✅

- **auth + routing** — Clerk login; `/` is smart: Hero (anon) / ConnectAccount (no profile) / Dashboard (has profile)
- **browse mode** — Hero: type any chess.com username, browse their raw games without signing in
- **chess.com connection** — ConnectAccount is the SOLE save point; Hero never saves
- **stockfish analysis** — blunders (200cp), mistakes (100cp), inaccuracies (50cp), patterns detected
- **AI explanations** — claude haiku explains each blunder in plain english + gives a rule
- **lesson generator** — claude haiku generates structured mini-lessons per detected pattern
- **drill UI** — click-to-move drills built from your actual blunders, 2-attempt reveal, score tracking
- **animated chess board** — pieces slide between squares instead of teleporting
- **blunder animation** — clicking a blunder in the analysis tab plays the mistake move animated
- **stripe payments** — code is done, just needs env vars connected (see below)
- **drill history** — `/drills` page shows past drill sessions and accuracy
- **progress graph** — recharts line chart: accuracy % + chess.com rating over time per analyzed game
- **pattern summary** — ranked weakness list: "time-trouble 8×, endgame weakness 6×..." with coaching hints

---

## current user flows

### anonymous (not signed in)
```
Hero → type chess.com username → validate → Start
→ /user?userName=X → raw games list (no analysis, no analyze button)
→ click Sign In in navbar → Clerk modal → FLOW: signed in
```

### signed in, no chess.com account linked
```
/ → ConnectAccount page
→ type YOUR chess.com username → validate → link account
→ router.refresh() → / → dashboard
```

### signed in, has chess.com account
```
/ → dashboard: your games + ✓ analyzed badges + progress tab + patterns
→ analyze a game → /game?... → full replay with moves/analysis/lessons
→ /drills → practice blunders from your analyzed games
→ change username → delete profile → back to ConnectAccount
```

### upgrade flow
```
analyze 3 games (free limit) → PaywallModal → Stripe checkout
→ /upgrade/success → plan = 'paid' → unlimited analyses
```

---

## stripe — needs to be connected

code is 100% done. add these 4 lines to `.env.local`:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...          ← $5/month recurring price ID from stripe dashboard
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

then in stripe dashboard → Webhooks → add endpoint for these 2 events:
- `checkout.session.completed`
- `customer.subscription.deleted`

for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## roadmap — what to build next

### 1. review + fix all user flows (highest priority)
walk every flow end-to-end, find gaps, fix them before monetizing:
- anonymous browse → sign in → connect account → dashboard
- change username flow
- quota hit → paywall → upgrade → paid dashboard
- browse other player's games while signed in

### 2. connect stripe
activate payments with env vars + test with stripe CLI

### 2. generated drills from recurring weaknesses
- today: drills come from blunders in a single analyzed game
- future: generate drill positions targeting your cross-game patterns
- "you always lose rook endgames — here are 5 rook endgame positions to practice"
- `POST /api/drills/generate` — takes weakness tag, generates drill positions

### 3. weekly coaching digest
- email or in-app notification
- "this week: 3 games analyzed, your accuracy improved 4%. your #1 pattern: time-trouble. recommended drill: →"

### 4. chess.com training history (future)
- fetch user's puzzle/lesson activity from chess.com API
- show timeline: "you did 40 puzzles this week"

---

## competitive landscape

| | per-game analysis | cross-game patterns | plain-english AI | drills from your games |
|---|---|---|---|---|
| chess.com | 1/day free, $15/mo | ❌ | ❌ | ❌ |
| lichess | ✅ unlimited free | ❌ | ❌ | ❌ |
| **this app** | ✅ | ✅ | ✅ | ✅ |

---

## key risks

1. **analysis quality** — stockfish is solid. the AI explanations need to feel genuinely insightful, not generic. test with real players.
2. **lichess** — they could add AI explanations. our moat is the cross-game aggregation + drills from your games.
3. **chess.com** — they could improve their free tier. we need to be faster to the cross-game insight features.
