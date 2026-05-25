import { NextResponse } from "next/server";
import { fetchAllTogelSources } from "@/lib/live/togelFetcher";
import { getTogelSources, togelLiveEnabled } from "@/lib/live/togelSources";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!togelLiveEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "TOGEL_LIVE_ENABLED is not true.",
        hint: "Set TOGEL_LIVE_ENABLED=true and TOGEL_SOURCE_1_URL in Railway variables.",
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const market = url.searchParams.get("market")?.toUpperCase() ?? null;
  const sources = getTogelSources().filter((source) => !market || source.market.toUpperCase() === market);

  if (sources.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: market ? `No togel source configured for market ${market}.` : "No togel source configured.",
      },
      { status: 404 }
    );
  }

  const fetched = await fetchAllTogelSources(sources);

  return NextResponse.json({
    success: true,
    fetchedAt: new Date().toISOString(),
    totalSources: sources.length,
    sources: fetched,
    latest: fetched.map((item) => item.latest).filter(Boolean),
  });
}
