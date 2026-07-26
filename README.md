# Overwatch 1:1 Scoped Sens

Live at **https://ow-sens.jor.dev/**

A static site with per-hero 1:1 values for Overwatch's **Relative Aim Sensitivity While
Zoomed**, an interactive calculator, and an explanation of why no single value can be 1:1
everywhere on a flat monitor (the "monitor distance" spectrum).

- **Recommended values** — crosshair-matched (0% monitor distance) values at 103 FOV.
- **Interactive calculator** — hipfire FOV (80–103) and monitor distance (0–100%) sliders,
  live per-hero results.
- **Chart** — the exact-1:1 curve per scoped-FOV group (Chart.js from cdnjs).
- **Write-up** — what 1:1 means, the flat-screen tangent stretch, and the formulas.

No build step. Vanilla HTML + CSS + JS with relative paths.

## Files

```
index.html      the whole site (tables, calculator, chart, article, JSON-LD)
css/style.css   styles (responsive, light/dark, WCAG AA)
js/app.js       hero data, formulas, calculator, Chart.js setup
favicon.svg     favicon
CNAME           custom domain for GitHub Pages (ow-sens.jor.dev)
.nojekyll       disables Jekyll processing on GitHub Pages
robots.txt      crawler policy + sitemap pointer
sitemap.xml     sitemap
```

## Deployment

Hosted on GitHub Pages from the `main` branch, root folder, with the custom domain
`ow-sens.jor.dev` (CNAME record pointing to `jorsanders.github.io`). Pushing to `main`
deploys automatically.

## The math

With `F1` = hipfire horizontal FOV, `F2` = scoped horizontal FOV, `p` = monitor-distance
fraction (0…1), angles in degrees:

- Linear / FOV-ratio (100% monitor distance): `sens% = F2 / F1 × 100`
- Tangent ("true 1:1", 0% monitor distance): `sens% = tan(F2/2) / tan(F1/2) × 100`
- General (exact at monitor distance `p`):
  `sens%(p) = atan(p·tan(F2/2)) / atan(p·tan(F1/2)) × 100`

## Data disclaimer

There is no official or datamined source for the scoped FOVs. All values are
community-derived (reverse-engineered from cm/360 measurements, 16:9); sources are
linked on the site. Overwatch is a trademark of Blizzard Entertainment; this is an
unofficial fan resource.
