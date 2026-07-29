# Zaakirah Dawood-Hawa — Portfolio

A scroll-driven personal portfolio, designed as a story rather than a resume.

**Stack:** hand-built static site — semantic HTML, modern CSS, GSAP 3 + ScrollTrigger + Lenis for the scroll narrative. No build step, no framework; deploys anywhere that serves static files.

## Run locally

Serve the folder with any static server, e.g.:

```
python -m http.server 8000
```

then open http://localhost:8000.

## Deploy (GitHub Pages)

Push this folder to a repository, then enable **Settings → Pages → Deploy from branch** (`main`, root). The site is fully static and works from a project subpath.

## Notes

- `?static=1` renders the site with all animation disabled (also used by the reduced-motion and no-JS fallbacks).
- Content honors `prefers-reduced-motion` and degrades gracefully without JavaScript.
