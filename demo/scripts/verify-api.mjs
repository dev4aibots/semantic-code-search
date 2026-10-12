// Runtime API verification: boots `next start` on an ephemeral port and
// asserts real endpoint behavior against the ported engine's contract.
// Exits 0 only if every check passes; always kills the server.
import { spawn } from "node:child_process";

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const checks = [];
function check(name, cond, detail = "") {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : " — " + detail}`);
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "pipe",
});

async function waitForServer(tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${BASE}/api/healthz`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start");
}

let failed = false;
try {
  await waitForServer();

  // 1. healthz shape
  {
    const r = await fetch(`${BASE}/api/healthz`);
    const j = await r.json();
    check("GET /api/healthz -> {ok:true, corpus:6}", r.status === 200 && j.ok === true && j.corpus === 6, JSON.stringify(j));
  }
  // 2. GET /query returns real fused rankings
  {
    const r = await fetch(`${BASE}/api/query?q=${encodeURIComponent("where is authorization centralized")}&topK=3`);
    const j = await r.json();
    const okShape = r.status === 200 && Array.isArray(j.fusedTop) && j.fusedTop.length === 3 &&
      Array.isArray(j.citations) && j.citations.length === 3 && typeof j.citations[0].score === "number";
    check("GET /api/query -> 200 fused rankings", okShape, r.status + " " + JSON.stringify(j).slice(0, 120));
    check("fusedTop[0] is the auth policy chunk", j.fusedTop?.[0] === "auth/libs/policy/opa.py:88-110", j.fusedTop?.[0]);
  }
  // 3. GET validation 400s
  {
    const r = await fetch(`${BASE}/api/query?q=%20%20`);
    const j = await r.json();
    check("GET empty q -> 400 port message", r.status === 400 && j.error === "query must not be empty or whitespace", r.status + " " + JSON.stringify(j));
  }
  {
    const r = await fetch(`${BASE}/api/query?q=x&topK=99`);
    check("GET topK=99 -> 400", r.status === 400, String(r.status));
  }
  // 4. POST paths
  {
    const r = await fetch(`${BASE}/api/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: "how does rank fusion work", topK: 2 }) });
    const j = await r.json();
    check("POST /api/query -> 200", r.status === 200 && Array.isArray(j.fusedTop) && j.fusedTop.length === 2, String(r.status));
  }
  {
    const r = await fetch(`${BASE}/api/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "not json{" });
    const j = await r.json();
    check("POST invalid JSON -> 400 with message", r.status === 400 && typeof j.error === "string" && j.error.length > 0, String(r.status));
  }
  {
    const r = await fetch(`${BASE}/api/query`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: "x", topK: 51 }) });
    check("POST topK=51 -> 400", r.status === 400, String(r.status));
  }
  // 5. scores endpoint (real engine, dense cosine + sparse BM25)
  {
    const r = await fetch(`${BASE}/api/scores?q=${encodeURIComponent("where is authorization centralized")}&view=dense&topK=3`);
    const j = await r.json();
    check("GET /api/scores dense -> scored anchors", r.status === 200 && j.view === "dense" && j.results.length === 3 && typeof j.results[0].score === "number", String(r.status));
  }
  // 6. homepage serves
  {
    const r = await fetch(`${BASE}/`);
    const html = await r.text();
    check("GET / -> 200 with hero", r.status === 200 && html.includes("Ask your codebase"), String(r.status));
  }
} catch (e) {
  console.log("FAIL  harness error —", String(e));
  failed = true;
} finally {
  server.kill("SIGTERM");
}

const bad = checks.filter((c) => !c.ok);
const nPass = checks.length - bad.length;
console.log(`\n${nPass}/${checks.length} checks passed`);
console.log(`Tests: ${nPass} passed, ${checks.length} total`);
process.exit(failed || bad.length > 0 ? 1 : 0);
