/* Efek singkat saat membuka menu: gambar ikon menu "keluar" + maskot, disertai bunyi pendek.
   Durasi ±0,7 detik, tidak menghalangi klik, bisa dimatikan di Pengaturan. */
(function () {
  'use strict';
  const KEY = 'menu-fx';
  const prefs = () => { try { return Object.assign({ anim: true, sound: true, vol: 0.5 }, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return { anim: true, sound: true, vol: 0.5 }; } };
  const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* */ } };
  let ac = null, busy = null;
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nada pendek: arpeggio lembut (nada dasar berbeda tiap menu) + kilau. */
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  function chime(seed) {
    const p = prefs(); if (!p.sound || p.vol <= 0) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + 0.01, master = ac.createGain();
      master.gain.value = 0.16 * p.vol; master.connect(ac.destination);
      let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      const root = 60 + [0, 2, 3, 5, 7, 8, 10][h % 7];
      const notes = [0, 2, 4].map(k => root + SCALE[(k + (h >> 3)) % 5]);
      notes.concat([notes[2] + 12]).forEach((m, i) => {
        const f = 440 * Math.pow(2, (m - 69) / 12), o = ac.createOscillator(), g = ac.createGain(), o2 = ac.createOscillator(), g2 = ac.createGain();
        o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
        const st = t0 + i * 0.065, dur = i === 3 ? 0.42 : 0.22;
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(i === 3 ? 0.5 : 0.75, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        g2.gain.setValueAtTime(0.0001, st); g2.gain.exponentialRampToValueAtTime(0.18, st + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, st + dur * 0.7);
        o.connect(g).connect(master); o2.connect(g2).connect(master);
        o.start(st); o2.start(st); o.stop(st + dur + 0.05); o2.stop(st + dur + 0.05);
      });
    } catch (e) { /* audio tidak tersedia */ }
  }

  function play(key, icon, label) {
    const p = prefs();
    chime(key);
    if (!p.anim) return;
    if (busy) { busy.remove(); busy = null; }
    const el = document.createElement('div');
    el.className = 'menu-fx' + (reduce() ? ' calm' : '');
    el.setAttribute('aria-hidden', 'true');
    const dots = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg;--d:${(i % 3) * 30}ms"></i>`).join('');
    el.innerHTML = `<div class="mfx-burst">${dots}</div><div class="mfx-card"><span class="mfx-ic">${icon || '✨'}</span></div>
      ${window.Art ? `<div class="mfx-kubi">${Art.kubi({ pose: 'cheer', eyes: 'happy' })}</div>` : ''}<div class="mfx-label">${String(label || '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))}</div>`;
    document.body.appendChild(el); busy = el;
    setTimeout(() => { el.classList.add('out'); }, reduce() ? 380 : 560);
    setTimeout(() => { el.remove(); if (busy === el) busy = null; }, reduce() ? 600 : 820);
  }
  window.MenuFx = { play, prefs, save, chime };
})();
