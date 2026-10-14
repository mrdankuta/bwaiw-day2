# 05: Add-recipe form + local persistence

**What to build:** A cook can add a family dish through a form and see it rank identically with seeds on later visits on the same device, via the versioned localStorage overlay seam only.

**Blocked by:** 01, 03 (needs schema + grid to surface user dishes).

**Status:** ready-for-agent

- [ ] Form validates title, ≥1 ingredient, timeMinutes, difficulty, region; saves with `u-<uuid>`, `source: user`, timestamps to `rba:user-recipes:v1` (URL-only images)
- [ ] Merged catalogue (`seeds + users`) ranks user dishes identically; reload persists them
- [ ] Corrupt overlay JSON recovers gracefully (reset overlay, keep seeds working)
