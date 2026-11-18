/**
 * Neutral cover placeholder used when a cover fails to load.
 * Derived from the INK & STAMP palette — never the brand logo, so a broken
 * image reads as "no cover" instead of a rendering bug.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
  <rect width="400" height="560" fill="#101012"/>
  <rect x="14" y="14" width="372" height="532" fill="none" stroke="#26262A" stroke-width="1"/>
  <text x="200" y="268" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="72" font-weight="700" fill="#F4EFE4" opacity="0.18">KS</text>
  <text x="200" y="306" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="#ABA599">NO COVER</text>
  <rect x="14" y="14" width="6" height="6" fill="#E8472F"/>
</svg>`;

export const FALLBACK_COVER = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;