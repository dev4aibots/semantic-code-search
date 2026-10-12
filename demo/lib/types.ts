// Ported from dev4aibots/semantic-code-search src/types.ts (SHA 750988b9ebe83bad92b9a78f6c2ee91b8c8f78a6).
// Verbatim port — no behavior changes.
export type Chunk = {
  repo: string;
  path: string;
  startLine: number;
  endLine: number;
  symbol: string;
  body: string;
  summary: string;
};

export type RankedChunk = { chunk: Chunk; score: number };

export type QueryResponse = {
  query: string;
  denseTop: string[];
  sparseTop: string[];
  fusedTop: string[];
  citations: { anchor: string; score: number }[];
};

export function anchor(c: Chunk): string {
  return `${c.repo}/${c.path}:${c.startLine}-${c.endLine}`;
}
