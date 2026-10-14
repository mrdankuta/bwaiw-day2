## Destination

Build-ready spec + clickable low-fi prototype for a home-cook recipe webapp that ranks recipes by available ingredients, time, difficulty, and location — ready to build as static MVP.

## Notes

- Domain: home cooking, waste reduction with what's on hand. Canonical terms: Available Ingredients, Recipe Catalogue, Match Score, Missing Ingredients.
- Skills every session should consult: grilling, domain-modeling; prototype sessions also use prototype; research sessions use research.
- Standing preferences from charting (user said Yes to all): 4-input bar (free-text + staples, max-minutes 15/30/60, Easy/Medium/Hard, country/region dropdown); recipe schema with title/ingredients/time/difficulty/cuisine-steps-image + ~30 seeds; ranked partial match with missing + substitutions + fully-makeable toggle; static no-auth MVP (HTML+JS+JSON, localStorage); low-fi prototype first.
- Tracker: local-markdown. Map at `.scratch/recipes-by-availability/map.md`, tickets at `.scratch/recipes-by-availability/issues/NN-<slug>.md`.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [Static MVP tech pattern](issues/05-static-mvp-tech-pattern.md): vanilla JS + recipes.json, localStorage overlay, GitHub Pages host — see branch `research/static-mvp`.

## Not yet specified

- User-added recipe flow: form fields, validation, edit/delete, image upload vs URL.
- Location depth: cuisine tag vs seasonal availability vs units/language; data source for regions.
- Substitution logic: static map vs heuristic; how missing items display.
- Seed content sourcing: who writes 30 recipes, licensing/images.
- Post-prototype build plan: styling system, mobile layout.

## Out of scope

- Native mobile apps; external recipe APIs for V1; accounts/auth/payments; auto meal-planning, shopping checkout, or pantry inventory tracking.
