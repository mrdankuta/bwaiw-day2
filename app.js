async function loadCatalogue(url = "recipes.json") {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Catalogue fetch failed: ${res.status}`);
  const data = await res.json();
  validateCatalogue(data);
  return data;
}

function validateCatalogue(data) {
  if (!Array.isArray(data)) throw new Error("Catalogue must be an array");
  const required = ["id", "title", "ingredients", "timeMinutes", "difficulty", "cuisine", "regions", "steps"];
  for (const r of data) {
    for (const k of required) {
      if (r[k] === undefined || r[k] === null) throw new Error(`Recipe ${r.id || "?"} missing ${k}`);
    }
    if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) throw new Error(`Recipe ${r.id} needs ingredients`);
    if (!Array.isArray(r.regions) || !Array.isArray(r.steps)) throw new Error(`Recipe ${r.id} needs regions[] + steps[]`);
    if (!["Easy", "Medium", "Hard"].includes(r.difficulty)) throw new Error(`Recipe ${r.id} bad difficulty`);
  }
}

function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg;
  el.hidden = false;
  document.getElementById("catalogue-status").textContent = "Catalogue failed to load.";
}

async function boot() {
  try {
    const recipes = await loadCatalogue();
    document.getElementById("catalogue-status").textContent = `${recipes.length} recipes loaded. Filters arrive in ticket 03.`;
    document.getElementById("grid").innerHTML = recipes.slice(0, 24).map((r) =>
      `<article class="card"><h3>${escapeHtml(r.title)}</h3><p>${r.timeMinutes} min · ${r.difficulty} · ${escapeHtml(r.cuisine)}</p></article>`
    ).join("");
  } catch (e) {
    showError(`Could not load recipes: ${e.message}`);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const STAPLES = new Set(["salt", "water", "vegetable oil", "oil"]);

const SYNONYMS = {
  "tomatoes": "tomato",
  "bell pepper": "red bell pepper",
  "capsicum": "red bell pepper",
  "peas": "green peas",
  "corn": "sweet corn",
  "stock": "chicken stock",
  "stock fish": "stockfish",
  "scent leaf": "scent leaves",
};

function normalizeIngredient(name) {
  const n = String(name).toLowerCase().trim().replace(/\s+/g, " ");
  return SYNONYMS[n] || n;
}

function ingredientName(ing) {
  return typeof ing === "string" ? ing : ing.name;
}

function queryRecipes(filters = {}, catalogue = []) {
  const available = new Set((filters.ingredients || []).map(normalizeIngredient));
  const maxTime = filters.maxTime ?? null;
  const difficulty = filters.difficulty || "Any";
  const region = filters.region || "Any";
  const fullyMakeableOnly = !!filters.fullyMakeableOnly;

  const out = [];
  for (const recipe of catalogue) {
    if (maxTime !== null && recipe.timeMinutes > maxTime) continue;
    if (difficulty !== "Any" && recipe.difficulty !== difficulty) continue;
    if (region !== "Any" && !(recipe.regions.includes(region) || recipe.regions.includes("Global"))) continue;

    const names = recipe.ingredients.map((i) => normalizeIngredient(ingredientName(i)));
    const required = names.filter((n) => !STAPLES.has(n));
    const matched = required.filter((n) => available.has(n));
    const missing = required.filter((n) => !available.has(n));
    const score = required.length === 0 ? 1 : matched.length / required.length;
    if (fullyMakeableOnly && score !== 1) continue;
    out.push({ recipe, score, matched, missing });
  }
  out.sort((a, b) =>
    b.score - a.score ||
    a.recipe.timeMinutes - b.recipe.timeMinutes ||
    a.recipe.title.localeCompare(b.recipe.title)
  );
  return out;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", boot);
if (typeof module !== "undefined") module.exports = { loadCatalogue, validateCatalogue, queryRecipes, normalizeIngredient, STAPLES };
