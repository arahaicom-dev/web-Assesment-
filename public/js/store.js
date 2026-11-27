/* Penyimpanan data di browser (localStorage) + data contoh */
(function () {
  'use strict';
  const KEY = 'asesmen-merdeka-v1';
  const C = window.Calc;

  const PRESETS = [
    { id: 'galaksi', name: 'Galaksi', h: 244, s: 78, mode: 'dark' },
    { id: 'siang', name: 'Langit Siang', h: 214, s: 82, mode: 'light' },
    { id: 'samudra', name: 'Samudra', h: 228, s: 72 },
    { id: 'toska', name: 'Toska', h: 178, s: 62 },
    { id: 'hutan', name: 'Hutan', h: 148, s: 52 },
    { id: 'senja', name: 'Senja', h: 22, s: 82 },
    { id: 'mawar', name: 'Mawar', h: 338, s: 66 },
    { id: 'anggur', name: 'Anggur', h: 268, s: 58 },
    { id: 'emas', name: 'Emas', h: 42, s: 78 },
    { id: 'batu', name: 'Batu', h: 215, s: 18 }
  ];

  function uid(p) { return (p || 'id') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function tahunAjaranNow() {
    const d = new Date(); const y = d.getFullYear();
    return d.getMonth() >= 6 ? y + '/' + (y + 1) : (y - 1) + '/' + y;
  }

  function blank() {
    return {
      version: 1,
      settings: Object.assign(JSON.parse(JSON.stringify(C.DEFAULT_SETTINGS)), {
        schoolName: 'Nama Sekolah', teacherName: '', tahunAjaran: tahunAjaranNow(),
        semester: new Date().getMonth() >= 6 ? 'ganjil' : 'genap'
      }),
      theme: { preset: 'galaksi', h: 244, s: 78, mode: 'dark', depth: 1, motion: 'on' },
      classes: [], subjects: [], assessments: [], scores: {}, questionSets: [], submissions: {},
      ui: { classId: null, subjectId: null }
    };
  }

  function normalize(d) {
    const b = blank();
    d = d || {};
    d.settings = Object.assign(b.settings, d.settings || {});
    d.theme = Object.assign(b.theme, d.theme || {});
    for (const k of ['classes', 'subjects', 'assessments', 'questionSets']) d[k] = d[k] || [];
    d.scores = d.scores || {}; d.submissions = d.submissions || {}; d.ui = d.ui || b.ui;
    return d;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) { console.error(e); return blank(); }
  }

  /* ---------- Mode server (Node.js + MySQL) ---------- */
  const TOKEN_KEY = 'asesmen-token';
  const UI_KEY = 'asesmen-ui';
  const DOC_KINDS = ['classes', 'subjects', 'assessments', 'questionSets'];
  const replacer = (k, v) => (k && k.charAt(0) === '_') ? undefined : v;

  /** Ratakan state menjadi peta kunci → JSON, untuk mencari perubahan. */
  function flatten(st) {
    const m = new Map();
    m.set('settings', JSON.stringify(st.settings, replacer));
    m.set('theme', JSON.stringify(st.theme, replacer));
    for (const kind of DOC_KINDS) for (const it of st[kind]) if (it && it.id) m.set('d\u0001' + kind + '\u0001' + it.id, JSON.stringify(it, replacer));
    for (const a in st.scores) for (const sid in st.scores[a]) m.set('s\u0001' + a + '\u0001' + sid, JSON.stringify(st.scores[a][sid]));
    for (const a in st.submissions) for (const sid in st.submissions[a]) m.set('u\u0001' + a + '\u0001' + sid, JSON.stringify(st.submissions[a][sid], replacer));
    return m;
  }
  function diff(prev, next) {
    const p = { docs: [], delDocs: [], scores: [], delScores: [], subs: [], delSubs: [] };
    let n = 0;
    for (const [k, v] of next) {
      if (prev.get(k) === v) continue;
      n++;
      if (k === 'settings') p.docs.push({ kind: 'settings', id: 'main', data: JSON.parse(v) });
      else if (k === 'theme') p.theme = JSON.parse(v);
      else {
        const [t, a, b] = k.split('\u0001');
        if (t === 'd') p.docs.push({ kind: a, id: b, data: JSON.parse(v) });
        else if (t === 's') p.scores.push({ a, s: b, v: JSON.parse(v) });
        else p.subs.push({ a, s: b, d: JSON.parse(v) });
      }
    }
    for (const k of prev.keys()) {
      if (next.has(k)) continue;
      const [t, a, b] = k.split('\u0001');
      n++;
      if (t === 'd') p.delDocs.push({ kind: a, id: b });
      else if (t === 's') p.delScores.push({ a, s: b });
      else if (t === 'u') p.delSubs.push({ a, s: b });
    }
    return n ? p : null;
  }

  async function api(path, opts) {
    opts = opts || {};
    const headers = { 'Content-Type': 'application/json' };
    const tok = localStorage.getItem(TOKEN_KEY);
    if (tok) { headers.Authorization = 'Bearer ' + tok; headers['X-Auth-Token'] = tok; }
    const res = await fetch('api/' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
    let data = null;
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      const err = new Error(data.error || ('Kesalahan server (' + res.status + ')'));
      err.status = res.status; err.data = data;
      if (res.status === 402 && data.subscription) { Store.subscription = data.subscription; Store.onLocked && Store.onLocked(); }
      if (res.status === 401 && Store.mode === 'server' && !opts.noAuthEvent) Store.onAuthLost && Store.onAuthLost();
      throw err;
    }
    return data;
  }

  const sync = { snap: null, timer: null, busy: false, again: false, status: 'ok', listeners: [] };
  function setStatus(s) { sync.status = s; sync.listeners.forEach(f => f(s)); }

  const Store = {
    KEY, PRESETS, uid, api,
    mode: 'local',
    saas: false,
    subscription: null,
    /** Sekolah sedang tidak aktif (masa coba/langganan habis) — data hanya bisa dilihat. */
    locked() { return this.saas && this.subscription && !this.subscription.active; },
    user: null,
    state: load(),
    /** Deteksi apakah aplikasi berjalan di server Node.js. */
    async init() {
      let health = null;
      try {
        const r = await fetch('api/health', { cache: 'no-store' });
        if (r.ok && (r.headers.get('content-type') || '').includes('json')) health = await r.json();
      } catch (e) { /* mode lokal */ }
      if (!health || health.mode !== 'server') { this.mode = 'local'; return { ok: true }; }
      this.mode = 'server';
      this.backend = health.backend || 'node';
      this.version = health.version || '';
      this.saas = !!health.saas;
      if (health.needsConfig) return { needsConfig: true };
      if (health.dbError) throw new Error(health.dbError);
      if (health.needsSetup) return { needsSetup: true };
      if (!localStorage.getItem(TOKEN_KEY)) return { needLogin: true };
      try { await this.pull(true); return { ok: true }; }
      catch (e) { if (e.status === 401) return { needLogin: true }; throw e; }
    },
    async login(username, password) {
      const r = await api('login', { body: { username, password }, noAuthEvent: true });
      localStorage.setItem(TOKEN_KEY, r.token); this.user = r.user;
      await this.pull(true);
    },
    async installConfig(body) { return api('install', { body, noAuthEvent: true }); },
    async register(body) {
      const r = await api('register', { body, noAuthEvent: true });
      localStorage.setItem(TOKEN_KEY, r.token); this.user = r.user;
      await this.pull(true);
    },
    async setup(body) {
      const r = await api('setup', { body, noAuthEvent: true });
      localStorage.setItem(TOKEN_KEY, r.token); this.user = r.user;
      await this.pull(true);
    },
    async logout() {
      try { await this.flush(); await api('logout', { method: 'POST' }); } catch (e) { /* abaikan */ }
      localStorage.removeItem(TOKEN_KEY); location.reload();
    },
    /** Ambil data terbaru dari server. force = abaikan perubahan yang belum terkirim. */
    async pull(force) {
      if (!force && (sync.busy || sync.timer || this.pending())) return false;
      const r = await api('state');
      this.user = r.user;
      this.subscription = r.subscription || null;
      this.themeSaved = !!(r.state && r.state.theme);
      let ui = {};
      try { ui = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); } catch (e) { /* */ }
      const next = normalize(Object.assign(r.state, { ui: Object.assign({ classId: null, subjectId: null }, ui) }));
      const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id', { numeric: true });
      const byCreated = (a, b) => (a.created || 0) - (b.created || 0);
      next.classes.sort(byName); next.subjects.sort(byName); next.assessments.sort(byCreated); next.questionSets.sort(byCreated);
      const nextSnap = flatten(next);
      const changed = !sync.snap || !!diff(sync.snap, nextSnap);
      if (changed || force) { this.state = next; sync.snap = nextSnap; }
      return changed;
    },
    pending() { return sync.snap ? !!diff(sync.snap, flatten(this.state)) : false; },
    onStatus(fn) { sync.listeners.push(fn); fn(sync.status); },
    syncStatus() { return sync.status; },
    async flush() {
      if (this.mode !== 'server') return;
      clearTimeout(sync.timer); sync.timer = null;
      if (sync.busy) { sync.again = true; return; }
      const next = flatten(this.state);
      const payload = diff(sync.snap || new Map(), next);
      if (!payload) { setStatus('ok'); return; }
      sync.busy = true; setStatus('saving');
      try {
        const r = await api('sync', { body: payload });
        sync.snap = next; setStatus('ok');
        if (r && r.rejected) {
          window.App && App.toast('Sebagian perubahan ditolak: paket soal, asesmen, dan nilai hanya bisa diubah oleh pembuatnya atau admin sekolah; kelas/mapel hanya bisa dihapus admin.', 'bad');
          await this.pull(true); window.App && App.route();
        }
      } catch (e) {
        console.error(e); setStatus('error');
        if (e.status === 402) { setStatus('locked'); return; }
        if (e.status !== 401) sync.timer = setTimeout(() => this.flush(), 5000);
        window.App && App.toast('Gagal menyimpan ke server: ' + e.message + ' (dicoba lagi otomatis)', 'bad');
      } finally {
        sync.busy = false;
        if (sync.again) { sync.again = false; this.flush(); }
      }
    },
    save() {
      if (this.mode === 'server' && this.locked()) {
        // Perubahan tema tetap disimpan; data lain tidak bisa diubah saat langganan habis
        try { localStorage.setItem(UI_KEY, JSON.stringify(this.state.ui || {})); } catch (e) { /* */ }
        clearTimeout(sync.timer); sync.timer = setTimeout(() => { sync.timer = null; this.flush(); }, 500);
        return;
      }
      if (this.mode === 'server') {
        try { localStorage.setItem(UI_KEY, JSON.stringify(this.state.ui || {})); } catch (e) { /* */ }
        clearTimeout(sync.timer); setStatus('saving');
        sync.timer = setTimeout(() => { sync.timer = null; this.flush(); }, 500);
        return;
      }
      try { localStorage.setItem(KEY, JSON.stringify(this.state, replacer)); }
      catch (e) { window.App && App.toast('Gagal menyimpan: penyimpanan browser penuh. Hapus bank soal yang tidak dipakai atau ekspor cadangan.', 'bad'); }
    },
    /** Ganti seluruh data (pulihkan cadangan / hapus semua). */
    async replaceAll(data) {
      data = normalize(JSON.parse(JSON.stringify(data)));
      if (this.mode === 'server') {
        await api('import', { body: { state: data } });
        if (data.theme) { this.state.theme = data.theme; }
        await this.pull(true);
        this.state.theme = data.theme || this.state.theme; this.save();
      } else {
        this.state = data; this.save();
      }
    },
    async reset() { const b = blank(); b.theme = this.state.theme; await this.replaceAll(b); },
    periode() { return this.state.settings.tahunAjaran + ' ' + this.state.settings.semester; },
    cls(id) { return this.state.classes.find(c => c.id === id); },
    subj(id) { return this.state.subjects.find(s => s.id === id); },
    asm(id) { return this.state.assessments.find(a => a.id === id); },
    qset(id) { return this.state.questionSets.find(q => q.id === id); },
    /** Asesmen dalam konteks kelas+mapel+periode aktif */
    assessmentsFor(classId, subjectId, type) {
      const per = this.periode();
      return this.state.assessments.filter(a => a.classId === classId && a.subjectId === subjectId && (a.periode || per) === per && (!type || a.type === type))
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created || 0) - (b.created || 0));
    },
    setScore(aid, sid, val) {
      const m = this.state.scores[aid] = this.state.scores[aid] || {};
      if (val === null || val === '' || val === undefined) delete m[sid]; else m[sid] = val;
    },
    getScore(aid, sid) { const m = this.state.scores[aid]; return m ? m[sid] : undefined; },
    deleteAssessment(id) {
      this.state.assessments = this.state.assessments.filter(a => a.id !== id);
      delete this.state.scores[id]; delete this.state.submissions[id];
    },
    ctx(classId, subjectId) {
      const subj = this.subj(subjectId);
      return { assessments: this.assessmentsFor(classId, subjectId), scores: this.state.scores, settings: this.state.settings, tps: subj ? subj.tps : [] };
    },

    seedDemo() {
      const s = this.state;
      const names = ['Adinda Putri Lestari', 'Bagas Pratama', 'Citra Ayu Maharani', 'Dimas Arya Saputra', 'Eka Nurhaliza', 'Fajar Ramadhan', 'Gita Permata Sari', 'Hendra Wijaya', 'Intan Kusuma Dewi', 'Joko Susilo', 'Kirana Salsabila', 'Lukman Hakim'];
      const cls = { id: uid('c'), name: 'VII A', fase: 'D', students: names.map((n, i) => ({ id: uid('s'), nis: String(2400 + i + 1), name: n })) };
      const cls2 = { id: uid('c'), name: 'VII B', fase: 'D', students: ['Maya Anggraini', 'Nanda Prakoso', 'Oktaviani', 'Putra Mahendra', 'Qori Amalia', 'Rizky Maulana'].map((n, i) => ({ id: uid('s'), nis: String(2420 + i + 1), name: n })) };
      const tp = (code, desc) => ({ id: uid('tp'), code, desc });
      const ipa = { id: uid('m'), name: 'IPA', tps: [tp('TP 1', 'Mengidentifikasi ciri-ciri makhluk hidup'), tp('TP 2', 'Mengklasifikasikan makhluk hidup berdasarkan ciri-cirinya'), tp('TP 3', 'Menjelaskan wujud zat dan perubahannya'), tp('TP 4', 'Menganalisis suhu, kalor, dan pemuaian')] };
      const mtk = { id: uid('m'), name: 'Matematika', tps: [tp('TP 1', 'Melakukan operasi hitung bilangan bulat'), tp('TP 2', 'Menyelesaikan masalah bilangan pecahan'), tp('TP 3', 'Menyederhanakan bentuk aljabar')] };
      const bind = { id: uid('m'), name: 'Bahasa Indonesia', tps: [tp('TP 1', 'Menentukan gagasan utama teks deskripsi'), tp('TP 2', 'Menulis teks deskripsi dengan struktur yang tepat')] };
      s.classes.push(cls, cls2); s.subjects.push(ipa, mtk, bind);
      const per = this.periode();
      const rnd = (base, spread) => Math.max(40, Math.min(100, Math.round(base + (Math.random() * 2 - 1) * spread)));
      const mk = (type, title, subj, tps, date, base, c) => {
        const a = { id: uid('a'), type, title, classId: (c || cls).id, subjectId: subj.id, tpIds: tps, date, periode: per, created: Date.now() };
        s.assessments.push(a);
        s.scores[a.id] = {};
        (c || cls).students.forEach((st, i) => {
          const skill = 72 + ((i * 37) % 25);
          if (type === 'formatif') s.scores[a.id][st.id] = { score: rnd(skill, 12), note: '' };
          else s.scores[a.id][st.id] = rnd((skill + base) / 2, 10);
        });
        return a;
      };
      for (const subj of [ipa, mtk, bind]) {
        mk('diagnostik', 'Diagnostik Kognitif Awal', subj, [], '2026-07-15', 65);
        mk('formatif', 'Kuis ' + subj.tps[0].code, subj, [subj.tps[0].id], '2026-07-28', 80);
        mk('slm', 'SLM 1 — ' + subj.tps[0].desc.split(' ').slice(0, 3).join(' '), subj, [subj.tps[0].id], '2026-08-05', 82);
        mk('slm', 'SLM 2 — ' + subj.tps[1].desc.split(' ').slice(0, 3).join(' '), subj, [subj.tps[1].id], '2026-08-26', 78);
        mk('sts', 'Sumatif Tengah Semester Ganjil', subj, subj.tps.slice(0, 2).map(t => t.id), '2026-09-22', 76);
        if (subj.tps[2]) mk('slm', 'SLM 3 — ' + subj.tps[2].desc.split(' ').slice(0, 3).join(' '), subj, [subj.tps[2].id], '2026-10-20', 80);
        mk('sas', 'Sumatif Akhir Semester Ganjil', subj, subj.tps.map(t => t.id), '2026-12-01', 79);
      }
      mk('slm', 'SLM 1 — Ciri makhluk hidup', ipa, [ipa.tps[0].id], '2026-08-05', 80, cls2);
      mk('sts', 'Sumatif Tengah Semester Ganjil', ipa, [ipa.tps[0].id], '2026-09-22', 75, cls2);
      s.ui.classId = cls.id; s.ui.subjectId = ipa.id;
      this.save();
    }
  };

  window.Store = Store;
})();
