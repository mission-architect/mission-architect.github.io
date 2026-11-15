/* AI-assisted: this file was written with the help of Claude (Anthropic), an AI coding assistant. See AI_USE.md. */
/* Görev Mimarı — denge testi (tarayıcısız).
   Oyunun kendi data.js + model.js + sim.js dosyalarını Node'da yükler, her senaryo için
   atölyedeki gibi bir "iyi" tasarım (en faydalı 4 alet) ve bir "kötü" tasarım (tek alet, kötü yörünge) kurar,
   N tohumla uçurur ve medyan puanlara bakar.

   Çalıştır:  node scripts/balance_test.js [--lang en] [--n 100] [--diff normal]
   Ölçüt (CLAUDE.md "Denge"): iyi tasarım medyanı 850–1000, kötü tasarım belirgin şekilde düşük (en az 150 puan).
   Bir ölçüt tutmazsa çıkış kodu 1 olur.

   Not: autoFix aşağıda workshop.js'teki kurala göre KOPYALANDI (o dosya sayfaya bağlı).
   workshop.js'te otomatik parça kuralları değişirse burayı da güncelle. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const LANG = opt('lang', 'tr');
const N = +opt('n', 100);
const DIFF = opt('diff', 'normal');
const dir = path.join(__dirname, '..', LANG === 'en' ? 'mission-game-en' : 'mission-game', 'js');

// sim.js'in kullandığı tohumlu rastgele üreteç viz.js'te; sadece o fonksiyonu al (viz.js'in geri kalanı sayfaya bağlı)
const viz = fs.readFileSync(path.join(dir, 'viz.js'), 'utf8');
const seededSrc = (viz.match(/function seeded\(seed\) \{[\s\S]*?\n\}/) || [])[0];
if (!seededSrc) { console.error('viz.js içinde seeded() bulunamadı'); process.exit(2); }
const src = [seededSrc].concat(['data.js', 'model.js', 'sim.js'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))).join('\n;\n');
const test = `
(function () {
  const ORBIT_LIST = { earth: ['sso', 'leo400', 'geo'], moon: ['lpo100', 'llo50', 'nrho'], mars: ['mlo', 'melip', 'areo'], europa: ['jflyby', 'eorbit', 'single'] };
  const DEFAULTS = {
    earth: { power: 'deploy3', propulsion: 'mono', antenna: 'xhga' },
    moon: { power: 'deploy3', propulsion: 'biprop', antenna: 'xhga' },
    mars: { power: 'deploy10', propulsion: 'biprop', antenna: 'kahga' },
    europa: { power: 'huge', propulsion: 'biprop', antenna: 'kahga' },
  };
  const LAUNCH_LIST = { LEO: ['rideshare', 'small', 'medium'], GEO: ['medium', 'heavy'], MOON: ['medium', 'heavy'], MARS: ['medium', 'heavy'], JUPITER: ['heavy', 'superheavy'] };
  const launchClassOf = (sc, d) => ORBITS[d.orbit].launchClass || sc.launchClass;
  const launchersFor = (sc, d) => (LAUNCH_LIST[launchClassOf(sc, d)] || []).filter((k) => { const L = LAUNCHERS[k]; return (L.cap[launchClassOf(sc, d)] || 0) > 0 && (!L.onlyOrbit || L.onlyOrbit.includes(d.orbit)); });
  function relevant(sc) {
    const best = {};
    sc.objectives.forEach((o) => Object.entries(o.needs).forEach(([i, w]) => { best[i] = Math.max(best[i] || 0, w * (o.primary ? 1.2 : 1)); }));
    return Object.keys(best).sort((a, b) => best[b] - best[a]);
  }
  function autoFix(sc, d0, diff) {
    const id = sc.id, d = { ...defaultDesign(sc), ...d0, instruments: { ...(d0.instruments || {}) } };
    d.months = sc.defaultMonths;
    for (const g of ['power', 'propulsion', 'antenna']) d[g] = d0[g] || DEFAULTS[id][g];
    d.structure = 'aluminum'; d.adcs = 'rw'; d.propMargin = '25'; d.aerobrake = false;
    d.computer = id === 'europa' ? 'radhard' : 'radtol';
    d.shielding = id === 'europa' ? 'vault' : id === 'earth' ? 'none' : 'std';
    d.redundancy = id === 'europa' ? 'dual' : 'single';
    d.ground = id === 'mars' || id === 'europa' ? 'dsn' : 'commercial';
    d.battery = 'xl';
    const need = computeDesign(sc, d, diff).power.battNeed;
    d.battery = ['s', 'm', 'l', 'xl'].find((b) => PARTS.battery.options[b].wh >= need) || 'xl';
    const ls = launchersFor(sc, d);
    d.launcher = ls.find((k) => { const R = computeDesign(sc, { ...d, launcher: k }, diff); return R.mass.cap >= R.mass.wet; }) || ls[ls.length - 1];
    return d;
  }
  function fly(sc, d, diff, n) {
    const R = computeDesign(sc, d, diff), scores = [], ends = {};
    for (let i = 0; i < n; i++) {
      const sim = createSim(R, 1000 + i); let g = 0;
      while (!sim.done && g++ < 600) { if (sim.pending) resolveEvent(sim, 0); simStep(sim); }
      scores.push(finalScore(sim).total); ends[sim.endReason] = (ends[sim.endReason] || 0) + 1;
    }
    scores.sort((a, b) => a - b);
    return { median: scores[Math.floor(n / 2)], p10: scores[Math.floor(n * 0.1)], min: scores[0], max: scores[n - 1], ends,
      errors: R.issues.filter((x) => x.level === 'error').length, cost: Math.round(R.cost.total), budget: R.budget };
  }
  const out = {};
  for (const sc of Object.values(SCENARIOS)) {
    const rel = relevant(sc);
    const good = autoFix(sc, { orbit: ORBIT_LIST[sc.id][0], instruments: Object.fromEntries(rel.slice(0, 4).map((k) => [k, 1])) }, DIFF);
    const bad = autoFix(sc, { orbit: ORBIT_LIST[sc.id][2], instruments: { [rel[rel.length - 1]]: 1 } }, DIFF);
    out[sc.id] = { good: fly(sc, good, DIFF, N), bad: fly(sc, bad, DIFF, N), goodInsts: rel.slice(0, 4) };
  }
  return out;
})()`;

const ctx = vm.createContext({ DIFF, N, console, Math, JSON, Object, Array, Number, String, Infinity, isFinite, Set, Map });
const res = vm.runInContext(src + '\n;\n' + test, ctx, { filename: 'balance' });

let fail = 0;
console.log(`Denge testi · dil ${LANG} · zorluk ${DIFF} · ${N} uçuş/tasarım\n`);
for (const [id, r] of Object.entries(res)) {
  const g = r.good, b = r.bad;
  const okGood = g.errors === 0 && g.median >= 850 && g.median <= 1000;
  const okGap = g.median - b.median >= 150;
  if (!okGood || !okGap) fail++;
  console.log(`${id.padEnd(7)} iyi: medyan ${g.median} (p10 ${g.p10}, en düşük ${g.min}) · $${g.cost}M / $${g.budget}M · hata ${g.errors} ${okGood ? '✓' : '✗'}`);
  console.log(`        kötü: medyan ${b.median} · fark ${g.median - b.median} ${okGap ? '✓' : '✗'}   [aletler: ${r.goodInsts.join(', ')}]`);
}
console.log(fail ? `\n${fail} senaryoda ölçüt tutmadı.` : '\nTüm senaryolar ölçütü karşılıyor.');
process.exit(fail ? 1 : 0);
