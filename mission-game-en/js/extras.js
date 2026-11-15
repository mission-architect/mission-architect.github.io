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
