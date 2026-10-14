# 04: Missing + toggle + substitutions + empty state

**What to build:** The near-miss decision helpers on top of the grid: missing-ingredients list per card, fully-makeable-only toggle, substitution hints where mapped, and a helpful empty state that tells the cook which filter to loosen.

**Blocked by:** 03 (needs grid to extend).

**Status:** done (built: toggle + subs + empty-state; closed gh#4)

- [ ] Each card lists missing ingredients (max 3 + "+n more") with substitution hint where the map covers it
- [ ] Toggle keeps score==1 only and survives filter changes; count of hidden items is visible
- [ ] Zero-result state names the tightest filter and offers one-tap loosen (e.g. clear time or toggle)
