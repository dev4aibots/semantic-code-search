// Framework-agnostic port of dev4aibots/semantic-code-search src/server.ts
// (buildApp(dense, bm25)) — same routes' logic, same validation, same
// response shapes, without the Hono dependency.
//
// UPSTREAM BUG FIX: server.ts requires buildApp(dense, bm25), but
// api/index.ts (Vercel adapter) called buildApp() with NO arguments — the
// Vercel path builds a broken app. createApp() fixes this by building the
// indices from SAMPLE_CORPUS exactly ONCE, internally, via buildIndices().
// It is impossible to construct an app without indices now.
import { z } from "zod";
import { runQuery, buildIndices } from "./retrieval.js";
import { SAMPLE_CORPUS } from "./corpus.js";
import type { QueryResponse } from "./types.js";

// Identical to server.ts QueryBody: q non-empty (trimmed), topK int 1..50, default 5.
export const QueryBody = z.object({
  q: z
    .string()
    .refine((s) => s.trim().length > 0, {
      message: "query must not be empty or whitespace",
    }),
  topK: z.number().int().positive().max(50).optional(),
});

export type OkResult = { status: 200; body: QueryResponse };
export type ErrResult = { status: 400; body: { error: string } };
export type AppResult = OkResult | ErrResult;

export interface SearchApp {
  /** GET /healthz — identical shape: { ok: true, corpus: <n> } */
  health(): { ok: true; corpus: number };
  /** GET /query?q=... — 200 QueryResponse, or 400 on empty/whitespace query */
  queryGet(q: string | null | undefined): AppResult;
  /** POST /query — raw JSON string body. 400 on bad JSON or invalid body. */
  queryPost(rawBody: string): AppResult;
}

export function createApp(): SearchApp {
  // FIX: indices are always built here (once), not injected by the caller.
  const { dense, bm25 } = buildIndices();
  return {
    health() {
      return { ok: true, corpus: SAMPLE_CORPUS.length };
    },
    queryGet(q) {
      if (!q || q.trim().length === 0) {
        return { status: 400, body: { error: "query must not be empty or whitespace" } };
      }
      return { status: 200, body: runQuery(q, dense, bm25) };
    },
    queryPost(rawBody) {
      let raw: unknown;
      try {
        raw = JSON.parse(rawBody);
      } catch (err) {
        return { status: 400, body: { error: (err as Error).message } };
      }
      const parsed = QueryBody.safeParse(raw);
      if (!parsed.success) {
        return {
          status: 400,
          body: { error: parsed.error.issues[0]?.message ?? "bad body" },
        };
      }
      const { q, topK = 5 } = parsed.data;
      return { status: 200, body: runQuery(q, dense, bm25, topK) };
    },
  };
}
