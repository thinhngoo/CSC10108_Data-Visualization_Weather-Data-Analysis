/** Max rows rendered into the DOM after filtering & sorting (full data still filtered). */
const PREVIEW_ROWS = 200;

const DEBOUNCE_MS = 180;

export function renderDatasetPage(container, mode, raw, refined) {
  container.innerHTML = "";

  if (mode === "raw") {
    container.appendChild(createInteractiveTableSection("Raw Data", raw));
  } else {
    container.appendChild(createInteractiveTableSection("Refined Data", refined));
  }
}

function createInteractiveTableSection(title, rows) {
  const section = document.createElement("section");
  section.className = "dataset-section";

  const headers = rows[0] ? Object.keys(rows[0]) : [];

  section.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p class="dataset-meta">
      ${escapeHtml("Loaded from CSV")} —
      <span class="dataset-total-rows">${rows.length}</span> rows
      <span class="dataset-filter-summary"></span>
    </p>
    <div class="dataset-table-toolbar">
      <label class="dataset-search-wrap">
        <span class="dataset-search-label">Search</span>
        <input
          type="search"
          class="dataset-global-search"
          placeholder="Search all columns…"
          autocomplete="off"
        />
      </label>
      <button type="button" class="dataset-clear-btn">Clear</button>
    </div>
    <div class="dataset-table-wrapper">
      <table class="dataset-table">
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const thead = section.querySelector("thead");
  const tbody = section.querySelector("tbody");
  const summaryEl = section.querySelector(".dataset-filter-summary");
  const searchInput = section.querySelector(".dataset-global-search");
  const clearBtn = section.querySelector(".dataset-clear-btn");

  let searchQuery = "";
  let sortColumn = null;
  let sortDir = "asc";
  let debounceId = null;

  function rowMatchesGlobalSearch(row) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return headers.some((h) =>
      String(row[h] ?? "")
        .toLowerCase()
        .includes(q),
    );
  }

  function buildThead() {
    const labelRow = document.createElement("tr");

    headers.forEach((h) => {
      const thLab = document.createElement("th");
      thLab.className = "dataset-th-sort";
      thLab.scope = "col";
      thLab.dataset.column = h;
      const label = document.createElement("button");
      label.type = "button";
      label.className = "dataset-sort-btn";
      label.title = `Sort by ${h}`;
      const text = document.createElement("span");
      text.textContent = h;
      text.className = "dataset-sort-label";
      const ind = document.createElement("span");
      ind.className = "dataset-sort-ind";
      ind.setAttribute("aria-hidden", "true");
      label.appendChild(text);
      label.appendChild(ind);
      thLab.appendChild(label);

      labelRow.appendChild(thLab);
    });

    thead.replaceChildren(labelRow);
    syncSortIndicators();
  }

  function syncSortIndicators() {
    thead.querySelectorAll(".dataset-sort-btn").forEach((btn) => {
      const col = btn.closest("th").dataset.column;
      const ind = btn.querySelector(".dataset-sort-ind");
      if (col === sortColumn) {
        ind.textContent = sortDir === "asc" ? " ↑" : " ↓";
        btn.setAttribute("aria-sort", sortDir === "asc" ? "ascending" : "descending");
      } else {
        ind.textContent = "";
        btn.removeAttribute("aria-sort");
      }
    });
  }

  function applyFiltersAndSort() {
    let out = rows.filter((row) => rowMatchesGlobalSearch(row));

    if (sortColumn) {
      out = [...out].sort((a, b) => compareCells(a[sortColumn], b[sortColumn], sortDir));
    }

    const totalShown = Math.min(out.length, PREVIEW_ROWS);
    tbody.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let i = 0; i < totalShown; i++) {
      frag.appendChild(trForRow(headers, out[i]));
    }
    tbody.appendChild(frag);

    summaryEl.textContent =
      searchQuery.trim() !== ""
        ? ` · ${out.length} match · showing ${totalShown}`
        : sortColumn != null && out.length > PREVIEW_ROWS
          ? ` · showing ${PREVIEW_ROWS} of ${out.length}`
          : out.length > PREVIEW_ROWS
            ? ` · showing ${PREVIEW_ROWS} of ${out.length}`
            : "";
    return out;
  }

  function scheduleRebuild() {
    if (debounceId != null) clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      debounceId = null;
      applyFiltersAndSort();
    }, DEBOUNCE_MS);
  }

  function trForRow(hs, row) {
    const tr = document.createElement("tr");
    tr.innerHTML = hs
      .map((h) => `<td>${escapeHtml(row[h] ?? "")}</td>`)
      .join("");
    return tr;
  }

  buildThead();
  applyFiltersAndSort();

  thead.addEventListener("click", (e) => {
    const btn = e.target.closest(".dataset-sort-btn");
    if (!btn || !thead.contains(btn)) return;
    const col = btn.closest("th").dataset.column;
    if (col === sortColumn) {
      if (sortDir === "asc") sortDir = "desc";
      else {
        sortColumn = null;
        sortDir = "asc";
      }
    } else {
      sortColumn = col;
      sortDir = "asc";
    }
    syncSortIndicators();
    applyFiltersAndSort();
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    scheduleRebuild();
  });

  clearBtn.addEventListener("click", () => {
    searchQuery = "";
    searchInput.value = "";
    scheduleRebuild();
  });

  return section;
}

function compareCells(a, b, dir) {
  const mult = dir === "asc" ? 1 : -1;
  const sa = String(a ?? "").trim();
  const sb = String(b ?? "").trim();
  const na = Number(sa);
  const nb = Number(sb);
  const aNum =
    sa !== "" && !Number.isNaN(na) && /^-?\d*\.?\d+(e[+/-]?\d+)?$/i.test(sa);
  const bNum =
    sb !== "" && !Number.isNaN(nb) && /^-?\d*\.?\d+(e[+/-]?\d+)?$/i.test(sb);

  let cmp = 0;
  if (aNum && bNum) {
    cmp = na === nb ? 0 : na < nb ? -1 : 1;
  } else {
    cmp = sa.localeCompare(sb, "vi", {
      sensitivity: "base",
      numeric: true,
    });
  }
  return mult * cmp;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
