/* AI-assisted: this file was written with the help of Claude (Anthropic), an AI coding assistant. See AI_USE.md. */
/* Görev Mimarı — ekler (iki dil klasöründe AYNI dosya; metinler TXT.tr / TXT.en, LANG'e göre).
   1) Raporda "gerçek NASA göreviyle karşılaştır" paneli (renderReport sarılır).
   Diğer ekler (ses, rozetler) aşağıda kendi bölümlerinde. */
(function () {
  'use strict';
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  const TXT = {
    tr: {
      realTitle: '🛰️ Gerçek görevle karşılaştır',
      you: 'Senin aracın', real: 'Gerçek görev',
      mass: 'Kütle (yakıtla)', cost: 'Maliyet', insts: 'Alet sayısı', rocket: 'Roket', power: 'Güç', orbit: 'Yörünge', launch: 'Fırlatma',
      note: 'Gerçek sayılar yaklaşıktır. Gerçek araçlar daha büyük: daha çok alet, yedek parça ve test.',
      more: 'NASA sayfası',
    },
    en: {
      realTitle: '🛰️ Compare with the real mission',
      you: 'Your craft', real: 'Real mission',
      mass: 'Mass (fuelled)', cost: 'Cost', insts: 'Instruments', rocket: 'Rocket', power: 'Power', orbit: 'Orbit', launch: 'Launch',
      note: 'Real numbers are approximate. Real craft are bigger: more instruments, spares and testing.',
      more: 'NASA page',
    },
  }[EN ? 'en' : 'tr'];

  /* Her senaryoya en yakın gerçek NASA görevi (yaklaşık, kamuya açık değerler). */
  const REAL = {
    earth: {
      name: 'Landsat 8', year: 2013, mass: 2623, cost: 850, insts: 2, rocket: 'Atlas V',
      power: { tr: 'Güneş paneli (~4,3 kW)', en: 'Solar array (~4.3 kW)' },
      orbit: { tr: '705 km, güneşle eşzamanlı', en: '705 km, sun-synchronous' },
      fact: { tr: 'Her 16 günde tüm Dünya\'yı çeker; yanık alanları da görür.', en: 'It images the whole Earth every 16 days, burn scars included.' },
      url: 'https://science.nasa.gov/mission/landsat-8/',
    },
    moon: {
      name: 'Lunar Reconnaissance Orbiter (LRO)', year: 2009, mass: 1916, cost: 500, insts: 7, rocket: 'Atlas V',
      power: { tr: 'Güneş paneli (~1,9 kW)', en: 'Solar array (~1.9 kW)' },
      orbit: { tr: '50 km, kutuplardan geçen', en: '50 km, polar' },
      fact: { tr: 'Kutup kraterlerinin haritasını çıkardı; buz izleri buldu.', en: 'It mapped the polar craters and found signs of ice.' },
      url: 'https://science.nasa.gov/mission/lro/',
    },
    mars: {
      name: 'MAVEN', year: 2013, mass: 2454, cost: 670, insts: 8, rocket: 'Atlas V',
      power: { tr: 'Güneş paneli (Mars\'ta ~1,2 kW)', en: 'Solar array (~1.2 kW at Mars)' },
      orbit: { tr: '150–6.200 km, basık', en: '150–6,200 km, elliptical' },
      fact: { tr: 'Mars\'ın havasını uzaya nasıl kaybettiğini ölçtü.', en: 'It measured how Mars loses its air to space.' },
      url: 'https://science.nasa.gov/mission/maven/',
    },
    europa: {
      name: 'Europa Clipper', year: 2024, mass: 6065, cost: 5200, insts: 9, rocket: 'Falcon Heavy',
      power: { tr: 'Dev güneş paneli (30 m)', en: 'Huge solar arrays (30 m)' },
      orbit: { tr: 'Jüpiter turu, ~49 Europa geçişi', en: 'Jupiter tour, ~49 Europa flybys' },
      fact: { tr: 'Nükleer pil yerine dev güneş panelleri taşır; 2030\'da varır.', en: 'It uses huge solar arrays, not nuclear power; arrives in 2030.' },
      url: 'https://science.nasa.gov/mission/europa-clipper/',
    },
  };

  const money = (m) => (typeof fmtMoney === 'function' ? fmtMoney(m) : '$' + Math.round(m) + 'M');
  const kgs = (x) => Math.round(x).toLocaleString(EN ? 'en-US' : 'tr-TR') + ' kg';
  const escH = (s) => (typeof esc === 'function' ? esc(String(s)) : String(s));

  function realPanel() {
    if (!S || !S.sim || !S.result) return '';
    const R = S.sim.R, real = REAL[S.scenario];
    if (!R || !real) return '';
    const L = EN ? 'en' : 'tr';
    const powName = (PARTS.power && PARTS.power.options[R.d.power]) ? PARTS.power.options[R.d.power].name : '—';
    const row = (label, a, b) => `<tr><td>${label}</td><td>${a}</td><td>${b}</td></tr>`;
    return `<div class="panel pad real-cmp" data-tour="real">
      <h3 style="margin-bottom:6px">${TXT.realTitle}</h3>
      <p class="real-name"><b>${real.name}</b> · ${TXT.launch} ${real.year} · <a href="${real.url}" target="_blank" rel="noopener">${TXT.more} ↗</a></p>
      <p class="muted real-fact">${real.fact[L]}</p>
      <div class="real-scroll"><table class="budget cmp real-table">
        <tr><td></td><td><b>${TXT.you}</b></td><td><b>${TXT.real}</b></td></tr>
        ${row(TXT.mass, kgs(R.mass.wet), '~' + kgs(real.mass))}
        ${row(TXT.cost, money(R.cost.total), '~' + money(real.cost))}
        ${row(TXT.insts, R.insts.length, real.insts)}
        ${row(TXT.rocket, escH(R.L.name), real.rocket)}
        ${row(TXT.power, escH(powName), real.power[L])}
        ${row(TXT.orbit, escH(R.orbit.short), real.orbit[L])}
      </table></div>
      <p class="muted" style="font-size:13px;margin:10px 0 0">${TXT.note}</p>
    </div>`;
  }

  if (typeof renderReport === 'function') {
    const baseReport = renderReport;
    // ui.js'teki global fonksiyon yeniden atanır (render() adıyla çağırır)
    renderReport = function () {
      const html = baseReport.apply(this, arguments);
      const panel = realPanel();
      if (!panel) return html;
      const i = html.lastIndexOf('<div class="start-bar');
      return i < 0 ? html + panel : html.slice(0, i) + panel + html.slice(i);
    };
  }
  window.MA_REAL = REAL;
})();

/* =========================================================================
   2) SES EFEKTLERİ — dosya yok, Web Audio ile kodla üretilir.
   Fırlatma gürültüsü, karar uyarısı, varış çanı, görev sonu (başarı/kayıp), patlama, seçim tıkı.
   Aç/kapat düğmesi tema düğmesinin yanında; seçim localStorage 'ma_sound' ('0' kapalı).
   Tarayıcı kuralı: ses ancak kullanıcı sayfaya dokunduktan sonra çalar (ilk tıklamada açılır).
   ========================================================================= */
(function () {
  'use strict';
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  const T = EN ? { on: 'Sound on', off: 'Sound off', label: 'Sound effects' } : { on: 'Ses açık', off: 'Ses kapalı', label: 'Ses efektleri' };
  let enabled = true;
  try { enabled = localStorage.getItem('ma_sound') !== '0'; } catch (e) { /* */ }
  let ctx = null, master = null, noiseBuf = null;

  function ac() {
    if (!enabled) return null;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    if (!ctx) {
      try { ctx = new C(); } catch (e) { return null; }
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); let b = 0;
      for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.5; } // kahverengi gürültü (derin)
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  // ilk kullanıcı hareketinde ses motorunu aç (tarayıcı izni)
  const unlock = () => { if (enabled) ac(); };
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  document.addEventListener('keydown', unlock, { capture: true });

  function tone(freq, t0, dur, { type = 'sine', vol = 0.18, slide = 0 } = {}) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), at = c.currentTime + t0;
    o.type = type; o.frequency.setValueAtTime(freq, at);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master); o.start(at); o.stop(at + dur + 0.05);
  }
  function noise(t0, dur, { from = 400, to = 120, vol = 0.5, attack = 0.4, q = 0.7 } = {}) {
    const c = ac(); if (!c) return null;
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = q;
    const g = c.createGain(), at = c.currentTime + t0;
    f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(Math.max(40, to), at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(at); src.stop(at + dur + 0.1);
    return src;
  }

  const SFX = {
    tick() { tone(1250, 0, 0.05, { type: 'triangle', vol: 0.05 }); },
    pop() { tone(520, 0, 0.12, { type: 'sine', vol: 0.12, slide: 1.8 }); },
    launch() { noise(0, 4.2, { from: 180, to: 900, vol: 0.9, attack: 0.7 }); noise(0.2, 4.0, { from: 90, to: 60, vol: 0.6, attack: 0.5, q: 1.2 }); },
    alert() { tone(880, 0, 0.16, { type: 'square', vol: 0.06 }); tone(660, 0.2, 0.22, { type: 'square', vol: 0.06 }); },
    arrive() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.12, 0.6, { vol: 0.1 })); },
    success() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.7, { type: 'triangle', vol: 0.12 })); },
    fail() { tone(330, 0, 0.5, { type: 'sawtooth', vol: 0.06, slide: 0.6 }); tone(220, 0.45, 0.8, { type: 'sawtooth', vol: 0.06, slide: 0.6 }); },
    boom() { noise(0, 2.4, { from: 1400, to: 60, vol: 1, attack: 0.02 }); },
  };
  window.MA_SFX = SFX;

  function setEnabled(v) {
    enabled = v;
    try { localStorage.setItem('ma_sound', v ? '1' : '0'); } catch (e) { /* */ }
    if (!v && ctx) { try { ctx.suspend(); } catch (e) { /* */ } }
    document.querySelectorAll('[data-snd]').forEach((b) => { b.textContent = v ? T.on : T.off; b.setAttribute('aria-pressed', String(v)); });
    if (v) SFX.pop();
  }
  const btnHTML = () => `<button type="button" class="btn small snd-btn" data-snd aria-pressed="${enabled}" title="${T.label}">${enabled ? T.on : T.off}</button>`;
  if (typeof themeSwitch === 'function') {
    const baseTheme = themeSwitch;
    themeSwitch = function () { return baseTheme.apply(this, arguments) + btnHTML(); };
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-snd]');
    if (b) { setEnabled(!enabled); return; }
    const sel = e.target.closest && e.target.closest('[data-act="inst"], [data-act="set"]');
    if (sel && !sel.disabled) { if (sel.getAttribute('aria-pressed') === 'true' || sel.classList.contains('sel')) SFX.tick(); else SFX.pop(); }
  }, true);

  /* uçuş olaylarına bağlan */
  let lastPhase = null, endPlayed = false;
  if (typeof startSimLoop === 'function') {
    const baseLoop = startSimLoop;
    startSimLoop = function () {
      lastPhase = S.sim && S.sim.phase; endPlayed = false;
      if (S.sim && S.sim.phase === 'launch') SFX.launch();
      return baseLoop.apply(this, arguments);
    };
  }
  if (typeof afterStep === 'function') {
    const baseAfter = afterStep;
    afterStep = function () {
      const r = baseAfter.apply(this, arguments);
      const sim = S.sim; if (!sim) return r;
      if (sim.phase !== lastPhase) {
        if (sim.phase === 'arrival' || (sim.phase === 'ops' && lastPhase === 'launch')) SFX.arrive();
        lastPhase = sim.phase;
      }
      if (sim.done && !endPlayed) {
        endPlayed = true;
        if (sim.endReason === 'launch') SFX.boom();
        else if (sim.endReason === 'complete') SFX.success();
        else SFX.fail();
      }
      return r;
    };
  }
  if (typeof showEventModal === 'function') {
    const baseEvent = showEventModal;
    showEventModal = function () { SFX.alert(); return baseEvent.apply(this, arguments); };
  }
  // ilk ekran ui.js yüklenirken çizildi; ses düğmesi görünsün diye bir kez yeniden çiz (uçuşta değil: ikinci döngü başlatır)
  if (typeof render === 'function' && typeof S !== 'undefined' && S.screen !== 'sim') render();
})();

/* =========================================================================
   3) ROZETLER — görev sonunda kazanılır, raporda gösterilir.
   localStorage 'ma_badges' = { id: 1 }, 'ma_worlds' = { senaryo: 1 } (başarıyla bitenler).
   Serbest modda rozet verilmez (sıralama tablosu gibi).
   ========================================================================= */
(function () {
  'use strict';
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  const L = EN ? 'en' : 'tr';
  const T = EN
    ? { title: '🏅 Badges', fresh: 'New!', count: (a, b) => `${a} / ${b} earned`, sandbox: 'No badges in sandbox mode.' }
    : { title: '🏅 Rozetler', fresh: 'Yeni!', count: (a, b) => `${a} / ${b} kazanıldı`, sandbox: 'Serbest modda rozet yok.' };
  const BADGES = [
    { id: 'first', tr: ['İlk uçuş', 'Bir görevi sonuna kadar uçur.'], en: ['First flight', 'Fly a mission to the end.'],
      test: (c) => c.sim.done },
    { id: 'success', tr: ['Tam başarı', 'Tüm ana hedefleri tuttur.'], en: ['Full success', 'Meet every main goal.'],
      test: (c) => c.score.success >= 150 },
    { id: 'club900', tr: ['900 kulübü', '900 puan ya da üstü al.'], en: ['900 club', 'Score 900 or more.'],
      test: (c) => c.score.total >= 900 },
    { id: 'science', tr: ['Bilim ustası', 'Bilimden 590 puan al.'], en: ['Science master', 'Get 590 science points.'],
      test: (c) => c.score.science >= 590 },
    { id: 'thrifty', tr: ['Tutumlu', 'Başar ve bütçenin %30\'u artsın.'], en: ['Thrifty', 'Succeed with 30% of the budget left.'],
      test: (c) => c.score.success >= 150 && c.R.budget !== Infinity && c.sim.reserve / c.R.budget >= 0.3 },
    { id: 'small', tr: ['Küçük roket', 'Paylaşımlı ya da küçük roketle başar.'], en: ['Small rocket', 'Succeed on a rideshare or small rocket.'],
      test: (c) => c.score.success >= 150 && ['rideshare', 'small'].includes(c.R.d.launcher) },
    { id: 'data', tr: ['Veri akıyor', 'Verinin %95\'ini Dünya\'ya indir.'], en: ['Data flows', 'Bring 95% of the data home.'],
      test: (c) => c.sim.dataGen > 0 && (c.score.lostFrac || 0) <= 0.05 },
    { id: 'calm', tr: ['Sakin uçuş', 'En fazla bir acil karar.'], en: ['Smooth ride', 'At most one emergency decision.'],
      test: (c) => c.sim.done && c.sim.endReason === 'complete' && c.sim.decisions.length <= 1 },
    { id: 'hard', tr: ['Uçuş direktörü', 'En zor seviyede başar.'], en: ['Flight director', 'Succeed on the hardest level.'],
      test: (c) => c.diff === 'hard' && c.score.success >= 150 },
    { id: 'team', tr: ['Takım oyunu', 'Takımla bir görev bitir.'], en: ['Team player', 'Finish a mission as a team.'],
      test: (c) => c.mode === 'team' && c.sim.done },
    { id: 'europa', tr: ['Okyanus kâşifi', 'Europa görevinde başar.'], en: ['Ocean explorer', 'Succeed at Europa.'],
      test: (c) => c.scen === 'europa' && c.score.success >= 150 },
    { id: 'worlds', tr: ['Dört dünya', 'Dört görevin hepsinde başar.'], en: ['Four worlds', 'Succeed in all four missions.'],
      test: (c) => ['earth', 'moon', 'mars', 'europa'].every((k) => c.worlds[k]) },
  ];
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };
  const awarded = new WeakMap(); // S.result → bu raporda yeni kazanılanlar

  function evaluate() {
    const res = S.result; if (!res || !S.sim) return null;
    if (awarded.has(res)) return awarded.get(res);
    const fresh = [];
    if (S.difficulty !== 'sandbox') {
      const have = load('ma_badges'), worlds = load('ma_worlds');
      if (res.score.success >= 150) { worlds[S.scenario] = 1; save('ma_worlds', worlds); }
      const c = { sim: S.sim, R: S.sim.R, score: res.score, diff: S.difficulty, mode: S.mode, scen: S.scenario, worlds };
      for (const b of BADGES) {
        let ok = false; try { ok = !!b.test(c); } catch (e) { ok = false; }
        if (ok && !have[b.id]) { have[b.id] = 1; fresh.push(b.id); }
      }
      save('ma_badges', have);
    }
    awarded.set(res, fresh);
    return fresh;
  }

  function badgePanel() {
    const fresh = evaluate(); if (!fresh) return '';
    const have = load('ma_badges');
    const n = BADGES.filter((b) => have[b.id]).length;
    const items = BADGES.map((b) => {
      const got = !!have[b.id], isNew = fresh.includes(b.id), [name, how] = b[L];
      return `<li class="badge${got ? ' got' : ''}${isNew ? ' new' : ''}"><span class="b-mark" aria-hidden="true">${got ? '★' : '☆'}</span>
        <span class="b-txt"><b>${name}</b>${isNew ? ` <span class="b-new">${T.fresh}</span>` : ''}<span class="b-how">${how}</span></span>
        <span class="sr-only">${got ? '✓' : '—'}</span></li>`;
    }).join('');
    return `<div class="panel pad badges-panel">
      <div class="badges-head"><h3>${T.title}</h3><span class="muted">${T.count(n, BADGES.length)}</span></div>
      ${S.difficulty === 'sandbox' ? `<p class="muted">${T.sandbox}</p>` : ''}
      <ul class="badges">${items}</ul></div>`;
  }

  if (typeof renderReport === 'function') {
    const baseReport = renderReport;
    renderReport = function () {
      const html = baseReport.apply(this, arguments);
      const panel = badgePanel(); if (!panel) return html;
      // en üstteki puan dökümünün hemen altına
      const i = html.indexOf('<div class="two">');
      return i < 0 ? html + panel : html.slice(0, i) + panel + html.slice(i);
    };
  }
  window.MA_BADGES = BADGES;
})();

/* =========================================================================
   4) KÜÇÜK KOLAYLIKLAR
   - Uçuşta klavye: Boşluk = duraklat/devam, 1–4 = hız (1×, 2×, 4×, 8×). Yazı alanında ve pencere açıkken çalışmaz.
   - Başlangıç ekranında kazanılan rozet sayısı (en az bir rozet varsa).
   ========================================================================= */
(function () {
  'use strict';
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  document.addEventListener('keydown', (e) => {
    if (typeof S === 'undefined' || S.screen !== 'sim' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector('.modal')) return; // karar penceresi açık
    if (e.key === ' ' || e.code === 'Space') {
      if (t && t.tagName === 'BUTTON') return; // düğmenin kendi Boşluk davranışı
      const b = document.getElementById('btn-pause');
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
    } else if (/^[1-4]$/.test(e.key)) {
      const v = [1, 2, 4, 8][+e.key - 1];
      const b = document.querySelector(`[data-act="speed"][data-v="${v}"]`);
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  if (typeof renderSimShell === 'function') {
    const baseSim = renderSimShell;
    renderSimShell = function () {
      const html = baseSim.apply(this, arguments);
      const hint = `<span class="muted kbd-hint">${EN ? 'Space: pause · 1–4: speed' : 'Boşluk: duraklat · 1–4: hız'}</span>`;
      const i = html.indexOf('<span class="grow"></span>');
      return i < 0 ? html : html.slice(0, i) + hint + html.slice(i);
    };
  }

  if (typeof renderTitle === 'function') {
    const baseTitle = renderTitle;
    renderTitle = function () {
      const html = baseTitle.apply(this, arguments);
      let have = {}; try { have = JSON.parse(localStorage.getItem('ma_badges') || '{}') || {}; } catch (e) { have = {}; }
      const n = Object.keys(have).length, total = (window.MA_BADGES || []).length;
      if (!n || !total) return html;
      const h = html.indexOf('<div class="hero">'); if (h < 0) return html;
      const p = html.indexOf('</p>', h); if (p < 0) return html;
      const line = `<p class="title-badges"><span aria-hidden="true">★</span> ${EN ? `${n} / ${total} badges earned` : `${n} / ${total} rozet kazanıldı`}</p>`;
      return html.slice(0, p + 4) + line + html.slice(p + 4);
    };
    if (S && S.screen === 'title') render();
  }

  // Başlangıç alt satırına gizlilik bağlantısı (kaynak kodu bağlantısı 2026-11-15 kullanıcı isteğiyle kaldırıldı) (sadece gerçek sitede; Artifact'te privacy.html yok)
  if (typeof renderTitle === 'function' && window.MA_SITE) {
    const baseTitle2 = renderTitle;
    renderTitle = function () {
      const html = baseTitle2.apply(this, arguments);
      const i = html.lastIndexOf('<div class="footer">'); if (i < 0) return html;
      const j = html.indexOf('</div>', i); if (j < 0) return html;
      const links = EN
        ? ' <a href="privacy.html#en">Privacy and credits</a>'
        : ' <a href="privacy.html">Gizlilik ve künye</a>';
      return html.slice(0, j) + links + html.slice(j);
    };
    if (S && S.screen === 'title') render();
  }
})();

/* =========================================================================
   5) GÖREV KARTI — rapordan 1200×630 PNG (sınıfta / sosyal medyada paylaşmak için).
   Düz koyu zemin (geçiş ve parlama yok), not, puan, sonuç, araç özeti, puan dağılımı, rozet sayısı
   ve (WebGL varsa) 3B aracın küçük bir görüntüsü. Tuvale emoji yazılmaz.
   ========================================================================= */
(function () {
  'use strict';
  const EN = typeof LANG !== 'undefined' && LANG === 'en';
  const T = EN
    ? { btn: 'Download mission card', brand: 'Mission Architect', pts: 'points', parts: ['Science', 'Success', 'Efficiency', 'Team', 'Bonus'], badges: 'badges', file: 'mission-card', made: 'Made with Mission Architect · NASA Space Apps 2026', fail: 'Could not create the image.' }
    : { btn: 'Görev kartını indir', brand: 'Görev Mimarı', pts: 'puan', parts: ['Bilim', 'Başarı', 'Verimlilik', 'Takım', 'Bonus'], badges: 'rozet', file: 'gorev-karti', made: 'Görev Mimarı ile tasarlandı · NASA Space Apps 2026', fail: 'Resim oluşturulamadı.' };
  const MAX = [600, 150, 150, 100, 100];
  const strip = (s) => String(s).replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();

  function craftImage(R) {
    try {
      if (!window.THREE || !window.Craft3D || !Craft3D.ready || !Craft3D.ready()) return null;
      const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(420, 420, false);
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
      const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
      const sun = new THREE.DirectionalLight(0xfff4e6, 2.6); sun.position.set(-4, 5, 4); scene.add(sun);
      const fill = new THREE.DirectionalLight(0x9fb8d9, 0.55); fill.position.set(4, -2, -3); scene.add(fill);
      scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x1a1410, 0.5));
      if (Craft3D.envFor) scene.environment = Craft3D.envFor(r);
      const m = Craft3D.build(R); scene.add(m);
      const sph = new THREE.Box3().setFromObject(m).getBoundingSphere(new THREE.Sphere());
      const dist = sph.radius / Math.sin((30 * Math.PI) / 360) * 1.05;
      cam.position.copy(sph.center).add(new THREE.Vector3(0.75, 0.42, 1).normalize().multiplyScalar(dist));
      cam.lookAt(sph.center); cam.near = dist / 50; cam.far = dist * 4; cam.updateProjectionMatrix();
      r.render(scene, cam);
      const url = r.domElement.toDataURL('image/png');
      r.dispose(); try { r.forceContextLoss(); } catch (e) { /* */ }
      return url;
    } catch (e) { return null; }
  }

  function draw(cb) {
    const res = S.result, sim = S.sim; if (!res || !sim) return cb(null);
    const R = sim.R, sc = scen(), score = res.score;
    const W = 1200, H = 630, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const font = (w, px) => `${w} ${px}px "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", system-ui, sans-serif`;
    g.fillStyle = '#0b1118'; g.fillRect(0, 0, W, H);
    // birkaç sabit yıldız (tohumlu, her seferinde aynı)
    let s = 7; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.25 + rnd() * 0.5; g.fillStyle = '#ffffff'; const z = rnd() < 0.1 ? 2 : 1; g.fillRect(rnd() * W, rnd() * H, z, z); }
    g.globalAlpha = 1;
    // başlık
    g.fillStyle = '#9aa8b6'; g.font = font(700, 22); g.textBaseline = 'alphabetic'; g.fillText(T.brand.toUpperCase(), 60, 70);
    g.fillStyle = '#eef2f6'; g.font = font(700, 46); g.fillText(strip(sc.name), 60, 128);
    g.fillStyle = '#a6b3c0'; g.font = font(400, 24);
    const money = typeof fmtMoney === 'function' ? fmtMoney(R.cost.total) : '$' + Math.round(R.cost.total) + 'M';
    g.fillText(strip(`${R.orbit.short} · ${R.L.name} · ${Math.round(R.mass.wet).toLocaleString(EN ? 'en-US' : 'tr-TR')} kg · ${money}`), 60, 168);
    // not kutusu
    const gradeCol = { S: '#4cc38a', A: '#4cc38a', B: '#8fb8ff', C: '#e8b04a', D: '#f07a6a', F: '#f07a6a' }[score.grade] || '#eef2f6';
    g.strokeStyle = gradeCol; g.lineWidth = 4; g.strokeRect(60, 210, 130, 130);
    g.fillStyle = gradeCol; g.font = font(700, 88); g.textAlign = 'center'; g.fillText(score.grade, 125, 307); g.textAlign = 'left';
    g.fillStyle = '#eef2f6'; g.font = font(700, 40); g.fillText(strip(score.outcome), 220, 252);
    g.font = font(700, 96); g.fillText(String(score.total), 220, 338);
    const tw = g.measureText(String(score.total)).width;
    g.fillStyle = '#a6b3c0'; g.font = font(400, 28); g.fillText(`/ 1000 ${T.pts}`, 236 + tw, 336);
    // puan dağılımı çubukları
    const vals = [score.science, score.success, score.eff, score.team, score.bonus];
    vals.forEach((v, i) => {
      const y = 386 + i * 38;
      g.fillStyle = '#c9d3dd'; g.font = font(400, 22); g.fillText(T.parts[i], 60, y + 18);
      g.fillStyle = '#1f2b38'; g.fillRect(220, y, 380, 22);
      g.fillStyle = '#8fb8ff'; g.fillRect(220, y, Math.max(0, Math.min(1, v / MAX[i])) * 380, 22);
      g.fillStyle = '#eef2f6'; g.font = font(700, 22); g.fillText(String(v), 616, y + 18);
    });
    // alt satır + rozet sayısı
    let have = {}; try { have = JSON.parse(localStorage.getItem('ma_badges') || '{}') || {}; } catch (e) { have = {}; }
    const nb = Object.keys(have).length, tb = (window.MA_BADGES || []).length;
    g.fillStyle = '#8f9dab'; g.font = font(400, 20);
    g.fillText(T.made + (tb ? ` · ${nb} / ${tb} ${T.badges}` : ''), 60, 600);
    // 3B araç (varsa) sağda
    const url = craftImage(R);
    if (!url) return cb(c);
    const img = new Image();
    img.onload = () => { g.drawImage(img, 720, 150, 420, 420); cb(c); };
    img.onerror = () => cb(c);
    img.src = url;
  }

  function download() {
    const go = () => draw((c) => {
      if (!c) return;
      const name = `${T.file}-${S.scenario}-${S.result.score.total}.png`;
      const save = (url, revoke) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000); };
      try {
        if (c.toBlob) c.toBlob((b) => (b ? save(URL.createObjectURL(b), true) : save(c.toDataURL('image/png'))), 'image/png');
        else save(c.toDataURL('image/png'));
      } catch (e) { if (typeof toast === 'function') toast(T.fail); }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  }
  window.MA_CARD = { draw, download };

  if (typeof renderReport === 'function') {
    const baseReport = renderReport;
    renderReport = function () {
      const html = baseReport.apply(this, arguments);
      const btn = `<button class="btn big" data-card>${T.btn}</button>`;
      const i = html.indexOf('<button class="btn big" data-act="home"');
      return i < 0 ? html : html.slice(0, i) + btn + html.slice(i);
    };
  }
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-card]'); if (b) { e.preventDefault(); download(); } });
})();
