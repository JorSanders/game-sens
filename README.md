# Overwatch 1:1 Scoped Sensitivity — Calculator & Explainer

A static site that explains how Overwatch's **Relative Aim Sensitivity While Zoomed**
setting works, why no single value can be 1:1 everywhere on a flat monitor, and lets you
compute the per-hero value that is exactly 1:1 at the point on screen you choose
(crosshair → edge, the "monitor distance" spectrum).

- **Interactive calculator** — hipfire FOV (80–103) and monitor distance (0–100%) sliders,
  live per-hero results.
- **Charts** — one exact-match curve per hero, an all-hero overview, and a comparison bar
  chart (Chart.js from cdnjs, recomputed live).
- **Full write-up** — the tangent vs. linear methods, the flat-screen tangent
  stretch, why 0% monitor distance is recommended for aiming, and all formulas.

No build step. Vanilla HTML + CSS + JS with relative paths, so it works from any subpath.

## Files

```
index.html      the whole site (calculator, charts, article, FAQ, JSON-LD)
css/style.css   styles (responsive, light/dark, WCAG AA)
js/app.js       formulas, calculator, Chart.js setup
favicon.svg     favicon
.nojekyll       disables Jekyll processing on GitHub Pages
robots.txt      crawler policy + sitemap pointer
sitemap.xml     sitemap
```

## Deploying to GitHub Pages

1. Create a repository on GitHub (e.g. `ow-sens`) and push this directory to it:

   ```sh
   git init
   git add .
   git commit -m "Overwatch scoped sensitivity site"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Build and deployment**, set **Source** to
   *Deploy from a branch*, pick branch **main** and folder **/ (root)**, then **Save**.

3. Wait for the Pages deployment to finish (Actions tab). The site will be live at
   `https://ow-sens.jor.dev/`.

## The math

With `F1` = hipfire horizontal FOV, `F2` = scoped horizontal FOV, `p` = monitor-distance
fraction (0…1), angles in degrees:

- Linear / FOV-ratio (100% monitor distance): `sens% = F2 / F1 × 100`
- Tangent ("true 1:1", 0% monitor distance): `sens% = tan(F2/2) / tan(F1/2) × 100`
- General (exact at monitor distance `p`):
  `sens%(p) = atan(p·tan(F2/2)) / atan(p·tan(F1/2)) × 100`

## Data disclaimer

Scoped-FOV values and 1:1 figures are community-derived (Blizzard forums / reddit), not
official Blizzard data, and assume a 16:9 aspect ratio. Emre's and Freja's scoped FOVs are
approximate (back-solved from community values). Overwatch is a trademark of Blizzard
Entertainment; this is an unofficial fan resource.
