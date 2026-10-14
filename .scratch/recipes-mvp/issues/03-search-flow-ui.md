# 03: Input bar + results grid + detail flow

**What to build:** The clickable cook flow: 4-input bar (free-text + staple quick-picks, max-time 15/30/60/Any, difficulty, region) driving a ranked results grid where each card shows match %, time, difficulty, cuisine, and opening a detail with steps + ingredient checklist.

**Blocked by:** 01, 02 (needs catalogue seam + rank engine).

**Status:** done (built + closed gh#3)

- [ ] Typing ingredients + changing time/difficulty/region re-ranks the grid via `queryRecipes` with ~200ms input debounce
- [ ] Cards show match %, time, difficulty, cuisine; detail shows steps + checklist; back returns to same filters
- [ ] Usable on mobile width in the kitchen (input reachable, cards tappable, lazy images)
