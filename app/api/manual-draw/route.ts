import { NextResponse } from "next/server";
import { addRuntimeHistoryRow, clearRuntimeHistoryRows, getRuntimeHistoryRows } from "@/lib/runtimeHistory";

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET() {
  return NextResponse.json({ success: true, rows: getRuntimeHistoryRows() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const market = String(body.market || "HK").trim().toUpperCase();
    const date = String(body.date || "").trim();
    const result = String(body.result || "").replace(/\D/g, "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad("Date wajib format YYYY-MM-DD.");
    if (!/^[A-Z0-9_ -]{2,20}$/.test(market)) return bad("Market tidak valid.");
    if (!/^\d{4}$/.test(result)) return bad("Result wajib 4 digit, contoh 7430.");

    const row = addRuntimeHistoryRow({ market, date, result });
    return NextResponse.json({ success: true, row, rows: getRuntimeHistoryRows() });
  } catch {
    return bad("Request body harus JSON valid.");
  }
}

export async function DELETE() {
  clearRuntimeHistoryRows();
  return NextResponse.json({ success: true, rows: [] });
}
