export type TogelSourceType = "4D" | "5D";

export type TogelLiveSource = {
  market: string;
  name: string;
  url: string;
  type: TogelSourceType;
};

function envFlag(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function sourceFromEnv(index: number): TogelLiveSource | null {
  const url = process.env[`TOGEL_SOURCE_${index}_URL`];
  if (!url) return null;

  return {
    market: process.env[`TOGEL_SOURCE_${index}_MARKET`] || `SOURCE_${index}`,
    name: process.env[`TOGEL_SOURCE_${index}_NAME`] || `Togel Source ${index}`,
    url,
    type: (process.env[`TOGEL_SOURCE_${index}_TYPE`] as TogelSourceType | undefined) || "4D",
  };
}

export function togelLiveEnabled(): boolean {
  return envFlag("TOGEL_LIVE_ENABLED", false);
}

export function getTogelSources(): TogelLiveSource[] {
  const sources: TogelLiveSource[] = [];

  for (let i = 1; i <= 20; i++) {
    const source = sourceFromEnv(i);
    if (source) sources.push(source);
  }

  if (sources.length > 0) return sources;

  const hkUrl = process.env.TOGEL_HK_HISTORY_URL;
  if (hkUrl) {
    sources.push({
      market: process.env.TOGEL_HK_MARKET || "HK",
      name: process.env.TOGEL_HK_NAME || "Hongkong Lotto",
      url: hkUrl,
      type: "4D",
    });
  }

  return sources;
}
