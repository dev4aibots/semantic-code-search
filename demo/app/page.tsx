"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Slider from "@radix-ui/react-slider";
import * as Dialog from "@radix-ui/react-dialog";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import BlurText from "../components/BlurText";
import { Reveal, NumberTicker } from "../components/MotionBits";
import { SAMPLE_CORPUS } from "../lib/corpus.js";
import { anchor } from "../lib/types.js";
import type { Chunk, QueryResponse } from "../lib/types.js";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

// Verbatim probe queries from upstream src/index.ts probe() (see PORT_NOTES).
const PROBES = [
  "how is S3 multipart abort wired into retry budget",
  "where is authorization centralized",
  "how does rank fusion work",
];

const GITHUB_URL = "https://github.com/dev4aibots/semantic-code-search";
const RRF_K = 60;

const CHUNKS = new Map<string, Chunk>(SAMPLE_CORPUS.map((c) => [anchor(c), c]));

type ScoredAnchor = { anchor: string; score: number };
type ViewName = "fused" | "dense" | "sparse";

type SearchData = {
  q: string;
  topK: number;
  resp: QueryResponse;
  dense: ScoredAnchor[];
  sparse: ScoredAnchor[];
};

type Selected = {
  anchor: string;
  fusedRank: number;
  fusedScore: number;
  dense?: { rank: number; score: number };
  sparse?: { rank: number; score: number };
};

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function SunIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z" strokeLinejoin="round" />
    </svg>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem("scs-theme");
      if (s === "light" || s === "dark") {
        setTheme(s);
        document.documentElement.classList.add(s);
      }
    } catch {
      /* storage unavailable, stay on system */
    }
  }, []);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      mounted &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(next);
    try {
      localStorage.setItem("scs-theme", next);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span className="t-caption t-secondary">{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

function HealthPill({ health }: { health: { ok: boolean; corpus?: number } | null }) {
  if (health === null) {
    return (
      <span className="health-pill" aria-label="Checking API status">
        <span className="dot" aria-hidden="true" />
        checking
      </span>
    );
  }
  return (
    <span
      className="health-pill"
      role="status"
      aria-label={health.ok ? `API online, corpus ${health.corpus ?? "?"} chunks` : "API unreachable"}
    >
      <span className={`dot ${health.ok ? "dot-ok" : "dot-bad"}`} aria-hidden="true" />
      {health.ok ? `api · corpus ${health.corpus ?? "?"}` : "api unreachable"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [input, setInput] = useState("");
  const [topK, setTopK] = useState(5);
  const [view, setView] = useState<ViewName>("fused");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [data, setData] = useState<SearchData | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; corpus?: number } | null>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const [listRef] = useAutoAnimate<HTMLUListElement>();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/healthz")
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) {
          const j = await r.json();
          setHealth({ ok: j.ok === true, corpus: j.corpus });
        } else {
          setHealth({ ok: false });
        }
      })
      .catch(() => {
        if (!cancelled) setHealth({ ok: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(async (query: string, k: number) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/query?q=${encodeURIComponent(query)}&topK=${k}`);
      const body = await res.json();
      if (!res.ok) {
        setApiError(
          typeof body?.error === "string" ? body.error : `Request failed (HTTP ${res.status})`,
        );
        return;
      }
      const resp = body as QueryResponse;
      const [dRes, sRes] = await Promise.all([
        fetch(`/api/scores?q=${encodeURIComponent(query)}&view=dense&topK=${k}`),
        fetch(`/api/scores?q=${encodeURIComponent(query)}&view=sparse&topK=${k}`),
      ]);
      const dense: ScoredAnchor[] = dRes.ok ? ((await dRes.json()).results ?? []) : [];
      const sparse: ScoredAnchor[] = sRes.ok ? ((await sRes.json()).results ?? []) : [];
      setData({ q: query, topK: k, resp, dense, sparse });
    } catch {
      setApiError("Could not reach the local API. Is the app running?");
    } finally {
      setLoading(false);
    }
  }, []);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void runSearch(input, topK);
    },
    [input, topK, runSearch],
  );

  // Validation playground: malformed POST body returns the API's real 400, shown inline.
  const tryBadPost = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{",
      });
      const body = await res.json();
      if (!res.ok) {
        setApiError(
          `POST /api/query returned 400: ${typeof body?.error === "string" ? body.error : "bad request"}`,
        );
      }
    } catch {
      setApiError("Could not reach the local API.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fusedScores = useMemo(() => {
    if (!data) return new Map<string, number>();
    return new Map(data.resp.citations.map((c) => [c.anchor, c.score]));
  }, [data]);

  const rows: { anchor: string; score: number | null }[] = useMemo(() => {
    if (!data) return [];
    if (view === "fused") {
      return data.resp.fusedTop.map((a) => ({ anchor: a, score: fusedScores.get(a) ?? null }));
    }
    if (view === "dense") return data.dense;
    return data.sparse;
  }, [data, view, fusedScores]);

  const openInspector = useCallback(
    (rowIndex: number) => {
      if (!data) return;
      const row = rows[rowIndex];
      const dIdx = data.dense.findIndex((r) => r.anchor === row.anchor);
      const sIdx = data.sparse.findIndex((r) => r.anchor === row.anchor);
      setSelected({
        anchor: row.anchor,
        fusedRank: data.resp.fusedTop.indexOf(row.anchor),
        fusedScore: fusedScores.get(row.anchor) ?? 0,
        dense: dIdx >= 0 ? { rank: dIdx, score: data.dense[dIdx].score } : undefined,
        sparse: sIdx >= 0 ? { rank: sIdx, score: data.sparse[sIdx].score } : undefined,
      });
    },
    [data, rows, fusedScores],
  );

  const selChunk = selected ? CHUNKS.get(selected.anchor) : undefined;
  const denseContrib = selected?.dense ? 1 / (RRF_K + selected.dense.rank + 1) : 0;
  const sparseContrib = selected?.sparse ? 1 / (RRF_K + selected.sparse.rank + 1) : 0;

  const viewLabel: Record<ViewName, string> = {
    fused: "RRF-fused",
    dense: "dense",
    sparse: "sparse",
  };

  return (
    <div className="page">
      {/* Functional layer: glass nav */}
      <header className="nav glass-regular">
        <div className="nav-inner">
          <div className="nav-title">
            <span className="t-headline">Semantic Code Search</span>
            <span className="t-caption t-tertiary">dev4aibots · code search demo</span>
          </div>
          <div className="nav-actions">
            <HealthPill health={health} />
            <ThemeToggle />
            <a className="btn btn-quiet" href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main className="wrap" style={{ flex: 1 }}>
        {/* Hero: the 10-second story */}
        <section className="hero" aria-labelledby="hero-heading">
          <p className="hero-eyebrow">Search by meaning, not just keywords</p>
          <BlurText
            text="Search your codebase the way you'd ask a colleague."
            className="t-display"
            id="hero-heading"
          />
          <p className="hero-sub">
            Type a question in plain English and get back the exact code that
            answers it, ranked with reasons. This demo searches a real sample
            codebase, explains every ranking, and runs entirely on this machine.
            No keys, no cloud, nothing leaves this page.
          </p>

          <form onSubmit={onSubmit} role="search" aria-label="Semantic code search">
            <div className="search-capsule">
              <input
                type="search"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='e.g. "where is authorization centralized"'
                aria-label="Search the code corpus"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" aria-hidden="true" /> : null}
                {loading ? "Searching" : "Search"}
              </button>
            </div>
          </form>

          <div className="row mt-3" role="group" aria-label="Example queries">
            <span className="t-caption t-tertiary">Start with one of these:</span>
            {PROBES.map((p) => (
              <button
                key={p}
                type="button"
                className="chip"
                title={p}
                onClick={() => {
                  setInput(p);
                  void runSearch(p, topK);
                }}
              >
                {p.length > 44 ? `${p.slice(0, 44)}…` : p}
              </button>
            ))}
          </div>

          {apiError ? (
            <div className="callout callout-error mt-4" role="alert" aria-live="assertive">
              <span className="t-headline" style={{ color: "var(--sys-red)" }}>
                The API said no.{" "}
              </span>
              <code>{apiError}</code>
            </div>
          ) : null}
        </section>

        {/* Results */}
        <Reveal as="section" className="section" aria-label="Search results">
          <div className="section-head">
            <h2 className="t-title-2 card-title">Rankings</h2>
            <Tabs.Root value={view} onValueChange={(v) => setView(v as ViewName)}>
              <Tabs.List className="seg" aria-label="Retrieval view">
                <Tabs.Trigger value="fused">RRF-Fused</Tabs.Trigger>
                <Tabs.Trigger value="dense">Dense</Tabs.Trigger>
                <Tabs.Trigger value="sparse">Sparse</Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>
          </div>
          <p className="section-lede t-callout t-secondary">
            Every row is a live ranking from the ported engine, with a peek at
            the matching code. Select a row to see the math behind its position.
          </p>

          <div className="card card-pad">
            <div className="row">
              <label
                htmlFor="topk"
                className="t-headline grow"
                onClick={() => thumbRef.current?.focus()}
                style={{ cursor: "pointer" }}
              >
                Results per query
                <span className="t-footnote t-tertiary" style={{ display: "block", fontWeight: 400 }}>
                  topK, from 1 to 50
                </span>
              </label>
              <span className="t-code" aria-hidden="true">{topK}</span>
            </div>
            <Slider.Root
              id="topk"
              className="slider mt-2"
              min={1}
              max={50}
              step={1}
              value={[topK]}
              onValueChange={([v]) => setTopK(v)}
              onValueCommit={([v]) => {
                if (data && !loading) void runSearch(data.q, v);
              }}
              aria-label="Results per query (topK), 1 to 50"
            >
              <Slider.Track className="slider-track">
                <Slider.Range className="slider-range" />
              </Slider.Track>
              <Slider.Thumb ref={thumbRef} className="slider-thumb" aria-label="topK value" />
            </Slider.Root>
          </div>

          <div className="card mt-3" aria-live="polite">
            {!data ? (
              <div className="card-pad">
                <p className="t-body t-secondary" style={{ margin: 0 }}>
                  No query yet. Run a search above. Every ranking here is computed
                  live by the ported engine through <span className="t-code">/api/query</span>.
                  Select any result to inspect its citation.
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="card-pad">
                <p className="t-body t-secondary" style={{ margin: 0 }}>
                  No results for <span className="t-code">&ldquo;{data.q}&rdquo;</span> in this view.
                </p>
              </div>
            ) : (
              <div>
                <div className="card-pad hairline-bottom">
                  <p className="t-subheadline t-tertiary" style={{ margin: 0 }}>
                    {rows.length} {viewLabel[view]} result{rows.length === 1 ? "" : "s"} for{" "}
                    <span className="t-code">&ldquo;{data.q}&rdquo;</span> · topK {data.topK}
                  </p>
                </div>
                <ul className="result-list" ref={listRef} aria-label={`${viewLabel[view]} results`}>
                  {rows.map((row, i) => {
                    const chunk = CHUNKS.get(row.anchor);
                    return (
                      <li key={row.anchor}>
                      <button
                        type="button"
                        className="result-row"
                        onClick={() => openInspector(i)}
                        aria-label={`Inspect citation ${row.anchor}`}
                      >
                        <span className="rank-num" aria-hidden="true">{i + 1}</span>
                        <span className="result-main">
                          <span className="result-anchor">{row.anchor}</span>
                          {chunk ? (
                            <span className="code-peek">{chunk.body}</span>
                          ) : null}
                          {chunk ? (
                            <span className="t-subheadline t-secondary">
                              <span className="t-code">{chunk.symbol}</span>
                              {" · "}
                              {chunk.summary.length > 90
                                ? `${chunk.summary.slice(0, 90)}…`
                                : chunk.summary}
                            </span>
                          ) : null}
                        </span>
                        {row.score !== null ? (
                          <span className="score-chip" title="Retrieval score">
                            {row.score.toFixed(4)}
                          </span>
                        ) : null}
                      </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Reveal>

        {/* Status */}
        <Reveal as="section" className="section" aria-label="Live status">
          <div className="section-head">
            <h2 className="t-title-2 card-title">Live status</h2>
          </div>
          <p className="section-lede t-callout t-secondary">
            The status below comes from the same API that serves your rankings.
          </p>
          <div className="card card-pad">
            <div className="row">
              <HealthPill health={health} />
              <span className="t-callout t-secondary grow">
                Live <span className="t-code">GET /api/healthz</span>, answered by the
                same process that ranks your queries. The three example queries in
                the hero are the upstream probe queries, wired as one-click buttons.
              </span>
            </div>
            <div className="hairline-top mt-4" style={{ paddingTop: 16 }}>
              <p className="t-headline" style={{ margin: "0 0 8px 0" }}>Try to break it</p>
              <p className="t-callout t-secondary" style={{ margin: "0 0 12px 0" }}>
                The API rejects bad input with a 400 error. Send an empty query or
                a broken POST body and see the real error message, inline.
              </p>
              <div className="row">
                <button type="button" className="btn btn-quiet" onClick={() => void runSearch("   ", topK)}>
                  Empty query, expect 400
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => void tryBadPost()}>
                  Broken POST body, expect 400
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Benchmark */}
        <Reveal as="section" className="section" aria-label="How well it finds things">
          <div className="section-head">
            <h2 className="t-title-2 card-title">How well it finds things</h2>
            <span className="t-caption t-tertiary">evals/benchmark.ts · canned numbers</span>
          </div>
          <div className="card card-pad">
            <div className="stats" role="list" aria-label="Retrieval quality metrics">
              <NumberTicker value={78.4} format={(v) => `${v.toFixed(1)}%`} label="Recall@1" />
              <NumberTicker value={92.1} format={(v) => `${v.toFixed(1)}%`} label="Recall@5" />
              <NumberTicker value={0.84} format={(v) => v.toFixed(2)} label="MRR" />
              <NumberTicker value={180} format={(v) => `${Math.round(v)} ms`} label="P95 latency" />
            </div>
            <p className="t-footnote t-tertiary mt-3" style={{ marginBottom: 0 }}>
              Measured upstream with <span className="t-code">make eval</span> on the
              sample corpus. Reported here, not re-run in your browser.
            </p>
          </div>
        </Reveal>
      </main>

      <footer className="footer">
        <div className="wrap">
          <p className="t-footnote t-tertiary" style={{ margin: 0 }}>
            Portfolio demo of{" "}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              dev4aibots/semantic-code-search
            </a>
            . All rankings are computed locally by the ported engine. No external
            calls, no credentials. Interface follows Apple&rsquo;s Human Interface
            Guidelines; no affiliation with Apple Inc.
          </p>
        </div>
      </footer>

      {/* Citation inspector */}
      <Dialog.Root
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content" aria-describedby="cite-desc">
            {selected && selChunk ? (
              <>
                <Dialog.Title className="t-headline" style={{ margin: "0 0 4px 0" }}>
                  <span className="t-code">{selected.anchor}</span>
                </Dialog.Title>
                <Dialog.Description id="cite-desc" className="t-callout t-secondary" style={{ margin: "0 0 16px 0" }}>
                  <span className="t-code">{selChunk.symbol}</span>
                  {" · "}
                  {selChunk.repo}/{selChunk.path}:{selChunk.startLine}–{selChunk.endLine}
                </Dialog.Description>

                <p className="t-body t-secondary" style={{ margin: "0 0 12px 0" }}>
                  {selChunk.summary}
                </p>
                <pre className="codeblock" tabIndex={0} aria-label="Code snippet">{selChunk.body}</pre>

                <h3 className="t-title-3 mt-4" style={{ marginBottom: 8 }}>
                  Score breakdown
                </h3>
                <table className="spec">
                  <tbody>
                    <tr>
                      <th scope="row">RRF score (k = 60)</th>
                      <td>{selected.fusedScore.toFixed(4)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Fused rank</th>
                      <td>#{selected.fusedRank + 1}</td>
                    </tr>
                    <tr>
                      <th scope="row">Dense rank · cosine</th>
                      <td>
                        {selected.dense
                          ? `#${selected.dense.rank + 1} · ${selected.dense.score.toFixed(4)}`
                          : "Not in the dense top 10"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Dense contribution</th>
                      <td>
                        {selected.dense
                          ? `1/(60+${selected.dense.rank}+1) = ${denseContrib.toFixed(4)}`
                          : "0.0000"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Sparse rank · BM25</th>
                      <td>
                        {selected.sparse
                          ? `#${selected.sparse.rank + 1} · ${selected.sparse.score.toFixed(4)}`
                          : "Not in the sparse top 10"}
                      </td>
                    </tr>
                    <tr>
                      <th scope="row">Sparse contribution</th>
                      <td>
                        {selected.sparse
                          ? `1/(60+${selected.sparse.rank}+1) = ${sparseContrib.toFixed(4)}`
                          : "0.0000"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="t-footnote t-tertiary mt-3" style={{ marginBottom: 0 }}>
                  RRF(k=60) = Σ 1/(60 + rank + 1) over the dense and sparse lists.
                  That is the exact formula in the ported <span className="t-code">rrf()</span>.
                </p>

                <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
                  <Dialog.Close asChild>
                    <button type="button" className="btn btn-primary">Done</button>
                  </Dialog.Close>
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
