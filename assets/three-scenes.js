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
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0D1116, 11, 26);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(...config.camera);

  /* --- Luces: clave cálida + relleno frío (coherente con la paleta) --- */
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

  // contraluz frío: dibuja el borde de los perfiles contra el fondo
  const rim = new THREE.DirectionalLight(0x8FC0E4, 2.2);
  rim.position.set(-6.5, 3.5, -6.5);
  scene.add(rim);

  // rebote cálido desde el suelo, como la luz de un patio al atardecer
  const glow = new THREE.PointLight(COPPER, 18, 13, 2);
  glow.position.set(0, 1.0, 0);
  scene.add(glow);

  /* --- Suelo receptor de sombra --- */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.ShadowMaterial({ opacity: 0.42 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // círculo guía, lenguaje de plano
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.15, 4.17, 96),
    new THREE.MeshBasicMaterial({ color: DRAFT, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  scene.add(ring);

  /* --- Controles --- */
  let controls = null;
  if (config.orbit) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 13;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.target.set(0, 1.15, 0);
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
   ESCENA A — Héroe: pérgola bioclimática con lamas que respiran
   ===================================================================== */
function heroScene(wrap) {
  let model = null, dims = null;
  const api = createScene(wrap, {
    camera: [7.9, 5.1, 8.8],
    orbit: true,
    tick: (t) => {
      if (!model) return;
      // apertura de lamas: onda lenta, cada lama con desfase
      const blades = model.userData.roof.userData.blades;
      blades.forEach((b, i) => {
        const phase = t * 0.42 - i * 0.075;
        b.rotation.x = (Math.sin(phase) * 0.5 + 0.5) * (Math.PI / 2.35);
      });
      model.position.y = Math.sin(t * 0.55) * 0.035;
    }
  });
  if (!api) return null;

  // acabado claro: la estructura debe leerse contra el fondo grafito
  model = buildPergola({ width: 16, depth: 12, type: "louver", finish: "blanco" });
  dims  = buildDimensions(16, 12);
  api.scene.add(model, dims);
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
