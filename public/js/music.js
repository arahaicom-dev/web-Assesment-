/* Musik latar orisinal yang dibangkitkan langsung di browser (Web Audio) — tanpa file musik.
   Music.play(id) · Music.stop() · Music.setVolume(0..1) · Music.TRACKS */
(function () {
  'use strict';
  let ctx = null, master = null, timer = null, cur = null, nextT = 0, step = 0, vol = 0.5, layers = [], noiseBuf = null;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];

  function ac() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
      const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- instrumen ---------- */
  function tone(f, t, dur, o) {
    o = o || {};
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.detune) osc.detune.value = o.detune;
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
    const a = o.attack || 0.01, peak = o.gain || 0.1, rel = o.release || dur;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.02, rel));
    let out = g;
    if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; g.connect(f2); out = f2; }
    osc.connect(g); out.connect(master);
    osc.start(t); osc.stop(t + Math.max(a + 0.05, rel) + 0.05);
  }
  function pad(notes, t, dur, gain, type) { notes.forEach((n, i) => tone(mtof(n), t, dur, { type: type || 'sine', gain: gain, attack: dur * 0.3, release: dur, detune: (i % 2 ? 6 : -6), lp: 1800 })); }
  function pluck(n, t, gain, type, dec) { tone(mtof(n), t, dec || 1.1, { type: type || 'triangle', gain: gain || 0.08, attack: 0.005, release: dec || 1.1, lp: 3200 }); }
  function bell(n, t, gain) { const f = mtof(n); tone(f, t, 3, { gain: gain || 0.05, attack: 0.005, release: 3 }); tone(f * 2.76, t, 1.2, { gain: (gain || 0.05) * 0.35, attack: 0.005, release: 1.2 }); }
  function noise(t, dur, o) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.ftype || 'highpass'; f.frequency.value = o.freq || 6000; f.Q.value = o.q || 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(o.gain || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const kick = (t, g) => tone(150, t, 0.35, { gain: g || 0.35, attack: 0.002, release: 0.35, slide: 45 });
  const snare = (t, g) => noise(t, 0.18, { ftype: 'bandpass', freq: 1800, q: 0.8, gain: g || 0.12 });
  const hat = (t, g) => noise(t, 0.05, { ftype: 'highpass', freq: 8000, gain: g || 0.04 });
  /** Lapisan suara terus-menerus (hujan, angin, dengung) dengan LFO. */
  function loopLayer(o) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.ftype; f.frequency.value = o.freq; f.Q.value = o.q || 0.5;
    const g = ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(o.gain, ctx.currentTime + 2);
    if (o.lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.lfo; lg.gain.value = o.lfoDepth; l.connect(lg); lg.connect(f.frequency); l.start(); layers.push(l); }
    s.connect(f); f.connect(g); g.connect(master); s.start(); layers.push(s);
    return g;
  }
  function drone(notes, gain) {
    notes.forEach((n, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = i % 2 ? 7 : -7;
      f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0; g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 3);
      o.connect(f); f.connect(g); g.connect(master); o.start(); layers.push(o);
    });
  }

  /* ---------- akor ---------- */
  const C = { Cmaj7: [48, 55, 59, 64], Am7: [45, 52, 55, 60], Fmaj7: [41, 48, 52, 57], G6: [43, 50, 52, 59], Dm9: [50, 53, 57, 60, 64], G13: [43, 53, 57, 59, 64], Cmaj9: [48, 52, 55, 59, 62], A7: [45, 52, 55, 61], Em7: [40, 47, 50, 55], C: [48, 52, 55], G: [43, 47, 50], Am: [45, 48, 52], F: [41, 45, 48], Dm: [50, 53, 57], E: [40, 44, 47] };
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88];

  /* ---------- daftar lagu ---------- */
  const TRACKS = [
    { id: 'fokus', name: 'Fokus Tenang', emoji: '🧘', kind: 'ujian', desc: 'Pad lembut, sangat tenang', bpm: 56, sub: 2,
      step(i, t, sd) { const prog = ['Cmaj7', 'Am7', 'Fmaj7', 'G6']; if (i % 16 === 0) pad(C[prog[(i / 16) % 4]].map(n => n + 12), t, sd * 16, 0.035); if (i % 2 === 0 && rnd() < 0.22) bell(pick(PENTA), t, 0.03); } },
    { id: 'lofi', name: 'Lo-fi Belajar', emoji: '🎧', kind: 'ujian', desc: 'Ketukan santai & piano jazzy', bpm: 74, sub: 4,
      start() { loopLayer({ ftype: 'highpass', freq: 5000, gain: 0.006 }); },
      step(i, t, sd) {
        const b = i % 16, prog = ['Dm9', 'G13', 'Cmaj9', 'A7'], ch = C[prog[Math.floor(i / 16) % 4]];
        const sw = (b % 2) ? sd * 0.18 : 0;
        if (b === 0 || b === 10) kick(t, 0.22); if (b === 4 || b === 12) snare(t, 0.06); if (b % 2 === 0) hat(t + sw, 0.018);
        if (b === 0) ch.forEach((n, k) => pluck(n + 12, t + k * 0.012, 0.035, 'triangle', 2.2));
        if (b === 0 || b === 8) tone(mtof(ch[0] - 12), t, sd * 6, { gain: 0.12, attack: 0.01, release: sd * 6, lp: 400 });
        if (b === 14 && rnd() < 0.5) pluck(ch[ch.length - 1] + 12, t, 0.03, 'sine', 1.2);
      } },
    { id: 'piano', name: 'Piano Pagi', emoji: '🎹', kind: 'ujian', desc: 'Arpeggio piano yang ringan', bpm: 84, sub: 2,
      step(i, t) { const prog = ['C', 'G', 'Am', 'F'], ch = C[prog[Math.floor(i / 16) % 4]], ord = [0, 1, 2, 1, 2, 0, 1, 2]; const n = ch[ord[i % 8]] + (i % 16 >= 8 ? 24 : 12); pluck(n, t, 0.06, 'triangle', 1.6); if (i % 16 === 0) pluck(ch[0] - 12, t, 0.07, 'sine', 3); } },
    { id: 'hujan', name: 'Hujan Rintik', emoji: '🌧️', kind: 'ujian', desc: 'Suara hujan & nada lembut', bpm: 60, sub: 2,
      start() { loopLayer({ ftype: 'bandpass', freq: 2200, q: 0.5, gain: 0.032 }); loopLayer({ ftype: 'lowpass', freq: 500, gain: 0.03 }); },
      step(i, t, sd) { for (let k = 0; k < 3; k++) if (rnd() < 0.5) tone(2200 + rnd() * 2600, t + rnd() * sd, 0.03, { gain: 0.012, attack: 0.002, release: 0.03 }); if (i % 32 === 0) pad(C[pick(['Am7', 'Fmaj7', 'Cmaj7'])].map(n => n + 12), t, sd * 32, 0.02); } },
    { id: 'alam', name: 'Pagi di Hutan', emoji: '🌿', kind: 'ujian', desc: 'Angin sepoi & kicau burung', bpm: 60, sub: 2,
      start() { loopLayer({ ftype: 'lowpass', freq: 600, q: 0.6, gain: 0.04, lfo: 0.07, lfoDepth: 300 }); },
      step(i, t) { if (rnd() < 0.12) { const n = 2 + Math.floor(rnd() * 3), base = 2600 + rnd() * 1600; for (let k = 0; k < n; k++) tone(base, t + k * 0.11, 0.08, { gain: 0.03, attack: 0.005, release: 0.08, slide: base * (rnd() < 0.5 ? 1.35 : 0.75) }); }
        if (i % 8 === 0 && rnd() < 0.35) tone(mtof(pick([72, 74, 76, 79, 81])), t, 1.6, { gain: 0.03, attack: 0.15, release: 1.6 }); } },
    { id: 'angkasa', name: 'Luar Angkasa', emoji: '🪐', kind: 'ujian', desc: 'Dengung luas & lonceng berkilau', bpm: 50, sub: 2,
      start() { drone([36, 43, 48], 0.025); },
      step(i, t) { if (rnd() < 0.3) bell(pick(PENTA) + (rnd() < 0.3 ? 12 : 0), t, 0.035); } },
    { id: 'semangat', name: 'Semangat Juara', emoji: '🏆', kind: 'main', desc: 'Chiptune cepat penuh energi', bpm: 128, sub: 4,
      step(i, t, sd) {
        const b = i % 16, bar = Math.floor(i / 16), prog = ['C', 'Am', 'F', 'G'], ch = C[prog[bar % 4]];
        if (b % 4 === 0) kick(t, 0.25); if (b === 4 || b === 12) snare(t, 0.08); if (b % 2) hat(t, 0.03);
        if (b % 2 === 0) tone(mtof(ch[(b / 2) % 2 ? 0 : 0] - 12 + (b % 4 ? 12 : 0)), t, sd * 1.6, { type: 'square', gain: 0.05, attack: 0.005, release: sd * 1.6, lp: 1200 });
        if (i % 64 === 0) { seed = 7 + bar; this.mel = Array.from({ length: 16 }, () => rnd() < 0.7 ? pick([0, 1, 2]) : -1); }
        const m = (this.mel || [])[b]; if (m >= 0 && m !== undefined) tone(mtof(ch[m] + 24), t, sd * 0.9, { type: 'square', gain: 0.035, attack: 0.005, release: sd * 0.9, lp: 3000 });
      } },
    { id: 'arkade', name: 'Arkade Ceria', emoji: '🕹️', kind: 'main', desc: 'Lompat-lompat ala gim retro', bpm: 116, sub: 4,
      step(i, t, sd) { const b = i % 16, prog = ['F', 'G', 'E', 'Am'], ch = C[prog[Math.floor(i / 16) % 4]];
        if (b === 0 || b === 8) kick(t, 0.22); if (b === 4 || b === 12) snare(t, 0.07); if (b % 2 === 0) hat(t, 0.025);
        const arp = [0, 1, 2, 1]; tone(mtof(ch[arp[b % 4]] + 24), t, sd * 0.8, { type: 'square', gain: 0.03, attack: 0.003, release: sd * 0.8, lp: 2800 });
        if (b % 4 === 0) tone(mtof(ch[0] - 12), t, sd * 3, { type: 'triangle', gain: 0.12, attack: 0.005, release: sd * 3 }); } },
    { id: 'santai', name: 'Santai Ceria', emoji: '🎸', kind: 'main', desc: 'Petikan riang & tepukan', bpm: 100, sub: 4,
      step(i, t, sd) { const b = i % 16, prog = ['C', 'F', 'C', 'G'], ch = C[prog[Math.floor(i / 16) % 4]];
        if ([0, 3, 6, 8, 11, 14].indexOf(b) >= 0) ch.forEach((n, k) => pluck(n + 12, t + k * 0.015, 0.035, 'triangle', 0.6));
        if (b === 4 || b === 12) noise(t, 0.12, { ftype: 'bandpass', freq: 1400, gain: 0.07 }); if (b % 2) hat(t, 0.02);
        if (b === 0 || b === 8) tone(mtof(ch[0] - 12), t, sd * 4, { type: 'sine', gain: 0.14, attack: 0.01, release: sd * 4 }); } }
  ];

  function tick() {
    if (!cur || !ctx) return;
    const sd = 60 / cur.bpm / cur.sub;
    while (nextT < ctx.currentTime + 0.15) { try { cur.step(step, nextT, sd); } catch (e) { /* */ } nextT += sd; step++; }
  }
  function clearLayers() { layers.forEach(n => { try { n.stop(); } catch (e) { /* */ } }); layers = []; }

  const Music = {
    TRACKS,
    current: () => (cur ? cur.id : null),
    play(id) {
      const tr = TRACKS.find(x => x.id === id);
      if (!tr) return this.stop();
      if (cur && cur.id === id) return;
      if (!ac()) return;
      this.stop(true);
      cur = Object.create(tr); seed = 42; step = 0; nextT = ctx.currentTime + 0.1;
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(vol * 1.6, ctx.currentTime + 1.2);
      if (cur.start) cur.start();
      timer = setInterval(tick, 30); tick();
    },
    stop(quick) {
      clearInterval(timer); timer = null;
      if (!ctx) { cur = null; return; }
      const old = layers; layers = [];
      if (quick) { old.forEach(n => { try { n.stop(); } catch (e) { /* */ } }); master.gain.setValueAtTime(0, ctx.currentTime); }
      else { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8); setTimeout(() => old.forEach(n => { try { n.stop(); } catch (e) { /* */ } }), 900); }
      cur = null;
    },
    setVolume(v) { vol = Math.max(0, Math.min(1, v)); if (ctx && cur) master.gain.setTargetAtTime(vol * 1.6, ctx.currentTime, 0.1); },
    getVolume: () => vol,
    unlock() { ac(); }
  };
  window.Music = Music;
})();
