import { NextResponse } from "next/server";
import { z } from "zod";
import { searchView } from "../../../lib/server.js";

// Supplementary endpoint (not in the port): per-view ranked lists WITH scores
// for the Dense / Sparse tabs. The port's /query response carries denseTop /
// sparseTop as anchor strings only (no scores), so this endpoint reuses the
// SAME ported indices (DenseIndex.search / BM25Index.search) to expose them.
// Same Zod validation contract as /api/query (400s on invalid).
const ScoresQuerySchema = z.object({
  q: z
    .string()
    .refine((s) => s.trim().length > 0, {
      message: "query must not be empty or whitespace",
    }),
  view: z.enum(["dense", "sparse"]),
  topK: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = ScoresQuerySchema.safeParse({
    q: searchParams.get("q"),
    view: searchParams.get("view"),
    topK: searchParams.get("topK") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "bad query" },
      { status: 400 },
    );
  }
  const { q, view, topK } = parsed.data;
  return NextResponse.json({ view, results: searchView(q, view, topK) });
}
