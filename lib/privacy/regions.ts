/**
 * Coarse mapping from Norwegian postal codes to region and electricity price
 * zone (NO1–NO5). Intentionally coarse: the public snapshot must never narrow
 * a consumer down to a street or small place.
 */

export interface RegionInfo {
  region: string;
  priceZone: string;
}

const RANGES: { from: number; to: number; region: string; priceZone: string }[] = [
  { from: 0, to: 1299, region: "Oslo", priceZone: "NO1" },
  { from: 1300, to: 1999, region: "Akershus/Østfold", priceZone: "NO1" },
  { from: 2000, to: 2399, region: "Akershus/Romerike", priceZone: "NO1" },
  { from: 2400, to: 2999, region: "Innlandet", priceZone: "NO1" },
  { from: 3000, to: 3299, region: "Buskerud", priceZone: "NO1" },
  { from: 3300, to: 3699, region: "Buskerud/Innlandet", priceZone: "NO1" },
  { from: 3700, to: 3999, region: "Telemark", priceZone: "NO2" },
  { from: 4000, to: 4499, region: "Rogaland", priceZone: "NO2" },
  { from: 4500, to: 4999, region: "Agder", priceZone: "NO2" },
  { from: 5000, to: 5999, region: "Vestland (Bergen)", priceZone: "NO5" },
  { from: 6000, to: 6699, region: "Møre og Romsdal", priceZone: "NO3" },
  { from: 6700, to: 6999, region: "Vestland (Sogn og Fjordane)", priceZone: "NO5" },
  { from: 7000, to: 7999, region: "Trøndelag", priceZone: "NO3" },
  { from: 8000, to: 8999, region: "Nordland", priceZone: "NO4" },
  { from: 9000, to: 9999, region: "Troms og Finnmark", priceZone: "NO4" },
];

export function postalCodeToRegion(postalCode: string): RegionInfo {
  const numeric = parseInt(postalCode, 10);
  if (Number.isNaN(numeric)) {
    return { region: "Norge", priceZone: "NO1" };
  }
  const match = RANGES.find((r) => numeric >= r.from && numeric <= r.to);
  return match
    ? { region: match.region, priceZone: match.priceZone }
    : { region: "Norge", priceZone: "NO1" };
}
