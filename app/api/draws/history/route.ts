import { NextResponse } from "next/server";
import { fetchHkHistory } from "@/lib/scrapers/hkHistory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") ?? "HK").toUpperCase();

  if (market !== "HK") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only HK scraped history is configured right now. Add a trusted source before enabling other markets.",
      },
      { status: 400 }
    );
  }

  const data = await fetchHkHistory();
  return NextResponse.json({ ok: data.ok, data });
}
