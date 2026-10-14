# 01: Scaffold + seed catalogue

**What to build:** A servable static app shell that loads the Recipe Catalogue: page skeleton with header/input-area/grid/detail placeholders, one `recipes.json` with ~30 seeds in the spec schema, and a `loadCatalogue()` that fetches and validates it with a visible error state on failure.

**Blocked by:** None (can start immediately).

**Status:** done (built + closed gh#1)

- [ ] App serves over http(s) and renders shell with no console errors
- [ ] `recipes.json` holds ~30 recipes matching spec schema (id, title, ingredients, timeMinutes, difficulty, cuisine, regions, steps, servings)
- [ ] Catalogue loads via seam and invalid JSON surfaces a readable error, not a blank page
