/* ==========================================================================
   ow-sens — Overwatch scoped sensitivity calculator & charts
   All math on this page comes from three formulas (F1, F2 in degrees,
   p = monitor-distance fraction 0..1):

     linear (100%):   sens% = (F2 / F1) * 100
     tangent (0%):    sens% = tan(F2/2) / tan(F1/2) * 100
     general:         sens%(p) = atan(p * tan(F2/2)) / atan(p * tan(F1/2)) * 100
                      (limit p->0 is the tangent formula)
   ========================================================================== */
"use strict";

/* ----------------------------- hero data ------------------------------- */
/* Scoped horizontal FOV (F2) is the source of truth; everything else is
   computed. Each hero links to the community source documenting the FOV or
   the 1:1 value it was back-solved from. */
const HEROES = [
  { name: "Ana",        fov2: 50.94,
    source: { label: "Blizzard forums (FOV 50.94, 37.89%)", url: "https://us.forums.blizzard.com/en/overwatch/t/scoped-unscoped-11-is-4946-not-3789-on-anawidow/795597" } },
  { name: "Widowmaker", fov2: 50.94,
    source: { label: "Blizzard forums (FOV 50.94, 37.89%)", url: "https://us.forums.blizzard.com/en/overwatch/t/scoped-unscoped-11-is-4946-not-3789-on-anawidow/795597" } },
  { name: "Ashe",       fov2: 66,
    source: { label: "Blizzard forums (51.47%)", url: "https://us.forums.blizzard.com/en/overwatch/t/ashe-zoom-sensitivity/609782" } },
  { name: "Cassidy",    fov2: 66,
    source: { label: "Blizzard forums (51.47%, same as Ashe)", url: "https://us.forums.blizzard.com/en/overwatch/t/any-tips-for-settings/993665?page=2" } },
  { name: "Emre",       fov2: 69.3,
    source: { label: "Blizzard forums (measured, 54.69%)", url: "https://us.forums.blizzard.com/en/overwatch/t/emre-relative-aim-sensitivity/1000383" } },
  { name: "Freja",      fov2: 76.3,
    source: { label: "@Renanthera on X (62.50%)", url: "https://x.com/Renanthera/status/1903563534036029807" } },
];

/* Heroes sharing the same scoped FOV have identical curves, so charts show
   one series per FOV group (e.g. "Ana / Widowmaker"). The calculator table
   stays per-hero. */
const GROUPS = (() => {
  const byFov = new Map();
  for (const hero of HEROES) {
    if (!byFov.has(hero.fov2)) byFov.set(hero.fov2, { names: [], fov2: hero.fov2 });
    byFov.get(hero.fov2).names.push(hero.name);
  }
  return [...byFov.values()].map((g) => ({ name: g.names.join(" / "), fov2: g.fov2 }));
})();

/* Dash patterns so chart series are never distinguished by color alone. */
const DASH_PATTERNS = [[], [8, 4], [2, 3], [12, 4, 3, 4], [6, 6], [1, 4]];
const HERO_COLORS = ["#0e918c", "#c4367a", "#1bc4b9", "#e8699a"];

const DEG = Math.PI / 180; // degrees -> radians

/* ------------------------------ formulas -------------------------------- */

/** Linear / FOV-ratio method — 100% monitor distance. */
function sensLinear(f1, f2) {
  return (f2 / f1) * 100;
}

/** Tangent method ("true 1:1") — 0% monitor distance. */
function sensTangent(f1, f2) {
  return (Math.tan((f2 / 2) * DEG) / Math.tan((f1 / 2) * DEG)) * 100;
}

/** General formula: exact 1:1 for a target at monitor-distance p (0..1). */
function sensAt(f1, f2, p) {
  if (p <= 1e-9) return sensTangent(f1, f2); // limit as p -> 0
  return (
    (Math.atan(p * Math.tan((f2 / 2) * DEG)) /
      Math.atan(p * Math.tan((f1 / 2) * DEG))) * 100
  );
}

const fmt = (x) => x.toFixed(2);

/* ------------------------------ DOM refs -------------------------------- */
const fovSlider = document.getElementById("fov-slider");
const mdSlider  = document.getElementById("md-slider");
const fovValue  = document.getElementById("fov-value");
const mdValue   = document.getElementById("md-value");
const statusEl  = document.getElementById("calc-status");
const tableBody = document.querySelector("#calc-table tbody");

/* -------------------------- recommended table --------------------------- */

/* Fixed reference values: crosshair-matched (0%) at the default 103 FOV. */
function renderRecommended() {
  const tbody = document.querySelector("#rec-table tbody");
  for (const hero of HEROES) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = hero.name;
    tr.appendChild(th);
    const td = document.createElement("td");
    td.className = "your-value";
    td.textContent = fmt(sensTangent(103, hero.fov2)) + "%";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

/* Render the source list below the calculator table (deduplicated by URL). */
function renderSources() {
  const ul = document.getElementById("source-list");
  const seen = new Set();
  for (const hero of HEROES) {
    if (seen.has(hero.source.url)) continue;
    seen.add(hero.source.url);
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = hero.source.url;
    a.textContent = hero.source.label;
    a.rel = "noopener";
    li.appendChild(a);
    ul.appendChild(li);
  }
}

/* ----------------------------- calculator ------------------------------- */

function renderTable() {
  const f1 = Number(fovSlider.value);
  const p  = Number(mdSlider.value) / 100;

  tableBody.innerHTML = "";
  for (const hero of HEROES) {
    const tr = document.createElement("tr");

    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = hero.name;
    tr.appendChild(th);

    // Angular magnification of the scope relative to the current hipfire FOV.
    const zoom = Math.tan((f1 / 2) * DEG) / Math.tan((hero.fov2 / 2) * DEG);

    const cells = [
      fmt(sensTangent(f1, hero.fov2)) + "%",
      fmt(sensAt(f1, hero.fov2, p)) + "%",
      fmt(sensLinear(f1, hero.fov2)) + "%",
      zoom.toFixed(2) + "×",
      `${hero.fov2}°`,
    ];
    cells.forEach((text, i) => {
      const td = document.createElement("td");
      td.textContent = text;
      if (i === 1) td.className = "your-value";
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  }

  // aria-live announcement (polite): a short summary, not the whole table.
  statusEl.textContent =
    `Table updated for ${f1}° hipfire FOV at ${mdSlider.value}% monitor distance.`;
}

/* ------------------------------- charts --------------------------------- */

const CURVE_STEPS = 50; // p = 0 .. 1 in 2% steps
const pValues = Array.from({ length: CURVE_STEPS + 1 }, (_, i) => i / CURVE_STEPS);

let overviewChart = null;

/** Read theme-dependent chart colors from CSS custom properties. */
function chartTheme() {
  const css = getComputedStyle(document.documentElement);
  return {
    grid: css.getPropertyValue("--chart-grid").trim() || "#d9dde2",
    tick: css.getPropertyValue("--chart-tick").trim() || "#4c5560",
  };
}

function baseScales(theme) {
  return {
    x: {
      type: "linear",
      min: 0,
      max: 100,
      title: { display: true, text: "Target distance from crosshair (% of edge)", color: theme.tick },
      ticks: { color: theme.tick, callback: (v) => v + "%" },
      grid: { color: theme.grid },
    },
    y: {
      title: { display: true, text: "Exact-1:1 scoped sens (%)", color: theme.tick },
      ticks: { color: theme.tick },
      grid: { color: theme.grid },
    },
  };
}

function curveData(f1, f2) {
  return pValues.map((p) => ({ x: p * 100, y: sensAt(f1, f2, p) }));
}

/** Build (once) the overview chart. */
function buildCharts() {
  const theme = chartTheme();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Chart.defaults.animation = reducedMotion ? false : { duration: 400 };
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

  // The chart is intentionally static at the default FOV (the slider only
  // drives the calculator table). Don't read the slider here: browsers can
  // restore a moved slider position across reloads.
  const f1 = 103;

  /* ---- overview: all heroes' curves ---- */
  overviewChart = new Chart(document.getElementById("chart-overview"), {
    type: "line",
    data: {
      datasets: GROUPS.map((hero, i) => ({
        label: hero.name,
        data: curveData(f1, hero.fov2),
        borderColor: HERO_COLORS[i],
        borderDash: DASH_PATTERNS[i],
        pointRadius: 0,
        borderWidth: 2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: baseScales(theme),
      plugins: {
        legend: { labels: { color: theme.tick, usePointStyle: false } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}% at ${Math.round(ctx.parsed.x)}%`,
          },
        },
      },
    },
  });

  buildHiddenTable();
}

/** Screen-reader data table mirroring the chart (sampled every 10%, fixed at 103 FOV). */
function buildHiddenTable() {
  const f1 = 103;
  const samples = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const headers = ["Radius", ...GROUPS.map((h) => h.name)];
  const head = headers.map((h) => `<th scope="col">${h}</th>`).join("");
  const body = samples
    .map((s) => {
      const cells = GROUPS.map((h) => `<td>${fmt(sensAt(f1, h.fov2, s / 100))}%</td>`).join("");
      return `<tr><th scope="row">${s}%</th>${cells}</tr>`;
    })
    .join("");

  document.getElementById("chart-overview-table").innerHTML =
    `<table><caption>Exact-1:1 scoped sensitivity (%) by target radius, 103° hipfire FOV.</caption>` +
    `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/* ---------------------------- wire it all up ----------------------------- */

fovSlider.addEventListener("input", () => {
  fovValue.textContent = fovSlider.value;
  renderTable();
});

mdSlider.addEventListener("input", () => {
  mdValue.textContent = mdSlider.value;
  renderTable(); // monitor distance affects only the calculator, not the curves
});

// Rebuild chart theme colors when the OS color scheme flips.
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const theme = chartTheme();
  const all = [overviewChart].filter(Boolean);
  for (const chart of all) {
    for (const scale of Object.values(chart.options.scales)) {
      if (scale.grid) scale.grid.color = theme.grid;
      if (scale.ticks) scale.ticks.color = theme.tick;
      if (scale.title) scale.title.color = theme.tick;
    }
    if (chart.options.plugins.legend.labels) {
      chart.options.plugins.legend.labels.color = theme.tick;
    }
    chart.update("none");
  }
});

renderRecommended();
renderTable();
renderSources();

// Chart.js is loaded with `defer` before this script, so it's available here;
// guard anyway in case the CDN is blocked — calculator still works without it.
if (typeof Chart !== "undefined") {
  buildCharts();
} else {
  document.getElementById("monitor-distance").insertAdjacentHTML(
    "beforeend",
    '<p class="fineprint">Chart could not load (Chart.js CDN unavailable). The calculator below still works.</p>'
  );
}
