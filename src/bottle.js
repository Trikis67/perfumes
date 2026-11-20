// Genera frascos de perfume en SVG. Cada fragancia tiene su forma, su tapa y el color de su líquido.
// Estructura animable:
//   .bottle-shadow  sombra en el piso
//   .bottle-body    todo el frasco (se inclina)
//   .bottle-liquid  el líquido (gira en sentido contrario para quedar nivelado)
//   .bottle-cap     la tapa / atomizador
let uid = 0;

const SHAPES = {
  classic: {
    top: 104,
    bottom: 290,
    left: 40,
    right: 160,
    path: 'M56 104 H144 Q160 104 160 120 V274 Q160 290 144 290 H56 Q40 290 40 274 V120 Q40 104 56 104 Z',
    cap: { w: 64, h: 50 },
  },
  round: {
    top: 122,
    bottom: 290,
    left: 16,
    right: 184,
    path: 'M100 122 A84 84 0 1 1 99.9 122 Z',
    cap: { w: 56, h: 46, round: true },
  },
  tall: {
    top: 84,
    bottom: 290,
    left: 58,
    right: 142,
    path: 'M70 84 H130 Q142 84 142 96 V278 Q142 290 130 290 H70 Q58 290 58 278 V96 Q58 84 70 84 Z',
    cap: { w: 50, h: 58 },
  },
  facet: {
    top: 104,
    bottom: 290,
    left: 30,
    right: 170,
    path: 'M62 104 H138 L170 136 V258 L138 290 H62 L30 258 V136 Z',
    cap: { w: 70, h: 44, facet: true },
  },
  flask: {
    top: 98,
    bottom: 290,
    left: 28,
    right: 172,
    path: 'M74 98 H126 C126 128 172 134 172 176 V270 Q172 290 152 290 H48 Q28 290 28 270 V176 C28 134 74 128 74 98 Z',
    cap: { w: 58, h: 48 },
  },
};

const CAPS = {
  gold: ['#F1E2B8', '#B88A44', '#7A5726', '#E6CB8C'],
  dark: ['#4A4A4C', '#1C1C1E', '#0A0A0B', '#3A3A3D'],
  light: ['#FFFFFF', '#E4E0E6', '#BDB7C0', '#F2EFF4'],
  wood: ['#B98557', '#7C5130', '#4B2E19', '#9C6A42'],
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function bottleSVG({ liquid = '#C4862C', shape = 'classic', cap = 'gold', label = 'ÁNIMA', fill = 0.78 } = {}) {
  const id = `b${++uid}`;
  const s = SHAPES[shape] || SHAPES.classic;
  const c = CAPS[cap] || CAPS.gold;
  const height = s.bottom - s.top;
  const liquidY = s.bottom - height * fill;
  const neckH = 14;
  const neckW = Math.min(36, s.cap.w - 16);
  const neckY = s.top - neckH;
  const capY = neckY - s.cap.h + 2;
  const capX = 100 - s.cap.w / 2;
  const midY = liquidY + (s.bottom - liquidY) * 0.48;

  const capShape = s.cap.round
    ? `<rect x="${capX}" y="${capY}" width="${s.cap.w}" height="${s.cap.h}" rx="${s.cap.w / 2.4}" fill="url(#${id}cap)"/>`
    : s.cap.facet
      ? `<path d="M${capX + 8} ${capY} H${capX + s.cap.w - 8} L${capX + s.cap.w} ${capY + 10} V${capY + s.cap.h} H${capX} V${capY + 10} Z" fill="url(#${id}cap)"/>`
      : `<rect x="${capX}" y="${capY}" width="${s.cap.w}" height="${s.cap.h}" rx="5" fill="url(#${id}cap)"/>`;

  const highlights =
    shape === 'round'
      ? `<path d="M44 196 A58 58 0 0 1 84 146" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.55"/>
    <path d="M166 214 A68 68 0 0 1 150 254" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.3"/>`
      : `<rect x="0" y="${s.bottom - 14}" width="200" height="14" fill="#fff" opacity="0.18"/>
    <rect x="${s.left + 12}" y="${s.top + 14}" width="7" height="${height - 40}" rx="3.5" fill="#fff" opacity="0.55"/>
    <rect x="${s.right - 16}" y="${s.top + 26}" width="3" height="${height - 70}" rx="1.5" fill="#fff" opacity="0.3"/>`;

  return `
<svg class="bottle" viewBox="0 0 200 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--liq:${liquid}">
  <defs>
    <linearGradient id="${id}liq" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(liquid, 0.28)}"/>
      <stop offset="0.55" stop-color="${liquid}"/>
      <stop offset="1" stop-color="${shade(liquid, -0.35)}"/>
    </linearGradient>
    <linearGradient id="${id}glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="0.25" stop-color="#fff" stop-opacity="0.12"/>
      <stop offset="0.75" stop-color="#fff" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="${id}cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c[0]}"/>
      <stop offset="0.35" stop-color="${c[1]}"/>
      <stop offset="0.7" stop-color="${c[2]}"/>
      <stop offset="1" stop-color="${c[3]}"/>
    </linearGradient>
    <radialGradient id="${id}shadow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${shade(liquid, -0.6)}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${shade(liquid, -0.6)}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}clip"><path d="${s.path}"/></clipPath>
  </defs>

  <ellipse class="bottle-shadow" cx="100" cy="298" rx="${(s.right - s.left) / 1.6}" ry="12" fill="url(#${id}shadow)"/>

  <g class="bottle-body">
    <rect x="${100 - neckW / 2}" y="${neckY - 2}" width="${neckW}" height="${neckH + 4}" rx="3" fill="${shade(liquid, 0.55)}" opacity="0.7"/>
    <g class="bottle-cap">${capShape}
      <rect x="${capX + s.cap.w * 0.16}" y="${capY + 4}" width="3" height="${s.cap.h - 8}" rx="1.5" fill="#fff" opacity="0.45"/>
    </g>
    <g clip-path="url(#${id}clip)">
      <path d="${s.path}" fill="${shade(liquid, 0.82)}" opacity="0.55"/>
      <g class="bottle-liquid">
        <rect x="-60" y="${liquidY}" width="320" height="${s.bottom - liquidY + 80}" fill="url(#${id}liq)"/>
        <rect x="-60" y="${liquidY}" width="320" height="2.5" fill="#fff" opacity="0.45"/>
      </g>
      <path d="${s.path}" fill="url(#${id}glass)"/>
      ${highlights}
    </g>
    <path d="${s.path}" fill="none" stroke="#fff" stroke-opacity="0.75" stroke-width="1.5"/>
    <text x="100" y="${midY}" text-anchor="middle" font-family="'Bodoni Moda', serif" font-size="11" letter-spacing="4" fill="#fff" fill-opacity="0.82">${label}</text>
  </g>
</svg>`;
}
