// Server-side singleton for the ported semantic-code-search engine.
// The ported lib (./app.js, ./retrieval.js, ...) is imported VERBATIM from
// ~/workspace/demos/semantic-code-search/lib — retrieval behavior is never
// altered here; this module only hosts it inside Next.js route handlers.
import { createApp, type SearchApp } from "./app.js";
import { buildIndices, runQuery, rrf } from "./retrieval.js";
import { anchor } from "./types.js";
import type { QueryResponse } from "./types.js";

let app: SearchApp | null = null;

/** The single shared SearchApp for all API routes. Indices built exactly once. */
export function getApp(): SearchApp {
  if (!app) app = createApp();
  return app;
}

let indices: ReturnType<typeof buildIndices> | null = null;
function getIndices() {
  if (!indices) indices = buildIndices();
  return indices;
}

/** GET /api/query with a caller-chosen topK. Identical semantics to the
 *  port's queryGet for q-validation; runQuery is the verbatim ported function. */
export function runQueryTopK(q: string, topK: number): QueryResponse {
  const { dense, bm25 } = getIndices();
  return runQuery(q, dense, bm25, topK);
}

export type ViewName = "dense" | "sparse";
export type ScoredAnchor = { anchor: string; score: number };

/**
 * Per-view ranked lists WITH scores, from the real ported indices.
 * The ported /query shape only carries denseTop/sparseTop as anchor strings
 * (no scores), so the UI's Dense/Sparse tabs read scores from here.
 * Same engine, same indices, zero behavior change.
 */
export function searchView(q: string, view: ViewName, topK: number): ScoredAnchor[] {
  const { dense, bm25 } = getIndices();
  const ranked = view === "dense" ? dense.search(q, topK) : bm25.search(q, topK);
  return ranked.map((r) => ({ anchor: anchor(r.chunk), score: r.score }));
}

/** RRF k constant, exported so the UI's score-breakdown math matches rrf() exactly. */
export const RRF_K = 60;
export { rrf };
