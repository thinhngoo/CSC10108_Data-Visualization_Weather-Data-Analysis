import {
  loadCleanedDataset,
  loadRawDataset,
  parseForCharts,
} from "./loaders/index.js";
import { renderDatasetPage } from "./pages/dataset.js";
import { drawQ7 } from "./charts/7-9/q7.js";
import { drawQ8 } from "./charts/7-9/q8.js";
import { drawQ9 } from "./charts/7-9/q9.js";
import { drawQ10 } from "./charts/10-12/q10.js";
import { drawQ11 } from "./charts/10-12/q11.js";
import { drawQ12 } from "./charts/10-12/q12.js";

import { drawQ1 } from "./charts/1-3/q1.js";
import { drawQ2 } from "./charts/1-3/q2.js";
import { drawQ3 } from "./charts/1-3/q3.js";
import { drawQ5 } from "./charts/4-6/q5.js";
import { drawQ6 } from "./charts/4-6/q6.js";

let cachedData = null;

async function loadAllData() {
  if (cachedData) return cachedData;
  const [raw, cleaned] = await Promise.all([
    loadRawDataset(),
    loadCleanedDataset(),
  ]);
  const chartRows = parseForCharts(cleaned);
  cachedData = { raw, chartRows };
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

  if (q1El) drawQ1(data);
  if (q2El) drawQ2(data);
  if (q3El) drawQ3(data);
  if (q5El) drawQ5(data);
  if (q6El) drawQ6(data);

  drawQ7(data);
  drawQ8(data);
  drawQ9(data);
  drawQ10(data);
  drawQ11(data);
  drawQ12(data);
}

function renderDataset(containerEl, mode, rows) {
  if (!containerEl) return;
  renderDatasetPage(containerEl, mode, rows);
}

function getRouteFromPath() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/" || path === "/analysis") return "analysis";
  if (path === "/dataset/raw") return "dataset-raw";
  if (path === "/dataset/cleaning") return "dataset-cleaning";
  return "analysis";
}

async function initPage() {
  const route = getRouteFromPath();
  const { raw, chartRows } = await loadAllData();

  if (route === "dataset-raw")
    renderDataset(document.getElementById("page-dataset"), "raw", raw);
  else if (route === "analysis") renderAnalysis(chartRows);
  else if (route === "dataset-cleaning")
    renderDataset(document.getElementById("page-dataset"), "cleaning", raw);
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
