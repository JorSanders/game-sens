# 1:1 Aim

Live at **https://game-sens.jor.dev/**

A static site about achieving 1:1 aim across Overwatch, CS2, Valorant, Apex Legends, and Marvel Rivals —
any weapon, any zoom. Crosshair-matched (0% monitor distance) settings up front, then the
explanation: what 1:1 actually means, which interpretation to pick, how FOV and the
flat-screen tangent stretch come into play, per-game yaw values, eDPI, and per-game zoom
value tables with sources.

- **Settings** — per-game base sens + scoped values, ready to copy (1600 DPI, 16:9).
- **Write-up** — what 1:1 means, which 1:1 to pick, FOV, the formulas, yaw, eDPI.
- **Cross-game calculator** — enter any base game/sens/DPI, get 0% matches for every game
  with a pro-eDPI sanity check.
- **Chart** — the exact-1:1 curve per Overwatch scoped-FOV group (Chart.js from cdnjs).
- **Zoom values** — per-game tables (Overwatch heroes, CS2 zoom levels, Valorant weapons,
  Apex optics) with community sources.

No build step. Vanilla HTML + CSS + JS with relative paths.

## Files

```
index.html      the whole site (tables, calculator, chart, article, JSON-LD)
css/style.css   styles (responsive, light/dark, WCAG AA)
js/app.js       hero data, formulas, calculator, Chart.js setup
favicon.svg     favicon
CNAME           custom domain for GitHub Pages (game-sens.jor.dev)
.nojekyll       disables Jekyll processing on GitHub Pages
robots.txt      crawler policy + sitemap pointer
sitemap.xml     sitemap
```

## Deployment

Hosted on GitHub Pages from the `main` branch, root folder, with the custom domain
`game-sens.jor.dev` (CNAME record pointing to `jorsanders.github.io`). Pushing to `main`
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
