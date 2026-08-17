/* ============================================================
   Zaakirah Dawood-Hawa — portfolio
   Scroll-story engine: Lenis smooth scroll + GSAP ScrollTrigger
   Progressive enhancement: content is fully readable without JS.
   ============================================================ */

(function () {
  "use strict";

  var staticMode = /[?&]static/.test(window.location.search);
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || staticMode;
  var isFinePointer = window.matchMedia("(pointer: fine)").matches;
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  /* ---------- Preloader (always resolves, even if libs fail) ---------- */
  var preloader = document.querySelector(".preloader");

  function killPreloader() {
    if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
  }

  if (prefersReducedMotion || !hasGSAP) {
    killPreloader();
  }

  if (!hasGSAP) {
    // No animation libs (offline?): make sure everything is visible and bail.
    document.documentElement.classList.add("no-motion");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (hasLenis && !prefersReducedMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Anchor links through Lenis (and keep keyboard focus in sync)
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        var target = id === "#top" ? document.body : document.querySelector(id);
        if (target) {
          e.preventDefault();
          var dest = id === "#top" ? document.querySelector("main") : target;
          dest.setAttribute("tabindex", "-1");
          dest.focus({ preventScroll: true });
          lenis.scrollTo(id === "#top" ? 0 : target, { offset: 0, duration: 1.4 });
        }
      });
    });
  }

  /* ---------- Text splitting helpers ---------- */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = "";
    var frag = document.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var span = document.createElement("span");
      span.className = "char";
      span.textContent = text[i];
      frag.appendChild(span);
    }
    el.appendChild(frag);
    return el.querySelectorAll(".char");
  }

  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    var frag = document.createDocumentFragment();
    words.forEach(function (w, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = w;
      frag.appendChild(span);
      if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    el.appendChild(frag);
    return el.querySelectorAll(".word");
  }

  /* Split section titles into line-masked words (keeps <br> and <em>) */
  function splitTitle(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    var out = [];
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        node.textContent.trim().split(/\s+/).forEach(function (w) {
          if (w) out.push({ text: w, italic: false });
        });
      } else if (node.nodeName === "EM") {
        node.textContent.trim().split(/\s+/).forEach(function (w) {
          if (w) out.push({ text: w, italic: true });
        });
      } else if (node.nodeName === "BR") {
        out.push({ br: true });
      }
    });
    el.innerHTML = "";
    out.forEach(function (item) {
      if (item.br) { el.appendChild(document.createElement("br")); return; }
      var mask = document.createElement("span");
      mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:0.12em;margin-bottom:-0.12em;";
      var inner = document.createElement("span");
      inner.className = "title-word";
      inner.style.display = "inline-block";
      if (item.italic) {
        var em = document.createElement("em");
        em.textContent = item.text;
        inner.appendChild(em);
      } else {
        inner.textContent = item.text;
      }
      mask.appendChild(inner);
      el.appendChild(mask);
      el.appendChild(document.createTextNode(" "));
    });
    return el.querySelectorAll(".title-word");
  }

  /* ---------- Reduced motion: reveal all, minimal wiring ---------- */
  if (prefersReducedMotion) {
    document.documentElement.classList.add("no-motion");
    document.querySelectorAll(".manifesto-text").forEach(function (el) {
      splitWords(el).forEach(function (w) { w.classList.add("is-lit"); });
    });
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.textContent = el.getAttribute("data-count");
    });
    // (typedPrompt text ships in the HTML — nothing to fill in here)
    // Verification hook: ?static=1&y=3000 shifts content up for screenshots
    // (headless scrolled viewports don't rasterize, so translate instead).
    var yParam = window.location.search.match(/[?&]y=(\d+)/);
    if (yParam) {
      var shift = function () {
        document.querySelector("main").style.transform = "translateY(-" + yParam[1] + "px)";
        document.getElementById("nav").style.display = "none";
      };
      shift();
      window.addEventListener("load", shift);
    }
    if (/[?&]debug/.test(window.location.search)) {
      window.addEventListener("load", function () {
        console.log("[debug] viewport=" + window.innerWidth + " scrollWidth=" + document.documentElement.scrollWidth);
        document.querySelectorAll("body *").forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.width > window.innerWidth + 2) {
            console.log("[overflow] <" + el.tagName.toLowerCase() + " class=\"" + el.className + "\"> width=" + Math.round(r.width));
          }
        });
      });
    }
    return;
  }

  /* ---------- Preloader sequence ---------- */
  var loadCount = document.getElementById("loadCount");
  var introDone = false;
  function finishIntro() {
    if (introDone) return;
    introDone = true;
    killPreloader();
    heroIntro();
  }
  // Failsafe: never let the preloader trap the visitor (throttled tabs,
  // stalled rAF, headless rendering). Force-completes the intro.
  setTimeout(function () {
    if (!introDone) {
      preloaderTl.kill();
      gsap.set(".hero-eyebrow, .hero-blurb, .hero-roles, .hero-scrollcue", { opacity: 1, y: 0 });
      heroChars.forEach(function (chars) { gsap.set(chars, { yPercent: 0 }); });
      finishIntro();
    }
  }, 4500);

  var preloaderTl = gsap.timeline({
    onComplete: finishIntro
  });

  preloaderTl
    .to(".preloader-name span", {
      y: 0, duration: 0.9, ease: "power4.out", stagger: 0.05
    }, 0.1)
    .to({ val: 0 }, {
      val: 100, duration: 1.15, ease: "power2.inOut",
      onUpdate: function () {
        if (loadCount) loadCount.textContent = Math.round(this.targets()[0].val);
      }
    }, 0.1)
    .to(".preloader-inner", { opacity: 0, y: -24, duration: 0.45, ease: "power2.in" }, "+=0.15")
    .to(".preloader", { clipPath: "inset(0 0 100% 0)", duration: 0.8, ease: "power4.inOut" }, "-=0.1");

  gsap.set(".preloader", { clipPath: "inset(0 0 0% 0)" });

  /* ---------- Hero intro ---------- */
  var heroChars = [];
  document.querySelectorAll(".hero-word").forEach(function (el) {
    heroChars.push(splitChars(el));
  });
  heroChars.forEach(function (chars) { gsap.set(chars, { yPercent: 115 }); });
  gsap.set(".hero-eyebrow, .hero-blurb, .hero-roles, .hero-scrollcue", { opacity: 0, y: 20 });

  function heroIntro() {
    var tl = gsap.timeline();
    tl.to(heroChars[0], { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.035 }, 0)
      .to(heroChars[1], { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.028 }, 0.18)
      .to(".hero-eyebrow", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.5)
      .to(".hero-roles", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.7)
      .to(".hero-blurb", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.85)
      .to(".hero-scrollcue", { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, 1.0);
    startRoleRotator();
  }

  /* ---------- Rotating roles ---------- */
  function startRoleRotator() {
    var roles = gsap.utils.toArray(".hero-roles-rotator .role");
    if (roles.length < 2) return;
    // Take full ownership of position: visibility comes from CSS classes,
    // transforms live only in GSAP from here on.
    gsap.set(roles, { yPercent: 110, visibility: "visible" });
    gsap.set(roles[0], { yPercent: 0 });
    var i = 0;
    function cycle() {
      var current = roles[i];
      i = (i + 1) % roles.length;
      var next = roles[i];
      // Park everything except the two words in play — survives throttled tabs.
      roles.forEach(function (r) {
        if (r !== current && r !== next) gsap.set(r, { yPercent: 110 });
      });
      gsap.to(current, { yPercent: -110, duration: 0.55, ease: "power3.in", overwrite: "auto" });
      gsap.to(next, { yPercent: 0, startAt: { yPercent: 110 }, duration: 0.55, ease: "power3.out", delay: 0.4, overwrite: "auto" });
      gsap.delayedCall(2.6, cycle);
    }
    gsap.delayedCall(2.6, cycle);
  }

  /* ---------- Hero parallax (on the container — the blobs themselves
     are owned by their CSS drift animation) ---------- */
  if (isFinePointer) {
    var blobLayer = document.querySelector(".hero-blobs");
    window.addEventListener("pointermove", function (e) {
      var nx = (e.clientX / window.innerWidth - 0.5);
      var ny = (e.clientY / window.innerHeight - 0.5);
      gsap.to(blobLayer, { x: nx * 30, y: ny * 22, duration: 1.4, ease: "power2.out", overwrite: "auto" });
    }, { passive: true });
  }

  /* ---------- Nav: hide on scroll down, frost on scroll ---------- */
  var nav = document.getElementById("nav");
  var lastScroll = 0;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (self) {
      var y = self.scroll();
      nav.classList.toggle("is-scrolled", y > 40);
      if (y > lastScroll && y > 300) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
      lastScroll = y;
    }
  });

  /* ---------- Scroll progress bar ---------- */
  gsap.to("#progressBar", {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
  });
  gsap.set("#progressBar", { scaleX: 0 });

  /* ---------- Manifesto: words light up as you scroll ---------- */
  document.querySelectorAll(".manifesto-text").forEach(function (el) {
    var words = splitWords(el);
    ScrollTrigger.create({
      trigger: el,
      start: "top 78%",
      end: "bottom 45%",
      scrub: true,
      onUpdate: function (self) {
        var lit = Math.floor(self.progress * words.length);
        words.forEach(function (w, idx) { w.classList.toggle("is-lit", idx <= lit); });
      }
    });
  });

  /* ---------- Section titles: masked word reveal ---------- */
  document.querySelectorAll("[data-split-words], .work-head .section-title").forEach(function (el) {
    var words = splitTitle(el);
    gsap.set(words, { yPercent: 110 });
    gsap.to(words, {
      yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.07,
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  /* ---------- Eyebrow reveals ---------- */
  gsap.utils.toArray(".section-eyebrow, .hero-eyebrow").forEach(function (el) {
    if (el.closest(".hero")) return;
    gsap.fromTo(el, { opacity: 0, y: 14 }, {
      opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* ---------- Story: rail draw + chapter activation ---------- */
  var chaptersWrap = document.querySelector(".chapters");
  if (chaptersWrap) {
    var rail = document.createElement("div");
    rail.className = "rail-progress";
    chaptersWrap.appendChild(rail);
    gsap.to(rail, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: {
        trigger: chaptersWrap,
        start: "top 70%",
        end: "bottom 55%",
        scrub: 0.4
      }
    });
    gsap.set(rail, { scaleY: 0 });
  }

  gsap.utils.toArray(".chapter").forEach(function (ch) {
    var inner = ch.querySelectorAll(".chapter-meta, .chapter-title, .chapter-role, .chapter-text, .chapter-skills, .chapter-quote");
    gsap.fromTo(inner, { opacity: 0, y: 36 }, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.09,
      scrollTrigger: { trigger: ch, start: "top 74%" }
    });
    ScrollTrigger.create({
      trigger: ch,
      start: "top 60%",
      end: "bottom 60%",
      onToggle: function (self) { ch.classList.toggle("is-active", self.isActive); }
    });
  });

  /* ---------- Work: pinned horizontal scroll (desktop only) ---------- */
  var mm = gsap.matchMedia();
  // Exact complement of the CSS "(max-width: 900px)" query — no fractional gap.
  mm.add("not all and (max-width: 900px)", function () {
    var track = document.getElementById("workTrack");
    if (!track) return;
    var getDistance = function () {
      return Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    };
    var tween = gsap.to(track, {
      x: function () { return -getDistance(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".work",
        start: "top top",
        end: function () { return "+=" + (getDistance() + window.innerHeight * 0.25); },
        scrub: 0.6,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
    // Keyboard access: when focus lands on a card (e.g. the CTA link),
    // jump the page scroll so the pinned shelf brings it into view.
    var onFocusIn = function (e) {
      var card = e.target.closest(".card");
      var st = tween.scrollTrigger;
      if (!card || !st || !getDistance()) return;
      var frac = Math.min(1, card.offsetLeft / getDistance());
      var y = st.start + frac * (st.end - st.start);
      if (lenis) lenis.scrollTo(y, { duration: 0.6 });
      else window.scrollTo(0, y);
    };
    track.addEventListener("focusin", onFocusIn);
    return function () {
      track.removeEventListener("focusin", onFocusIn);
      tween.scrollTrigger && tween.scrollTrigger.kill();
    };
  });

  /* ---------- Counters ---------- */
  gsap.utils.toArray("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    // HTML ships the real value for no-JS/CDN-blocked visitors;
    // zero it only here, where the count-up is guaranteed to run.
    el.textContent = "0";
    var obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.6,
      ease: "power2.out",
      snap: { val: 1 },
      onUpdate: function () { el.textContent = Math.round(obj.val); },
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  /* ---------- Value cards stagger ---------- */
  gsap.fromTo(".value-card", { opacity: 0, y: 40 }, {
    opacity: 1, y: 0, duration: 0.85, ease: "power3.out", stagger: 0.1,
    scrollTrigger: { trigger: ".values-grid", start: "top 80%" }
  });

  /* ---------- Marquee parallax ----------
     Auto-drift lives in CSS (marquee-drift keyframes on .marquee-track,
     hover-pause via :hover). Here we only add the parallax layer: as the
     toolbox scrolls through the viewport, the two rows slide in opposite
     directions at different rates. Leftward-only offsets so the strip's
     left seam is never exposed. */
  gsap.utils.toArray(".marquee .marquee-par").forEach(function (par, i) {
    var forward = i % 2 === 0;
    gsap.fromTo(par,
      { xPercent: forward ? 0 : -12 },
      {
        xPercent: forward ? -12 : 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".toolbox",
          start: "top bottom",
          end: "bottom top",
          scrub: 0.4
        }
      });
  });

  /* ---------- AI chat typing ---------- */
  var promptText = "My QPlant launch concept: “Estimates you can defend.” Push on it — give me 3 sharper variants to A/B test against my line.";
  var typedEl = document.getElementById("typedPrompt");
  var aiReply = document.getElementById("aiReply");
  var humanNote = document.getElementById("humanNote");
  var chatPlayed = false;

  if (typedEl) {
    // HTML ships the full prompt for no-JS visitors; clear it only here,
    // where the typing animation is guaranteed to run.
    typedEl.textContent = "";
    ScrollTrigger.create({
      trigger: ".ai-demo",
      start: "top 72%",
      onEnter: function () {
        if (chatPlayed) return;
        chatPlayed = true;
        var i = 0;
        var typer = setInterval(function () {
          typedEl.textContent = promptText.slice(0, ++i);
          if (i >= promptText.length) {
            clearInterval(typer);
            setTimeout(function () { aiReply.classList.add("is-in"); }, 500);
            setTimeout(function () { humanNote.classList.add("is-in"); }, 2400);
          }
        }, 26);
      }
    });
  }

  /* ---------- Chaos, sorted — an interactive parable -----------------
     Phase 0/1: the viewer tries to gather the chaos by hand. It leaks.
     Phase 2:   a rose light — Zaakirah — glides in. She sorts particles
                into the Z wherever she passes, and the viewer's touch
                suddenly works too: everything it brushes settles home.
     Phase 3:   the Z holds, breathing, a step higher after every break.
     Three.js lazy-loads near the section; any failure and the section
     simply stands on its own. */
  var chaosStarted = false;
  function buildChaos() {
    var wrap = document.getElementById("globe");
    var T = window.THREE;
    if (!wrap || !T) return;

    // Sample the Z from an offscreen canvas
    var cs = document.createElement("canvas");
    cs.width = 320; cs.height = 320;
    var cx2d = cs.getContext("2d");
    if (!cx2d) return;
    cx2d.fillStyle = "#fff";
    cx2d.font = "italic 700 300px Georgia, 'Times New Roman', serif";
    cx2d.textAlign = "center"; cx2d.textBaseline = "middle";
    cx2d.fillText("Z", 160, 175);
    var img = cx2d.getImageData(0, 0, 320, 320).data;
    var targets = [];
    for (var yy = 0; yy < 320; yy += 3) {
      for (var xx = 0; xx < 320; xx += 3) {
        if (img[(yy * 320 + xx) * 4 + 3] > 128) {
          targets.push([(xx - 160) / 38, -(yy - 160) / 38, (Math.random() - 0.5) * 0.7]);
        }
      }
    }
    var N = targets.length;
    if (!N) return;

    var size = wrap.clientWidth;
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 7.4;
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    wrap.appendChild(renderer.domElement);
    wrap.parentNode.classList.add("is-live");
    var progressEl = wrap.parentNode.querySelector(".globe-progress-fill");
    var captionEl = wrap.parentNode.querySelector(".globe-caption");
    function setCaption(text) {
      if (!captionEl) return;
      gsap.to(captionEl, { opacity: 0, duration: 0.35, onComplete: function () {
        captionEl.textContent = text;
        gsap.to(captionEl, { opacity: 1, duration: 0.5 });
      }});
    }

    var group = new T.Group();
    scene.add(group);
    var targetGroupY = -0.1;
    group.position.y = targetGroupY;

    // Particles: cream majority with pastel confetti
    var palette = [
      [0.97, 0.96, 0.94], [0.97, 0.96, 0.94],
      [0.87, 0.61, 0.71], [0.89, 0.78, 0.49],
      [0.66, 0.79, 0.67], [0.62, 0.73, 0.85]
    ];
    var pos = new Float32Array(N * 3);
    var col = new Float32Array(N * 3);
    var vel = new Float32Array(N * 3);
    var phase = new Float32Array(N);
    var awake = new Uint8Array(N); // 0 = adrift in chaos, 1 = being sorted
    for (var i = 0; i < N; i++) {
      var r = 3.2 + Math.random() * 2.2;
      var a = Math.random() * Math.PI * 2;
      var b = (Math.random() - 0.5) * Math.PI;
      pos[i * 3] = Math.cos(a) * Math.cos(b) * r;
      pos[i * 3 + 1] = Math.sin(b) * r * 0.8;
      pos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r * 0.5;
      var c = palette[(Math.random() * palette.length) | 0];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      phase[i] = Math.random() * Math.PI * 2;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("color", new T.BufferAttribute(col, 3));
    group.add(new T.Points(geo, new T.PointsMaterial({
      vertexColors: true, size: 0.055, transparent: true, opacity: 0.95, sizeAttenuation: true
    })));

    // The objective, always visible: a ghost outline of the Z to rebuild
    var ghostPos = new Float32Array(N * 3);
    for (var g = 0; g < N; g++) {
      ghostPos[g * 3] = targets[g][0];
      ghostPos[g * 3 + 1] = targets[g][1];
      ghostPos[g * 3 + 2] = targets[g][2];
    }
    var ghostGeo = new T.BufferGeometry();
    ghostGeo.setAttribute("position", new T.BufferAttribute(ghostPos, 3));
    group.add(new T.Points(ghostGeo, new T.PointsMaterial({
      color: 0xF7F4EF, size: 0.034, transparent: true, opacity: 0.32, sizeAttenuation: true
    })));

    // Mending threads — visible only for particles being sorted
    var threadPos = new Float32Array(N * 6);
    var threadGeo = new T.BufferGeometry();
    threadGeo.setAttribute("position", new T.BufferAttribute(threadPos, 3));
    group.add(new T.LineSegments(threadGeo, new T.LineBasicMaterial({
      color: 0xF7F4EF, transparent: true, opacity: 0.13, depthWrite: false
    })));

    // Zaakirah: a rose light with a soft halo, hidden until she arrives
    var orb = new T.Group();
    orb.add(new T.Mesh(new T.SphereGeometry(0.09, 16, 16),
      new T.MeshBasicMaterial({ color: 0xDE9BB4 })));
    orb.add(new T.Mesh(new T.SphereGeometry(0.24, 16, 16),
      new T.MeshBasicMaterial({ color: 0xDE9BB4, transparent: true, opacity: 0.18 })));
    orb.visible = false;
    orb.position.set(-4.8, 3.4, 0.5);
    group.add(orb);
    var orbGoal = new T.Vector3(0, 0, 0);
    var orbVel = new T.Vector3(0, 0, 0);
    var perch = new T.Vector3(2.7, 2.1, 0.5); // the dot on the signature
    var perched = false;

    // Her trail — a fading rose ribbon that makes her path legible
    var TRAIL = 40;
    var trailPos = new Float32Array(TRAIL * 3);
    var trailGeo = new T.BufferGeometry();
    trailGeo.setAttribute("position", new T.BufferAttribute(trailPos, 3));
    var trail = new T.Line(trailGeo, new T.LineBasicMaterial({
      color: 0xDE9BB4, transparent: true, opacity: 0.35, depthWrite: false
    }));
    trail.visible = false;
    group.add(trail);

    // Heat: particles flash bright the moment they're sorted
    var heat = new Float32Array(N);
    var baseCol = new Float32Array(col);

    // Pointer in formation-plane coordinates
    var visH = 2 * Math.tan((38 / 2) * Math.PI / 180) * camera.position.z;
    var ptrX = 999, ptrY = 999, ptrOn = false, ptrDown = false;
    var cv = renderer.domElement;
    function toPlane(e) {
      var rect = cv.getBoundingClientRect();
      ptrX = ((e.clientX - rect.left) / rect.width * 2 - 1) * (visH / 2);
      ptrY = (1 - (e.clientY - rect.top) / rect.height * 2) * (visH / 2) - group.position.y;
    }
    var downX = 0, downY = 0, downT = 0;
    cv.addEventListener("pointermove", function (e) { ptrOn = true; toPlane(e); }, { passive: true });
    cv.addEventListener("pointerdown", function (e) {
      ptrOn = true; ptrDown = true; toPlane(e);
      downX = e.clientX; downY = e.clientY; downT = performance.now();
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    }, { passive: true });
    cv.addEventListener("pointerup", function (e) {
      ptrDown = false;
      var moved = Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY);
      if (act >= 3 && performance.now() - downT < 350 && moved < 10) burst();
    });
    cv.addEventListener("pointercancel", function () { ptrDown = false; });
    cv.addEventListener("pointerleave", function () { ptrOn = false; ptrDown = false; ptrX = 999; ptrY = 999; });

    // The story clock
    var act = 0;            // 0-1 alone, 2 she's here, 3 sorted & holding
    var effortMs = 0;       // how long the viewer has genuinely tried
    var watchMs = 0;        // how long the section has been watched
    var arrivedOnce = false, sortedOnce = false;

    function arrive() {
      if (arrivedOnce) return;
      arrivedOnce = true;
      act = 2;
      orb.visible = true;
      trail.visible = true;
      for (var tr = 0; tr < TRAIL; tr++) {
        trailPos[tr * 3] = orb.position.x;
        trailPos[tr * 3 + 1] = orb.position.y;
        trailPos[tr * 3 + 2] = orb.position.z;
      }
      setCaption("hard alone, isn’t it? here’s zaakirah.");
      gsap.delayedCall(3.2, function () {
        if (act === 2) setCaption("feel the difference — everything you touch settles now.");
      });
    }

    function burst() {
      act = 2;
      for (var i = 0; i < N; i++) {
        var i3 = i * 3;
        var dx = pos[i3] - ptrX, dy = pos[i3 + 1] - ptrY;
        var d2 = dx * dx + dy * dy;
        var f = 0.4 / (1 + d2 * 0.5);
        vel[i3] += dx * f + (Math.random() - 0.5) * 0.22;
        vel[i3 + 1] += dy * f + (Math.random() - 0.5) * 0.22;
        vel[i3 + 2] += (Math.random() - 0.5) * 0.18;
      }
      gsap.to(group.position, { y: targetGroupY - 0.07, duration: 0.3, ease: "power2.out" });
    }

    // Render only while the section is on screen
    var active = false;
    ScrollTrigger.create({
      trigger: ".contact", start: "top bottom", end: "bottom top",
      onToggle: function (self) { active = self.isActive; }
    });

    var t = 0, frame = 0;
    gsap.ticker.add(function (time, delta) {
      if (!active) return;
      var dms = Math.min(delta, 50);
      t += dms * 0.001;
      frame++;

      // Story pacing: struggle first, then she arrives
      if (act < 2) {
        watchMs += dms;
        if (ptrDown && ptrOn) { effortMs += dms; act = 1; }
        if (effortMs > 5500 || watchMs > 10000) arrive();
      }

      // She flies with intent: steering physics toward the nearest work,
      // and when the sorting is done, a perch at the Z's signature corner.
      if (act >= 2) {
        if (frame % 24 === 0 || orb.position.distanceTo(orbGoal) < 0.6) {
          var bestD = Infinity, bestI = -1;
          for (var k = 0; k < N; k++) {
            if (!awake[k]) {
              var gdx = pos[k * 3] - orb.position.x, gdy = pos[k * 3 + 1] - orb.position.y;
              var gd = gdx * gdx + gdy * gdy;
              if (gd < bestD) { bestD = gd; bestI = k; }
            }
          }
          if (bestI >= 0) {
            perched = false;
            orbGoal.set(pos[bestI * 3], pos[bestI * 3 + 1], pos[bestI * 3 + 2] * 0.5);
          } else {
            perched = true;
          }
        }
        if (perched) {
          orbGoal.copy(perch);
          orbGoal.y += Math.sin(t * 1.6) * 0.1;
        }
        // Steer: accelerate toward the goal, capped speed — swooping arcs
        var steer = new T.Vector3().subVectors(orbGoal, orb.position);
        var dist = steer.length();
        if (dist > 0.001) {
          steer.normalize().multiplyScalar(0.006);
          orbVel.add(steer);
          orbVel.clampLength(0, perched ? Math.min(0.03, dist * 0.08) : 0.062);
          orb.position.add(orbVel);
        }
        // Trail: shift the ribbon, head at her current position
        for (var tr = TRAIL - 1; tr > 0; tr--) {
          trailPos[tr * 3] = trailPos[(tr - 1) * 3];
          trailPos[tr * 3 + 1] = trailPos[(tr - 1) * 3 + 1];
          trailPos[tr * 3 + 2] = trailPos[(tr - 1) * 3 + 2];
        }
        trailPos[0] = orb.position.x; trailPos[1] = orb.position.y; trailPos[2] = orb.position.z;
        trailGeo.attributes.position.needsUpdate = true;
      }

      var i3, i6, dx, dy, d2, settled = 0;
      for (var i = 0; i < N; i++) {
        i3 = i * 3; i6 = i * 6;
        var tx = targets[i][0] + Math.sin(t * 1.4 + phase[i]) * 0.035;
        var ty = targets[i][1] + Math.cos(t * 1.1 + phase[i]) * 0.035;
        var tz = targets[i][2];

        if (awake[i]) {
          // Without her, fixes don't hold: solo-sorted pieces crumble
          // loose after a few seconds. Once she's here, everything sticks.
          if (act < 2 && Math.random() < 0.004) {
            awake[i] = 0; heat[i] = 0;
            col[i3] = baseCol[i3]; col[i3 + 1] = baseCol[i3 + 1]; col[i3 + 2] = baseCol[i3 + 2];
            vel[i3] += (Math.random() - 0.5) * 0.12;
            vel[i3 + 1] += (Math.random() - 0.5) * 0.12;
            vel[i3 + 2] += (Math.random() - 0.5) * 0.06;
          }
        }
        if (awake[i]) {
          // Being sorted: spring home
          vel[i3] += (tx - pos[i3]) * 0.016;
          vel[i3 + 1] += (ty - pos[i3 + 1]) * 0.016;
          vel[i3 + 2] += (tz - pos[i3 + 2]) * 0.016;
        } else {
          // Adrift: wander, loosely contained
          vel[i3] += (Math.random() - 0.5) * 0.014 - pos[i3] * 0.0012;
          vel[i3 + 1] += (Math.random() - 0.5) * 0.014 - pos[i3 + 1] * 0.0012;
          vel[i3 + 2] += (Math.random() - 0.5) * 0.010 - pos[i3 + 2] * 0.0015;
        }

        // The viewer's hand
        if (ptrOn) {
          dx = ptrX - pos[i3]; dy = ptrY - pos[i3 + 1];
          d2 = dx * dx + dy * dy;
          if (act < 2) {
            // Alone: gather pieces and carry them onto the outline. Only
            // the few whose homes are right there lock in — honest work,
            // but slow. The pull is leaky; strays drift off again.
            if (ptrDown && d2 < 2.25) {
              vel[i3] += dx * 0.045 + (Math.random() - 0.5) * 0.05;
              vel[i3 + 1] += dy * 0.045 + (Math.random() - 0.5) * 0.05;
              if (d2 < 0.49) {
                var hx = targets[i][0] - ptrX, hy = targets[i][1] - ptrY;
                if (hx * hx + hy * hy < 0.2) { awake[i] = 1; heat[i] = 1; }
              }
            }
          } else if (act === 2) {
            // Together: whatever the viewer touches settles home
            if (d2 < 1.44 && !awake[i]) { awake[i] = 1; heat[i] = 1; }
          } else if (d2 < 1.44 && d2 > 0.0001) {
            // Holding: a playful stir
            var fs = (1.44 - d2) / 1.44 * 0.09 / Math.sqrt(d2);
            vel[i3] -= dx * fs;
            vel[i3 + 1] -= dy * fs;
          }
        }

        // Her sorting sweep — touched pieces flash and fly home
        if (act >= 2 && !awake[i]) {
          dx = orb.position.x - pos[i3]; dy = orb.position.y - pos[i3 + 1];
          if (dx * dx + dy * dy < 1.2) {
            awake[i] = 1;
            heat[i] = 1;
            vel[i3 + 2] += (Math.random() - 0.5) * 0.05;
          }
        }

        // Heat flash: sorted pieces glow toward white, then cool back
        if (heat[i] > 0.01) {
          var h = heat[i];
          col[i3] = baseCol[i3] + (1 - baseCol[i3]) * h;
          col[i3 + 1] = baseCol[i3 + 1] + (1 - baseCol[i3 + 1]) * h;
          col[i3 + 2] = baseCol[i3 + 2] + (1 - baseCol[i3 + 2]) * h;
          heat[i] *= 0.94;
          if (heat[i] <= 0.01) {
            col[i3] = baseCol[i3]; col[i3 + 1] = baseCol[i3 + 1]; col[i3 + 2] = baseCol[i3 + 2];
          }
        }

        var damp = awake[i] ? 0.88 : 0.95;
        vel[i3] *= damp; vel[i3 + 1] *= damp; vel[i3 + 2] *= damp;
        pos[i3] += vel[i3]; pos[i3 + 1] += vel[i3 + 1]; pos[i3 + 2] += vel[i3 + 2];

        // Threads only while a sorted particle is in flight
        dx = tx - pos[i3]; dy = ty - pos[i3 + 1];
        d2 = dx * dx + dy * dy;
        if (awake[i] && d2 > 0.05) {
          threadPos[i6] = pos[i3]; threadPos[i6 + 1] = pos[i3 + 1]; threadPos[i6 + 2] = pos[i3 + 2];
          threadPos[i6 + 3] = tx; threadPos[i6 + 4] = ty; threadPos[i6 + 5] = tz;
        } else {
          if (awake[i] && d2 <= 0.05) settled++;
          threadPos[i6] = threadPos[i6 + 3] = pos[i3];
          threadPos[i6 + 1] = threadPos[i6 + 4] = pos[i3 + 1];
          threadPos[i6 + 2] = threadPos[i6 + 5] = pos[i3 + 2];
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      threadGeo.attributes.position.needsUpdate = true;

      // The objective meter
      if (progressEl && frame % 10 === 0) {
        progressEl.style.width = Math.round(settled / N * 100) + "%";
      }

      // Sorted? The whole structure lifts — a step higher every time.
      if (act === 2 && frame % 12 === 0 && settled / N > 0.96) {
        act = 3;
        targetGroupY = Math.min(targetGroupY + 0.1, 0.2);
        gsap.to(group.position, { y: targetGroupY, duration: 1.4, ease: "back.out(1.5)" });
        if (!sortedOnce) {
          sortedOnce = true;
          setCaption("chaos, sorted. let’s raise the bar together.");
        }
      }

      group.rotation.y = Math.sin(t * 0.35) * 0.14;
      group.rotation.x = Math.cos(t * 0.28) * 0.06;
      renderer.render(scene, camera);
    });

    window.addEventListener("resize", function () {
      var s = wrap.clientWidth;
      renderer.setSize(s, s);
    });
  }

  ScrollTrigger.create({
    trigger: ".contact",
    start: "top bottom+=600",
    once: true,
    onEnter: function () {
      if (chaosStarted || !window.WebGLRenderingContext) return;
      chaosStarted = true;
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js";
      s.onload = function () { try { buildChaos(); } catch (e) { /* section stands on its own */ } };
      document.head.appendChild(s);
    }
  });

  /* ---------- Contact title + inner reveal ---------- */
  gsap.fromTo(".contact-text, .contact-mail, .contact-meta", { opacity: 0, y: 30 }, {
    opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.12,
    scrollTrigger: { trigger: ".contact-inner", start: "top 70%" }
  });

  /* ---------- Magnetic elements ---------- */
  if (isFinePointer) {
    document.querySelectorAll(".magnetic").forEach(function (el) {
      var strength = 22;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        gsap.to(el, { x: (x / r.width) * strength, y: (y / r.height) * strength, duration: 0.4, ease: "power3.out" });
      });
      el.addEventListener("pointerleave", function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ---------- Custom cursor ---------- */
  if (isFinePointer) {
    var cursor = document.querySelector(".cursor");
    var label = cursor.querySelector(".cursor-label");
    var cx = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3.out" });
    var cy = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3.out" });
    window.addEventListener("pointermove", function (e) {
      cursor.classList.add("is-live");
      cx(e.clientX); cy(e.clientY);
    }, { passive: true });

    document.querySelectorAll('[data-cursor="hover"], a, button').forEach(function (el) {
      el.addEventListener("pointerenter", function () { cursor.classList.add("is-hover"); });
      el.addEventListener("pointerleave", function () { cursor.classList.remove("is-hover"); });
    });
    document.querySelectorAll('[data-cursor="drag"]').forEach(function (el) {
      el.addEventListener("pointerenter", function () {
        cursor.classList.add("is-drag");
        label.textContent = "scroll";
      });
      el.addEventListener("pointerleave", function () { cursor.classList.remove("is-drag"); });
    });
  }

  /* ---------- Refresh after fonts/images settle ---------- */
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });

})();
