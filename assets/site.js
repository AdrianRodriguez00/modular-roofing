/* =====================================================================
   MODULAR ROOFING & PÉRGOLAS — Capa de interacción
   - Router "soft" con transición de cortina entre páginas
   - Bilingüe ES/EN (español por defecto, inglés vía data-en)
   - Reveals, acordeón, galería, wizard de cotización
   ===================================================================== */
(() => {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     1. IDIOMA
     El HTML se escribe en español. El inglés vive en atributos:
       data-en="..."             -> textContent
       data-en-placeholder="..." -> placeholder
       data-en-aria-label="..."  -> aria-label
       data-en-content="..."     -> content (meta)
     Guardamos el español original la primera vez para poder volver.
     --------------------------------------------------------------- */
  const LANG_KEY = "mrp-lang";
  const ATTRS = ["placeholder", "aria-label", "content", "alt", "title"];

  const getLang = () => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "es" || saved === "en") return saved;
    return (navigator.language || "es").toLowerCase().startsWith("en") ? "en" : "es";
  };

  function applyLang(lang, root = document) {
    $$("[data-en]", root).forEach(el => {
      const en = el.dataset.en;
      // Si la traducción trae marcado (enlaces, <strong>), hay que usar
      // innerHTML: con textContent se perderían las etiquetas.
      if (en.includes("<")) {
        if (el.dataset.esHtml === undefined) el.dataset.esHtml = el.innerHTML;
        el.innerHTML = lang === "en" ? en : el.dataset.esHtml;
      } else {
        if (el.dataset.es === undefined) el.dataset.es = el.textContent;
        el.textContent = lang === "en" ? en : el.dataset.es;
      }
    });
    ATTRS.forEach(attr => {
      const key = "data-en-" + attr;
      $$(`[${key}]`, root).forEach(el => {
        const store = "es" + attr.replace(/-(\w)/g, (_, c) => c.toUpperCase());
        if (el.dataset[store] === undefined) el.dataset[store] = el.getAttribute(attr) || "";
        el.setAttribute(attr, lang === "en" ? el.getAttribute(key) : el.dataset[store]);
      });
    });
    if (root === document) {
      document.documentElement.lang = lang;
      $$(".lang__b").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    }
  }

  function initLangToggle() {
    $$(".lang__b").forEach(b => {
      b.addEventListener("click", () => {
        const lang = b.dataset.lang;
        localStorage.setItem(LANG_KEY, lang);
        applyLang(lang);
        document.dispatchEvent(new CustomEvent("mrp:lang", { detail: { lang } }));
      });
    });
  }

  /* ---------------------------------------------------------------
     1b. AVISO DE PRIVACIDAD / COOKIES
     El sitio no coloca cookies de rastreo: el aviso es informativo y
     se muestra una sola vez por navegador.
     --------------------------------------------------------------- */
  const COOKIE_KEY = "mrp-notice";
  function initCookie() {
    const box = $("[data-cookie]");
    if (!box) return;
    if (localStorage.getItem(COOKIE_KEY) === "seen") { box.remove(); return; }
    setTimeout(() => box.dataset.show = "true", 1400);
    $("[data-cookie-ok]", box)?.addEventListener("click", () => {
      localStorage.setItem(COOKIE_KEY, "seen");
      box.dataset.show = "false";
      setTimeout(() => box.remove(), 900);
    });
  }

  /* ---------------------------------------------------------------
     2. CABECERA + MENÚ MÓVIL
     --------------------------------------------------------------- */
  function initHeader() {
    const hdr = $(".hdr");
    if (!hdr) return;
    const onScroll = () => hdr.dataset.stuck = String(scrollY > 24);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    const burger = $(".burger");
    const sheet  = $(".sheet");
    if (!burger || !sheet) return;

    const setOpen = open => {
      burger.setAttribute("aria-expanded", String(open));
      sheet.dataset.open = String(open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
    $$(".sheet__a", sheet).forEach(a => a.addEventListener("click", () => setOpen(false)));
    addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
    document.addEventListener("mrp:navigate", () => setOpen(false));
  }

  /* ---------------------------------------------------------------
     3. REVEALS AL HACER SCROLL
     --------------------------------------------------------------- */
  let io;
  function initReveals(root = document) {
    const items = $$("[data-reveal]", root).filter(el => el.dataset.reveal !== "is-in");
    if (reduce) { items.forEach(el => el.dataset.reveal = "is-in"); return; }
    if (!io) {
      io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          e.target.dataset.reveal = "is-in";
          io.unobserve(e.target);
        });
      }, { rootMargin: "0px 0px -9% 0px", threshold: 0.08 });
    }
    items.forEach(el => io.observe(el));
  }

  /* Escalona hijos con data-stagger para reveals en cascada */
  function initStagger(root = document) {
    $$("[data-stagger]", root).forEach(group => {
      const step = Number(group.dataset.stagger) || 80;
      Array.from(group.children).forEach((child, i) => {
        child.style.setProperty("--rv-d", `${i * step}ms`);
      });
    });
  }

  /* ---------------------------------------------------------------
     4. TARJETAS: luz que sigue al cursor
     --------------------------------------------------------------- */
  function initPlates(root = document) {
    if (matchMedia("(hover: none)").matches) return;
    $$(".plate", root).forEach(p => {
      p.addEventListener("pointermove", e => {
        const r = p.getBoundingClientRect();
        p.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        p.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    });
  }

  /* ---------------------------------------------------------------
     5. ACORDEÓN
     --------------------------------------------------------------- */
  function initAccordion(root = document) {
    $$(".acc", root).forEach(acc => {
      $$(".acc__b", acc).forEach(btn => {
        btn.addEventListener("click", () => {
          const item = btn.closest(".acc__i");
          const open = item.dataset.open === "true";
          if (acc.dataset.single !== "false") {
            $$(".acc__i", acc).forEach(i => { i.dataset.open = "false"; $(".acc__b", i).setAttribute("aria-expanded", "false"); });
          }
          item.dataset.open = String(!open);
          btn.setAttribute("aria-expanded", String(!open));
        });
      });
    });
  }

  /* ---------------------------------------------------------------
     6. CONTADORES
     --------------------------------------------------------------- */
  function initCounters(root = document) {
    const nodes = $$("[data-count]", root);
    if (!nodes.length) return;
    const run = el => {
      const target = parseFloat(el.dataset.count);
      const dur = 1500, t0 = performance.now();
      const suffix = el.dataset.countSuffix || "";
      const dec = (el.dataset.count.split(".")[1] || "").length;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (reduce) { nodes.forEach(el => el.textContent = el.dataset.count + (el.dataset.countSuffix || "")); return; }
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { run(e.target); obs.unobserve(e.target); }
    }), { threshold: 0.5 });
    nodes.forEach(el => obs.observe(el));
  }

  /* ---------------------------------------------------------------
     7. BARRA DE ACCIÓN MÓVIL
     --------------------------------------------------------------- */
  function initDock() {
    const dock = $(".dock");
    if (!dock) return;
    const onScroll = () => dock.dataset.show = String(scrollY > 620);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------
     8. GALERÍA: filtros + lightbox
     --------------------------------------------------------------- */
  function initGallery(root = document) {
    const gal = $("[data-gallery]", root);
    if (!gal) return;

    const items = $$("[data-cat]", gal);
    $$("[data-filter]", root).forEach(btn => {
      btn.addEventListener("click", () => {
        const f = btn.dataset.filter;
        $$("[data-filter]", root).forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
        items.forEach(it => {
          const show = f === "all" || it.dataset.cat === f;
          it.style.display = show ? "" : "none";
          if (show) { it.dataset.reveal = "is-in"; }
        });
      });
    });

    // Lightbox
    const box = $("[data-lightbox]");
    if (!box) return;
    const img = $("[data-lightbox-img]", box);
    const cap = $("[data-lightbox-cap]", box);
    let idx = 0;
    const visible = () => items.filter(i => i.style.display !== "none");

    const show = i => {
      const list = visible();
      idx = (i + list.length) % list.length;
      const src = list[idx].dataset.full || $("img", list[idx])?.src;
      const caption = list[idx].dataset.cap || "";
      img.src = src; img.alt = caption;
      cap.textContent = caption;
    };
    const open = i => { show(i); box.hidden = false; document.body.style.overflow = "hidden"; box.focus(); };
    const close = () => { box.hidden = true; document.body.style.overflow = ""; };

    items.forEach((it, i) => it.addEventListener("click", () => open(visible().indexOf(it) >= 0 ? visible().indexOf(it) : 0)));
    $("[data-lb-close]", box)?.addEventListener("click", close);
    $("[data-lb-prev]", box)?.addEventListener("click", () => show(idx - 1));
    $("[data-lb-next]", box)?.addEventListener("click", () => show(idx + 1));
    box.addEventListener("click", e => { if (e.target === box) close(); });
    addEventListener("keydown", e => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
  }

  /* ---------------------------------------------------------------
     9. COMPARADOR ANTES / DESPUÉS
     --------------------------------------------------------------- */
  function initCompare(root = document) {
    $$("[data-compare]", root).forEach(c => {
      const range = $("input[type=range]", c);
      if (!range) return;
      const set = v => c.style.setProperty("--split", v + "%");
      set(range.value);
      range.addEventListener("input", () => set(range.value));
    });
  }

  /* ---------------------------------------------------------------
     10. WIZARD DE COTIZACIÓN
     --------------------------------------------------------------- */
  function initWizard(root = document) {
    const wiz = $("[data-wizard]", root);
    if (!wiz) return;
    const steps = $$("[data-step]", wiz);
    const bar   = $("[data-wiz-bar]", wiz);
    const num   = $("[data-wiz-num]", wiz);
    const total = steps.length;
    let cur = 0;

    const render = () => {
      steps.forEach((s, i) => s.hidden = i !== cur);
      bar.style.width = `${((cur + 1) / total) * 100}%`;
      if (num) num.textContent = `${cur + 1} / ${total}`;
    };

    const valid = () => {
      const s = steps[cur];
      const req = $$("[required]", s);
      return req.every(f => f.type === "radio"
        ? $$(`[name="${f.name}"]`, s).some(r => r.checked)
        : f.value.trim() !== "");
    };

    $$("[data-wiz-next]", wiz).forEach(b => b.addEventListener("click", () => {
      if (!valid()) {
        const s = steps[cur];
        $$("[required]", s).forEach(f => f.reportValidity?.());
        s.animate(
          [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }],
          { duration: 320, easing: "ease-in-out" }
        );
        return;
      }
      if (cur < total - 1) { cur++; render(); }
    }));
    $$("[data-wiz-prev]", wiz).forEach(b => b.addEventListener("click", () => { if (cur > 0) { cur--; render(); } }));

    // las tarjetas-opción avanzan solas
    $$("[data-wiz-pick]", wiz).forEach(lab => {
      lab.addEventListener("change", () => setTimeout(() => { if (cur < total - 1) { cur++; render(); } }, 240));
    });

    render();
  }

  /* ---------------------------------------------------------------
     11. FORMULARIOS -> WhatsApp
     Sin backend: se arma el mensaje y se abre WhatsApp.
     --------------------------------------------------------------- */
  const WA = "17867820216";
  function initForms(root = document) {
    $$("form[data-wa-form]", root).forEach(form => {
      form.addEventListener("submit", e => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const lang = getLang();
        const data = new FormData(form);
        const head = lang === "en"
          ? "New quote request — Modular Roofing & Pergolas"
          : "Nueva solicitud de cotización — Modular Roofing y Pérgolas";
        const lines = [head, ""];
        for (const [k, v] of data.entries()) {
          if (!String(v).trim()) continue;
          const field = form.querySelector(`[name="${CSS.escape(k)}"]`);
          const label = field?.dataset.waLabel || k;
          lines.push(`${label}: ${v}`);
        }
        const url = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join("\n"))}`;
        window.open(url, "_blank", "noopener");
        const ok = $("[data-form-ok]", form.parentElement) || $("[data-form-ok]", form);
        if (ok) ok.hidden = false;
      });
    });
  }

  /* ---------------------------------------------------------------
     12. ROUTER CON TRANSICIÓN DE CORTINA
     Navegación real (URLs reales, funciona sin JS). Con JS,
     intercepta enlaces internos, precarga el HTML y hace el swap
     de <main> detrás de la cortina.
     --------------------------------------------------------------- */
  const cache = new Map();
  let navigating = false;

  const isInternal = a => {
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return false;
    if (a.dataset.noRoute !== undefined) return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (!/\.html?$/.test(url.pathname) && !url.pathname.endsWith("/")) return false;
    return true;
  };

  async function fetchPage(href) {
    if (cache.has(href)) return cache.get(href);
    const res = await fetch(href, { headers: { "X-Requested-With": "router" } });
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const payload = {
      main:  doc.querySelector("main")?.innerHTML ?? "",
      title: doc.title,
      desc:  doc.querySelector('meta[name="description"]')?.content ?? "",
      path:  new URL(href, location.href).pathname
    };
    cache.set(href, payload);
    return payload;
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function curtain(state) {
    const c = $(".curtain");
    if (!c) return;
    c.dataset.state = state;
  }

  async function swap(payload, href, push = true) {
    const main = $("main");
    // liberar contextos WebGL del contenido saliente antes de destruirlo
    document.dispatchEvent(new CustomEvent("mrp:unmount"));
    main.innerHTML = payload.main;
    document.title = payload.title;
    const meta = $('meta[name="description"]');
    if (meta) meta.content = payload.desc;
    if (push) history.pushState({ href }, "", href);

    // marcar enlace activo
    const here = new URL(href, location.href).pathname.replace(/\/$/, "/index.html");
    $$(".nav__a, .sheet__a").forEach(a => {
      const p = new URL(a.href, location.href).pathname.replace(/\/$/, "/index.html");
      if (p === here) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    scrollTo({ top: 0, behavior: "instant" });
    applyLang(getLang());
    initPage(main);
    document.dispatchEvent(new CustomEvent("mrp:navigate", { detail: { href } }));
  }

  async function go(href, push = true) {
    if (navigating) return;
    navigating = true;
    try {
      const load = fetchPage(href);
      if (!reduce) {
        curtain("out");
        await Promise.all([load, wait(560)]);
      }
      const payload = await load;
      await swap(payload, href, push);
      if (!reduce) {
        curtain("in");
        await wait(700);
        curtain("");
      }
    } catch (err) {
      location.href = href;   // si algo falla, navegación normal
    } finally {
      navigating = false;
    }
  }

  function initRouter() {
    if (!$(".curtain")) return;

    document.addEventListener("click", e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest("a[href]");
      if (!isInternal(a)) return;
      const url = new URL(a.href, location.href);
      // ancla en la misma página: dejar el comportamiento nativo
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      go(url.pathname + url.search + url.hash);
    });

    // precarga al pasar el cursor
    document.addEventListener("pointerover", e => {
      const a = e.target.closest("a[href]");
      if (isInternal(a)) fetchPage(new URL(a.href).pathname).catch(() => {});
    }, { passive: true });

    addEventListener("popstate", () => go(location.pathname + location.search, false));
  }

  /* ---------------------------------------------------------------
     13. ARRANQUE
     --------------------------------------------------------------- */
  function initPage(root = document) {
    initReveals(root);
    initStagger(root);
    initPlates(root);
    initAccordion(root);
    initCounters(root);
    initGallery(root);
    initCompare(root);
    initWizard(root);
    initForms(root);
    // avisar a la capa 3D que hay lienzos nuevos
    document.dispatchEvent(new CustomEvent("mrp:page", { detail: { root } }));
  }

  function boot() {
    applyLang(getLang());
    initLangToggle();
    initHeader();
    initCookie();
    initDock();
    initRouter();
    initPage(document);
    document.body.dataset.ready = "true";
  }

  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot);
  else boot();

  // API mínima para otros módulos
  window.MRP = { getLang, applyLang, $, $$, reduce };
})();
