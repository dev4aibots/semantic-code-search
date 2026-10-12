// Ported from dev4aibots/semantic-code-search src/retrieval.ts (SHA 1385aaa384f999f16210888a5d44e5237db70cf2).
// Verbatim port: RRF with k=60, runQuery searching dense+sparse at top 10
// each, denseTop/sparseTop sliced to 3, citations from fused topK.
// buildIndices() builds both indices from SAMPLE_CORPUS (used by app.ts).
import { anchor } from "./types.js";
import type { Chunk, QueryResponse, RankedChunk } from "./types.js";
import { BM25Index, DenseIndex } from "./index_store.js";
import { SAMPLE_CORPUS } from "./corpus.js";

export function rrf(
  dense: RankedChunk[],
  sparse: RankedChunk[],
  kRrf = 60,
): RankedChunk[] {
  const scoreByAnchor = new Map<string, number>();
  const byAnchor = new Map<string, Chunk>();
  dense.forEach(({ chunk }, rank) => {
    const a = anchor(chunk);
    scoreByAnchor.set(a, (scoreByAnchor.get(a) ?? 0) + 1.0 / (kRrf + rank + 1));
    byAnchor.set(a, chunk);
  });
  sparse.forEach(({ chunk }, rank) => {
    const a = anchor(chunk);
    scoreByAnchor.set(a, (scoreByAnchor.get(a) ?? 0) + 1.0 / (kRrf + rank + 1));
    byAnchor.set(a, chunk);
  });
  const fused = [...scoreByAnchor.entries()].sort((a, b) => b[1] - a[1]);
  return fused.map(([a, score]) => ({ chunk: byAnchor.get(a)!, score }));
}

export function runQuery(
  q: string,
  dense: DenseIndex,
  bm25: BM25Index,
  topK = 5,
): QueryResponse {
  const d = dense.search(q, 10);
  const s = bm25.search(q, 10);
  const fused = rrf(d, s);
  const top = fused.slice(0, topK);
  return {
    query: q,
    denseTop: d.slice(0, 3).map((r) => anchor(r.chunk)),
    sparseTop: s.slice(0, 3).map((r) => anchor(r.chunk)),
    fusedTop: fused.slice(0, topK).map((r) => anchor(r.chunk)),
    citations: top.map((r) => ({ anchor: anchor(r.chunk), score: r.score })),
  };
}

export function buildIndices(): { dense: DenseIndex; bm25: BM25Index } {
  const dense = new DenseIndex();
  const bm25 = new BM25Index();
  for (const c of SAMPLE_CORPUS) {
    dense.add(c);
    bm25.add(c);
  }
  return { dense, bm25 };
}
