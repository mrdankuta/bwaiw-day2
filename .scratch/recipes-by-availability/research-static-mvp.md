# Research: static no-auth MVP tech pattern

Question: single JSON + client-side filtering vs tiny framework, localStorage schema for user-added recipes, performance for ~30–500 recipes, free static deployment (GitHub Pages / Netlify / Vercel), migration path to auth/DB later.

## 1. Pattern: single JSON + client-side filtering

- Recommended for MVP: one static `recipes.json` fetched at load + vanilla JS (or zero-build single-page HTML/JS) doing filter/rank in memory. No framework, no build step, no backend.
- Rationale: catalogue is read-only seed data; all four MVP inputs (ingredients text, max-minutes, difficulty, region) are pure client-side predicates + a score sort. No per-request server compute needed.
- Framework only pays off later (routing, state, auth forms). Adding e.g. Vite + a micro-framework later does not change the data pattern — `recipes.json` stays the seed source.
- Keep a data-access seam from day one: `loadCatalogue()` (fetch JSON), `getUserRecipes()` / `saveUserRecipe()` (localStorage), `queryRecipes(filters)` (pure function over merged list). Migration swaps the internals, not the call sites.

## 2. localStorage schema for user-added recipes

Facts (MDN / WHATWG):
- `localStorage` is a per-origin, string-only, synchronous key-value store persisting across sessions (`Window.localStorage`, MDN; spec: WHATWG HTML webstorage).
- Practical quota is ~5 MiB per origin (throws `QuotaExceededError` when exceeded); behaviour for `file:` URLs is undefined — serve over http(s) even locally.
- Strings only: must `JSON.stringify` / `JSON.parse`; wrap both directions in try/catch.

Proposed schema (user overlay, seed JSON stays read-only):
- Key: `rba:user-recipes:v1` → JSON array of recipe objects (namespaced + versioned key so `v2` migration is trivial).
- Each object mirrors the seed recipe shape: `{ id, title, ingredients[], timeMinutes, difficulty, cuisine/region, steps[], imageUrl?, createdAt, updatedAt, source: "user" }`.
- `id`: `crypto.randomUUID()`; never reuse seed ids (prefix user ids e.g. `u-`).
- Images: store URL string only, never base64/blob in localStorage (a single photo would eat the 5 MiB budget). Validate URL, lazy-load with `loading="lazy"`.
- Merge rule: `all = seeds.concat(users)`; user items rank identically; edits/deletes touch only the overlay key.
- Capacity check: a text recipe serialises to ~1–2 KB → 5 MiB holds thousands of user recipes; quota is not an MVP risk unless images are inlined.

## 3. Performance for 30–500 recipes

- Data size: 30 recipes × ~1–2 KB ≈ 30–60 KB JSON; 500 × ~2 KB ≈ ~1 MB. Both are one cacheable static fetch, well under all hosts' site limits.
- Filter cost: linear scan + sort over ≤500 items is sub-millisecond to low-ms in JS — negligible. No index, worker, or pagination of the *filter* needed.
- Real bottleneck is DOM + images: cap rendered cards (e.g. top 20–50 + "show more"), `loading="lazy"` on images, debounced free-text input (~150–300 ms).
- Verdict: no performance reason to add a framework, bundler, or backend at this scale.

## 4. Free static deployment (2026)

| Target | Free-tier facts | MVP fit |
|---|---|---|
| GitHub Pages | Static only, no server code/DB. Recommended repo limit 1 GB, published site ≤1 GB, deploy timeout 10 min, **soft** 100 GB/mo bandwidth + 10 builds/hr (custom Actions workflows exempt from build cap). Free for public repos; private Pages needs paid plan. | Simplest: push HTML/JS/JSON, done. No previews/functions. Plenty for MVP. |
| Netlify Free | Credit model (2026): **300 credits/mo hard cap** — bandwidth ~20 credits/GB ⇒ ~15 GB effective if nothing else spends credits; builds/functions/requests draw from same pool. Sites pause when credits run out. | Fine for MVP traffic; nicer previews/forms/functions than Pages, but the hard pause-on-exhaustion is the strictest of the three. |
| Vercel Hobby | Free for **personal, non-commercial use only** (fair-use condition). ~100 GB bandwidth/mo, 1M edge requests, 100 deployments/day, generous static handling. | Best preview/DX story, but the non-commercial restriction matters if this MVP ever takes money or business traffic — then Pro ($20/seat/mo + usage) applies. |

Recommendation: **GitHub Pages** for the static no-auth MVP (zero config, soft — not hard — bandwidth cap, matches "HTML+JS+JSON" scope). Choose Netlify/Vercel when you need branch previews or serverless functions on the road to auth/DB.

## 5. Migration path to auth/DB later

1. Keep the seam: only `loadCatalogue` / `getUserRecipes` / `saveUserRecipe` know about JSON vs API vs localStorage.
2. Step 1 (no auth): move `recipes.json` behind the same fetch shape from any host/CDN; add IndexedDB if user recipe volume or offline needs grow (larger async quota vs localStorage's 5 MiB sync).
3. Step 2 (auth/DB, e.g. Supabase/Firebase/any REST + Netlify/Vercel functions): seed catalogue becomes a read endpoint; user recipes become per-user rows keyed by the existing UUIDs; localStorage overlay becomes a write-through cache/offline fallback, then is retired per-user on first login (import overlay → server, bump key to `v2`, clear `v1`).
4. Schema discipline that makes this cheap: stable ids, `createdAt/updatedAt`, `source` flag, and the versioned storage key — all proposed above.

## Sources

- MDN, `Window: localStorage property` (string-only, per-origin, persists across sessions; `file:` behaviour undefined) — https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- MDN, Storage quotas and eviction criteria (~5 MiB localStorage convention; larger variable quotas for IndexedDB/OPFS) — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- WHATWG HTML, webstorage (owning spec) — https://html.spec.whatwg.org/multipage/webstorage.html
- GitHub Docs, GitHub Pages limits (1 GB site, soft 100 GB/mo, 10 builds/hr, static-only) — https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Netlify free-plan 300-credits model and ~15 GB effective bandwidth (verified against Netlify docs Jul 2026) — https://netli.fyi/blog/netlify-free-plan-limits-2026 ; https://www.netlify.com/blog/introducing-netlify-free-plan
- Vercel Hobby plan docs (non-commercial personal-use restriction; 100 GB bandwidth, 100 deploys/day figures) — https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/limits/fair-use-guidelines
