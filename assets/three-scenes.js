/* =====================================================================
   MODULAR ROOFING & PÉRGOLAS — Modelado 3D en tiempo real
   Todo se genera por código (sin archivos .glb): pérgolas paramétricas
   con acotaciones tipo plano arquitectónico.
   ===================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ---------- Paleta compartida con el CSS ---------- */
const COPPER = 0xC9682F;
const DRAFT  = 0x4F94C4;

const FINISHES = {
  blanco: { color: 0xE6E7E3, rough: 0.55, metal: 0.12 },
  negro:  { color: 0x1B1E22, rough: 0.42, metal: 0.30 },
  bronce: { color: 0x53412F, rough: 0.38, metal: 0.55 },
  madera: { color: 0x8A5A31, rough: 0.78, metal: 0.02 }
};

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const scenes = new Set();

/* =====================================================================
   Construcción paramétrica de la pérgola
   ===================================================================== */
function makeMaterial(finish) {
  const f = FINISHES[finish] || FINISHES.blanco;
  return new THREE.MeshStandardMaterial({
    color: f.color, roughness: f.rough, metalness: f.metal
  });
}

/**
 * @param {object} o
 * @param {number} o.width  ancho en pies
 * @param {number} o.depth  profundidad en pies
 * @param {string} o.type   'louver' | 'panel' | 'decorativa'
 * @param {string} o.finish clave de FINISHES
 */
function buildPergola(o) {
  const g = new THREE.Group();
  const mat = makeMaterial(o.finish);
  const W = o.width / 3.6;        // pies -> unidades de escena
  const D = o.depth / 3.6;
  const H = 2.55;                 // altura libre
  const post = 0.17;              // sección del poste
  const beam = 0.13;

  const add = (geo, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* --- Postes --- */
  const postGeo = new THREE.BoxGeometry(post, H, post);
  const hx = W / 2 - post / 2, hz = D / 2 - post / 2;
  [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]].forEach(([x, z]) => {
    add(postGeo, x, H / 2, z);
    // zapata de anclaje
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(post * 1.9, 0.055, post * 1.9), mat
    );
    base.position.set(x, 0.028, z);
    base.receiveShadow = true;
    g.add(base);
  });

  /* --- Vigas perimetrales --- */
  const beamTop = H + beam / 2;
  add(new THREE.BoxGeometry(W, beam, beam * 1.15), 0, beamTop, -hz);
  add(new THREE.BoxGeometry(W, beam, beam * 1.15), 0, beamTop,  hz);
  add(new THREE.BoxGeometry(beam * 1.15, beam, D), -hx, beamTop, 0);
  add(new THREE.BoxGeometry(beam * 1.15, beam, D),  hx, beamTop, 0);

  /* --- Cubierta según tipo --- */
  const roof = new THREE.Group();
  roof.position.y = beamTop + beam / 2;
  g.add(roof);

  if (o.type === "panel") {
    // Panel insulado: losa con juntas marcadas
    const slabH = 0.11;
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W * 1.03, slabH, D * 1.03), mat);
    slab.position.y = slabH / 2;
    slab.castShadow = true; slab.receiveShadow = true;
    roof.add(slab);

    const seams = Math.max(3, Math.round(W / 0.62));
    const seamMat = new THREE.MeshStandardMaterial({
      color: 0x000000, roughness: 1, metalness: 0, transparent: true, opacity: 0.24
    });
    for (let i = 1; i < seams; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, slabH * 1.04, D * 1.03), seamMat);
      s.position.set(-W * 0.515 + (W * 1.03 / seams) * i, slabH / 2, 0);
      roof.add(s);
    }
    roof.userData.blades = [];

  } else if (o.type === "decorativa") {
    // Rafters cruzados, sección esbelta
    const blades = [];
    const nA = Math.max(5, Math.round(W / 0.42));
    for (let i = 0; i < nA; i++) {
      const x = -W / 2 + (W / (nA - 1)) * i;
      const m = add(new THREE.BoxGeometry(0.055, 0.16, D * 1.02), x, 0.08, 0, roof);
      blades.push(m);
    }
    const nB = Math.max(4, Math.round(D / 0.55));
    for (let i = 0; i < nB; i++) {
      const z = -D / 2 + (D / (nB - 1)) * i;
      add(new THREE.BoxGeometry(W * 1.02, 0.075, 0.045), 0, 0.2, z, roof);
    }
    roof.userData.blades = blades;

  } else {
    // Bioclimática: lamas orientables
    const blades = [];
    const n = Math.max(6, Math.round(D / 0.34));
    const bw = (D / n) * 0.92;
    const geo = new THREE.BoxGeometry(W * 0.985, 0.035, bw);
    for (let i = 0; i < n; i++) {
      const z = -D / 2 + (D / n) * (i + 0.5);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 0.075, z);
      m.castShadow = true; m.receiveShadow = true;
      roof.add(m);
      blades.push(m);
    }
    roof.userData.blades = blades;
  }

  g.userData.roof = roof;
  g.userData.opts = o;
  return g;
}

/* =====================================================================
   Acotaciones tipo plano (líneas + flechas en cobre)
   ===================================================================== */
function buildDimensions(width, depth) {
  const grp = new THREE.Group();
  const W = width / 3.6, D = depth / 3.6;
  const mat = new THREE.LineBasicMaterial({ color: COPPER, transparent: true, opacity: 0.75 });
  const y = 0.012, off = 0.42;

  const line = pts => new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p))), mat
  );

  // cota de ancho (frente)
  const zf = D / 2 + off;
  grp.add(line([[-W / 2, y, zf], [W / 2, y, zf]]));
  grp.add(line([[-W / 2, y, zf - 0.1], [-W / 2, y, zf + 0.1]]));
  grp.add(line([[W / 2, y, zf - 0.1], [W / 2, y, zf + 0.1]]));
  // líneas de referencia
  grp.add(line([[-W / 2, y, D / 2], [-W / 2, y, zf]]));
  grp.add(line([[W / 2, y, D / 2], [W / 2, y, zf]]));

  // cota de profundidad (lateral)
  const xf = W / 2 + off;
  grp.add(line([[xf, y, -D / 2], [xf, y, D / 2]]));
  grp.add(line([[xf - 0.1, y, -D / 2], [xf + 0.1, y, -D / 2]]));
  grp.add(line([[xf - 0.1, y, D / 2], [xf + 0.1, y, D / 2]]));
  grp.add(line([[W / 2, y, -D / 2], [xf, y, -D / 2]]));
  grp.add(line([[W / 2, y, D / 2], [xf, y, D / 2]]));

  return grp;
}

/* =====================================================================
   Texturas procedurales (dibujadas en canvas, sin archivos)
   ===================================================================== */
function canvasTexture(size, draw, repeat = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d"), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  return t;
}

/** Piso de losas tipo travertino, con junta y veteado irregular. */
const paverTexture = () => canvasTexture(512, (x, s) => {
  const tile = s / 4;
  x.fillStyle = "#4A443D"; x.fillRect(0, 0, s, s);          // junta
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 132 + Math.random() * 24;
    x.fillStyle = `rgb(${v},${v - 11},${v - 26})`;
    x.fillRect(i * tile + 2, j * tile + 2, tile - 4, tile - 4);
    // veteado
    x.strokeStyle = `rgba(120,108,94,${0.05 + Math.random() * 0.09})`;
    x.lineWidth = 1 + Math.random() * 2;
    for (let k = 0; k < 4; k++) {
      x.beginPath();
      x.moveTo(i * tile + Math.random() * tile, j * tile);
      x.lineTo(i * tile + Math.random() * tile, j * tile + tile);
      x.stroke();
    }
  }
}, 7);

/** Estuco de pared, grano fino. */
const stuccoTexture = () => canvasTexture(256, (x, s) => {
  x.fillStyle = "#9C9184"; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 14000; i++) {
    const a = Math.random() * 0.09;
    x.fillStyle = Math.random() > .5 ? `rgba(255,255,255,${a})` : `rgba(90,84,76,${a})`;
    x.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
}, 3);

/** Cáusticas de agua: manchas claras que se desplazan lentamente. */
const waterTexture = () => canvasTexture(256, (x, s) => {
  x.fillStyle = "#0E4C57"; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    const g = x.createRadialGradient(
      Math.random() * s, Math.random() * s, 0,
      Math.random() * s, Math.random() * s, 14 + Math.random() * 34
    );
    g.addColorStop(0, "rgba(150,235,240,.36)");
    g.addColorStop(1, "rgba(150,235,240,0)");
    x.fillStyle = g; x.fillRect(0, 0, s, s);
  }
}, 3);

/** Cielo de atardecer, de naranja bajo a azul profundo arriba. */
const skyTexture = () => canvasTexture(256, (x, s) => {
  const g = x.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0.00, "#0A1626");
  g.addColorStop(0.38, "#1D3550");
  g.addColorStop(0.60, "#4E5F72");
  g.addColorStop(0.78, "#B08059");
  g.addColorStop(0.90, "#E0A06A");
  g.addColorStop(1.00, "#6E4E3C");
  x.fillStyle = g; x.fillRect(0, 0, s, s);
});

/* =====================================================================
   El patio: piso, piscina, casa, vegetación y mobiliario
   ===================================================================== */
function buildPatio() {
  const g = new THREE.Group();
  const mesh = (geo, mat, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /* --- Piscina: definimos el hueco primero --- */
  const px = -8.4, pz = 1.2, pw = 6.2, pd = 9;
  const x0 = px - pw / 2, x1 = px + pw / 2;   // -11.5 .. -5.3
  const z0 = pz - pd / 2, z1 = pz + pd / 2;   //  -3.3 ..  5.7
  const DX0 = -15, DX1 = 15, DZ0 = -13, DZ1 = 13;

  /* --- Piso de losas, recortado alrededor del vaso --- */
  const paverMat = new THREE.MeshStandardMaterial({
    map: paverTexture(), roughness: 0.88, metalness: 0.02
  });
  const slab = (ax, bx, az, bz) => {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(bx - ax, 0.22, bz - az), paverMat
    );
    s.position.set((ax + bx) / 2, -0.11, (az + bz) / 2);
    s.receiveShadow = true; s.castShadow = true;
    g.add(s);
  };
  slab(DX0, x0, DZ0, DZ1);   // franja izquierda
  slab(x1, DX1, DZ0, DZ1);   // franja derecha (donde va la pérgola)
  slab(x0, x1, DZ0, z0);     // fondo del hueco
  slab(x0, x1, z1, DZ1);     // frente del hueco

  /* --- Césped alrededor --- */
  const lawn = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshStandardMaterial({ color: 0x1E3320, roughness: 1 })
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = -0.26;
  lawn.receiveShadow = true;
  g.add(lawn);

  /* --- Vaso de la piscina --- */
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x1B5566, roughness: 0.28, metalness: 0.1 });
  mesh(new THREE.BoxGeometry(pw, 0.05, pd), tileMat, px, -1.35, pz);          // fondo
  for (const [w, d, cx, cz] of [
    [pw, 0.06, px, z0], [pw, 0.06, px, z1],
  ]) { const m = mesh(new THREE.BoxGeometry(w, 1.4, d), tileMat, cx, -0.65, cz); m.receiveShadow = true; }
  for (const cx of [x0, x1]) mesh(new THREE.BoxGeometry(0.06, 1.4, pd), tileMat, cx, -0.65, pz);

  // agua
  const wTex = waterTexture();
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(pw - 0.12, pd - 0.12),
    new THREE.MeshStandardMaterial({
      map: wTex, color: 0x2E8C9E, roughness: 0.05, metalness: 0.72,
      transparent: true, opacity: 0.9,
      emissive: 0x0A3F4A, emissiveIntensity: 0.4
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(px, -0.16, pz);
  g.add(water);
  g.userData.water = wTex;

  /* --- Casa al fondo, con puerta corrediza iluminada --- */
  const wall = new THREE.MeshStandardMaterial({ map: stuccoTexture(), roughness: 0.95 });
  mesh(new THREE.BoxGeometry(22, 6.4, 0.5), wall, 1, 3.2, -9.6);
  mesh(new THREE.BoxGeometry(0.5, 6.4, 9), wall, 12, 3.2, -5.2);
  // alero
  mesh(new THREE.BoxGeometry(23, 0.36, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xE8E6E0, roughness: 0.7 }), 1, 6.5, -9.1);

  const frame = new THREE.MeshStandardMaterial({ color: 0x22252A, roughness: 0.45, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1A2B33, roughness: 0.09, metalness: 0.25,
    emissive: 0xFFB870, emissiveIntensity: 0.42,
    transparent: true, opacity: 0.86
  });
  for (let i = 0; i < 4; i++) {
    const x = -1.4 + i * 1.85;
    mesh(new THREE.BoxGeometry(1.72, 4.3, 0.06), glass, x, 2.2, -9.3);
    mesh(new THREE.BoxGeometry(0.1, 4.4, 0.12), frame, x - 0.9, 2.2, -9.28);
  }
  mesh(new THREE.BoxGeometry(7.6, 0.12, 0.14), frame, 1.3, 4.4, -9.28);

  // ventana lateral
  mesh(new THREE.BoxGeometry(2.6, 1.9, 0.06), glass, -7.6, 3.1, -9.3);

  /* --- Jardineras y vegetación --- */
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x2B2E31, roughness: 0.8 });
  const leafA = new THREE.MeshStandardMaterial({ color: 0x2F6B39, roughness: 0.9, flatShading: true });
  const leafB = new THREE.MeshStandardMaterial({ color: 0x25532F, roughness: 0.9, flatShading: true });
  const bushGeo = new THREE.IcosahedronGeometry(0.5, 0);

  const planter = (x, z, w = 1.5) => {
    mesh(new THREE.BoxGeometry(w, 0.66, 1.1), planterMat, x, 0.33, z);
    for (let i = 0; i < 4; i++) {
      const b = mesh(bushGeo, i % 2 ? leafA : leafB,
        x + (Math.random() - .5) * (w - .5), 0.82 + Math.random() * 0.24, z + (Math.random() - .5) * .7);
      b.scale.setScalar(0.7 + Math.random() * 0.6);
      b.rotation.set(Math.random(), Math.random(), Math.random());
    }
  };
  planter(6.6, -7.4); planter(9.4, -7.4, 1.2); planter(-2.2, -8.2, 1.8);

  /* --- Palmeras --- */
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6A5744, roughness: 0.95 });
  const frondGeo = new THREE.ConeGeometry(0.34, 2.5, 4, 1, true);
  const palm = (x, z, h) => {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    for (let i = 0; i < 7; i++) {
      const seg = mesh(new THREE.CylinderGeometry(0.19 - i * 0.012, 0.22 - i * 0.012, h / 7, 7),
        trunkMat, Math.sin(i * .5) * .1, (i + .5) * (h / 7), 0, p);
      seg.rotation.z = Math.sin(i * .5) * 0.05;
    }
    for (let i = 0; i < 9; i++) {
      const f = mesh(frondGeo, i % 2 ? leafA : leafB, 0, h + 0.2, 0, p);
      f.rotation.set(Math.PI / 2.4, 0, (i / 9) * Math.PI * 2);
      f.rotation.x += (Math.random() - .5) * .35;
      f.scale.set(1, 1.1 + Math.random() * .5, 1);
    }
    g.add(p);
    return p;
  };
  palm(-13, -5.5, 5.4); palm(-11.2, -7.8, 4.2); palm(13.5, -1.5, 4.8);

  /* --- Mobiliario bajo la pérgola --- */
  const cushion = new THREE.MeshStandardMaterial({ color: 0x9A9184, roughness: 0.96 });
  const teak = new THREE.MeshStandardMaterial({ color: 0x4A3527, roughness: 0.82 });

  const sofa = (x, z, rot, w = 3.1) => {
    const s = new THREE.Group();
    s.position.set(x, 0, z); s.rotation.y = rot;
    mesh(new THREE.BoxGeometry(w, 0.26, 1.15), teak, 0, 0.3, 0, s);
    mesh(new THREE.BoxGeometry(w - 0.14, 0.24, 1.02), cushion, 0, 0.55, 0, s);
    mesh(new THREE.BoxGeometry(w - 0.14, 0.56, 0.22), cushion, 0, 0.9, -0.42, s);
    for (const dx of [-w / 2 + 0.16, w / 2 - 0.16])
      mesh(new THREE.BoxGeometry(0.12, 0.3, 1.1), teak, dx, 0.15, 0, s);
    g.add(s);
  };
  sofa(0.4, 2.2, 0);
  sofa(-2.4, 0.3, Math.PI / 2, 2.1);

  // mesa de centro
  mesh(new THREE.BoxGeometry(1.5, 0.09, 0.86), teak, 0.6, 0.42, 0.35);
  for (const [dx, dz] of [[-.62, -.34], [.62, -.34], [-.62, .34], [.62, .34]])
    mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), teak, 0.6 + dx, 0.2, 0.35 + dz);

  // tumbonas junto a la piscina
  const lounger = (x, z) => {
    const l = new THREE.Group();
    l.position.set(x, 0, z); l.rotation.y = Math.PI / 2;
    mesh(new THREE.BoxGeometry(1.9, 0.13, 0.68), cushion, 0, 0.42, 0, l);
    const back = mesh(new THREE.BoxGeometry(0.78, 0.12, 0.66), cushion, -0.72, 0.63, 0, l);
    back.rotation.z = -0.62;
    for (const dx of [-.8, .8]) mesh(new THREE.BoxGeometry(0.07, 0.36, 0.6), teak, dx, 0.18, 0, l);
    g.add(l);
  };
  lounger(-4.3, -1.4); lounger(-4.3, 1.4);

  /* --- Maceta grande de acento --- */
  const pot = mesh(new THREE.CylinderGeometry(0.44, 0.32, 0.9, 12),
    new THREE.MeshStandardMaterial({ color: 0x3A3D40, roughness: 0.7 }), 4.2, 0.45, 1.8);
  for (let i = 0; i < 5; i++) {
    const b = mesh(bushGeo, leafA, 4.2 + (Math.random() - .5) * .6, 1.15 + Math.random() * .45, 1.8 + (Math.random() - .5) * .6);
    b.scale.setScalar(0.55 + Math.random() * .5);
  }

  return g;
}

/* =====================================================================
   Escena base
   ===================================================================== */
function createScene(wrap, config) {
  const canvas = wrap.querySelector("canvas");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    wrap.dataset.fallback = "true";
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // el patio se expone más bajo: buscamos atardecer, no mediodía
  renderer.toneMappingExposure = config.env === "patio" ? 0.82 : 1.05;

  const patio = config.env === "patio";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(patio ? 0x2A3140 : 0x0D1116, patio ? 22 : 11, patio ? 52 : 26);

  const camera = new THREE.PerspectiveCamera(patio ? 42 : 36, 1, 0.1, 200);
  camera.position.set(...config.camera);

  let glow;

  if (patio) {
    /* ---------- Atardecer en un patio de Miami ---------- */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(80, 32, 20),
      new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })
    );
    scene.add(sky);

    scene.add(new THREE.HemisphereLight(0x8FAAC6, 0x3A2E22, 0.62));

    // sol bajo, cálido, entrando por la izquierda
    const sun = new THREE.DirectionalLight(0xFFBE79, 2.9);
    sun.position.set(-15, 7.5, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 48;
    sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 16;  sun.shadow.camera.bottom = -14;
    sun.shadow.bias = -0.0009;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    // rebote frío del cielo por detrás: separa la pérgola de la pared
    const bounce = new THREE.DirectionalLight(0x8FB6DC, 1.35);
    bounce.position.set(9, 6, -10);
    scene.add(bounce);

    // luz cálida saliendo de la casa
    const indoor = new THREE.PointLight(0xFFB870, 26, 20, 2);
    indoor.position.set(1, 2.6, -8.4);
    scene.add(indoor);

    // tira LED bajo la pérgola
    glow = new THREE.PointLight(0xFFD9A8, 22, 11, 2);
    glow.position.set(0, 2.35, 0);
    scene.add(glow);

    // luz sumergida: tiñe el vaso de turquesa sin quemar el deck
    const poolLight = new THREE.PointLight(0x5FD0E0, 7, 9, 2);
    poolLight.position.set(-8.4, -0.75, 1.2);
    scene.add(poolLight);

  } else {
    /* ---------- Estudio neutro: para evaluar el producto ---------- */
    scene.add(new THREE.HemisphereLight(0xB9CEDF, 0x1A2027, 1.45));

    const key = new THREE.DirectionalLight(0xFFE6CC, 3.4);
    key.position.set(5.5, 8, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1; key.shadow.camera.far = 26;
    key.shadow.camera.left = -8; key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;  key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0012;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x8FC0E4, 2.2);
    rim.position.set(-6.5, 3.5, -6.5);
    scene.add(rim);

    glow = new THREE.PointLight(COPPER, 18, 13, 2);
    glow.position.set(0, 1.0, 0);
    scene.add(glow);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.ShadowMaterial({ opacity: 0.42 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.15, 4.17, 96),
      new THREE.MeshBasicMaterial({ color: DRAFT, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.004;
    scene.add(ring);
  }

  /* --- Controles --- */
  let controls = null;
  if (config.orbit) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = patio ? 9 : 4.5;
    controls.maxDistance = patio ? 20 : 13;
    // en el patio la cámara no baja del nivel del suelo ni sube a vista cenital
    controls.minPolarAngle = patio ? 0.95 : 0.35;
    controls.maxPolarAngle = patio ? Math.PI / 2 - 0.045 : Math.PI / 2 - 0.06;
    controls.target.set(...(config.target || [0, patio ? 1.5 : 1.15, 0]));
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.55;
    // al interactuar, se detiene el giro automático
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      wrap.querySelector(".canvas-wrap__hint")?.style.setProperty("opacity", "0");
    });
  }

  /* --- Ajuste de tamaño --- */
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(wrap);
  resize();

  /* --- Pausa cuando no está a la vista --- */
  let visible = true;
  const vo = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 });
  vo.observe(wrap);

  /* --- Bucle --- */
  const clock = new THREE.Clock();
  let raf = 0, dead = false;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!visible || dead) return;
    const t = clock.getElapsedTime();
    controls?.update();
    config.tick?.(t, { scene, camera, glow });
    renderer.render(scene, camera);
  };
  loop();

  wrap.dataset.ready = "true";

  const api = {
    scene, camera, renderer, controls,
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); vo.disconnect();
      controls?.dispose();
      scene.traverse(obj => {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material?.dispose?.();
      });
      renderer.dispose();
      scenes.delete(api);
    }
  };
  scenes.add(api);
  return api;
}

/* =====================================================================
   ESCENA A — Héroe: la pérgola instalada en un patio real, al atardecer
   ===================================================================== */
function heroScene(wrap) {
  let model = null, water = null;

  const api = createScene(wrap, {
    env: "patio",
    // 3/4 elevado desde la derecha: entra la piscina a la izquierda,
    // la casa al fondo y queda cielo por encima del alero
    camera: [9.2, 5.6, 10.6],
    target: [-1.8, 1.9, 0.4],
    orbit: true,
    tick: (t) => {
      if (model) {
        // las lamas se abren y cierran en onda, con desfase por lama
        const blades = model.userData.roof.userData.blades;
        blades.forEach((b, i) => {
          // desfase amplio: la onda recorre el techo y se ve lama por lama
          const phase = t * 0.5 - i * 0.34;
          // nunca cierran del todo: así se lee que son lamas, no una losa
          const k = 0.34 + (Math.sin(phase) * 0.5 + 0.5) * 0.66;
          b.rotation.x = k * (Math.PI / 2.35);
        });
      }
      // el agua se mueve: dos capas de cáusticas a distinta velocidad
      if (water) {
        water.offset.x = (t * 0.014) % 1;
        water.offset.y = (t * 0.021) % 1;
      }
    }
  });
  if (!api) return null;

  const patio = buildPatio();
  water = patio.userData.water;

  // pérgola de aluminio blanco, anclada sobre el deck
  model = buildPergola({ width: 16, depth: 12, type: "louver", finish: "blanco" });
  model.position.set(0.4, 0, 1.2);

  api.scene.add(patio, model);
  api.model = model;
  return api;
}

/* =====================================================================
   ESCENA B — Configurador interactivo
   ===================================================================== */
function configScene(wrap) {
  const state = {
    width: Number(wrap.dataset.width) || 16,
    depth: Number(wrap.dataset.depth) || 12,
    type:  wrap.dataset.type || "louver",
    finish: wrap.dataset.finish || "blanco",
    open: 0.55
  };

  let model = null, dims = null;
  const api = createScene(wrap, {
    camera: [8.2, 5.3, 9.1],
    orbit: true,
    tick: () => {
      if (!model) return;
      const blades = model.userData.roof.userData.blades;
      if (state.type === "louver") {
        blades.forEach(b => {
          b.rotation.x += ((state.open * (Math.PI / 2.35)) - b.rotation.x) * 0.12;
        });
      }
    }
  });
  if (!api) return null;

  /* Reencuadra la cámara según el tamaño del modelo, conservando el ángulo
     que el usuario haya elegido con el orbit. */
  const frame = () => {
    const span = Math.max(state.width, state.depth) / 3.6;   // pies -> escena
    const dist = span * 1.42 + 3.1;
    const dir = api.camera.position.clone().sub(api.controls.target).normalize();
    api.camera.position.copy(api.controls.target).addScaledVector(dir, dist);
    api.controls.minDistance = dist * 0.62;
    api.controls.maxDistance = dist * 1.75;
    api.controls.update();
  };

  const rebuild = () => {
    if (model) {
      api.scene.remove(model, dims);
      [model, dims].forEach(root => root.traverse(o => {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material?.dispose?.();
      }));
    }
    model = buildPergola(state);
    dims  = buildDimensions(state.width, state.depth);
    api.scene.add(model, dims);
    frame();
  };
  rebuild();

  /* --- Enlazar los controles del DOM --- */
  const panel = document.querySelector(`[data-config-for="${wrap.id}"]`);
  if (panel) {
    panel.querySelectorAll("[data-cfg]").forEach(input => {
      const key = input.dataset.cfg;
      const handler = () => {
        const v = input.type === "range" ? Number(input.value) : input.value;
        if (key === "open") { state.open = v / 100; return; }
        state[key] = key === "width" || key === "depth" ? Number(v) : v;
        rebuild();
        // reflejar el valor en pantalla
        const out = panel.querySelector(`[data-cfg-out="${key}"]`);
        if (out) out.textContent = key === "width" || key === "depth" ? `${v} ft` : out.textContent;
      };
      input.addEventListener(input.type === "range" ? "input" : "change", handler);
      if (input.type === "radio" && input.checked) state[key] = input.value;
    });

    // el control de lamas sólo aplica al tipo bioclimático
    const syncOpen = () => {
      const row = panel.querySelector("[data-open-row]");
      if (row) row.hidden = state.type !== "louver";
    };
    syncOpen();
    panel.addEventListener("change", syncOpen);

    // botón de reinicio de cámara
    panel.querySelector("[data-cfg-reset]")?.addEventListener("click", () => {
      api.controls.autoRotate = true;
      api.camera.position.set(8.2, 5.3, 9.1);
      api.controls.target.set(0, 1.15, 0);
      frame();
    });
  }

  api.state = state;
  return api;
}

/* =====================================================================
   Montaje / desmontaje según la página activa
   ===================================================================== */
const BUILDERS = { hero: heroScene, config: configScene };

function mount(root = document) {
  root.querySelectorAll("[data-scene]").forEach(wrap => {
    if (wrap.dataset.mounted === "true") return;
    const build = BUILDERS[wrap.dataset.scene];
    if (!build) return;
    wrap.dataset.mounted = "true";
    try {
      build(wrap);
    } catch (err) {
      console.warn("[3D]", err);
      wrap.dataset.fallback = "true";
    }
  });
}

function unmountAll() {
  Array.from(scenes).forEach(s => s.dispose());
  document.querySelectorAll("[data-scene]").forEach(w => {
    w.dataset.mounted = "false";
    w.dataset.ready = "false";
  });
}

// El router reemplaza <main>: liberar antes del swap, montar después
document.addEventListener("mrp:unmount", unmountAll);
document.addEventListener("mrp:page", e => mount(e.detail?.root || document));

mount(document);
