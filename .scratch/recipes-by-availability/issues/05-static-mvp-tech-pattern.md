Type: research
Status: resolved

## Question

Surface the static-MVP tech pattern facts needed before spec lock: single JSON + client-side filtering vs tiny framework, localStorage schema for user-added recipes, performance for ~30-500 recipes, free deployment target (GitHub Pages / Netlify / Vercel static), and migration path if auth/DB comes later.

Resolved by subagent with research skill; capture findings on throwaway `research/static-mvp` branch with context pointer here. Never merged.

## Answer

Static MVP = single `recipes.json` + in-memory client-side filtering (vanilla JS, `loadCatalogue`/`queryRecipes` seam); user recipes in versioned localStorage overlay `rba:user-recipes:v1` (UUIDs, URL-only images); 30-500 recipes needs no framework (cap rendered cards + lazy images); host on GitHub Pages (simplest free static); migrate later by swapping seam to API/auth and importing overlay on first login.

Full findings: branch `research/static-mvp`, file `.scratch/recipes-by-availability/research-static-mvp.md` (never merged).
