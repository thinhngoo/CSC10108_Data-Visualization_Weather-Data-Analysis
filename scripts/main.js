import {
  loadRawDataset,
  loadRefinedDataset,
  parseForCharts,
} from "./loaders/index.js";
import { renderDatasetPage } from "./pages/dataset.js";
import { drawBarCondition } from "./charts/barCondition.js";
import { drawBoxConditionTemp } from "./charts/boxConditionTemp.js";
import { drawRegionBars } from "./charts/regionBars.js";
import { drawScatterUVTemp } from "./charts/scatterUVTemp.js";
import { drawLineDaylight } from "./charts/lineDaylight.js";
import { drawScatterDaylight } from "./charts/scatterDaylight.js";

import { drawQ1Trend } from "./charts/q1Trend.js";
import { drawQ2Comparison } from "./charts/q2Comparison.js";
import { drawQ3MultiAttribute } from "./charts/q3MultiAttribute.js";
import { drawQ5Coastal } from "./charts/q5Coastal.js";
import { drawQ6RegionDensity } from "./charts/q6RegionDensity.js";

let cachedData = null;

async function loadAllData() {
  if (cachedData) return cachedData;
  const [raw, refined] = await Promise.all([loadRawDataset(), loadRefinedDataset()]);
  const chartRows = parseForCharts(refined);
  cachedData = { raw, refined, chartRows };
  return cachedData;
}

function renderAnalysis(data) {
  const q1El = document.getElementById("trend-temp");
  const q2El = document.getElementById("box-region-temp");
  const q3El = document.getElementById("combo-region-weather");
  const q5El = document.getElementById("q5-coastal");
  const q6El = document.getElementById("q6-region-density");
  const q7El = document.getElementById("bar-condition");
  const q8El = document.getElementById("box-condition-temp");
  const q9TempEl = document.getElementById("bar-region-temp");
  const q9HumEl = document.getElementById("bar-region-humidity");
  const q9PrecEl = document.getElementById("bar-region-precip");
  const q10El = document.getElementById("scatter-uv-temp");
  const q11El = document.getElementById("line-daylight");
  const q12El = document.getElementById("scatter-daylight");

  if (!q7El) return;

  if (q1El) q1El.innerHTML = "";
  if (q2El) q2El.innerHTML = "";
  if (q3El) q3El.innerHTML = "";
  if (q5El) q5El.innerHTML = "";
  if (q6El) q6El.innerHTML = "";
  q7El.innerHTML = "";
  q8El.innerHTML = "";
  q9TempEl.innerHTML = "";
  q9HumEl.innerHTML = "";
  q9PrecEl.innerHTML = "";
  q10El.innerHTML = "";
  q11El.innerHTML = "";
  q12El.innerHTML = "";

  if (q1El) drawQ1Trend(data);
  if (q2El) drawQ2Comparison(data);
  if (q3El) drawQ3MultiAttribute(data);
  if (q5El) drawQ5Coastal(data);
  if (q6El) drawQ6RegionDensity(data);

  drawBarCondition(data);
  drawBoxConditionTemp(data);
  drawRegionBars(data);
  drawScatterUVTemp(data);
  drawLineDaylight(data);
  drawScatterDaylight(data);
}

function renderDataset(containerEl, mode, raw, refined) {
  if (!containerEl) return;
  renderDatasetPage(containerEl, mode, raw, refined);
}

function getRouteFromPath() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/analysis") return "analysis";
  if (path === "/dataset/raw") return "dataset-raw";
  if (path === "/dataset/refined") return "dataset-refined";
  return "analysis";
}

async function initPage() {
  const route = getRouteFromPath();
  const { raw, refined, chartRows } = await loadAllData();

  if (route === "dataset-raw")
    renderDataset(document.getElementById("page-dataset"), "raw", raw, refined);
  else if (route === "analysis") renderAnalysis(chartRows);
  else if (route === "dataset-refined")
    renderDataset(
      document.getElementById("page-dataset"),
      "refined",
      raw,
      refined,
    );
}

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

function initSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const toggleBtn = document.getElementById("toggle-sidebar");
  const menuBtn = document.getElementById("navbar-menu-btn");

  const isMobile = () => window.innerWidth < 1024;

  function toggleSidebar() {
    if (isMobile()) {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("visible", sidebar.classList.contains("open"));
    } else {
      sidebar.classList.toggle("collapsed");
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        sidebar.classList.contains("collapsed"),
      );
    }
  }

  function closeSidebarOnMobile() {
    if (isMobile()) {
      sidebar.classList.remove("open");
      overlay.classList.remove("visible");
    }
  }

  toggleBtn?.addEventListener("click", toggleSidebar);
  menuBtn?.addEventListener("click", toggleSidebar);
  overlay?.addEventListener("click", closeSidebarOnMobile);

  document.querySelectorAll(".sidebar-link").forEach((link) => {
    link.addEventListener("click", closeSidebarOnMobile);
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) overlay.classList.remove("visible");
    else sidebar.classList.remove("open");
  });
}

function init() {
  initSidebar();
  initPage();
}

init();
