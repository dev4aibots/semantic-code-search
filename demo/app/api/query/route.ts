import { NextResponse } from "next/server";
import { z } from "zod";
import { getApp, runQueryTopK } from "../../../lib/server.js";

// GET /api/query?q=&topK= — same validation contract as the port:
// q non-empty after trim ("query must not be empty or whitespace"), topK int 1..50 (default 5). 400s on invalid.
const GetQuerySchema = z.object({
  q: z
    .string()
    .refine((s) => s.trim().length > 0, {
      message: "query must not be empty or whitespace",
    }),
  topK: z.coerce.number().int().min(1).max(50).default(5),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = GetQuerySchema.safeParse({
    q: searchParams.get("q"),
    topK: searchParams.get("topK") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "bad query" },
      { status: 400 },
    );
  }
  const { q, topK } = parsed.data;
  // q-validation is byte-identical to the port's queryGet (same message);
  // topK flows into the verbatim ported runQuery (default 5, like queryGet).
  return NextResponse.json(runQueryTopK(q, topK));
}

export async function POST(req: Request) {
  // Verbatim port behavior via createApp().queryPost: raw JSON parse, Zod
  // QueryBody (q non-empty trimmed, topK int 1..50 default 5), first-issue
  // 400 messages, invalid-JSON 400 with the parse error message.
  const raw = await req.text();
  const result = getApp().queryPost(raw);
  return NextResponse.json(result.body, { status: result.status });
}
