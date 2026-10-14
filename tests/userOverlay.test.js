const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

function stubStorage(initial = {}) {
  const store = { ...initial };
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
  return store;
}

const { saveUserRecipe, getUserRecipes, queryRecipes } = require("../app.js");

describe("user overlay", () => {
  beforeEach(() => { delete global.localStorage; stubStorage(); });

  it("round-trips save -> get with user metadata", () => {
    const saved = saveUserRecipe({ title: "Mama Stew", ingredients: "yam, pepper", timeMinutes: 30, difficulty: "Easy", steps: "Boil\nEat" });
    assert.ok(saved.id.startsWith("u-"));
    assert.equal(saved.source, "user");
    assert.deepEqual(getUserRecipes().map((r) => r.id), [saved.id]);
  });

  it("rejects invalid input", () => {
    assert.throws(() => saveUserRecipe({ title: "", ingredients: "yam", timeMinutes: 10, difficulty: "Easy", steps: "s" }), /Title/);
    assert.throws(() => saveUserRecipe({ title: "T", ingredients: "", timeMinutes: 10, difficulty: "Easy", steps: "s" }), /ingredient/);
    assert.throws(() => saveUserRecipe({ title: "T", ingredients: "yam", timeMinutes: 0, difficulty: "Easy", steps: "s" }), /timeMinutes/);
  });

  it("corrupt overlay recovers to seeds-only", () => {
    stubStorage({ "rba:user-recipes:v1": "{broken" });
    assert.deepEqual(getUserRecipes(), []);
    assert.equal(global.localStorage.getItem("rba:user-recipes:v1"), null);
  });

  it("user dishes rank identically with seeds", () => {
    const mine = saveUserRecipe({ title: "Egg Yam", ingredients: "yam, eggs", timeMinutes: 20, difficulty: "Easy", steps: "Cook" });
    const seeds = [{ id: "s", title: "Seed", ingredients: ["yam", "eggs"], timeMinutes: 20, difficulty: "Easy", cuisine: "T", regions: ["Global"], steps: ["s"] }];
    const res = queryRecipes({ ingredients: ["yam", "eggs"] }, seeds.concat(getUserRecipes()));
    assert.ok(res.find((r) => r.recipe.id === mine.id && r.score === 1));
  });
});
