export function renderDatasetPage(container, mode, rawData, cleanedData) {
  container.innerHTML = "";

  if (mode === "raw") {
    const section = createDataSection("Raw Data", "Loaded from CSV", rawData, false);
    container.appendChild(section);
  } else {
    const section = createDataSection(
      "Cleaned Data",
      "After filtering and transformation",
      cleanedData,
      true
    );
    container.appendChild(section);
  }
}

function createDataSection(title, metaText, data, formatDates) {
  const section = document.createElement("section");
  section.className = "dataset-section";
  section.innerHTML = `
    <h2>${escapeHtml(title)}</h2>
    <p class="dataset-meta">${escapeHtml(metaText)} — ${data.length} rows</p>
    <div class="dataset-table-wrapper">
      <table class="dataset-table">
        <thead></thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  const headers = data[0] ? Object.keys(data[0]) : [];
  const table = section.querySelector("table");
  table.querySelector("thead").innerHTML = `<tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  table.querySelector("tbody").innerHTML = data
    .slice(0, 200)
    .map(
      (row) =>
        `<tr>${headers.map((h) => `<td>${escapeHtml(formatCell(row[h], formatDates))}</td>`).join("")}</tr>`
    )
    .join("");

  if (data.length > 200) {
    section.querySelector(".dataset-meta").textContent += " (showing first 200)";
  }

  return section;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatCell(value, formatDates) {
  if (value == null) return "";
  if (formatDates && value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}
