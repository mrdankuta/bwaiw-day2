# 02: Filter + rank engine with tests

**What to build:** The pure `queryRecipes(filters, catalogue)` engine that owns all filter + Match Score + sort behaviour, covered by unit tests asserting external behaviour (ordered ids + missing lists), so the UI can trust one seam.

**Blocked by:** 01 (needs locked recipe schema).

**Status:** done (built: queryRecipes + 7 tests green; closed gh#2)

- [ ] Score = matched non-staple / total non-staple; staples auto-matched; normalization + synonyms work
- [ ] Time/difficulty/region act as hard filters; ingredients rank only
- [ ] Sort is score desc, then timeMinutes asc, then title; tests cover toggle-off ranking, ties, and empty catalogue
