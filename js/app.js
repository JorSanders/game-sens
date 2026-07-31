/* ==========================================================================
   game-sens — scoped sensitivity math, chart, and cross-game hipfire calculator
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
   computed. Community sources for these values are listed in index.html. */
const HEROES = [
  { name: "Ana",        fov2: 50.94 },
  { name: "Widowmaker", fov2: 50.94 },
  { name: "Ashe",       fov2: 65.81 },
  { name: "Cassidy",    fov2: 65.81 },
  { name: "Emre",       fov2: 69.02 },
  { name: "Freja",      fov2: 76.31 },
];

/* Heroes sharing the same scoped FOV have identical curves, so charts show
   one series per FOV group (e.g. "Ana / Widowmaker"). */
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

/* ----------------------- cross-game hipfire matching --------------------- */
/* 0% hipfire match across games: equal on-screen movement per cm at the
   crosshair means equal yaw·sens / tan(F/2), with F the actual 16:9 hFOV.
   yaw = degrees of rotation per mouse count per sensitivity unit. */

const hipBase       = document.getElementById("hip-base");
const hipSens       = document.getElementById("hip-sens");
const hipDpi        = document.getElementById("hip-dpi");
const hipOwFov      = document.getElementById("hip-ow-fov");
const hipOwFovOut   = document.getElementById("hip-ow-fov-value");
const hipApexFov    = document.getElementById("hip-apex-fov");
const hipApexFovOut = document.getElementById("hip-apex-fov-value");
const hipDlFov      = document.getElementById("hip-dl-fov");
const hipDlFovOut   = document.getElementById("hip-dl-fov-value");
const hipCs2Aspect  = document.getElementById("hip-cs2-aspect");
const hipStatus     = document.getElementById("hip-status");
const hipBody       = document.querySelector("#hipfire-table tbody");

/* proEdpi = the eDPI band most pros run (sources in the approach section). */
const HIP_GAMES = {
  overwatch: { label: "Overwatch",    yaw: 0.0066, proEdpi: [3200, 5600], t: () => Math.tan((Number(hipOwFov.value) / 2) * DEG) },
  /* 4:3 stretched renders a 90-degree (tan = 1) image across the full monitor
     width, so horizontal on-screen speed at the crosshair scales by 4/3;
     black bars keep the 16:9 focal length and aim identically to 16:9. */
  cs2:       { label: "CS2",          yaw: 0.022,  proEdpi: [600, 1200],  t: () => (hipCs2Aspect.value === "4:3 stretched" ? 1 : 4 / 3) },
  valorant:  { label: "Valorant",     yaw: 0.07,   proEdpi: [200, 400],   t: () => Math.tan((103 / 2) * DEG) },
  apex:      { label: "Apex Legends", yaw: 0.022,  proEdpi: [600, 1600],  t: () => (4 / 3) * Math.tan((Number(hipApexFov.value) / 2) * DEG) },
  /* Fixed FOV, community-measured ~90 deg 16:9 -> tan(45 deg) = 1.
     Yaw is the measured pi/180, not the often-quoted Unreal 0.022. */
  rivals:    { label: "Marvel Rivals", yaw: 0.017453, proEdpi: [1000, 2000], t: () => 1 },
  /* Source 2, same yaw as CS2. The Camera FOV slider is horizontal 16:9,
     range 75-90 (sources in the Deadlock zoom section). */
  deadlock:  { label: "Deadlock",     yaw: 0.022,  proEdpi: [680, 1200],  t: () => Math.tan((Number(hipDlFov.value) / 2) * DEG) },
};

function renderRow(tbody, name, cells, highlightIndex) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = name;
  tr.appendChild(th);
  cells.forEach((cell, i) => {
    const td = document.createElement("td");
    if (typeof cell === "object" && cell !== null) {
      td.textContent = cell.text;
      if (cell.className) td.className = cell.className;
    } else {
      td.textContent = cell;
    }
    if (i === highlightIndex) td.classList.add("your-value");
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
}

function renderHipfireTable() {
  const base = HIP_GAMES[hipBase.value];
  const sensBase = Math.max(Number(hipSens.value) || 0, 0);
  const dpi = Math.max(Number(hipDpi.value) || 0, 0);
  const tBase = base.t();

  hipBody.innerHTML = "";
  for (const [key, game] of Object.entries(HIP_GAMES)) {
    const t = game.t();
    const sens = sensBase * (base.yaw / game.yaw) * (t / tBase);
    const sensCm = sensBase * (base.yaw / game.yaw); // FOV-blind cm/360 match
    const fov = (2 * Math.atan(t)) / DEG;
    const cm = sens > 0 && dpi > 0 ? (360 * 2.54) / (game.yaw * sens * dpi) : NaN;

    // eDPI of the value you'd actually enter (the sens rounded to 3 decimals)
    const edpi = sens > 0 && dpi > 0 ? Number(sens.toFixed(3)) * dpi : NaN;
    const [lo, hi] = game.proEdpi;
    let proCell;
    if (!Number.isFinite(edpi)) {
      proCell = { text: `≈${lo}–${hi}` };
    } else if (edpi < lo) {
      proCell = { text: `✗ below ≈${lo}–${hi}`, className: "range-bad" };
    } else if (edpi > hi) {
      proCell = { text: `✗ above ≈${lo}–${hi}`, className: "range-bad" };
    } else {
      const pos = (edpi - lo) / (hi - lo);
      const spot = pos < 1 / 3 ? "lower end" : pos < 2 / 3 ? "middle" : "upper end";
      proCell = { text: `✓ ${spot} of ≈${lo}–${hi}`, className: "range-ok" };
    }

    renderRow(hipBody, game.label + (key === hipBase.value ? " (base)" : ""), [
      sens.toFixed(3),
      sensCm.toFixed(3),
      Number.isFinite(edpi) ? String(Math.round(edpi)) : "—",
      proCell,
      fmt(fov) + "°",
      Number.isFinite(cm) ? cm.toFixed(1) + " cm" : "—",
    ], 0);
  }
}

/* Announce what actually changed (also read by screen readers via aria-live). */
function announceHipfireUpdate(change) {
  hipStatus.textContent = `Table updated: ${change}.`;
}

/* Switching base game keeps the aim: the base sens is converted to the newly
   selected game's equivalent 0% value (e.g. Overwatch 2.28 -> Valorant 0.215). */
let prevBase = hipBase.value;
hipBase.addEventListener("input", () => {
  const oldGame = HIP_GAMES[prevBase];
  const newGame = HIP_GAMES[hipBase.value];
  const sens = Math.max(Number(hipSens.value) || 0, 0);
  if (sens > 0 && prevBase !== hipBase.value) {
    const converted = sens * (oldGame.yaw / newGame.yaw) * (newGame.t() / oldGame.t());
    hipSens.value = String(Number(converted.toFixed(3)));
  }
  prevBase = hipBase.value;
  renderHipfireTable();
  announceHipfireUpdate(
    `base switched to ${newGame.label}, sensitivity ${hipSens.value}`);
});

const INPUT_ANNOUNCEMENTS = [
  [hipSens,      () => `base sensitivity ${hipSens.value}`],
  [hipDpi,       () => `mouse DPI ${hipDpi.value}`],
  [hipCs2Aspect, () => `CS2 aspect ratio ${hipCs2Aspect.value}`],
];
for (const [el, message] of INPUT_ANNOUNCEMENTS) {
  el.addEventListener("input", () => {
    renderHipfireTable();
    announceHipfireUpdate(message());
  });
}
hipOwFov.addEventListener("input", () => {
  hipOwFovOut.textContent = hipOwFov.value;
  renderHipfireTable();
  announceHipfireUpdate(`Overwatch FOV ${hipOwFov.value}°`);
});
hipApexFov.addEventListener("input", () => {
  hipApexFovOut.textContent = hipApexFov.value;
  renderHipfireTable();
  announceHipfireUpdate(`Apex FOV ${hipApexFov.value}`);
});
hipDlFov.addEventListener("input", () => {
  hipDlFovOut.textContent = hipDlFov.value;
  renderHipfireTable();
  announceHipfireUpdate(`Deadlock Camera FOV ${hipDlFov.value}°`);
});

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

/** Build (once) the overview chart, fixed at the default 103 FOV. */
function buildCharts() {
  const theme = chartTheme();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Chart.defaults.animation = reducedMotion ? false : { duration: 400 };
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;

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

// The default table state is baked into the HTML (no layout shift, works
// without JS). Re-render once in case the browser restored input values.
renderHipfireTable();

// Chart.js is loaded with `defer` before this script, so it's available here;
// guard anyway in case the CDN is blocked — the page still works without it.
if (typeof Chart !== "undefined") {
  buildCharts();
} else {
  document.getElementById("math").insertAdjacentHTML(
    "beforeend",
    '<p class="fineprint">Chart could not load (Chart.js CDN unavailable). The rest of the page still works.</p>'
  );
}
