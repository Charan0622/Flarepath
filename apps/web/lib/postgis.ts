// Parse a PostGIS EWKB-hex string returned by PostgREST into [lng, lat].
// Supabase returns `geography(POINT, 4326)` as a hex-encoded EWKB string by
// default, e.g. "0101000020E61000009A99999999992E408FC2F5285C8F4240".
// This helper handles the common 2D-point-with-SRID case and returns null
// on anything unexpected — callers should always fall back gracefully.

export function parseEWKBPoint(raw: unknown): [number, number] | null {
  if (typeof raw !== "string") return null;
  const hex = raw.startsWith("0x") ? raw.slice(2) : raw;
  if (hex.length < 42) return null; // 1 + 4 + 16 bytes min = 42 hex chars (no SRID)

  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    const view = new DataView(bytes.buffer);

    const littleEndian = view.getUint8(0) === 1;
    const typeWithFlags = view.getUint32(1, littleEndian);
    const baseType = typeWithFlags & 0xff;
    if (baseType !== 1) return null; // not a POINT

    const hasSRID = (typeWithFlags & 0x20000000) !== 0;
    const dataOffset = hasSRID ? 9 : 5;
    if (bytes.length < dataOffset + 16) return null;

    const lng = view.getFloat64(dataOffset, littleEndian);
    const lat = view.getFloat64(dataOffset + 8, littleEndian);

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
    return [lng, lat];
  } catch {
    return null;
  }
}
