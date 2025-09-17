// Curated per-set color overrides.
// Keys can be groupId (TCGplayer Group ID) as string or uppercase set abbreviation.
// Values should be CSS colors (hex, rgb, or hsl).
//
// Add entries as you prefer. Example Pokemon SV-era below as placeholders.
// If a set is not present here, the UI falls back to a stable derived color.

export const setColorOverrides: Record<string, string> = {
  // By TCGplayer groupId (string)
  // "3120": "#d946ef", // Example groupId → color

  // By set abbreviation (UPPERCASE)
  // Pokemon Scarlet & Violet era (examples; replace with your choices):
  // "SV1": "#b91c1c",
  // "SV2": "#2563eb",
  // "SV3": "#16a34a",
  // "SV4": "#f59e0b",
  // "SV5": "#8b5cf6",
  // "SVP": "#64748b",

  // MTG examples:
  // "LTR": "#2563eb", // The Lord of the Rings
  // "MH3": "#dc2626", // Modern Horizons 3
};
