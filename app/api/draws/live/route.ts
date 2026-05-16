import { NextResponse } from "next/server";
import { fetchLiveDraw, isLiveMarket } from "@/lib/scrapers";
import { LIVE_MARKETS } from "@/lib/scrapers/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const marketParam = searchParams.get("market")?.toUpperCase() ?? "SGP";

  if (!isLiveMarket(marketParam)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported market. Use one of: ${LIVE_MARKETS.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const data = await fetchLiveDraw(marketParam);
  return NextResponse.json({ ok: data.ok, data });
}
