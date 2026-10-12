import { NextResponse } from "next/server";
import { getApp } from "../../../lib/server.js";

export async function GET() {
  // Identical shape to the port: { ok: true, corpus: <n> }
  return NextResponse.json(getApp().health());
}
