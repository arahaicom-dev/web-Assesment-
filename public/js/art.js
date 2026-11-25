/* Ilustrasi orisinal (SVG): maskot "Kubi" si robot kubus & objek 3D melayang. */
(function () {
  'use strict';
  let n = 0;
  const uid = () => 'a' + (++n) + Math.random().toString(36).slice(2, 6);

  /** Kubi — robot kubus. opsi: {c: warna utama, d: warna gelap, l: warna terang, pose: 'wave'|'pencil'|'trophy'|'cheer', eyes: 'happy'|'open'} */
  function kubi(o) {
    o = Object.assign({ c: '#6d5cff', d: '#3b2fc4', l: '#a99bff', pose: 'wave', eyes: 'open', screen: '#14123a', glow: '#7ef9ff' }, o || {});
    const g = uid();
    const eyes = o.eyes === 'happy'
      ? `<path d="M74 92 q8 -10 16 0" stroke="${o.glow}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M110 92 q8 -10 16 0" stroke="${o.glow}" stroke-width="6" fill="none" stroke-linecap="round"/>`
      : `<rect x="74" y="80" width="14" height="20" rx="7" fill="${o.glow}"/><rect x="112" y="80" width="14" height="20" rx="7" fill="${o.glow}"/><circle cx="84" cy="85" r="3" fill="#fff"/><circle cx="122" cy="85" r="3" fill="#fff"/>`;
    const armL = o.pose === 'cheer' ? `<path d="M50 120 q-22 -24 -18 -52" stroke="${o.d}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="32" cy="66" r="10" fill="${o.l}"/>`
      : `<path d="M50 128 q-18 8 -22 26" stroke="${o.d}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="28" cy="156" r="10" fill="${o.l}"/>`;
    let armR, prop = '';
    if (o.pose === 'wave' || o.pose === 'cheer') armR = `<path d="M150 120 q22 -24 18 -52" stroke="${o.d}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="168" cy="66" r="10" fill="${o.l}"/>`;
    else armR = `<path d="M150 128 q18 4 24 20" stroke="${o.d}" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="175" cy="150" r="10" fill="${o.l}"/>`;
    if (o.pose === 'pencil') prop = `<g transform="translate(170 104) rotate(28)"><rect x="-6" y="0" width="12" height="54" rx="3" fill="#ffc93c"/><rect x="-6" y="0" width="12" height="9" rx="2" fill="#ff7a9a"/><path d="M-6 54 L0 68 L6 54 Z" fill="#f3d9b1"/><path d="M-2 62 L0 68 L2 62 Z" fill="#333"/></g>`;
    if (o.pose === 'trophy') prop = `<g transform="translate(160 118)">${trophyInner()}</g>`;
    return `<svg viewBox="0 0 200 230" xmlns="http://www.w3.org/2000/svg" class="kubi" role="img" aria-label="Kubi">
      <defs><linearGradient id="${g}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.l}"/><stop offset=".55" stop-color="${o.c}"/><stop offset="1" stop-color="${o.d}"/></linearGradient>
      <radialGradient id="${g}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="100" cy="216" rx="62" ry="10" fill="url(#${g}s)"/>
      <rect x="70" y="176" width="20" height="34" rx="9" fill="${o.d}"/><rect x="110" y="176" width="20" height="34" rx="9" fill="${o.d}"/>
      <rect x="62" y="200" width="34" height="14" rx="7" fill="${o.l}"/><rect x="104" y="200" width="34" height="14" rx="7" fill="${o.l}"/>
      ${armL}${armR}
      <path d="M48 52 L100 32 L152 52 L100 72 Z" fill="${o.l}" opacity=".9"/>
      <rect x="44" y="50" width="112" height="132" rx="30" fill="url(#${g}f)"/>
      <path d="M156 80 q10 4 10 16 v52 q0 22 -14 30" fill="${o.d}" opacity=".55"/>
      <rect x="58" y="64" width="84" height="62" rx="18" fill="${o.screen}"/>
      ${eyes}
      <path d="M88 108 q12 10 24 0" stroke="${o.glow}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="70" y="138" width="60" height="28" rx="10" fill="${o.d}" opacity=".45"/>
      <circle cx="86" cy="152" r="6" fill="#ff7a9a"/><circle cx="100" cy="152" r="6" fill="#ffc93c"/><circle cx="114" cy="152" r="6" fill="#4be3a8"/>
      <line x1="100" y1="50" x2="100" y2="24" stroke="${o.d}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="100" cy="18" r="10" fill="#ff7a9a"/><circle cx="96" cy="14" r="3" fill="#fff" opacity=".8"/>
      ${prop}
    </svg>`;
  }
  function trophyInner() {
    return `<path d="M-20 -30 h40 v14 q0 24 -20 28 q-20 -4 -20 -28 Z" fill="#ffc93c"/><path d="M-20 -24 q-14 0 -12 12 q2 10 14 12" stroke="#f0a91c" stroke-width="5" fill="none"/><path d="M20 -24 q14 0 12 12 q-2 10 -14 12" stroke="#f0a91c" stroke-width="5" fill="none"/>
      <rect x="-5" y="10" width="10" height="12" fill="#f0a91c"/><rect x="-16" y="20" width="32" height="10" rx="3" fill="#8a5cff"/><path d="M-6 -18 l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z" fill="#fff6c8"/>`;
  }
  const trophy = () => `<svg viewBox="-40 -40 80 80" xmlns="http://www.w3.org/2000/svg">${trophyInner()}</svg>`;
  const star = (o) => { const c = typeof o === 'string' ? o : (o && o.c); return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 4 L62 36 L96 38 L69 59 L79 93 L50 73 L21 93 L31 59 L4 38 L38 36 Z" fill="${c || '#ffc93c'}" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/></svg>`; };
  const pencil = () => `<svg viewBox="0 0 40 140" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="0" width="28" height="106" rx="6" fill="#ffc93c"/><rect x="6" y="0" width="28" height="18" rx="5" fill="#ff7a9a"/><rect x="6" y="18" width="28" height="6" fill="#c9c9d9"/><path d="M6 106 L20 138 L34 106 Z" fill="#f3d9b1"/><path d="M15 126 L20 138 L25 126 Z" fill="#2b2b3a"/><rect x="24" y="24" width="5" height="80" fill="#fff" opacity=".35"/></svg>`;
  const book = () => `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg"><path d="M60 16 Q34 2 6 10 V82 Q34 74 60 88 Z" fill="#4be3a8"/><path d="M60 16 Q86 2 114 10 V82 Q86 74 60 88 Z" fill="#33c38e"/><path d="M60 16 V88" stroke="#1d8a63" stroke-width="3"/><path d="M16 26 Q36 20 52 28 M16 40 Q36 34 52 42 M68 28 Q84 20 104 26 M68 42 Q84 34 104 40" stroke="#fff" stroke-opacity=".7" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  const bubble = () => `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg"><path d="M10 8 h80 q8 0 8 8 v44 q0 8 -8 8 h-46 l-20 18 v-18 h-14 q-8 0 -8 -8 v-44 q0 -8 8 -8 Z" fill="#ffffff"/><text x="50" y="52" text-anchor="middle" font-family="Unbounded, sans-serif" font-weight="900" font-size="38" fill="#6d5cff">?</text></svg>`;
  const pad = () => `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg"><path d="M30 20 h100 q26 0 28 30 q2 34 -18 40 q-14 4 -26 -16 h-68 q-12 20 -26 16 q-20 -6 -18 -40 q2 -30 28 -30 Z" fill="#5b4bff"/><rect x="36" y="38" width="10" height="30" rx="3" fill="#cfc8ff"/><rect x="26" y="48" width="30" height="10" rx="3" fill="#cfc8ff"/><circle cx="116" cy="42" r="7" fill="#ff7a9a"/><circle cx="130" cy="56" r="7" fill="#4be3a8"/><circle cx="102" cy="56" r="7" fill="#ffc93c"/><circle cx="116" cy="70" r="7" fill="#7ef9ff"/></svg>`;

  window.Art = { kubi, trophy, star, pencil, book, bubble, pad };
})();
