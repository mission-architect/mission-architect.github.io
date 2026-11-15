/* AI-assisted: this file was written with the help of Claude (Anthropic), an AI coding assistant. See AI_USE.md. */
/* Görev Mimarı — atölyedeki 3B uzay aracı (Three.js r149, mission-game/vendor/three.min.js).
   İki dil klasöründe de AYNI dosya. Three.js ilk kez gerektiğinde yüklenir; yüklenemezse ya da
   WebGL yoksa atölye eski SVG çizimini (viz.js craftSVG) göstermeye devam eder.
   Kullanım: Craft3D.ready() → true ise Craft3D.show(kutu, R). */
(function () {
  'use strict';
  const TXT = {
    tr: { hint: 'Döndürmek için sürükle', label: 'Uzay aracının 3B görünümü' },
    en: { hint: 'Drag to rotate', label: '3D view of the spacecraft' },
  }[typeof LANG !== 'undefined' && LANG === 'en' ? 'en' : 'tr'];

  // three.min.js her iki dil için tek kopya: mission-game/vendor/
  const SELF = document.currentScript && document.currentScript.src;
  const THREE_URL = SELF ? new URL('../../mission-game/vendor/three.min.js', SELF).href : 'mission-game/vendor/three.min.js';

  // NASA gezegen dokuları (eşdikdörtgen): mission-game/textures/. Kaynaklar README'de.
  const TEX_BASE = SELF ? new URL('../../mission-game/textures/', SELF).href : 'mission-game/textures/';
  const NASA_FILE = { Earth: 'earth.jpg', Moon: 'moon.jpg', Mars: 'mars.jpg', Jupiter: 'jupiter.jpg', Europa: 'europa.jpg' };
  const NT = {};
  // Doku hazırsa döndürür; değilse yüklemeyi başlatır, null döner ve hazır olunca onLoad(tex) çağırır.
  // file:// ile açılınca WebGL yerel resmi kullanamaz → hiç denemez (onFail hemen).
  function nasaTex(body, onLoad, onFail) {
    if (!NASA_FILE[body] || location.protocol === 'file:') { if (onFail) onFail(); return null; }
    let e = NT[body];
    if (e && e.tex) return e.tex;
    if (e && e.failed) { if (onFail) onFail(); return null; }
    if (!e) {
      e = NT[body] = { tex: null, failed: false, ok: [], bad: [] };
      new THREE.TextureLoader().load(TEX_BASE + NASA_FILE[body], (t) => {
        t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; e.tex = t;
        e.ok.forEach((f) => f(t)); e.ok = []; e.bad = [];
      }, undefined, () => { e.failed = true; e.bad.forEach((f) => f()); e.ok = []; e.bad = []; });
    }
    if (onLoad) e.ok.push(onLoad);
    if (onFail) e.bad.push(onFail);
    return null;
  }

  // NASA 3B modelleri (glb): mission-game/models/. GLTFLoader (Three.js r147, klasik script) ilk gerektiğinde yüklenir.
  // file:// ile açılınca model dosyası okunamaz → hiç denemez (onFail). Kaynaklar README'de.
  const MODEL_BASE = SELF ? new URL('../../mission-game/models/', SELF).href : 'mission-game/models/';
  const GLTF_URL = SELF ? new URL('../../mission-game/vendor/GLTFLoader.js', SELF).href : 'mission-game/vendor/GLTFLoader.js';
  const MODELS = {};
  // Three.js ek dosyaları (klasik script, THREE.X olarak eklenir): mission-game/vendor/{GLTFLoader,Sky}.js — tembel yüklenir
  const VENDOR = {};
  function withScript(file, global, cb) {
    let e = VENDOR[file];
    if (!e) {
      e = VENDOR[file] = { state: 'loading', wait: [] };
      const sc = document.createElement('script'); sc.src = new URL(file, GLTF_URL).href;
      sc.onload = () => { e.state = THREE[global] ? 'ok' : 'fail'; e.wait.splice(0).forEach((f) => f(e.state === 'ok')); };
      sc.onerror = () => { e.state = 'fail'; e.wait.splice(0).forEach((f) => f(false)); };
      document.head.appendChild(sc);
    }
    if (e.state === 'loading') e.wait.push(cb); else cb(e.state === 'ok');
  }
  const withGLTF = (cb) => withScript('GLTFLoader.js', 'GLTFLoader', cb);
  // Modeli bir kez yükler; her istekte sahneye eklenebilecek bir kopya (clone) verir.
  function loadModel(file, onLoad, onFail) {
    if (location.protocol === 'file:') { if (onFail) onFail(); return; }
    let e = MODELS[file];
    if (e && e.scene) return onLoad(e.scene.clone(true));
    if (e && e.failed) { if (onFail) onFail(); return; }
    if (!e) {
      e = MODELS[file] = { scene: null, failed: false, ok: [], bad: [] };
      withGLTF((ok) => {
        const fail = () => { e.failed = true; e.bad.splice(0).forEach((f) => f()); e.ok = []; };
        if (!ok) return fail();
        // Dokular glb içinde: GLTFLoader bunları blob: adresinden ImageBitmapLoader ile (fetch) okur ve sitenin CSP'si
        // (connect-src) buna izin vermez. Ayrıştırıcı oluşturulurken createImageBitmap'i gizleyince <img> ile
        // okuyan TextureLoader'ı seçer (img-src blob: izinli).
        fetch(MODEL_BASE + file).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then((buf) => {
          const saved = window.createImageBitmap;
          try { window.createImageBitmap = undefined; } catch (_) {}
          try {
            new THREE.GLTFLoader().parse(buf, MODEL_BASE, (g) => {
              e.scene = g.scene;
              g.scene.traverse((o) => { if (o.material && o.material.map) o.material.map.encoding = THREE.sRGBEncoding; });
              e.ok.splice(0).forEach((f) => f(e.scene.clone(true))); e.bad = [];
            }, (err) => { console.warn('model', file, err); fail(); });
          } finally { try { window.createImageBitmap = saved; } catch (_) {} }
        }).catch((err) => { console.warn('model', file, err); fail(); });
      });
    }
    e.ok.push(onLoad); if (onFail) e.bad.push(onFail);
  }

  let state = 'idle'; // idle | loading | ok | fail
  const waiters = [];
  function webglOK() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function load(cb) {
    if (state === 'ok') return cb(true);
    if (state === 'fail') return cb(false);
    waiters.push(cb);
    if (state === 'loading') return;
    if (!webglOK()) { state = 'fail'; return flush(); }
    if (window.THREE && window.THREE.WebGLRenderer) { state = 'ok'; return flush(); }
    state = 'loading';
    const s = document.createElement('script');
    s.src = THREE_URL;
    s.onload = () => { state = window.THREE && window.THREE.WebGLRenderer ? 'ok' : 'fail'; flush(); };
    s.onerror = () => { state = 'fail'; flush(); };
    document.head.appendChild(s);
  }
  function flush() { while (waiters.length) { try { waiters.shift()(state === 'ok'); } catch (e) { console.error(e); } } }

  /* ---------------- malzemeler ve dokular (bir kez) ----------------
     2026-11-15: kullanıcı \"gövde kalas gibi\" dedi → NASA araçlarına benzeyen yeniden yapım: kırışık altın folyo (MLI, normal
     haritalı), fırçalanmış alüminyum güverteler, beyaz radyatörler, gerçekçi güneş hücreleri, yansıma ortamı (envFor). */
  let M = null;
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    return t;
  }
  function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  // yükseklik alanından normal haritası (kırışık folyo için)
  function normalFromHeight(W, H, hgt) {
    return canvasTex(W, H, (g) => {
      const img = g.createImageData(W, H), D = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = hgt((x + 1) % W, y) - hgt((x - 1 + W) % W, y), dy = hgt(x, (y + 1) % H) - hgt(x, (y - 1 + H) % H);
        const nx = -dx * 2.2, ny = -dy * 2.2, l = Math.hypot(nx, ny, 1), i = (y * W + x) * 4;
        D[i] = (nx / l * 0.5 + 0.5) * 255; D[i + 1] = (ny / l * 0.5 + 0.5) * 255; D[i + 2] = (1 / l * 0.5 + 0.5) * 255; D[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, false);
  }
  function materials() {
    if (M) return M;
    const r = rnd(7);
    // kırışık folyo: rastgele katlanma çizgilerinden yükseklik alanı
    const N = 256, hf = new Float32Array(N * N);
    for (let k = 0; k < 70; k++) {
      const x0 = r() * N, y0 = r() * N, a = r() * Math.PI, len = 30 + r() * 120, amp = (r() - 0.5) * 1.6, ca = Math.cos(a), sa = Math.sin(a);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = x - x0, dy = y - y0, along = dx * ca + dy * sa, across = -dx * sa + dy * ca;
        if (Math.abs(along) > len) continue;
        hf[y * N + x] += amp * Math.exp(-(across * across) / 18) * (1 - Math.abs(along) / len);
      }
    }
    const crinkle = normalFromHeight(N, N, (x, y) => hf[y * N + x]);
    crinkle.wrapS = crinkle.wrapT = THREE.RepeatWrapping;
    const gold = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#c8902c'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,214,120,.18)' : 'rgba(120,70,10,.18)'; g.fillRect(r() * w, r() * h, 10 + r() * 50, 6 + r() * 40); }
      // dikiş/bant çizgileri
      g.strokeStyle = 'rgba(90,60,20,.55)'; g.lineWidth = 2; g.strokeRect(4, 4, w - 8, h - 8);
    });
    gold.wrapS = gold.wrapT = THREE.RepeatWrapping;
    // güneş hücreleri: koyu lacivert hücreler, gümüş iletken şeritler, hücre aralarında açık boşluk
    const cells = canvasTex(512, 256, (g, w, h) => {
      g.fillStyle = '#cfd5dc'; g.fillRect(0, 0, w, h);
      const cw = 32, ch = 32;
      for (let y = 2; y < h - 2; y += ch) for (let x = 2; x < w - 2; x += cw) {
        const gr = g.createLinearGradient(x, y, x + cw, y + ch); gr.addColorStop(0, '#1b2f5c'); gr.addColorStop(1, '#0d1833');
        g.fillStyle = gr; g.fillRect(x + 1, y + 1, cw - 2, ch - 2);
        g.fillStyle = 'rgba(200,210,225,.45)'; for (let k = 1; k < 4; k++) g.fillRect(x + 1, y + (ch * k) / 4, cw - 2, 0.8);
      }
      g.strokeStyle = '#9aa3ad'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    });
    const rad = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#f2f3f4'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(160,165,172,.5)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 1, h); });
    const std = (o) => new THREE.MeshStandardMaterial(o);
    M = {
      mli: std({ map: gold, normalMap: crinkle, normalScale: new THREE.Vector2(0.9, 0.9), metalness: 0.9, roughness: 0.28 }),
      mliSilver: std({ color: 0xd4d8de, normalMap: crinkle, normalScale: new THREE.Vector2(0.7, 0.7), metalness: 0.95, roughness: 0.22 }),
      mliBlack: std({ color: 0x15161a, normalMap: crinkle, normalScale: new THREE.Vector2(0.8, 0.8), metalness: 0.4, roughness: 0.35 }),
      tape: std({ color: 0x8a6420, metalness: 0.7, roughness: 0.4 }),
      cells: std({ map: cells, metalness: 0.5, roughness: 0.22 }),
      cellBack: std({ color: 0x6d737a, metalness: 0.35, roughness: 0.7 }),
      frame: std({ color: 0x3a3f46, metalness: 0.7, roughness: 0.4 }),
      silver: std({ color: 0xc9ced6, metalness: 0.9, roughness: 0.28 }),
      deck: std({ color: 0xb8bec6, metalness: 0.85, roughness: 0.35 }),
      white: std({ color: 0xeef0f2, metalness: 0.05, roughness: 0.5, side: THREE.DoubleSide }),
      radiator: std({ map: rad, metalness: 0.1, roughness: 0.45 }),
      grey: std({ color: 0x5a6069, metalness: 0.6, roughness: 0.45 }),
      dark: std({ color: 0x1e2228, metalness: 0.4, roughness: 0.45 }),
      lens: std({ color: 0x05070c, metalness: 0.95, roughness: 0.05 }),
      nozzle: std({ color: 0x3d3a38, metalness: 1, roughness: 0.32, side: THREE.DoubleSide }),
      nozzleIn: std({ color: 0x8a6a3a, metalness: 1, roughness: 0.4, side: THREE.BackSide }),
      rtg: std({ color: 0x34383e, metalness: 0.55, roughness: 0.55 }),
      ion: std({ color: 0x6aa9ff, emissive: 0x3b7bff, emissiveIntensity: 1.2 }),
    };
    return M;
  }
  // metal yüzeyler bir şey yansıtsın: basit gök/zemin ortamından yansıma haritası (renderer başına bir kez)
  const ENV = new WeakMap();
  function envFor(renderer) {
    if (ENV.has(renderer)) return ENV.get(renderer);
    const sc = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
      vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 p; void main(){ float h = p.y; vec3 c = mix(vec3(0.03,0.035,0.05), vec3(0.55,0.6,0.7), smoothstep(-0.2, 0.9, h)); c += vec3(1.6,1.5,1.3) * pow(max(dot(p, normalize(vec3(-0.6,0.7,0.5))), 0.0), 40.0); gl_FragColor = vec4(c,1.0); }' }));
    sc.add(sky);
    const pm = new THREE.PMREMGenerator(renderer);
    const tex = pm.fromScene(sc, 0.02).texture;
    pm.dispose();
    ENV.set(renderer, tex);
    return tex;
  }

  /* ---------------- parçalar ---------------- */
  // Eksenler: +Y üst (anten), ±X güneş kanatları, -Y motor, +Z ön yüz (aletler), -Z arka (radyatör, SAR).
  function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); return m; }
  function box(w, h, d, mat) { return mesh(new THREE.BoxGeometry(w, h, d), mat); }
  function cyl(rt, rb, h, mat, seg = 20) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); }
  // çan biçimli motor ağzı
  function bell(rt, rb, L, seg = 32) {
    const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(rt + (rb - rt) * Math.pow(t, 0.55), -t * L)); }
    const g = new THREE.Group(), m = materials();
    g.add(mesh(new THREE.LatheGeometry(pts, seg), m.nozzle));
    const inner = mesh(new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p.x * 0.97, p.y)), seg), m.nozzleIn); g.add(inner);
    return g;
  }

  function buildParts(R) {
    const d = R.d, m = materials();
    const on = (id) => R.insts.find((i) => i.id === id);
    const big = (id) => (on(id) && on(id).t === 2 ? 1.3 : 1);
    const s = 0.9 + Math.min(0.7, Math.sqrt(Math.max(R.mass.dry, 1)) / 40); // gövde boyu
    const rr = s * 0.52, hy = s * 0.43; // sekizgen gövdenin köşe yarıçapı ve yarı yüksekliği
    const ap = rr * Math.cos(Math.PI / 8); // yüz merkezine uzaklık
    const hx = ap, hz = ap;
    const parts = [];
    const add = (key, obj) => parts.push({ key, obj });

    // ---- gövde: sekizgen prizma, altın folyo, alüminyum güverteler, arka radyatör, iticiler, yıldız izleyiciler
    const bus = new THREE.Group();
    // her yüz ayrı panel: çoğu altın folyo, birkaçı siyah ve gümüş (gerçek araçlardaki gibi karışık battaniyeler)
    const faceW = 2 * rr * Math.sin(Math.PI / 8), faceMat = [m.mli, m.mli, m.mliBlack, m.mli, m.radiator, m.mli, m.mliSilver, m.mli];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4, f = box(faceW * 1.005, hy * 2, 0.02, faceMat[k]);
      f.position.set(Math.sin(a) * (ap - 0.01), 0, Math.cos(a) * (ap - 0.01)); f.rotation.y = a; bus.add(f);
      // bant dikişleri (yatay iki çizgi)
      if (faceMat[k] !== m.radiator) for (const ty of [-0.33, 0.36]) { const tape = box(faceW * 0.98, 0.012, 0.004, m.tape); tape.position.set(Math.sin(a) * (ap + 0.002), hy * ty, Math.cos(a) * (ap + 0.002)); tape.rotation.y = a; bus.add(tape); }
      // köşe rayları
      const ca = a + Math.PI / 8, rail = box(0.035, hy * 2.02, 0.035, m.deck); rail.position.set(Math.sin(ca) * rr, 0, Math.cos(ca) * rr); rail.rotation.y = ca; bus.add(rail);
    }
    for (const sy of [1, -1]) {
      const deck = mesh(new THREE.CylinderGeometry(rr * 1.04, rr * 1.04, 0.045, 8), m.deck); deck.rotation.y = Math.PI / 8; deck.position.y = sy * (hy + 0.02); bus.add(deck);
      // güverte kenarında ince bant
      const band = mesh(new THREE.CylinderGeometry(rr * 1.01, rr * 1.01, 0.03, 8, 1, true), m.mliSilver); band.rotation.y = Math.PI / 8; band.position.y = sy * (hy - 0.05); bus.add(band);
    }
    // arka yüzde beyaz radyatör
    const radp = box(2 * rr * Math.sin(Math.PI / 8) * 0.92, hy * 1.6, 0.015, m.radiator); radp.position.set(0, 0, -ap - 0.008); bus.add(radp);
    // üst güvertede ekipman kutuları ve güneş sensörleri
    const er = rnd(Math.round(s * 1000));
    for (let k = 0; k < 5; k++) {
      const a = er() * Math.PI * 2, d0 = rr * (0.25 + er() * 0.45), w = 0.08 + er() * 0.12, hh = 0.04 + er() * 0.07, dd = 0.08 + er() * 0.1;
      const eq = box(w, hh, dd, er() < 0.5 ? m.mliSilver : m.mliBlack); eq.position.set(Math.cos(a) * d0, hy + 0.045 + hh / 2, Math.sin(a) * d0); eq.rotation.y = er() * Math.PI; bus.add(eq);
    }
    for (const sx of [-1, 1]) { const ss = mesh(new THREE.SphereGeometry(0.03, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.lens); ss.position.set(sx * rr * 0.7, hy + 0.045, ap * 0.55); bus.add(ss); }
    // altta fırlatma bağlantı halkası
    const ring = mesh(new THREE.CylinderGeometry(rr * 0.62, rr * 0.66, 0.09, 40, 1, true), m.deck); ring.position.y = -hy - 0.09; bus.add(ring);
    const ringLip = mesh(new THREE.TorusGeometry(rr * 0.66, 0.015, 8, 40), m.silver); ringLip.rotation.x = Math.PI / 2; ringLip.position.y = -hy - 0.135; bus.add(ringLip);
    // köşelerde küçük itici kümeleri (4 adet)
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2, g = new THREE.Group();
      g.position.set(Math.sin(a) * rr * 0.98, -hy + 0.06, Math.cos(a) * rr * 0.98);
      const blk = box(0.07, 0.07, 0.07, m.dark); g.add(blk);
      for (const [dx, dy, dz] of [[0, -1, 0], [1, 0, 0], [0, 0, 1]]) { const n = bell(0.008, 0.02, 0.05, 12); n.position.set(dx * 0.035, dy * 0.035, dz * 0.035); n.lookAt(dx * 9, dy * 9, dz * 9); n.rotateX(Math.PI / 2); g.add(n); }
      g.rotation.y = a; bus.add(g);
    }
    // üstte iki yıldız izleyici (siperlikli)
    if (d.adcs !== 'mtq') for (const sx of [-1, 1]) {
      const st = new THREE.Group(); st.position.set(sx * rr * 0.45, hy + 0.05, -ap * 0.45);
      st.add(box(0.1, 0.08, 0.1, m.dark));
      const baf = cyl(0.045, 0.03, 0.12, m.dark, 16); baf.position.set(0, 0.09, 0); baf.rotation.x = -0.5; st.add(baf);
      const l = cyl(0.03, 0.03, 0.01, m.lens, 16); l.position.set(0, 0.145, 0.03); l.rotation.x = -0.5; st.add(l);
      bus.add(st);
    }
    // küçük her yöne antenler (üst ve alt)
    for (const sy of [1, -1]) { const ro = cyl(0.008, 0.008, 0.22, m.silver, 6); ro.position.set(-rr * 0.6, sy * (hy + 0.13), ap * 0.3); bus.add(ro); const tip = cyl(0.025, 0.025, 0.03, m.white, 10); tip.position.set(-rr * 0.6, sy * (hy + 0.25), ap * 0.3); bus.add(tip); }
    add('bus', bus);

    // ---- güç: güneş kanatları (bağlantı kolu + menteşeli paneller) / gövde panelleri / RTG
    const wing = { deploy3: [1.25, 0.72, 2], deploy10: [1.85, 0.9, 3], huge: [2.7, 1.15, 4] }[d.power];
    if (wing) {
      const [w, h, n] = wing, g = new THREE.Group();
      for (const side of [-1, 1]) {
        // V biçimli bağlantı kafesi + kablo demeti
        for (const sz of [-1, 1]) { const from = new THREE.Vector3(side * (hx + 0.02), 0, sz * 0.12), to = new THREE.Vector3(side * (hx + 0.42), 0, 0), len = from.distanceTo(to); const st = cyl(0.014, 0.014, len, m.silver, 8); st.position.copy(from).add(to).multiplyScalar(0.5); st.lookAt(to); st.rotateX(Math.PI / 2); g.add(st); }
        const cable = cyl(0.008, 0.008, 0.4, m.dark, 6); cable.rotation.z = Math.PI / 2; cable.position.set(side * (hx + 0.21), -0.03, 0.02); g.add(cable);
        const drive = cyl(0.05, 0.05, 0.08, m.dark, 12); drive.rotation.z = Math.PI / 2; drive.position.x = side * (hx + 0.03); g.add(drive);
        const wingG = new THREE.Group(); wingG.rotation.x = -0.28; // güneşe dönük
        for (let k = 0; k < n; k++) {
          const pw = w / n, x = side * (hx + 0.42 + pw * (k + 0.5) + k * 0.025);
          const p = box(pw, h, 0.02, [m.cellBack, m.cellBack, m.cellBack, m.cellBack, m.cells, m.cellBack]); p.position.x = x; wingG.add(p);
          // çerçeve
          for (const sy of [1, -1]) { const fr = box(pw, 0.025, 0.03, m.frame); fr.position.set(x, sy * h / 2, 0); wingG.add(fr); }
          // arka destek çubukları
          for (const sy of [-0.25, 0.25]) { const rib = box(pw * 0.96, 0.015, 0.02, m.frame); rib.position.set(x, sy * h, -0.02); wingG.add(rib); }
          if (k > 0) { const hinge = cyl(0.012, 0.012, h * 0.8, m.silver, 6); hinge.position.set(side * (hx + 0.42 + pw * k + (k - 0.5) * 0.025), 0, 0); wingG.add(hinge); }
        }
        g.add(wingG);
      }
      add('power-' + d.power, g);
    } else if (d.power === 'body') {
      const g = new THREE.Group();
      for (let k = 0; k < 8; k++) { if (k === 0 || k === 4) continue; const a = (k * Math.PI) / 4; const p = box(2 * rr * Math.sin(Math.PI / 8) * 0.9, hy * 1.7, 0.012, [m.cellBack, m.cellBack, m.cellBack, m.cellBack, m.cells, m.cellBack]); p.position.set(Math.sin(a) * (ap + 0.008), 0, Math.cos(a) * (ap + 0.008)); p.rotation.y = a; g.add(p); }
      add('power-body', g);
    }
    const rtgN = d.power === 'rtg' ? 1 : d.power === 'rtg2' ? 2 : 0;
    for (let i = 0; i < rtgN; i++) {
      const side = i === 0 ? -1 : 1, g = new THREE.Group();
      const boom = cyl(0.02, 0.02, 0.7, m.silver, 8); boom.rotation.z = side * Math.PI / 2.6; boom.position.set(side * (hx + 0.26), -hy * 0.6, 0); g.add(boom);
      const rt = new THREE.Group(); rt.position.set(side * (hx + 0.58), -hy * 1.05, 0); rt.rotation.z = side * 0.5;
      rt.add(cyl(0.11, 0.11, 0.6, m.rtg, 16));
      for (let k = 0; k < 8; k++) { const fin = box(0.3, 0.56, 0.015, m.rtg); fin.rotation.y = (k * Math.PI) / 8; rt.add(fin); }
      for (const sy of [1, -1]) { const cap = cyl(0.13, 0.13, 0.04, m.deck, 16); cap.position.y = sy * 0.3; rt.add(cap); }
      g.add(rt);
      add('power-rtg-' + i, g);
    }

    // ---- anten (üstte): çanak = parabolik yüzey + arka kaburgalar + üç ayaklı besleyici; orta = boynuz; düşük = çubuk
    const ant = d.antenna, ag = new THREE.Group();
    if (ant === 'lga') {
      const rod = cyl(0.012, 0.012, 0.32, m.silver, 8); rod.position.set(hx * 0.5, hy + 0.18, 0); ag.add(rod);
      const cap = cyl(0.05, 0.05, 0.08, m.white, 16); cap.position.set(hx * 0.5, hy + 0.37, 0); ag.add(cap);
    } else if (ant === 'mga') {
      const horn = cyl(0.17, 0.07, 0.3, m.mli, 4); horn.rotation.y = Math.PI / 4; horn.position.y = hy + 0.2; ag.add(horn);
      const mouth = box(0.23, 0.005, 0.23, m.dark); mouth.position.y = hy + 0.35; ag.add(mouth);
    } else {
      const R0 = ant === 'kahga' ? 0.95 : 0.65, depth = R0 * 0.3, base = hy + 0.26;
      const pts = []; for (let i = 0; i <= 20; i++) { const x = (R0 * i) / 20; pts.push(new THREE.Vector2(x, (depth * x * x) / (R0 * R0))); }
      const dish = mesh(new THREE.LatheGeometry(pts, 64), m.white); dish.position.y = base; ag.add(dish);
      const rim = mesh(new THREE.TorusGeometry(R0, 0.012, 6, 64), m.deck); rim.rotation.x = Math.PI / 2; rim.position.y = base + depth; ag.add(rim);
      for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4, rib = box(0.012, 0.02, R0 * 0.95, m.deck); rib.position.set(Math.cos(a) * R0 * 0.48, base + depth * 0.22 - 0.01, Math.sin(a) * R0 * 0.48); rib.rotation.y = -a + Math.PI / 2; rib.rotation.x = -0.25; ag.add(rib); }
      const mast = cyl(0.04, 0.05, 0.26, m.deck, 12); mast.position.y = hy + 0.13; ag.add(mast);
      const gimbal = cyl(0.07, 0.07, 0.05, m.dark, 16); gimbal.position.y = hy + 0.25; ag.add(gimbal);
      const feedH = R0 * 0.58;
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI * 2) / 3, from = new THREE.Vector3(Math.cos(a) * R0 * 0.82, base + depth * 0.7, Math.sin(a) * R0 * 0.82), to = new THREE.Vector3(0, base + feedH, 0);
        const len = from.distanceTo(to), st = cyl(0.008, 0.008, len, m.silver, 6);
        st.position.copy(from).add(to).multiplyScalar(0.5); st.lookAt(to); st.rotateX(Math.PI / 2); ag.add(st);
      }
      // ikinci yansıtıcı (Cassegrain) ve çanak ortasında altın besleme boynuzu
      const sub = mesh(new THREE.SphereGeometry(R0 * 0.16, 24, 8, 0, Math.PI * 2, 0, 0.6), m.deck); sub.rotation.x = Math.PI; sub.position.y = base + feedH + 0.04; ag.add(sub);
      const horn = cyl(0.05, 0.025, 0.16, m.mli, 16); horn.position.y = base + 0.1; ag.add(horn);
      const wg = cyl(0.012, 0.012, 0.3, m.silver, 6); wg.position.set(0.06, hy + 0.15, -0.05); ag.add(wg);
    }
    add('antenna-' + ant, ag);

    // ---- itki (altta): ana motor çanı + boğaz; iyon = ızgara + mavi parıltı; soğuk gaz = sadece köşe iticileri
    const pr = d.propulsion;
    if (pr && pr !== 'none' && pr !== 'cold') {
      const g = new THREE.Group();
      if (pr === 'ion') {
        const c = cyl(0.22, 0.24, 0.14, m.dark, 32); c.position.y = -hy - 0.1; g.add(c);
        const grid = cyl(0.19, 0.19, 0.01, m.grey, 32); grid.position.y = -hy - 0.17; g.add(grid);
        const glow = cyl(0.17, 0.17, 0.005, m.ion, 32); glow.position.y = -hy - 0.178; g.add(glow);
      } else {
        const size = { mono: 0.55, biprop: 1 }[pr] || 0.6;
        const b = bell(0.07 * size, 0.24 * size, 0.46 * size); b.position.y = -hy - 0.07; g.add(b);
        const throat = cyl(0.1 * size + 0.02, 0.07 * size, 0.09, m.grey, 16); throat.position.y = -hy - 0.035; g.add(throat);
        // ısı battaniyesi ve iki yönlendirme pistonu
        const blanket = cyl(0.13 * size + 0.03, 0.12 * size + 0.03, 0.06, m.mli, 20); blanket.position.y = -hy - 0.03; g.add(blanket);
        for (const sx of [-1, 1]) { const act = cyl(0.012, 0.012, 0.16 * size, m.silver, 6); act.position.set(sx * 0.11 * size, -hy - 0.1 * size, 0.05); act.rotation.z = sx * 0.4; g.add(act); }
        if (pr === 'biprop') for (const sx of [-1, 1]) { const tank = mesh(new THREE.SphereGeometry(0.11, 16, 12), m.mliSilver); tank.position.set(sx * rr * 0.45, -hy - 0.06, 0); tank.scale.y = 0.6; g.add(tank); }
      }
      add('prop-' + pr, g);
    }

    // ---- aletler: ön üç yüze (sol-ön, ön, sağ-ön) dağıtılır
    const front = ['camera', 'spectrometer', 'multispec', 'thermal', 'altimeter', 'atmo', 'neutron', 'particles'].filter(on).slice(0, 6);
    const faceA = [0, -Math.PI / 4, Math.PI / 4];
    front.forEach((id, i) => {
      const k = big(id) * Math.min(1, s / 1.2), g = new THREE.Group();
      const a = faceA[i % 3], row = Math.floor(i / 3), nRows = front.length > 3 ? 2 : 1;
      const y = nRows === 1 ? 0 : (row === 0 ? 1 : -1) * hy * 0.42;
      g.position.set(Math.sin(a) * ap, y, Math.cos(a) * ap); g.rotation.y = a;
      if (id === 'camera' || id === 'multispec') {
        const barrel = cyl(0.085 * k, 0.1 * k, 0.28 * k, id === 'camera' ? m.white : m.mliSilver, 24); barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.14 * k; g.add(barrel);
        const wrap = cyl(0.105 * k, 0.105 * k, 0.1 * k, m.mli, 24); wrap.rotation.x = Math.PI / 2; wrap.position.z = 0.06 * k; g.add(wrap);
        const brk = box(0.16 * k, 0.03, 0.12 * k, m.deck); brk.position.set(0, -0.1 * k, 0.06 * k); g.add(brk);
        const shade = cyl(0.1 * k, 0.085 * k, 0.07 * k, m.dark, 24); shade.rotation.x = Math.PI / 2; shade.position.z = 0.31 * k; g.add(shade);
        const lens = cyl(0.065 * k, 0.065 * k, 0.01, m.lens, 24); lens.rotation.x = Math.PI / 2; lens.position.z = 0.29 * k; g.add(lens);
      } else if (id === 'spectrometer') {
        const b = box(0.24 * k, 0.17 * k, 0.16 * k, m.mli); b.position.z = 0.08 * k; g.add(b);
        const ap2 = box(0.12 * k, 0.05 * k, 0.02, m.lens); ap2.position.z = 0.17 * k; g.add(ap2);
        const rad2 = box(0.24 * k, 0.012, 0.14 * k, m.radiator); rad2.position.set(0, 0.09 * k, 0.08 * k); g.add(rad2);
      } else if (id === 'thermal') {
        const b = box(0.2 * k, 0.2 * k, 0.13 * k, m.white); b.position.z = 0.065 * k; g.add(b);
        for (let f = -2; f <= 2; f++) { const fin = box(0.2 * k, 0.008, 0.12 * k, m.deck); fin.position.set(0, f * 0.035 * k, 0.07 * k); g.add(fin); }
        const l = cyl(0.045 * k, 0.045 * k, 0.02, m.lens, 20); l.rotation.x = Math.PI / 2; l.position.z = 0.14 * k; g.add(l);
      } else if (id === 'altimeter') {
        const tube = cyl(0.09 * k, 0.09 * k, 0.16 * k, m.mli, 24); tube.rotation.x = Math.PI / 2; tube.position.z = 0.08 * k; g.add(tube);
        const l = cyl(0.07 * k, 0.07 * k, 0.01, m.lens, 24); l.rotation.x = Math.PI / 2; l.position.z = 0.165 * k; g.add(l);
      } else if (id === 'atmo') {
        const b = box(0.2 * k, 0.14 * k, 0.1 * k, m.white); b.position.z = 0.05 * k; g.add(b);
        const dome = mesh(new THREE.SphereGeometry(0.07 * k, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.lens); dome.rotation.x = Math.PI / 2; dome.position.z = 0.1 * k; g.add(dome);
      } else {
        const b = box(0.15 * k, 0.12 * k, 0.1 * k, m.mliSilver); b.position.z = 0.05 * k; g.add(b);
        const det = box(0.1 * k, 0.07 * k, 0.01, m.dark); det.position.z = 0.105 * k; g.add(det);
      }
      add('i-' + id, g);
    });
    if (on('sar')) { // radar: arka yüzde uzun, karolu düz anten
      const k = big('sar'), g = new THREE.Group(), W = s * 1.6 * k;
      const p = box(W, 0.34, 0.05, m.grey); p.position.set(0, 0, -ap - 0.2); g.add(p);
      for (let t = 0; t < 8; t++) { const tile = box(W / 8 - 0.02, 0.3, 0.008, m.dark); tile.position.set(-W / 2 + W / 16 + (t * W) / 8, 0, -ap - 0.17); g.add(tile); }
      for (const sx of [-0.25, 0.25]) { const st = box(0.03, 0.03, 0.2, m.silver); st.position.set(sx * s, 0, -ap - 0.1); g.add(st); }
      add('i-sar', g);
    }
    if (on('magnetometer')) {
      const g = new THREE.Group(), L = 1.7;
      const boom = cyl(0.012, 0.012, L, m.silver, 6); boom.rotation.z = -Math.PI / 3; boom.position.set(hx + Math.sin(Math.PI / 3) * L / 2, hy * 0.6 + Math.cos(Math.PI / 3) * L / 2, -hz * 0.6); g.add(boom);
      for (let t = 1; t < 5; t++) { const joint = cyl(0.02, 0.02, 0.03, m.dark, 8); joint.rotation.z = -Math.PI / 3; joint.position.set(hx + Math.sin(Math.PI / 3) * L * t / 5, hy * 0.6 + Math.cos(Math.PI / 3) * L * t / 5, -hz * 0.6); g.add(joint); }
      const tip = box(0.09, 0.07, 0.07, m.white); tip.position.set(hx + Math.sin(Math.PI / 3) * L, hy * 0.6 + Math.cos(Math.PI / 3) * L, -hz * 0.6); g.add(tip);
      add('i-magnetometer', g);
    }
    if (on('radar_sounder')) {
      const g = new THREE.Group(), L = 2.2 * big('radar_sounder');
      for (const side of [-1, 1]) { const a = cyl(0.008, 0.008, L, m.white, 6); a.rotation.z = side * (Math.PI / 2 - 0.35); a.position.set(side * (hx + Math.cos(0.35) * L / 2), -hy - Math.sin(0.35) * L / 2, -hz + 0.05); g.add(a); }
      add('i-radar_sounder', g);
    }
    return parts;
  }

  /* ---------------- ortak gezinme: tam ekran, yakınlaştırma, serbest kamera ----------------
     Atölye (bu dosya) ve uçuş ekranı (flight3d.js) aynı yardımcıları kullanır.
     Normal (yörünge) kip: sol sürükle = döndür, sağ tık ya da Shift + sürükle = kaydır, tekerlek = yakınlaştır (tam ekranda),
       iki parmak = yakınlaştır + kaydır.
     Serbest kamera: kamera sahnede serbestçe uçar. Sürükle = etrafa bak; W A S D / oklar = ileri-geri-sola-sağa;
       Q / E (ya da Page Down / Page Up) = aşağı / yukarı; Shift = hızlı; tekerlek = ileri-geri. Dokunmatikte ekrandaki yön düğmeleri. */
  const NAV_TXT = {
    tr: { full: 'Tam ekran', exit: 'Küçült', zin: 'Yakınlaştır', zout: 'Uzaklaştır', free: 'Serbest kamera', back: 'Araca dön', reset: 'Sıfırla', tools: '3B görünüm denetimleri',
      help: 'Sürükle: etrafa bak · W A S D ya da oklar: ilerle · Q / E: aşağı / yukarı · Shift: hızlı',
      helpTouch: 'Sürükle: etrafa bak · Düğmelerle ilerle',
      mv: { f: 'İleri', b: 'Geri', l: 'Sola', r: 'Sağa', u: 'Yukarı', d: 'Aşağı' }, pad: 'Kamera hareketi' },
    en: { full: 'Full screen', exit: 'Exit full screen', zin: 'Zoom in', zout: 'Zoom out', free: 'Free camera', back: 'Back to craft', reset: 'Reset', tools: '3D view controls',
      help: 'Drag: look around · W A S D or arrows: move · Q / E: down / up · Shift: faster',
      helpTouch: 'Drag: look around · Use the buttons to move',
      mv: { f: 'Forward', b: 'Back', l: 'Left', r: 'Right', u: 'Up', d: 'Down' }, pad: 'Camera movement' },
  }[typeof LANG !== 'undefined' && LANG === 'en' ? 'en' : 'tr'];
  const TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  const FREE = new Set(); // serbest kipteki gezinmeler (klavye bunlara gider)
  function createNav(yaw, pitch, limits) {
    const nav = {
      yaw, pitch, zoom: 1, panX: 0, panY: 0, idleAt: 0, active: false, home: { yaw, pitch }, lim: limits || { pMin: -0.9, pMax: 1.1 },
      free: false, pos: new THREE.Vector3(), lyaw: 0, lpitch: 0, keys: new Set(), hold: {}, fast: false, last: 0, cam: null, kick: () => {},
    };
    nav.setFree = (on) => {
      if (on && nav.cam) {
        // kameranın şu anki yerinden ve bakış yönünden başla (zıplama olmasın)
        nav.pos.copy(nav.cam.position);
        const d = nav.cam.getWorldDirection(new THREE.Vector3());
        nav.lyaw = Math.atan2(-d.x, -d.z); nav.lpitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
      }
      nav.free = !!on && !!nav.cam; nav.keys.clear(); nav.hold = {}; nav.last = 0;
      if (nav.free) FREE.add(nav); else FREE.delete(nav);
      if (nav.onFree) nav.onFree(nav.free);
    };
    nav.reset = () => { nav.setFree(false); nav.yaw = nav.home.yaw; nav.pitch = nav.home.pitch; nav.zoom = 1; nav.panX = 0; nav.panY = 0; nav.idleAt = performance.now(); };
    nav.setZoom = (z) => { nav.zoom = Math.max(0.35, Math.min(4, z)); nav.idleAt = performance.now(); };
    return nav;
  }
  function isFull(el) { return !!el && (document.fullscreenElement === el || document.webkitFullscreenElement === el || el.classList.contains('v3-full')); }
  function exitFull(el) {
    if (!el) return;
    el.classList.remove('v3-full'); setTimeout(syncBars, 0);
    const fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe === el) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) {} }
  }
  function toggleFull(el) {
    if (isFull(el)) return exitFull(el);
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    // tarayıcı tam ekrana izin vermezse (ör. iPhone, gömülü sayfa) sayfa içinde tüm ekranı kapla
    const fallback = () => { el.classList.add('v3-full'); syncBars(); };
    if (!req) return fallback();
    try { const p = req.call(el); if (p && p.catch) p.catch(fallback); } catch (_) { fallback(); }
    // bazı gömülü tarayıcılar isteği ne kabul ne ret eder: kısa süre sonra hâlâ tam ekran değilse sayfa içinde kapla
    setTimeout(() => { if (!(document.fullscreenElement || document.webkitFullscreenElement)) fallback(); }, 800);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.querySelector('.v3-full')) { document.querySelectorAll('.v3-full').forEach((el) => el.classList.remove('v3-full')); syncBars(); } });

  // serbest kamera klavyesi: sadece ekranda görünen serbest kipteki görünüme gider; yazı alanlarında çalışmaz
  const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', KeyE: 'u', PageUp: 'u', KeyQ: 'd', PageDown: 'd' };
  function liveFree() { for (const n of FREE) { if (n.cv && n.cv.isConnected && !n.cv.hidden) return n; } return null; }
  window.addEventListener('keydown', (e) => {
    const n = liveFree(); if (!n) return;
    if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    n.fast = e.shiftKey;
    const k = KEYMAP[e.code]; if (!k) return;
    e.preventDefault(); n.keys.add(k);
    if (!e.repeat) n.step = k; // kısa basışta da küçük bir adım at
    n.kick();
  });
  window.addEventListener('keyup', (e) => { for (const n of FREE) { n.fast = e.shiftKey; const k = KEYMAP[e.code]; if (k) n.keys.delete(k); } });
  window.addEventListener('blur', () => { for (const n of FREE) { n.keys.clear(); n.hold = {}; } });

  // sürükle / iki parmak / tekerlek
  function bindGestures(cv, nav, fullEl, kick) {
    nav.cv = cv; nav.kick = kick;
    const pts = new Map();
    let mode = null, st = null;
    const snap = () => {
      const a = [...pts.values()];
      const mid = a.length > 1 ? { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 } : a[0];
      const dist = a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0;
      return { mid, dist, yaw: nav.yaw, pitch: nav.pitch, zoom: nav.zoom, panX: nav.panX, panY: nav.panY, lyaw: nav.lyaw, lpitch: nav.lpitch };
    };
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // pointer capture kullanılmıyor: takılı kalırsa araç çubuğu tıklamaları tuvale gidiyordu; pencereyi dinle
      mode = pts.size >= 2 ? 'pinch' : (!nav.free && (e.button === 2 || e.shiftKey) ? 'pan' : 'rot');
      st = snap(); nav.active = true; nav.idleAt = performance.now();
      cv.classList.add('grab'); if (nav.onInteract) nav.onInteract();
      kick();
    });
    window.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId) || !mode) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const now = snap(), h = cv.clientHeight || 300, dx = now.mid.x - st.mid.x, dy = now.mid.y - st.mid.y;
      if (nav.free) {
        // serbest kip: tutup çekiyormuş gibi etrafa bak; iki parmak ileri-geri
        nav.lyaw = st.lyaw + dx * 0.005;
        nav.lpitch = Math.max(-1.5, Math.min(1.5, st.lpitch + dy * 0.005));
        if (mode === 'pinch' && st.dist > 0) { nav.pinch = Math.log(now.dist / st.dist); }
      } else if (mode === 'rot') {
        nav.yaw = st.yaw + dx * 0.01;
        nav.pitch = Math.max(nav.lim.pMin, Math.min(nav.lim.pMax, st.pitch + dy * 0.006));
      } else {
        nav.panX = st.panX - (dx / h) * 1.6 / nav.zoom;
        nav.panY = st.panY + (dy / h) * 1.6 / nav.zoom;
        if (mode === 'pinch' && st.dist > 0) nav.setZoom(st.zoom * (now.dist / st.dist));
      }
      nav.idleAt = performance.now();
      kick();
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 0) { mode = null; nav.active = false; nav.pinch = 0; cv.classList.remove('grab'); }
      else { mode = 'rot'; nav.pinch = 0; st = snap(); }
      nav.idleAt = performance.now();
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      if (nav.free) { e.preventDefault(); nav.wheel = (nav.wheel || 0) - e.deltaY; kick(); return; }
      // yörünge kipinde tekerlek sayfayı kaydırmasın diye sadece tam ekranda yakınlaştırır
      if (!isFull(fullEl())) return;
      e.preventDefault();
      nav.setZoom(nav.zoom * Math.exp(-e.deltaY * 0.0015));
      kick();
    }, { passive: false });
  }

  // araç çubuğu: Tam ekran, +, −, Serbest kamera, Sıfırla (+ serbest kipte yardım ve yön düğmeleri)
  function toolbar(container, fullEl, nav, kick, extraClass) {
    const bar = document.createElement('div');
    bar.className = 'v3-tools' + (extraClass ? ' ' + extraClass : '');
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', NAV_TXT.tools);
    bar.innerHTML = `<button type="button" class="v3-btn" data-v3="full">${NAV_TXT.full}</button>
      <button type="button" class="v3-btn" data-v3="in" aria-label="${NAV_TXT.zin}">+</button>
      <button type="button" class="v3-btn" data-v3="out" aria-label="${NAV_TXT.zout}">−</button>
      <button type="button" class="v3-btn" data-v3="free" aria-pressed="false">${NAV_TXT.free}</button>
      <button type="button" class="v3-btn" data-v3="reset">${NAV_TXT.reset}</button>`;
    // serbest kip: yardım satırı + yön düğmeleri (basılı tuttukça hareket)
    const help = document.createElement('div'); help.className = 'v3-help'; help.hidden = true;
    help.textContent = TOUCH ? NAV_TXT.helpTouch : NAV_TXT.help;
    const pad = document.createElement('div'); pad.className = 'v3-pad'; pad.hidden = true;
    pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', NAV_TXT.pad);
    const M = NAV_TXT.mv;
    pad.innerHTML = `<button type="button" class="v3-btn" data-mv="u">${M.u}</button><button type="button" class="v3-btn" data-mv="f" aria-label="${M.f}">▲</button><button type="button" class="v3-btn" data-mv="d">${M.d}</button>
      <button type="button" class="v3-btn" data-mv="l" aria-label="${M.l}">◀</button><button type="button" class="v3-btn" data-mv="b" aria-label="${M.b}">▼</button><button type="button" class="v3-btn" data-mv="r" aria-label="${M.r}">▶</button>`;
    const stopAll = () => { nav.hold = {}; };
    pad.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-mv]'); if (!b) return; e.preventDefault(); nav.hold[b.dataset.mv] = 1; kick(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => pad.addEventListener(t, stopAll));
    pad.addEventListener('contextmenu', (e) => e.preventDefault());
    // klavyeyle de kullanılabilsin: Enter/Boşluk ile kısa bir adım
    pad.addEventListener('click', (e) => { const b = e.target.closest('[data-mv]'); if (!b || e.detail) return; nav.step = b.dataset.mv; kick(); });

    const sync = () => {
      const f = isFull(fullEl());
      const b = bar.querySelector('[data-v3="full"]'); b.textContent = f ? NAV_TXT.exit : NAV_TXT.full; b.setAttribute('aria-pressed', f);
      const fr = bar.querySelector('[data-v3="free"]'); fr.textContent = nav.free ? NAV_TXT.back : NAV_TXT.free; fr.setAttribute('aria-pressed', nav.free);
      bar.querySelector('[data-v3="in"]').hidden = nav.free; bar.querySelector('[data-v3="out"]').hidden = nav.free;
      help.hidden = !nav.free; pad.hidden = !nav.free;
    };
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v3]'); if (!b) return;
      e.stopPropagation();
      const k = b.dataset.v3;
      if (k === 'full') toggleFull(fullEl());
      else if (k === 'in') nav.setZoom(nav.zoom * 1.25);
      else if (k === 'out') nav.setZoom(nav.zoom / 1.25);
      else if (k === 'free') {
        nav.setFree(!nav.free);
        // küçük ekranda yön düğmeleri sığmaz: serbest kamera açılınca tam ekrana geç
        if (nav.free && !isFull(fullEl()) && (TOUCH || window.innerWidth < 720)) toggleFull(fullEl());
      }
      else if (k === 'reset') nav.reset();
      sync(); setTimeout(sync, 60); kick();
    });
    nav.onFree = () => sync();
    bar.sync = sync;
    container.appendChild(bar); container.appendChild(help); container.appendChild(pad);
    bar.parts = [help, pad];
    sync();
    return bar;
  }
  // tam ekrana girip çıkınca tüm araç çubuklarını güncelle
  function syncBars() { document.querySelectorAll('.v3-tools').forEach((b) => b.sync && b.sync()); }
  document.addEventListener('fullscreenchange', syncBars);
  document.addEventListener('webkitfullscreenchange', syncBars);

  // arka plan yıldızları (yarıçap r küresi üzerinde), birkaç parlak yıldızla
  function makeStars(n, r, seed) {
    let s = seed >>> 0; const rr = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rr() * 2 - 1, a = rr() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      pos.set([Math.cos(a) * q * r, u * r, Math.sin(a) * q * r], i * 3);
      const b = 0.25 + Math.pow(rr(), 3) * 0.75, warm = rr() < 0.15;
      col.set(warm ? [b, b * 0.88, b * 0.72] : [b * 0.95, b, b * 1.05], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const grp = new THREE.Group();
    grp.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true })));
    const bp = new Float32Array(24 * 3);
    for (let i = 0; i < 24; i++) { const u = rr() * 2 - 1, a = rr() * Math.PI * 2, q = Math.sqrt(1 - u * u); bp.set([Math.cos(a) * q * r, u * r, Math.sin(a) * q * r], i * 3); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
    grp.add(new THREE.Points(bg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, color: 0xf4f7ff })));
    return grp;
  }

  // Kamerayı yerleştir. Yörünge kipi: merkez etrafında (yakınlaştırma + kaydırma). Serbest kip: kendi konumu ve bakışı.
  // dist sahnenin ölçeğidir (serbest hızı buna göre). Kamera hareket ediyorsa true döner.
  const MV = { f: [0, 0, -1], b: [0, 0, 1], l: [-1, 0, 0], r: [1, 0, 0], u: [0, 1, 0], d: [0, -1, 0] };
  function placeCamera(cam, c, nav, dist) {
    nav.cam = cam;
    if (!nav.free) {
      const d = dist / nav.zoom;
      cam.position.set(c.x + Math.sin(nav.yaw) * Math.cos(nav.pitch) * d, c.y + Math.sin(nav.pitch) * d, c.z + Math.cos(nav.yaw) * Math.cos(nav.pitch) * d);
      cam.lookAt(c);
      cam.translateX(nav.panX * dist * 0.5);
      cam.translateY(nav.panY * dist * 0.5);
      return false;
    }
    const now = performance.now(), dt = nav.last ? Math.min(0.05, (now - nav.last) / 1000) : 0;
    nav.last = now;
    cam.rotation.order = 'YXZ';
    cam.rotation.set(nav.lpitch, nav.lyaw, 0);
    // ileri-geri yönü bakışla, sola-sağa yataydan, yukarı-aşağı dünya ekseninden
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(cam.rotation);
    const right = new THREE.Vector3(Math.cos(nav.lyaw), 0, -Math.sin(nav.lyaw));
    const up = new THREE.Vector3(0, 1, 0);
    let mx = 0, my = 0, mz = 0;
    const act = new Set([...nav.keys, ...Object.keys(nav.hold).filter((k) => nav.hold[k])]);
    for (const k of act) { mx += MV[k][0]; my += MV[k][1]; mz += MV[k][2]; }
    const speed = dist * 0.55 * (nav.fast ? 3 : 1);
    const move = new THREE.Vector3()
      .addScaledVector(right, mx * speed * dt)
      .addScaledVector(up, my * speed * dt)
      .addScaledVector(fwd, -mz * speed * dt);
    if (nav.step) { const s = MV[nav.step]; move.addScaledVector(right, s[0] * dist * 0.05).addScaledVector(up, s[1] * dist * 0.05).addScaledVector(fwd, -s[2] * dist * 0.05); nav.step = null; }
    if (nav.wheel) { move.addScaledVector(fwd, nav.wheel * dist * 0.0012); nav.wheel = 0; }
    if (nav.pinch) move.addScaledVector(fwd, nav.pinch * speed * dt * 4);
    nav.pos.add(move);
    // çok uzağa kaçmasın
    const lim = dist * 12;
    if (nav.pos.distanceTo(c) > lim) nav.pos.sub(c).setLength(lim).add(c);
    // gezegenin içine girmesin (uçuş ekranı nav.minR verir)
    if (nav.minR && nav.pos.distanceTo(c) < nav.minR) nav.pos.sub(c).setLength(nav.minR).add(c);
    cam.position.copy(nav.pos);
    return act.size > 0 || !!nav.pinch;
  }

  /* ---------------- sahne ---------------- */
  let V = null; // { host, renderer, scene, camera, craft, ... }
  function createView(host) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const cv = renderer.domElement;
    cv.className = 'ws-3d'; cv.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    // güneş sol-üstten (gezegen resimleriyle aynı yönden)
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.6); sun.position.set(-4, 5, 4); scene.add(sun);
    // gerçek gölgeler: paneller ve anten gövdeye gölge düşürsün (derinlik hissi)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3;
    const fill = new THREE.DirectionalLight(0x9fb8d9, 0.55); fill.position.set(4, -2, -3); scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x1a1410, 0.5));
    const craft = new THREE.Group(); scene.add(craft);
    scene.environment = envFor(renderer); // metal ve folyo yüzeyler yansıtsın
    // arka plandaki gezegen ayrı katmanda, sabit kamerayla (araç dönerken yerinde durur)
    renderer.autoClear = false;
    // yıldızlar ayrı sahnede, en arkada (araçla birlikte döner)
    const sscene = new THREE.Scene(); sscene.add(makeStars(900, 60, 7));
    const nav = createNav(-0.55, 0.28);
    const v = { sun, planet: null, pBody: null, sscene, nav, host, renderer, cv, scene, camera, craft, parts: new Map(), dist: 0, distT: 6, pops: [], raf: 0, visible: true, hinted: false };
    nav.onInteract = () => { if (!v.hinted) { v.hinted = true; const h = v.host.querySelector('.ws-3d-hint'); if (h) h.classList.add('gone'); } };
    // sürükle = döndür, iki parmak / sağ tık = kaydır ve yakınlaştır (dikey tek parmak sayfayı kaydırır)
    bindGestures(cv, nav, () => v.host.parentElement, () => kick());
    if ('IntersectionObserver' in window) {
      v.io = new IntersectionObserver((es) => { v.visible = es[0].isIntersecting; if (v.visible) kick(); });
    }
    return v;
  }

  function attach(host) {
    if (V && V.host === host && host.contains(V.cv)) return;
    if (!V) V = createView(host);
    V.host = host;
    host.classList.add('is3d');
    host.setAttribute('role', 'img'); host.setAttribute('aria-label', TXT.label);
    host.innerHTML = '';
    host.appendChild(V.cv);
    const hint = document.createElement('span'); hint.className = 'ws-3d-hint' + (V.hinted ? ' gone' : ''); hint.textContent = TXT.hint; host.appendChild(hint);
    toolbar(host, () => V.host.parentElement, V.nav, () => kick(), 'ws-tools');
    if (host.parentElement) host.parentElement.classList.add('has3d');
    if (V.io) { V.io.disconnect(); V.io.observe(host); }
    V.parts.clear(); clearCraft();
    V.first = true;
    hideImg();
  }
  // NASA dokulu 3B gezegen hazırsa atölyedeki 2B gezegen resmini gizle
  function hideImg() {
    const img = V.host.parentElement && V.host.parentElement.querySelector('.ws-planet');
    if (img) img.style.visibility = 'hidden'; // 3B görünümde 2B gezegen resmi de gösterilmez
  }
  // Gezegen sahnenin içinde gerçek bir küre: ilk görünüşte (başlangıç kamerasından) aracın arkasında, sağ altta.
  // Kamera dönünce ve serbest kamerayla gezerken yeri değişir; yanına uçulabilir.
  function placePlanet() {
    if (!V.planet || !V.center || !V.radius) return;
    const c = V.center, n = V.nav.home, dist = V.distT || 6;
    const camPos = new THREE.Vector3(c.x + Math.sin(n.yaw) * Math.cos(n.pitch) * dist, c.y + Math.sin(n.pitch) * dist, c.z + Math.cos(n.yaw) * Math.cos(n.pitch) * dist);
    const f = c.clone().sub(camPos).normalize();
    const right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, f).normalize();
    const R = V.radius * 3.2;
    V.planet.scale.setScalar(R);
    V.planet.position.copy(c).addScaledVector(f, R * 1.6).addScaledVector(right, R * 0.9).addScaledVector(up, -R * 0.75);
    V.planetPlaced = true;
  }
  function setPlanet(body) {
    if (V.pBody === body) { if (V.planet && !V.planetPlaced) placePlanet(); return; }
    V.pBody = body; V.planetPlaced = false;
    if (V.planet) { V.scene.remove(V.planet); V.planet.geometry.dispose(); V.planet = null; }
    hideImg();
    const make = (tex) => {
      if (V.pBody !== body || V.planet) return;
      V.planet = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
      V.planet.rotation.set(0.25, -1.2, 0.1);
      V.scene.add(V.planet);
      placePlanet();
      hideImg(); kick();
    };
    const t = nasaTex(body, make);
    if (t) make(t);
  }
  function clearCraft() {
    while (V.craft.children.length) { const o = V.craft.children[0]; V.craft.remove(o); disposeObj(o); }
  }
  function disposeObj(o) { o.traverse((c) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); }); }

  /* ---------- gerçek NASA uzay aracı modelleri (2026-11-15 kullanıcı: "gövde kalas gibi, hazır NASA aracı varsa onu kullan") ----------
     Her görev için o işi gerçekten yapmış bir NASA aracı: Dünya → Landsat 8, Ay → Clementine (Ay kutuplarında buz izine ilk rastlayan),
     Mars → Mars Global Surveyor, Europa → Galileo (Europa okyanusunun ilk kanıtı). Model gelene kadar / gelmezse kodla çizilen araç. */
  // 2026-11-15: kullanıcı seçimlerin araçta görünmesini istedi → sabit NASA modelleri kapalı, parçalı araç NASA görünümünde yeniden yapıldı.
  const USE_NASA_CRAFT = false;
  const CRAFT_GLB = { earth: 'landsat8.glb', moon: 'clementine.glb', mars: 'mgs.glb', europa: 'galileo.glb' };
  const CRAFT_TPL = {};
  // modeli ortala ve en büyük yarıçapı ~1,3 olacak şekilde ölçekle; geometri kopyalarla ortak → silinmesin
  function normalizeCraft(m) {
    const g = new THREE.Group(); g.add(m);
    m.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(m).getBoundingSphere(new THREE.Sphere());
    const k = 1.3 / (sph.radius || 1);
    m.scale.multiplyScalar(k); m.updateMatrixWorld(true);
    // ölçekten sonra merkezi yeniden ölç ve tam ortaya al
    const c2 = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
    m.position.sub(c2);
    // dokusuz modellerde malzeme adına göre gerçekçi renk (Galileo'da "black" adlı gövde yanlışlıkla maviydi)
    const FIX = [[/black/i, 0x1d1f24, 0.3, 0.6], [/gold/i, 0xc8952e, 0.65, 0.35], [/silver|nozzle/i, 0xc9ced6, 0.8, 0.3], [/white/i, 0xeceef1, 0.1, 0.6]];
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.shared = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mt of mats) {
        if (!mt) continue;
        mt.side = THREE.DoubleSide;
        if (!mt.map) { const f = FIX.find(([re]) => re.test(mt.name || '')); if (f) { mt.color.setHex(f[1]); mt.metalness = f[2]; mt.roughness = f[3]; } }
      }
    });
    return g;
  }
  // hazırsa NASA aracının bir kopyasını verir; değilse yüklemeyi başlatır (onReady) ve null döner
  function nasaCraft(scId, onReady) {
    const f = USE_NASA_CRAFT && CRAFT_GLB[scId]; if (!f) return null;
    if (CRAFT_TPL[scId]) return CRAFT_TPL[scId].clone(true);
    if (CRAFT_TPL[scId] === false) return null;
    if (!CRAFT_TPL['_l_' + scId]) {
      CRAFT_TPL['_l_' + scId] = true;
      loadModel(f, (m) => { CRAFT_TPL[scId] = normalizeCraft(m); if (onReady) onReady(); }, () => { CRAFT_TPL[scId] = false; });
    }
    return null;
  }

  function setParts(R) {
    V.lastR = R;
    const nasa = nasaCraft(R.sc.id, () => { if (V && V.lastR && V.host && V.host.isConnected) { setParts(V.lastR); kick(); } });
    const list = nasa ? [{ key: 'nasa-' + R.sc.id, obj: nasa }] : buildParts(R);
    V.nasaFit = !!nasa;
    // NASA aracında parçalar değişmez; tasarım değişince araç kısa bir "nabız" atar (geri bildirim)
    const sig = JSON.stringify(R.d);
    if (nasa && V.lastSig && V.lastSig !== sig && V.parts.has('nasa-' + R.sc.id)) V.pulseAt = performance.now();
    V.lastSig = sig;
    const prev = V.parts;
    clearCraft();
    V.parts = new Map();
    const now = performance.now();
    V.pops = [];
    list.forEach((p) => { V.craft.add(p.obj); V.parts.set(p.key, p.obj); });
    // tüm araç kadraja sığsın (parçalar tam boyuttayken ölç)
    V.craft.position.set(0, 0, 0);
    const sph = new THREE.Box3().setFromObject(V.craft).getBoundingSphere(new THREE.Sphere());
    // yeni parçalar küçükten büyüyerek belirir
    list.forEach((p, i) => {
      if (prev.has(p.key) || REDUCED_MOTION) return;
      p.obj.scale.setScalar(0.001);
      V.pops.push({ obj: p.obj, t0: now + (V.first ? i * 90 : 0) });
    });
    V.first = false;
    V.center = sph.center.clone();
    const fov = (V.camera.fov * Math.PI) / 180, aspect = V.camera.aspect || 1.6;
    const fitV = sph.radius / Math.sin(fov / 2), fitH = sph.radius / Math.sin(Math.atan(Math.tan(fov / 2) * aspect));
    V.distT = Math.max(fitV, fitH) * (V.nasaFit ? 0.95 : 0.78); // NASA araçlarının uzun kolları kesilmesin
    V.radius = sph.radius;
    // gölge kamerası aracı tam kaplasın; tüm parçalar gölge düşürsün ve alsın
    if (V.sun) {
      const sc = V.sun.shadow.camera, r = sph.radius * 1.15;
      sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 0.1; sc.far = r * 6; sc.updateProjectionMatrix();
      V.sun.position.copy(sph.center).add(new THREE.Vector3(-4, 5, 4).normalize().multiplyScalar(r * 3)); V.sun.target.position.copy(sph.center); V.sun.target.updateMatrixWorld();
      V.craft.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    }

    if (!V.dist) V.dist = V.distT;
  }

  function resize() {
    const w = V.host.clientWidth, h = V.host.clientHeight;
    if (!w || !h) return false;
    if (V.w !== w || V.h !== h) {
      V.w = w; V.h = h; V.renderer.setSize(w, h, false); V.camera.aspect = w / h; V.camera.updateProjectionMatrix();
      if (V.radius) { const fov = (V.camera.fov * Math.PI) / 180; V.distT = Math.max(V.radius / Math.sin(fov / 2), V.radius / Math.sin(Math.atan(Math.tan(fov / 2) * V.camera.aspect))) * (V.nasaFit ? 0.95 : 0.78); }
    }
    return true;
  }

  const ease = (t) => { const c = 1.7; t -= 1; return 1 + t * t * ((c + 1) * t + c); }; // hafif taşmalı
  function frame() {
    V.raf = 0;
    if (!V.host.isConnected) return;
    if (!resize()) return;
    const now = performance.now();
    let busy = false;
    // parça belirme
    V.pops = V.pops.filter((p) => {
      const t = Math.min(1, Math.max(0, (now - p.t0) / 550));
      p.obj.scale.setScalar(t <= 0 ? 0.001 : Math.max(0.001, ease(t)));
      if (t < 1) { busy = true; return true; }
      p.obj.scale.setScalar(1); return false;
    });
    // kendiliğinden yavaş dönüş (kullanıcı bıraktıktan 2,5 sn sonra)
    if (!REDUCED_MOTION && !V.nav.active && !V.nav.free && now - V.nav.idleAt > 2500) { V.nav.yaw += 0.0035; busy = true; }
    if (Math.abs(V.dist - V.distT) > 0.01) { V.dist += (V.distT - V.dist) * 0.12; busy = true; } else V.dist = V.distT;
    const c = V.center || new THREE.Vector3();
    if (placeCamera(V.camera, c, V.nav, V.dist)) busy = true;
    V.craft.position.y = REDUCED_MOTION ? 0 : Math.sin(now / 900) * 0.04;
    // tasarım değişince kısa nabız
    const pk = V.pulseAt ? (now - V.pulseAt) / 420 : 1;
    V.craft.scale.setScalar(pk < 1 && !REDUCED_MOTION ? 1 + 0.07 * Math.sin(pk * Math.PI) : 1);
    if (pk < 1) busy = true;
    V.renderer.clear();
    V.sscene.position.copy(V.camera.position); // yıldızlar sonsuz uzakta gibi
    V.renderer.render(V.sscene, V.camera);
    V.renderer.clearDepth();
    if (V.planet && !REDUCED_MOTION) V.planet.rotation.y += 0.0008;
    V.renderer.render(V.scene, V.camera);
    if ((busy || !REDUCED_MOTION) && V.visible && !document.hidden) kick();
  }
  function kick() { if (V && !V.raf) V.raf = requestAnimationFrame(frame); }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  window.addEventListener('resize', () => kick());

  window.Craft3D = {
    // true: Three.js hazır, 3B çizilebilir. false: henüz değil (yüklemeyi başlatır) ya da hiç olmayacak.
    ready(onReady) { if (state === 'ok') return true; if (state !== 'fail') load((ok) => { if (ok && onReady) onReady(); }); return false; },
    failed() { return state === 'fail'; },
    nasaTex,
    envFor,
    loadModel,
    // atmosfer gökyüzü (Preetham, THREE.Sky)
    loadSky: (cb) => withScript('Sky.js', 'Sky', cb),
    // uçuş ekranı da aynı gezinme araçlarını kullanır
    nav: { createNav, bindGestures, toolbar, makeStars, placeCamera, isFull, exitFull },
    // uçuş ekranı (flight3d.js) için: aracın tüm parçaları tek grup halinde
    build(R) { const n = nasaCraft(R.sc.id); if (n) return n; const g = new THREE.Group(); buildParts(R).forEach((p) => g.add(p.obj)); return g; },
    show(host, R) {
      // atölyede arka planda gezegen yok (kullanıcı isteği); sadece araç ve yıldızlar
      try { attach(host); setParts(R); kick(); return true; } catch (e) { console.error(e); state = 'fail'; return false; }
    },
  };
})();
