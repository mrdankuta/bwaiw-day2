Status: ready-for-agent

## Problem Statement

Home cooks stare into the fridge with random ingredients and no plan. They waste food, repeat the same 3 meals, and abandon recipes halfway when time, difficulty, or a missing ingredient surprises them. They need "what can I cook right now with what I have" — not another endless recipe search.

## Solution

A static no-auth webapp: user enters Available Ingredients + max time + difficulty + location region, sees a Recipe Catalogue ranked by Match Score with missing ingredients called out, toggles fully-makeable-only, opens a recipe detail, and can add their own recipes (persisted locally). V1 seeds ~30 recipes; everything filters client-side from one JSON file.

## User Stories

1. As a home cook, I want to type the ingredients I have as free text, so that I don't have to pick from a fixed list.
2. As a home cook, I want one-tap staple quick-picks (salt, oil, water, rice, eggs, onion, garlic), so that I don't retype basics every time.
3. As a home cook, I want ingredient matching to ignore case/whitespace and common synonyms, so that "Tomatoes" matches "tomato".
4. As a home cook, I want to set a max cook time (15 / 30 / 60 / Any), so that I only see meals that fit my evening.
5. As a home cook, I want to filter by difficulty (Easy / Medium / Hard / Any), so that beginners aren't served soufflés.
6. As a home cook, I want to pick my location region (e.g. Nigeria / West Africa / Global / Any), so that suggestions respect cuisine availability.
7. As a home cook, I want results ranked by percent of ingredients I already have, so that the most makeable meals come first.
8. As a home cook, I want each result card to show match %, missing ingredients, time, and difficulty, so that I can judge at a glance.
9. As a home cook, I want a "fully-makeable only" toggle, so that I can hide anything I'd need to shop for.
10. As a home cook, I want basic substitution hints for missing items (e.g. butter → oil), so that near-misses stay usable.
11. As a home cook, I want to open a recipe detail with steps and ingredient checklist, so that I can cook without surprises.
12. As a home cook, I want an empty state with guidance when nothing matches, so that I know to loosen a filter.
13. As a home cook, I want to add my own recipe via a form, so that family dishes enter the catalogue.
14. As a home cook, I want my added recipes to persist across visits on the same device, so that I don't re-enter them.
15. As a home cook, I want user-added recipes to rank identically with seeds, so that my dishes actually surface.
16. As a mobile cook, I want the input → grid → detail flow usable on a phone, so that I can cook with it in the kitchen.

## Implementation Decisions

- Seams (highest possible, one new seam preferred): `loadCatalogue()` fetches read-only `recipes.json`; `getUserRecipes()` / `saveUserRecipe()` own the localStorage overlay only; `queryRecipes(filters, catalogue)` is the single pure function owning all filter + rank + sort logic. UI calls only `queryRecipes`. This seam comes from research branch `research/static-mvp` and makes the later API/DB migration a swap of internals, not call sites.
- Catalogue source: single static `recipes.json` (~30 seeds for V1, shape supports 500 with no code change). No framework, no build step, vanilla JS.
- Recipe schema: `{ id, title, ingredients[{name, staple?}], timeMinutes (total), difficulty (Easy|Medium|Hard, author-assigned), cuisine, regions[] (e.g. Nigeria, West-Africa, Global), steps[], servings, imageUrl? }`. Ingredient match is presence-only, no quantities in V1.
- Normalization: lowercase + trim + small synonym map (tomatoes→tomato, capsicum→bell pepper, etc.). Staples (salt, oil, water) are auto-matched and excluded from the match denominator so they never punish a score.
- Rank: `score = matchedNonStaple / totalNonStaple`. Sort by score desc, then `timeMinutes` asc, then title. Time/difficulty/region are hard filters applied before ranking; ingredients only rank (never hide) unless the fully-makeable toggle is on (keeps score==1 only).
- Region semantics for V1: recipe passes if its `regions` includes the selected region or `Global`, or filter is Any. No seasonal-availability engine, no units conversion in V1.
- Result card content: title, image (lazy), match %, time, difficulty, cuisine, missing-ingredients list (max 3 + "+n more"), substitution hint where mapped.
- User overlay: localStorage key `rba:user-recipes:v1`, JSON array mirroring seed shape with `id: u-<uuid>`, `source: user`, `createdAt/updatedAt`. Images URL-only, never base64. Merge rule `all = seeds.concat(users)`.
- Hosting: GitHub Pages static. Serve over http(s) even locally (localStorage on `file:` is undefined behaviour).
- Rendering performance: cap rendered cards to top 24 + "show more", `loading="lazy"` images, debounce free-text input ~200ms. Filtering ≤500 items stays in-memory, no index/worker.

## Testing Decisions

- What makes a good test: assert external behaviour of `queryRecipes` (given filters + catalogue, expect ordered ids + missing lists), never DOM internals or JSON formatting.
- Modules to test: `queryRecipes` scoring/sort/toggle/region/time/difficulty/normalization; overlay merge (`seeds + users` ranks identically); synonym + staple handling edge cases.
- Prior art: none — greenfield repo. Use zero-dep Node test runner or Vitest for the pure function only; no E2E in V1 beyond manual click-through of input → grid → detail → add-recipe on mobile + desktop.

## Out of Scope

- Accounts/auth/payments; external recipe APIs; native apps; pantry inventory tracking; auto meal-planning or shopping checkout; seasonal-availability engine; units/language conversion; image uploads (URL only); offline PWA packaging.

## Further Notes

- Synthesized from wayfinder effort `.scratch/recipes-by-availability/` (destination: spec + low-fi prototype → static MVP) without re-interviewing; open decision tickets 01–04 fed the Implementation Decisions above.
- Research facts live on throwaway branch `research/static-mvp`, file `.scratch/recipes-by-availability/research-static-mvp.md` (never merged): localStorage ~5 MiB string-only quota, GitHub Pages 1 GB soft-100 GB/mo, Netlify 300-credits hard pause, Vercel Hobby non-commercial restriction.
- Standing prefs honoured: 4-input bar, ~30 seeds, ranked partial match + missing + toggle, static no-auth MVP, low-fi first (prototype folded into Ticket 3 build below as clickable flow, no separate Figma).
