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
    var tp = document.getElementById("typedPrompt");
    if (tp) tp.textContent = "Draft 3 subject lines for the QPlant launch email — confident, human, under 50 characters.";
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
    var inner = ch.querySelectorAll(".chapter-meta, .chapter-title, .chapter-role, .chapter-text, .chapter-quote");
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
  var promptText = "Draft 3 subject lines for the QPlant launch email — confident, human, under 50 characters.";
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
