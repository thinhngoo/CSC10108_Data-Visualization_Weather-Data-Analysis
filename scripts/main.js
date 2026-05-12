import { loadData, cleanData } from "./loaders/index.js";
import { renderDatasetPage } from "./pages/dataset.js";
import { drawScatterUVTemp }   from "./charts/scatterUVTemp.js";
import { drawLineDaylight }    from "./charts/lineDaylight.js";
import { drawScatterDaylight } from "./charts/scatterDaylight.js";

let cachedData = null;

async function loadAllData() {
  if (cachedData) return cachedData;
  const raw = await loadData();
  const cleaned = cleanData(raw);
  cachedData = { raw, cleaned };
  return cachedData;
}

function renderAnalysis(data) {
  const q10El = document.getElementById("scatter-uv-temp");
  const q11El = document.getElementById("line-daylight");
  const q12El = document.getElementById("scatter-daylight");
  if (!q10El || !q11El || !q12El) return;

  q10El.innerHTML = "";
  q11El.innerHTML = "";
  q12El.innerHTML = "";

  drawScatterUVTemp(data);
  drawLineDaylight(data);
  drawScatterDaylight(data);
}

function renderDataset(containerEl, mode, rawData, cleanedData) {
  if (!containerEl) return;
  renderDatasetPage(containerEl, mode, rawData, cleanedData);
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
  const { raw, cleaned } = await loadAllData();

  if (route === "dataset-raw")
    renderDataset(document.getElementById("page-dataset"), "raw", raw, cleaned);
  else if (route === "analysis") renderAnalysis(cleaned);
  else if (route === "dataset-cleaning")
    renderDataset(
      document.getElementById("page-dataset"),
      "cleaning",
      raw,
      cleaned,
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
