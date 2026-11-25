/* Halaman utama: harga dari server, tema, efek 3D */
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rupiah = n => 'Rp' + Math.round(+n || 0).toLocaleString('id-ID');

  // Kemiringan 3D kartu mengikuti kursor
  $$('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 8}deg)`;
      el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  if (localStorage.getItem('asesmen-token')) { const b = $('#btn-login'); b.textContent = 'Buka Aplikasi'; }

  function hideSaas() { $$('[data-saas]').forEach(el => el.remove()); }

  fetch('api/public/plans', { cache: 'no-store' })
    .then(r => r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null)
    .then(p => {
      if (!p || !p.plans) return hideSaas();
      if (p.brand) { $$('[data-brand]').forEach(el => { el.textContent = p.brand; }); document.title = p.brand + ' — Asesmen Kurikulum Merdeka, Nilai Rapor Otomatis & Ujian Online'; }
      if (p.tagline) $$('[data-tagline]').forEach(el => { el.textContent = p.tagline; });
      $$('[data-trial]').forEach(el => { el.textContent = p.trialDays; });
      if (!p.trialDays) $$('[data-trial]').forEach(el => { el.parentNode.textContent = '🚀 Daftar Sekarang'; });
      $('#pricing').innerHTML = p.plans.map((pl, i) => `
        <div class="card tilt plan-card ${i === 1 ? 'featured' : ''}">
          ${i === 1 ? '<span class="pill ok" style="position:absolute;top:16px;right:16px">Populer</span>' : ''}
          <h3>${esc(pl.name)}</h3>
          <div class="price">${rupiah(pl.price)}</div>
          <div class="small muted">untuk ${pl.months} bulan${pl.months > 1 ? ` · ±${rupiah(pl.price / pl.months)}/bulan` : ''}</div>
          <p>${esc(pl.desc || '')}</p>
          <ul class="checks"><li>Semua jenis asesmen</li><li>Unggah soal PDF tanpa batas</li><li>Ujian online dari HP murid</li><li>Rekap rapor & leger otomatis</li><li>Guru & murid tanpa batas</li></ul>
          <a class="btn ${i === 1 ? '' : 'soft'}" style="width:100%" href="app.html#daftar">${p.trialDays ? 'Mulai Coba Gratis' : 'Daftar'}</a>
        </div>`).join('');
      const c = [];
      if (p.whatsapp) c.push(`<a target="_blank" href="https://wa.me/${esc(p.whatsapp)}">💬 WhatsApp</a>`);
      if (p.email) c.push(`<a href="mailto:${esc(p.email)}">✉️ ${esc(p.email)}</a>`);
      $('#contact').innerHTML = c.join(' · ');
    })
    .catch(hideSaas);
})();
