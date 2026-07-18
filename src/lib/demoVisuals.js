const THEMES = {
  antipasto: ["#164e63", "#fef3c7", "#fb923c", "#0f172a"],
  primo: ["#7c2d12", "#fed7aa", "#f97316", "#431407"],
  pesce: ["#075985", "#bae6fd", "#22d3ee", "#082f49"],
  carne: ["#7f1d1d", "#fecaca", "#ef4444", "#450a0a"],
  vegetariano: ["#166534", "#dcfce7", "#22c55e", "#052e16"],
  dolce: ["#7e22ce", "#f3e8ff", "#f59e0b", "#3b0764"],
  drink: ["#0f766e", "#ccfbf1", "#14b8a6", "#042f2e"],
  vino: ["#881337", "#ffe4e6", "#e11d48", "#4c0519"],
};

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function escapeSvg(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function demoRestaurantLogo() {
  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <defs>
    <linearGradient id="g" x1="80" x2="560" y1="80" y2="560" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f172a"/>
      <stop offset=".56" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" rx="148" fill="url(#g)"/>
  <circle cx="320" cy="244" r="118" fill="#fffaf0"/>
  <path d="M206 362h228c18 0 32 14 32 32v12H174v-12c0-18 14-32 32-32Z" fill="#fffaf0"/>
  <path d="M230 250c36 46 144 46 180 0" fill="none" stroke="#0f172a" stroke-width="22" stroke-linecap="round"/>
  <path d="M260 176v76M304 168v84M348 176v76" stroke="#0f172a" stroke-width="16" stroke-linecap="round"/>
  <text x="320" y="514" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#fffaf0">DEMO BISTRO</text>
</svg>`);
}

export function demoDishImage(title, subtitle = "EasyMenu Demo", theme = "primo") {
  const [bg, plate, accent, dark] = THEMES[theme] || THEMES.primo;
  const safeTitle = escapeSvg(title);
  const safeSubtitle = escapeSvg(subtitle);

  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="${bg}"/>
      <stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#020617" flood-opacity=".28"/>
    </filter>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1010" cy="130" r="170" fill="#ffffff" opacity=".13"/>
  <circle cx="160" cy="690" r="220" fill="#ffffff" opacity=".10"/>
  <ellipse cx="600" cy="408" rx="330" ry="210" fill="#fffaf0" filter="url(#shadow)"/>
  <ellipse cx="600" cy="408" rx="245" ry="148" fill="${plate}" opacity=".92"/>
  <circle cx="482" cy="368" r="58" fill="${accent}" opacity=".92"/>
  <circle cx="622" cy="446" r="74" fill="#f8fafc" opacity=".78"/>
  <circle cx="712" cy="346" r="48" fill="${accent}" opacity=".75"/>
  <path d="M424 478c92 58 260 50 348-18" fill="none" stroke="${dark}" stroke-width="24" stroke-linecap="round" opacity=".58"/>
  <path d="M492 298c58-34 146-34 210 0" fill="none" stroke="#fffaf0" stroke-width="18" stroke-linecap="round" opacity=".72"/>
  <text x="600" y="704" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="#ffffff">${safeTitle}</text>
  <text x="600" y="752" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff" opacity=".82">${safeSubtitle}</text>
</svg>`);
}
