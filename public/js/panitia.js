/* Kartu Panitia Ujian — desain kartu (SVG), ekspor JPG & PDF tanpa pustaka luar.
 * Semua desain digambar sendiri dari bentuk dasar (bintang, garis, blok warna). */
(function (root) {
  'use strict';
  const X = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const F_DISP = "'Unbounded', 'Arial Black', sans-serif", F_TEXT = "'Plus Jakarta Sans', Arial, sans-serif";

  const SIZES = [
    { id: 'id', label: 'ID Card tegak (5,4 × 8,6 cm)', w: 54, h: 86 },
    { id: 'idl', label: 'ID Card mendatar (8,6 × 5,4 cm)', w: 86, h: 54 },
    { id: 'b2', label: 'Name tag (7 × 10 cm)', w: 70, h: 100 },
    { id: 'b3', label: 'Name tag besar (9 × 13 cm)', w: 90, h: 130 },
    { id: 'a6', label: 'A6 (10,5 × 14,8 cm)', w: 105, h: 148 },
    { id: 'custom', label: 'Ukuran sendiri…', w: 60, h: 90 }
  ];

  /* ---------- bentuk dasar ---------- */
  const star = (cx, cy, ro, ri, n, rot) => {
    const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = (rot || 0) + Math.PI * i / n - Math.PI / 2; p.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1)); }
    return p.join(' ');
  };
  const squiggle = (x, y, w, amp, n) => { let d = `M${x},${y}`; const st = w / n; for (let i = 0; i < n; i++) d += ` q${st / 2},${(i % 2 ? amp : -amp)} ${st},0`; return d; };
  /** Teks yang otomatis dipadatkan bila terlalu panjang untuk lebarnya. */
  const K_W = { disp: 0.86, bold: 0.64, text: 0.55 };
  function txt(t, x, y, size, maxW, o) {
    o = o || {}; t = String(t || '');
    const est = t.length * size * (K_W[o.k || 'bold'] || 0.6) + (o.ls || 0) * t.length;
    const fit = maxW && est > maxW ? ` textLength="${maxW.toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
    const st = o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw}" stroke-linejoin="round" paint-order="stroke"` : '';
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${o.font || F_TEXT}" font-weight="${o.w || 700}" font-size="${size.toFixed(1)}" fill="${o.fill || '#000'}" text-anchor="${o.anchor || 'middle'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${st}${fit}>${X(t)}</text>`;
  }
  function tag(t, cx, cy, size, bg, fg, rot, maxW, o) {
    o = o || {};
    const w = Math.min(maxW || 1e9, String(t).length * size * 0.66 + size * 1.6), h = size * 1.75;
    return `<g transform="rotate(${rot || 0} ${cx.toFixed(1)} ${cy.toFixed(1)})"><rect x="${(cx - w / 2).toFixed(1)}" y="${(cy - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${o.rx || 0}" fill="${bg}"/>${txt(t, cx, cy + size * 0.36, size, w - size * 1.1, { fill: fg, w: 800, font: o.font })}</g>`;
  }
  const photoBox = (d, x, y, w, h, shape, clipId, ph) => {
    const clip = shape === 'circle' ? `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) / 2}"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${shape === 'round' ? Math.min(w, h) * 0.08 : 0}"/>`;
    const img = d.photo ? `<image href="${d.photo}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`
      : `<g clip-path="url(#${clipId})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ph || '#d9d9d9'}"/><circle cx="${x + w / 2}" cy="${y + h * 0.4}" r="${Math.min(w, h) * 0.2}" fill="#ffffff" opacity=".75"/><ellipse cx="${x + w / 2}" cy="${y + h * 0.98}" rx="${w * 0.36}" ry="${h * 0.32}" fill="#ffffff" opacity=".75"/></g>`;
    return { defs: `<clipPath id="${clipId}">${clip}</clipPath>`, svg: img };
  };

  /* ---------- tema ---------- */
  const THEMES = {
    retro: { name: 'Retro Pop', desc: 'Krem, blok merah-biru, bintang meledak', accent: '#c0392b', accent2: '#2f73b8', bg: '#f5ead5', photo: 'rect' },
    navy: { name: 'Elegan Navy', desc: 'Biru tua & emas, foto bundar', accent: '#d4af37', accent2: '#16254f', bg: '#111d42', photo: 'circle' },
    ceria: { name: 'Ceria Gradasi', desc: 'Ungu-merah muda-jingga, konfeti', accent: '#7c3aed', accent2: '#f97316', bg: '#7c3aed', photo: 'round' },
    resmi: { name: 'Resmi Sekolah', desc: 'Putih dengan pita warna & logo', accent: '#15803d', accent2: '#0f5132', bg: '#ffffff', photo: 'rect' },
    minimal: { name: 'Minimalis', desc: 'Bersih, hitam-putih + 1 aksen', accent: '#111827', accent2: '#f59e0b', bg: '#ffffff', photo: 'round' }
  };

  /**
   * Gambar satu kartu.
   * d = { school, title ("PANITIA|UJIAN"), event, greet, footer, name, role, nip, photo, logo, showNip }
   * o = { theme, w, h (mm), accent, scale, id }
   */
  function svg(d, o) {
    const th = THEMES[o.theme] || THEMES.retro, A = o.accent || th.accent, B = th.accent2;
    const W = o.w * 10, H = o.h * 10, land = W > H, u = Math.min(W, H) / 54 * (o.scale || 1), pad = Math.min(W, H) * 0.06;
    const uid = (o.id || 'k') + Math.random().toString(36).slice(2, 7);
    let titleLines = String(d.title || '').split(/\||\n/).map(s => s.trim()).filter(Boolean).map(s => s.toUpperCase());
    if (W > H && titleLines.length > 1) titleLines = [titleLines.join(' ')];
    let defs = '', back = '', mid = '', fore = '';
    // setiap elemen bisa digeser & diperbesar: o.off = { kunci: { x, y (mm), s (skala) } }
    const drag = (k, inner, ox, oy) => {
      const v = (o.off && o.off[k]) || {}, dx = (+v.x || 0) * 10, dy = (+v.y || 0) * 10, sc = +v.s || 1;
      const scp = sc !== 1 && ox !== undefined ? `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${sc}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})` : '';
      return `<g class="pn-drag" data-drag="${k}" data-sc="${scp}" transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) ${scp}">${inner}</g>`;
    };
    const name = String(d.name || 'Nama Panitia').trim() || 'Nama Panitia', role = String(d.role || '').toUpperCase();
    const nip = d.showNip && d.nip ? 'NIP. ' + d.nip : '';
    // ---- area isi ----
    const col = land ? { x: pad + (H - 2 * pad) * 0.78 + pad, w: W - (H - 2 * pad) * 0.78 - 3 * pad } : { x: pad, w: W - 2 * pad };
    const cx = col.x + col.w / 2;
    const fsSchool = (land ? 2.8 : 3.1) * u, fsTitle = (land ? 5.6 : 7.6) * u, fsSmall = (land ? 2.6 : 2.9) * u, fsTag = (land ? 2.8 : 3.2) * u;
    // ukuran nama menyesuaikan panjang nama (nama panjang → huruf lebih kecil, bukan dipadatkan berlebihan)
    const nameStr = String(d.name || 'Nama Panitia'), nameMaxW = land ? col.w : W - pad * 1.4;
    const fsName = Math.max((land ? 4.6 : 5.4) * u * 0.6, Math.min((land ? 4.6 : 5.4) * u, nameMaxW * 0.94 / Math.max(1, nameStr.length * (o.theme === 'retro' ? 0.8 : 0.6))));
    let y = pad + fsSchool;
    const head = [];
    // ---- latar per tema ----
    if (o.theme === 'navy') {
      defs += `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16285a"/><stop offset="1" stop-color="#0b1430"/></linearGradient>`;
      back += `<rect width="${W}" height="${H}" fill="url(#g${uid})"/>`;
      for (let i = -H; i < W; i += 9 * u) back += `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}" stroke="#ffffff" stroke-opacity=".035" stroke-width="${1.2 * u}"/>`;
      back += `<rect x="${pad * 0.45}" y="${pad * 0.45}" width="${W - pad * 0.9}" height="${H - pad * 0.9}" fill="none" stroke="${A}" stroke-width="${0.5 * u}" rx="${2 * u}"/>`;
    } else if (o.theme === 'ceria') {
      defs += `<linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${A}"/><stop offset=".55" stop-color="#ec4899"/><stop offset="1" stop-color="${B}"/></linearGradient>`;
      back += `<rect width="${W}" height="${H}" fill="url(#g${uid})"/>`;
      const cols = ['#fde047', '#ffffff', '#22d3ee', '#a3e635'];
      for (let i = 0; i < 26; i++) { const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1, ry = (Math.sin(i * 78.233) * 12345.678) % 1; back += `<circle cx="${(Math.abs(rx) * W).toFixed(1)}" cy="${(Math.abs(ry) * H).toFixed(1)}" r="${(0.5 + (i % 3) * 0.45) * u}" fill="${cols[i % 4]}" opacity=".8"/>`; }
    } else if (o.theme === 'resmi') {
      back += `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
    } else if (o.theme === 'minimal') {
      back += `<rect width="${W}" height="${H}" fill="#ffffff"/><rect x="0" y="0" width="${W}" height="${1.6 * u}" fill="${B}"/>`;
    } else {
      back += `<rect width="${W}" height="${H}" fill="${th.bg}"/>`;
      // bintang & coretan dekoratif
      const sx = land ? W * 0.985 : W * 1.0, sy = land ? H * 0.99 : -H * 0.012;
      back += `<polygon points="${star(sx, sy, 14 * u, 5.5 * u, 9, 0.2)}" fill="${B}"/><polygon points="${star(sx - 2 * u, sy + (land ? -2 : 2) * u, 7 * u, 3.2 * u, 5, 0)}" fill="#fdf4dc" stroke="#222" stroke-width="${0.35 * u}"/>`;
      back += `<path d="${squiggle(-2 * u, H * 0.56, W * 0.32, 5 * u, 4)}" fill="none" stroke="${B}" stroke-width="${1.6 * u}" stroke-linecap="round"/>`;
      back += `<polygon points="${star(W * 0.12, H * 0.67, 7 * u, 2.6 * u, 12, 0)}" fill="${A}"/>`;
    }
    // ---- kepala: sekolah + judul + acara ----
    const onDark = o.theme === 'navy' || o.theme === 'ceria';
    if (o.theme === 'resmi') {
      const bandH = (land ? 0.3 : 0.2) * H;
      back += `<rect width="${W}" height="${bandH}" fill="${A}"/><rect y="${bandH}" width="${W}" height="${1.1 * u}" fill="${B}"/><rect y="${H - 6 * u}" width="${W}" height="${6 * u}" fill="${A}"/>`;
      const lg = bandH * 0.62, lx = land ? col.x : pad;
      if (d.logo) fore += drag('logo', `<image href="${d.logo}" x="${lx}" y="${(bandH - lg) / 2}" width="${lg}" height="${lg}" preserveAspectRatio="xMidYMid meet"/>`, lx + lg / 2, bandH / 2);
      const tx = d.logo ? lx + lg + pad * 0.6 : lx, tw = W - tx - pad;
      fore += drag('school', txt(d.school, tx, bandH * 0.36, fsSchool, tw, { fill: '#ffffff', anchor: 'start', w: 800 }), tx, bandH * 0.33);
      fore += drag('title', txt(titleLines.join(' '), tx, bandH * 0.36 + fsTitle * 0.95, fsTitle * 0.78, tw, { fill: '#ffffff', anchor: 'start', font: F_DISP, w: 900, k: 'disp' }), tx, bandH * 0.36 + fsTitle * 0.7);
      if (d.event) fore += drag('event', txt(d.event, tx, bandH * 0.36 + fsTitle * 0.95 + fsSmall * 1.35, fsSmall, tw, { fill: '#e7ffe9', anchor: 'start', w: 600, k: 'text' }), tx, bandH * 0.36 + fsTitle * 0.95 + fsSmall);
      y = bandH + pad * (land ? 0.6 : 1);
      if (d.footer) fore += drag('footer', txt(d.footer, land ? col.x + col.w / 2 : W / 2, H - 1.8 * u, fsSmall * 0.85, land ? col.w : W - 2 * pad, { fill: '#ffffff', w: 700 }), land ? col.x + col.w / 2 : W / 2, H - 2.1 * u);
    } else {
      let sx0 = land ? col.x : cx, sw0 = col.w;
      if (d.logo && o.theme !== 'retro') {
        const lg = fsSchool * (land ? 2.2 : 2.6);
        if (land) { fore += drag('logo', `<image href="${d.logo}" x="${col.x.toFixed(1)}" y="${(y - fsSchool * 1.45).toFixed(1)}" width="${lg}" height="${lg}" preserveAspectRatio="xMidYMid meet"/>`, col.x + lg / 2, y - fsSchool * 1.45 + lg / 2); sx0 = col.x + lg + fsSchool * 0.6; sw0 = col.w - lg - fsSchool * 0.6; }
        else { fore += drag('logo', `<image href="${d.logo}" x="${(cx - lg / 2).toFixed(1)}" y="${(pad * 0.9).toFixed(1)}" width="${lg}" height="${lg}" preserveAspectRatio="xMidYMid meet"/>`, cx, pad * 0.9 + lg / 2); y += lg; }
      }
      const schoolFill = o.theme === 'retro' ? A : onDark ? (o.theme === 'navy' ? A : '#ffffff') : '#374151';
      fore += drag('school', txt(String(d.school || '').toUpperCase(), sx0, y, fsSchool, sw0, { fill: schoolFill, anchor: land ? 'start' : 'middle', w: 800, ls: 0.3 * u }), sx0, y - fsSchool * 0.35);
      y += fsSchool * 0.5;
      let titleSvg = '', ty0 = y;
      titleLines.forEach((l, i) => {
        y += fsTitle * (i ? 1.02 : 1.08);
        const titleStyle = o.theme === 'retro' ? { fill: A, stroke: '#ffffff', sw: 2.2 * u } : o.theme === 'navy' ? { fill: A } : o.theme === 'ceria' ? { fill: '#ffffff', stroke: 'rgba(0,0,0,.18)', sw: 1.2 * u } : { fill: A };
        titleSvg += txt(l, land ? col.x : cx, y, fsTitle, col.w, Object.assign({ anchor: land ? 'start' : 'middle', font: F_DISP, w: 900, k: 'disp' }, titleStyle));
      });
      fore += drag('title', titleSvg, land ? col.x : cx, (ty0 + y) / 2);
      if (d.event) {
        y += fsSmall * 2.1;
        if (o.theme === 'retro') fore += drag('event', tag(d.event, land ? col.x + Math.min(col.w, d.event.length * fsSmall * 0.66 + fsSmall * 1.6) / 2 : cx, y - fsSmall * 0.4, fsSmall, '#efe56a', '#1f2937', -2, col.w), cx, y - fsSmall * 0.4);
        else fore += drag('event', txt(d.event, land ? col.x : cx, y, fsSmall, col.w, { fill: onDark ? '#f8fafc' : '#4b5563', anchor: land ? 'start' : 'middle', w: 600, k: 'text' }), land ? col.x : cx, y - fsSmall * 0.35);
      }
      y += pad * 0.7;
      if (d.footer) fore += drag('footer', txt(d.footer, land ? col.x : cx, H - pad * 1.1, fsSmall * 0.85, col.w, { fill: onDark ? 'rgba(255,255,255,.8)' : '#6b7280', anchor: land ? 'start' : 'middle', w: 600, k: 'text' }), land ? col.x : cx, H - pad * 1.1 - fsSmall * 0.3);
    }
    // ---- foto ----
    const nameBarH = fsName * 1.65;
    const bottomReserve = (d.footer ? fsSmall * 1.9 : pad * 0.6) + (nip ? fsSmall * 1.7 : 0) + nameBarH * 0.75;
    let px, py, pw, ph;
    if (land) { ph = H - 2 * pad; pw = ph * 0.78; px = pad; py = pad; }
    else {
      const avail = H - y - bottomReserve - pad * 0.4;
      pw = Math.min(W * 0.66, avail * 0.8); ph = pw * 1.25; if (th.photo === 'circle') { ph = pw; }
      px = (W - pw) / 2; py = y + Math.max(0, (avail - ph) / 2) * 0.35;
    }
    const pb = photoBox(d, px, py, pw, ph, th.photo, 'c' + uid, o.theme === 'navy' ? '#2a3a6b' : o.theme === 'ceria' ? '#f5d0fe' : '#cfd8e3');
    defs += pb.defs;
    const pcx = px + pw / 2, pcy = py + ph / 2;
    let frame = '';
    if (o.theme === 'retro') {
      if (!land) mid += `<polygon points="${star(px + pw * 1.0, py + ph * 0.42, 14 * u, 4.6 * u, 14, 0.1)}" fill="#efe56a" stroke="${A}" stroke-width="${0.5 * u}"/>`;
      mid = drag('photo', mid + `<rect x="${px - pw * (land ? 0.04 : 0.12)}" y="${py + ph * 0.06}" width="${pw * 0.5}" height="${ph * 0.9}" fill="#ffffff" transform="rotate(-3 ${px} ${py})"/><rect x="${px - pw * 0.03}" y="${py - ph * 0.015}" width="${pw * (land ? 1.04 : 1.08)}" height="${ph * 1.02}" fill="${B}" transform="rotate(2 ${px + pw / 2} ${py + ph / 2})"/>`, pcx, pcy);
    } else if (o.theme === 'navy') frame = `<circle cx="${px + pw / 2}" cy="${py + ph / 2}" r="${Math.min(pw, ph) / 2 + 1.6 * u}" fill="none" stroke="${A}" stroke-width="${1.1 * u}"/>`;
    else if (o.theme === 'ceria') frame = `<rect x="${px - 1.5 * u}" y="${py - 1.5 * u}" width="${pw + 3 * u}" height="${ph + 3 * u}" rx="${Math.min(pw, ph) * 0.1}" fill="#ffffff"/>`;
    else if (o.theme === 'resmi') frame = `<rect x="${px - 0.9 * u}" y="${py - 0.9 * u}" width="${pw + 1.8 * u}" height="${ph + 1.8 * u}" fill="${A}"/>`;
    else frame = `<rect x="${px - 0.6 * u}" y="${py - 0.6 * u}" width="${pw + 1.2 * u}" height="${ph + 1.2 * u}" rx="${Math.min(pw, ph) * 0.09}" fill="${A}"/>`;
    fore += drag('photo', frame + pb.svg, pcx, pcy);
    // ---- jabatan, sapaan, nama, NIP ----
    const nameW = land ? col.w : Math.min(W - pad * 1.2, Math.max(pw * 1.15, name.length * fsName * 0.66 + fsName * 1.4));
    let ny;
    const landRoleY = y + fsTag * 0.5;
    if (land) ny = (role ? landRoleY + fsTag * 0.9 : y) + nameBarH * 0.75;
    else ny = py + ph + nameBarH * 0.15;
    const nb = land ? 0.36 : null; // pada kartu mendatar teks nama selalu di tengah pita
    const nx = land ? col.x + nameW / 2 : W / 2;
    if (role && o.rolePos !== 'none') {
      const tw0 = Math.min(land ? col.w : W - pad * 2, role.length * fsTag * 0.66 + fsTag * 1.6);
      // tag jabatan selalu utuh di dalam kartu (tidak terpotong di tepi)
      let ry = land ? landRoleY : py + ph * 0.1, rx = land ? col.x + tw0 / 2 : Math.min(W - pad * 0.6 - tw0 / 2, Math.max(pad * 0.6 + tw0 / 2, px + pw * 0.08));
      if (!land && o.rolePos === 'atas') { ry = py + fsTag * 0.25; rx = W / 2; }
      if (!land && o.rolePos === 'bawah') { ry = py + ph * (th.photo === 'circle' ? 0.84 : 0.88); rx = W / 2; }
      const rStyle = o.theme === 'retro' ? [A, '#fdf1dc', -4] : o.theme === 'navy' ? [A, '#111d42', 0] : o.theme === 'ceria' ? ['#fde047', '#3b0764', -3] : o.theme === 'resmi' ? [A, '#ffffff', 0] : [B, '#111827', 0];
      fore += drag('role', tag(role, rx, ry, fsTag, rStyle[0], rStyle[1], rStyle[2], land ? col.w : W - pad * 2, { rx: o.theme === 'retro' ? 0 : fsTag * 0.88 }), rx, ry);
    }
    if (!land && d.greet && (o.theme === 'retro' || o.theme === 'ceria')) fore += drag('greet', tag(String(d.greet).toUpperCase(), (land ? col.x : nx - nameW / 2) + fsSmall * 3.6, ny - nameBarH * 0.72, fsSmall * 0.95, '#22b8e0', '#ffffff', -4, nameW), nx - nameW / 2 + fsSmall * 3.6, ny - nameBarH * 0.72);
    let nameSvg = '';
    if (o.theme === 'retro') {
      nameSvg += `<polygon points="${star(nx + nameW / 2 + 1.5 * u, ny + nameBarH * 0.45, 6.5 * u, 2.3 * u, 11, 0.3)}" fill="${B}"/>`;
      nameSvg += `<g transform="rotate(-2 ${nx} ${ny})"><rect x="${nx - nameW / 2}" y="${ny - nameBarH / 2}" width="${nameW}" height="${nameBarH}" fill="${A}"/>${txt(name.toUpperCase(), nx, ny + fsName * 0.36, fsName, nameW - fsName, { fill: '#fdf1dc', font: F_DISP, w: 900, k: 'disp' })}</g>`;
    } else if (o.theme === 'navy') nameSvg += txt(name, nx, ny + fsName * (nb || 0.85), fsName, nameW, { fill: '#ffffff', w: 800 }) + `<line x1="${nx - nameW * 0.3}" y1="${ny + fsName * ((nb || 0.85) + 0.5)}" x2="${nx + nameW * 0.3}" y2="${ny + fsName * ((nb || 0.85) + 0.5)}" stroke="${A}" stroke-width="${0.5 * u}"/>`;
    else if (o.theme === 'ceria') { const off = land ? 0 : fsName * 0.5; nameSvg += `<rect x="${nx - nameW / 2}" y="${ny - nameBarH / 2 + off}" width="${nameW}" height="${nameBarH}" rx="${nameBarH / 2}" fill="#ffffff"/>${txt(name, nx, ny + off + fsName * 0.36, fsName, nameW - fsName, { fill: '#3b0764', w: 800 })}`; }
    else nameSvg += txt(name, nx, ny + fsName * (nb || 0.9), fsName, nameW, { fill: o.theme === 'resmi' ? B : '#111827', w: 800 });
    fore += drag('name', nameSvg, nx, ny + fsName * 0.4);
    if (nip) fore += drag('nip', txt(nip, nx, ny + nameBarH * 0.5 + fsSmall * 1.75, fsSmall * 0.95, nameW, { fill: onDark ? '#e5e7eb' : '#374151', w: 600, k: 'text' }), nx, ny + nameBarH * 0.5 + fsSmall * 1.45);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${o.w}mm" height="${o.h}mm"><defs>${defs}${o.fontCss ? `<style>${o.fontCss}</style>` : ''}</defs>${back}${mid}${fore}</svg>`;
  }

  /* ---------- ekspor ---------- */
  let fontCssP = null;
  /** CSS @font-face dengan font tertanam (agar teks tetap sama di JPG/PDF). */
  function fontCss(base) {
    if (fontCssP) return fontCssP;
    const list = [['Unbounded', 900, 'unbounded-latin-900-normal'], ['Plus Jakarta Sans', 600, 'plus-jakarta-sans-latin-600-normal'], ['Plus Jakarta Sans', 700, 'plus-jakarta-sans-latin-700-normal'], ['Plus Jakarta Sans', 800, 'plus-jakarta-sans-latin-800-normal']];
    fontCssP = Promise.all(list.map(([f, w, file]) => fetch((base || '') + 'fonts/' + file + '.woff2').then(r => r.blob()).then(b => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(`@font-face{font-family:'${f}';font-weight:${w};src:url(${fr.result}) format('woff2');}`); fr.readAsDataURL(b); })).catch(() => '')))
      .then(a => a.join(''));
    return fontCssP;
  }
  const svgImage = s => new Promise((res, rej) => { const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); const im = new Image(); im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(url), 2000); }; im.onerror = () => rej(new Error('Gagal menggambar kartu.')); im.src = url; });
  /** Kartu → kanvas (pxPerMm titik per mm). */
  async function cardCanvas(svgStr, wmm, hmm, pxPerMm) {
    const im = await svgImage(svgStr);
    const c = document.createElement('canvas'); c.width = Math.round(wmm * pxPerMm); c.height = Math.round(hmm * pxPerMm);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
    return c;
  }
  /** Susun kartu di lembar A4: kembalikan daftar halaman berisi posisi kartu (mm). */
  function layoutA4(n, w, h, gap, margin) {
    gap = gap == null ? 4 : gap; margin = margin == null ? 8 : margin;
    const cols = Math.max(1, Math.floor((210 - 2 * margin + gap) / (w + gap))), rows = Math.max(1, Math.floor((297 - 2 * margin + gap) / (h + gap)));
    const per = cols * rows, ox = (210 - (cols * w + (cols - 1) * gap)) / 2, oy = (297 - (rows * h + (rows - 1) * gap)) / 2;
    const pages = [];
    for (let i = 0; i < n; i++) { const p = Math.floor(i / per), k = i % per; (pages[p] = pages[p] || []).push({ i, x: ox + (k % cols) * (w + gap), y: oy + Math.floor(k / cols) * (h + gap) }); }
    return { pages, per, cols, rows };
  }
  async function sheetCanvas(svgs, w, h, slots, pxPerMm, cut) {
    const c = document.createElement('canvas'); c.width = Math.round(210 * pxPerMm); c.height = Math.round(297 * pxPerMm);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    for (const s of slots) {
      const im = await svgImage(svgs[s.i]);
      g.drawImage(im, s.x * pxPerMm, s.y * pxPerMm, w * pxPerMm, h * pxPerMm);
      if (cut) { g.strokeStyle = '#b5b5b5'; g.lineWidth = Math.max(1, pxPerMm * 0.12); g.setLineDash([pxPerMm * 1.2, pxPerMm * 0.9]); g.strokeRect(s.x * pxPerMm, s.y * pxPerMm, w * pxPerMm, h * pxPerMm); g.setLineDash([]); }
    }
    return c;
  }
  const b64ToBytes = b => { const s = atob(b), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  /** PDF sederhana: tiap halaman = satu gambar JPEG penuh. pages: [{canvas, wmm, hmm}] */
  function pdfFromCanvases(pages, quality) {
    const enc = new TextEncoder(), chunks = [], offs = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; };
    const obj = (num, fn) => { offs[num] = len; push(num + ' 0 obj\n'); fn(); push('\nendobj\n'); };
    const pt = mm => +(mm * 72 / 25.4).toFixed(2);
    push('%PDF-1.4\n%âãÏÓ\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Kids [${pages.map((_, i) => (3 + 3 * i) + ' 0 R').join(' ')}] /Count ${pages.length} >>`));
    pages.forEach((p, i) => {
      const n = 3 + 3 * i, wp = pt(p.wmm), hp = pt(p.hmm);
      const jpg = b64ToBytes(p.canvas.toDataURL('image/jpeg', quality || 0.92).split(',')[1]);
      obj(n, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${wp} ${hp}] /Resources << /XObject << /Im${i} ${n + 2} 0 R >> >> /Contents ${n + 1} 0 R >>`));
      const cs = `q ${wp} 0 0 ${hp} 0 0 cm /Im${i} Do Q`;
      obj(n + 1, () => { push(`<< /Length ${cs.length} >>\nstream\n`); push(cs); push('\nendstream'); });
      obj(n + 2, () => { push(`<< /Type /XObject /Subtype /Image /Width ${p.canvas.width} /Height ${p.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); push(jpg); push('\nendstream'); });
    });
    const total = 3 + 3 * pages.length, xref = len;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let k = 1; k < total; k++) x += String(offs[k]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const canvasBlob = (c, q) => new Promise(res => c.toBlob(res, 'image/jpeg', q || 0.92));

  const PARTS = { logo: 'Logo', school: 'Nama sekolah', title: 'Judul', event: 'Nama kegiatan', photo: 'Foto', role: 'Jabatan', greet: 'Sapaan', name: 'Nama', nip: 'NIP', footer: 'Teks bawah' };
  root.PanitiaCard = { PARTS, SIZES, THEMES, svg, fontCss, cardCanvas, sheetCanvas, layoutA4, pdfFromCanvases, saveBlob, canvasBlob };
})(typeof self !== 'undefined' ? self : this);
