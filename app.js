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

const QUICK_STAPLES = ["salt", "oil", "water", "rice", "eggs", "onion", "garlic"];

const SUBSTITUTIONS = {
  "butter": "vegetable oil",
  "milk": "water",
  "mayonnaise": "plain yogurt",
  "scent leaves": "basil",
  "stockfish": "extra beef",
  "green peas": "green beans",
  "sweet corn": "skip it",
  "shawarma bread": "any flatbread",
  "soy sauce": "salt",
  "ketchup": "tomato paste with a pinch of sugar",
};

function subHint(missing) {
  const hit = missing.find((m) => SUBSTITUTIONS[m]);
  return hit ? `No ${hit}? try ${SUBSTITUTIONS[hit]}.` : "";
}

function getUserRecipes() {
  try {
    const raw = localStorage.getItem("rba:user-recipes:v1");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

let CATALOGUE = [];

function readFilters() {
  const raw = document.getElementById("ingredients").value;
  const ingredients = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const maxTime = document.getElementById("maxTime").value;
  return {
    ingredients,
    maxTime: maxTime === "" ? null : Number(maxTime),
    difficulty: document.getElementById("difficulty").value,
    region: document.getElementById("region").value,
    fullyMakeableOnly: document.getElementById("makeableOnly")?.checked || false,
  };
}

function renderGrid(results) {
  const grid = document.getElementById("grid");
  if (results.length === 0) {
    const f = readFilters();
    const loosen = [];
    if (f.fullyMakeableOnly) loosen.push(`<button type="button" data-fix="toggle">Show near-misses</button>`);
    if (f.maxTime !== null) loosen.push(`<button type="button" data-fix="time">Clear time limit</button>`);
    if (f.difficulty !== "Any") loosen.push(`<button type="button" data-fix="difficulty">Clear difficulty</button>`);
    loosen.push(`<button type="button" data-fix="ingredients">Clear ingredients</button>`);
    grid.innerHTML = `<div class="empty"><p>No recipes match. Try loosening a filter — your time, difficulty, toggle, or ingredient list is too tight.</p><p>${loosen.join(" ")}</p></div>`;
    grid.querySelectorAll("button[data-fix]").forEach((b) => b.addEventListener("click", () => {
      const fix = b.dataset.fix;
      if (fix === "toggle") document.getElementById("makeableOnly").checked = false;
      if (fix === "time") document.getElementById("maxTime").value = "";
      if (fix === "difficulty") document.getElementById("difficulty").value = "Any";
      if (fix === "ingredients") document.getElementById("ingredients").value = "";
      refresh();
    }));
    return;
  }
  grid.innerHTML = results.slice(0, 24).map(({ recipe, score, missing }) => {
    const hint = missing.length ? subHint(missing) : "";
    return `<article class="card" data-id="${recipe.id}" tabindex="0"><h3>${escapeHtml(recipe.title)}</h3><p>${Math.round(score * 100)}% · ${recipe.timeMinutes} min · ${recipe.difficulty} · ${escapeHtml(recipe.cuisine)}</p>${missing.length ? `<p class="missing">Missing: ${missing.slice(0, 3).map(escapeHtml).join(", ")}${missing.length > 3 ? ` +${missing.length - 3} more` : ""}</p>${hint ? `<p class="sub">${escapeHtml(hint)}</p>` : ""}` : `<p class="makeable">All ingredients on hand</p>`}</article>`;
  }).join("");
  grid.querySelectorAll(".card").forEach((c) => {
    c.addEventListener("click", () => openDetail(c.dataset.id));
    c.addEventListener("keydown", (e) => { if (e.key === "Enter") openDetail(c.dataset.id); });
  });
}

function openDetail(id) {
  const all = CATALOGUE.concat(getUserRecipes());
  const r = all.find((x) => x.id === id);
  if (!r) return;
  const d = document.getElementById("detail");
  const ings = r.ingredients.map((i) => `<li>${escapeHtml(typeof i === "string" ? i : i.name)}</li>`).join("");
  d.innerHTML = `<button id="back">← Back to results</button><h2>${escapeHtml(r.title)}</h2><p>${r.timeMinutes} min · ${r.difficulty} · ${escapeHtml(r.cuisine)} · serves ${r.servings || "—"}</p><h4>Ingredients</h4><ul>${ings}</ul><h4>Steps</h4><ol>${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`;
  d.hidden = false;
  document.getElementById("back").addEventListener("click", () => { d.hidden = true; });
}

function refresh() {
  const filters = readFilters();
  const all = CATALOGUE.concat(getUserRecipes());
  const results = queryRecipes(filters, all);
  renderGrid(results);
  const note = document.getElementById("filter-note");
  if (note) {
    if (filters.fullyMakeableOnly) {
      const base = queryRecipes({ ...filters, fullyMakeableOnly: false }, all);
      const hidden = base.length - results.length;
      note.textContent = hidden > 0 ? `${hidden} near-miss${hidden === 1 ? "" : "es"} hidden by fully-makeable filter.` : "Showing only fully-makeable recipes.";
    } else {
      note.textContent = "";
    }
  }
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

async function boot() {
  const staples = document.getElementById("staples");
  staples.innerHTML = QUICK_STAPLES.map((s) => `<button type="button" data-s="${s}">+ ${s}</button>`).join(" ");
  staples.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-s]");
    if (!b) return;
    const input = document.getElementById("ingredients");
    const cur = input.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!cur.map((x) => x.toLowerCase()).includes(b.dataset.s)) {
      input.value = cur.concat(b.dataset.s).join(", ");
      refresh();
    }
  });
  try {
    CATALOGUE = await loadCatalogue();
    document.getElementById("catalogue-status").textContent = `${CATALOGUE.length} recipes loaded.`;
    ["ingredients", "maxTime", "difficulty", "region", "makeableOnly"].forEach((id) =>
      document.getElementById(id).addEventListener("input", debounce(refresh, 200)));
    refresh();
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
if (typeof module !== "undefined") module.exports = { loadCatalogue, validateCatalogue, queryRecipes, normalizeIngredient, STAPLES, getUserRecipes, subHint, SUBSTITUTIONS };
