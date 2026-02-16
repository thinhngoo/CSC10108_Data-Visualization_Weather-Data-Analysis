import { loadData, cleanData } from "./loaders/index.js";
import { drawLineTemp } from "./charts/lineTemp.js";
import { drawBarRegion } from "./charts/barRegion.js";
import { drawScatterUV } from "./charts/scatterUV.js";
import { renderDatasetPage } from "./pages/dataset.js";

let cachedData = null;

async function loadAllData() {
  if (cachedData) return cachedData;
  const raw = await loadData();
  const cleaned = cleanData(raw);
  cachedData = { raw, cleaned };
  return cachedData;
}

function renderHome(data) {
  const lineEl = document.getElementById("line-temp");
  const barEl = document.getElementById("bar-region");
  const scatterEl = document.getElementById("scatter-uv");
  if (!lineEl || !barEl || !scatterEl) return;

  lineEl.innerHTML = "";
  barEl.innerHTML = "";
  scatterEl.innerHTML = "";

  drawLineTemp(data);
  drawBarRegion(data);
  drawScatterUV(data);
}

function renderDataset(containerEl, mode, rawData, cleanedData) {
  if (!containerEl) return;
  renderDatasetPage(containerEl, mode, rawData, cleanedData);
}

function getRouteFromPath() {
  const path = location.pathname.replace(/\/$/, "") || "/";
  if (path === "/") return "home";
  if (path === "/dataset/raw") return "dataset-raw";
  if (path === "/dataset/cleaning") return "dataset-cleaning";
  return "home";
}

async function initPage() {
  const route = getRouteFromPath();
  const { raw, cleaned } = await loadAllData();

  if (route === "home") renderHome(cleaned);
  else if (route === "dataset-raw")
    renderDataset(document.getElementById("page-dataset"), "raw", raw, cleaned);
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
