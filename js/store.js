/* Penyimpanan data di browser (localStorage) + data contoh */
(function () {
  'use strict';
  const KEY = 'asesmen-merdeka-v1';
  const C = window.Calc;

  const PRESETS = [
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
      theme: { preset: 'samudra', h: 228, s: 72, mode: 'light', depth: 1, motion: 'on' },
      classes: [], subjects: [], assessments: [], scores: {}, questionSets: [], submissions: {},
      ui: { classId: null, subjectId: null }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const d = JSON.parse(raw);
      const b = blank();
      d.settings = Object.assign(b.settings, d.settings || {});
      d.theme = Object.assign(b.theme, d.theme || {});
      for (const k of ['classes', 'subjects', 'assessments', 'questionSets']) d[k] = d[k] || [];
      d.scores = d.scores || {}; d.submissions = d.submissions || {}; d.ui = d.ui || b.ui;
      return d;
    } catch (e) { console.error(e); return blank(); }
  }

  const Store = {
    KEY, PRESETS, uid,
    state: load(),
    save() {
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
      catch (e) { window.App && App.toast('Gagal menyimpan: penyimpanan browser penuh. Hapus bank soal yang tidak dipakai atau ekspor cadangan.', 'bad'); }
    },
    reset() { this.state = blank(); this.save(); },
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
