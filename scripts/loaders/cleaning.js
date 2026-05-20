const DISTINCT_LIST_MAX = 100;

const NUM_STRING_RE = /^-?\d*\.?\d+(e[+/-]?\d+)?$/i;

function isCellEmpty(val) {
  if (val == null || val === "") return true;
  if (typeof val === "string" && val.trim() === "") return true;
  return false;
}

function parsesAsNumericCell(val) {
  if (isCellEmpty(val)) return false;
  const s = String(val).trim();
  const n = Number(s);
  return !Number.isNaN(n) && NUM_STRING_RE.test(s);
}

function toNumber(val) {
  return Number(String(val).trim());
}

/** UTC-midnight-only → date-only display; otherwise date+time. */
function formatTemporalMs(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  const hasClock =
    d.getUTCHours() !== 0 ||
    d.getUTCMinutes() !== 0 ||
    d.getUTCSeconds() !== 0 ||
    d.getUTCMilliseconds() !== 0;
  if (hasClock) {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  }
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Parse cell to epoch ms for date/datetime columns.
 * Does not treat generic integer fields as dates (see NUM_STRING_RE path).
 */
function parseTemporalToMs(val) {
  if (isCellEmpty(val)) return null;
  const s = String(val).trim();

  if (NUM_STRING_RE.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    if (Math.abs(n) >= 1e12) return n;
    if (Math.abs(n) >= 1e9 && Math.abs(n) < 1e12) return n * 1000;
    return null;
  }

  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

/** Parses `%-I:%M %p`-style tokens; stats use ms offset from midnight in `[0, 86400000)`. */
function parseClock12hToMsSinceMidnight(val) {
  if (typeof d3 === "undefined" || typeof d3.timeParse !== "function")
    return null;
  if (isCellEmpty(val)) return null;
  const parseTime = d3.timeParse("%I:%M %p");
  const s = String(val).trim();
  const t = parseTime(s);
  const z = parseTime("12:00 AM");
  if (t == null || z == null) return null;
  const ms = t - z;
  return ((ms % 86400000) + 86400000) % 86400000;
}

function formatTimeOfDayMs(ms) {
  if (ms == null || Number.isNaN(ms) || !Number.isFinite(ms)) return "—";
  const wrap = ((Math.round(ms) % 86400000) + 86400000) % 86400000;
  const totalMin = Math.floor(wrap / 60000);
  let h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const ap = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

function classifyColumns(headers, rows) {
  const stringCols = [];
  const numericCols = [];
  const temporalInstantCols = [];
  const temporalWallClockCols = [];

  for (const h of headers) {
    let sawValue = false;
    let allNumeric = true;
    let allWallClock = true;
    let allInstantTemporal = true;

    for (const row of rows) {
      const v = row[h];
      if (isCellEmpty(v)) continue;
      sawValue = true;
      if (!parsesAsNumericCell(v)) allNumeric = false;

      const wc = parseClock12hToMsSinceMidnight(v);
      if (wc == null || !Number.isFinite(wc)) allWallClock = false;

      const ti = parseTemporalToMs(v);
      if (ti == null || !Number.isFinite(ti)) allInstantTemporal = false;
    }

    if (!sawValue) continue;
    if (allNumeric) {
      numericCols.push(h);
    } else if (allInstantTemporal) {
      temporalInstantCols.push(h);
    } else if (allWallClock) {
      temporalWallClockCols.push(h);
    } else {
      stringCols.push(h);
    }
  }

  return {
    stringCols,
    numericCols,
    temporalInstantCols,
    temporalWallClockCols,
  };
}

function formatStatNumber(x) {
  if (x == null || Number.isNaN(x)) return "—";
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x) >= 1e9) return x.toExponential(4);
  const rounded =
    Number.isInteger(x) || Math.abs(x - Math.round(x)) < 1e-9
      ? String(Math.round(x))
      : (() => {
          const f = Number.parseFloat(x.toPrecision(12));
          return String(f)
            .replace(/(\.\d*?[1-9])0+$/, "$1")
            .replace(/\.$/, "");
        })();
  return rounded;
}

function medianOfSorted(sorted) {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function modesOfNumbers(values) {
  const freq = new Map();
  for (const v of values) {
    freq.set(v, (freq.get(v) ?? 0) + 1);
  }
  let max = 0;
  for (const c of freq.values()) {
    if (c > max) max = c;
  }
  const modes = [...freq.entries()]
    .filter(([, c]) => c === max)
    .map(([v]) => v)
    .sort((a, b) => a - b);
  return modes;
}

function collectNumericSamples(rows, key) {
  const out = [];
  for (const row of rows) {
    if (isCellEmpty(row[key])) continue;
    out.push(toNumber(row[key]));
  }
  return out;
}

function collectTemporalSamples(rows, key, chronology) {
  const parse =
    chronology === "wallClock"
      ? parseClock12hToMsSinceMidnight
      : parseTemporalToMs;
  const out = [];
  for (const row of rows) {
    if (isCellEmpty(row[key])) continue;
    const ms = parse(row[key]);
    if (ms != null && Number.isFinite(ms)) out.push(ms);
  }
  return out;
}

function collectDistinctStrings(rows, key) {
  const set = new Set();
  for (const row of rows) {
    const v = row[key];
    if (isCellEmpty(v)) continue;
    set.add(String(v).trim());
  }
  return [...set].sort((a, b) =>
    a.localeCompare(b, "vi", { sensitivity: "base", numeric: true }),
  );
}

function formatPercentRatio(ratio) {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(2)}%`;
}

function computeColumnProfile(rows, columnKey) {
  const total_rows = rows.length;
  let nullCount = 0;
  const distinctNonEmpty = new Set();

  for (const row of rows) {
    const v = row[columnKey];
    if (isCellEmpty(v)) {
      nullCount++;
    } else {
      distinctNonEmpty.add(String(v).trim());
    }
  }

  const actual = total_rows - nullCount;
  const cardinality = distinctNonEmpty.size;
  const completeness = total_rows > 0 ? actual / total_rows : 0;
  const uniqueness = total_rows > 0 ? cardinality / total_rows : 0;
  const distinctness = actual > 0 ? cardinality / actual : null;

  return {
    nullCount,
    actual,
    completeness,
    cardinality,
    uniqueness,
    distinctness,
  };
}

function buildProfileSection(rows, headers, total_rows) {
  const section = document.createElement("section");
  section.className = "dataset-section dataset-profile-section";

  const h2 = document.createElement("h2");
  h2.textContent = "Column profile";
  section.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "dataset-meta";
  meta.textContent = `Quality metrics over ${total_rows.toLocaleString()} row(s).`;
  section.appendChild(meta);

  const wrap = document.createElement("div");
  wrap.className = "dataset-table-wrapper";
  const table = document.createElement("table");
  table.className = "dataset-table dataset-profile-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  [
    "Column",
    "Null",
    "Actual",
    "Completeness",
    "Cardinality",
    "Uniqueness",
    "Distinctness",
  ].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    if (label !== "Column") th.className = "dataset-profile-num-head";
    th.scope = "col";
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  headers.forEach((col) => {
    const stats = computeColumnProfile(rows, col);
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = col;
    tr.appendChild(tdName);

    const addNumCell = (text) => {
      const td = document.createElement("td");
      td.className = "dataset-profile-num";
      td.textContent = text;
      tr.appendChild(td);
    };

    addNumCell(stats.nullCount.toLocaleString());
    addNumCell(stats.actual.toLocaleString());
    addNumCell(formatPercentRatio(stats.completeness));
    addNumCell(stats.cardinality.toLocaleString());
    addNumCell(formatPercentRatio(stats.uniqueness));
    addNumCell(
      stats.distinctness == null ? "—" : formatPercentRatio(stats.distinctness),
    );

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

function buildStringFieldsSection(rows, stringCols) {
  const section = document.createElement("section");
  section.className =
    "dataset-section dataset-profile-section dataset-string-fields";

  const h2 = document.createElement("h2");
  h2.textContent = "String fields";
  section.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "dataset-meta";
  meta.textContent = `Text columns. Distinct lists appear when cardinality is below ${DISTINCT_LIST_MAX}`;
  section.appendChild(meta);

  const wrap = document.createElement("div");
  wrap.className = "dataset-table-wrapper";

  const table = document.createElement("table");
  table.className =
    "dataset-table dataset-profile-table dataset-string-fields-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Column", "Distinct values"].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  stringCols.forEach((col) => {
    const distinct = collectDistinctStrings(rows, col);

    const tr = document.createElement("tr");

    const tdCol = document.createElement("td");
    tdCol.textContent = col;
    tr.appendChild(tdCol);

    const tdVals = document.createElement("td");
    tdVals.className = "dataset-distinct-values-cell";
    if (distinct.length >= DISTINCT_LIST_MAX) {
      tdVals.textContent = "Too many values";
    } else {
      const ul = document.createElement("ul");
      ul.className = "dataset-distinct-values-list";
      distinct.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
      });
      tdVals.appendChild(ul);
    }
    tr.appendChild(tdVals);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

function buildNumericFieldsSection(
  rows,
  numericCols,
  temporalInstantCols,
  temporalWallClockCols,
) {
  const section = document.createElement("section");
  section.className =
    "dataset-section dataset-profile-section dataset-numeric-fields";

  const h2 = document.createElement("h2");
  h2.textContent = "Number & date/time fields";
  section.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "dataset-meta";
  meta.textContent =
    "Columns that can be converted to numbers.";
  section.appendChild(meta);

  const wrap = document.createElement("div");
  wrap.className = "dataset-table-wrapper";

  const table = document.createElement("table");
  table.className = "dataset-table dataset-profile-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["Column", "Minimum", "Maximum", "Mode", "Average", "Median"].forEach(
    (label) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      if (label !== "Column") th.className = "dataset-profile-num-head";
      headRow.appendChild(th);
    },
  );
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  const entries = [
    ...numericCols.map((col) => ({ col, temporal: false, timeOfDay: false })),
    ...temporalInstantCols.map((col) => ({
      col,
      temporal: true,
      timeOfDay: false,
    })),
    ...temporalWallClockCols.map((col) => ({
      col,
      temporal: true,
      timeOfDay: true,
    })),
  ];

  entries.forEach(({ col, temporal, timeOfDay }) => {
    const samples = temporal
      ? collectTemporalSamples(rows, col, timeOfDay ? "wallClock" : "instant")
      : collectNumericSamples(rows, col);
    const sorted = [...samples].sort((a, b) => a - b);
    const min = sorted.length ? sorted[0] : null;
    const max = sorted.length ? sorted[sorted.length - 1] : null;
    const avg =
      sorted.length === 0
        ? null
        : samples.reduce((a, b) => a + b, 0) / samples.length;
    const median = medianOfSorted(sorted);
    const modes = modesOfNumbers(samples);

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = col;
    tr.appendChild(tdName);

    const fmtMs = (v, roundMean) => {
      if (v == null || Number.isNaN(v)) return "—";
      const x = roundMean ? Math.round(Number(v)) : Number(v);
      return timeOfDay ? formatTimeOfDayMs(x) : formatTemporalMs(x);
    };

    const addTemporalStatCell = (v, roundMean = false) => {
      const td = document.createElement("td");
      td.className = "dataset-profile-num";
      td.textContent = fmtMs(v, roundMean);
      tr.appendChild(td);
    };

    const addNumericStatCell = (v) => {
      const td = document.createElement("td");
      td.className = "dataset-profile-num";
      td.textContent = formatStatNumber(v);
      tr.appendChild(td);
    };

    if (temporal) {
      addTemporalStatCell(min, false);
      addTemporalStatCell(max, false);
    } else {
      addNumericStatCell(min);
      addNumericStatCell(max);
    }

    const tdMode = document.createElement("td");
    tdMode.className = "dataset-profile-num dataset-mode-cell";
    tdMode.textContent = temporal
      ? modes.map((m) => fmtMs(m, false)).join(", ")
      : modes.map((m) => formatStatNumber(m)).join(", ");
    tr.appendChild(tdMode);

    if (temporal) {
      addTemporalStatCell(avg, true);
      addTemporalStatCell(median, true);
    } else {
      addNumericStatCell(avg);
      addNumericStatCell(median);
    }

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);

  return section;
}

/** Overview blocks for `/dataset/cleaning/`: profiles, string summaries, numeric stats. */
export function createCleaningProfileSection(rows) {
  const root = document.createElement("div");
  root.className = "cleaning-overview";

  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const total_rows = rows.length;

  root.appendChild(buildProfileSection(rows, headers, total_rows));

  const {
    stringCols,
    numericCols,
    temporalInstantCols,
    temporalWallClockCols,
  } = classifyColumns(headers, rows);
  if (stringCols.length)
    root.appendChild(buildStringFieldsSection(rows, stringCols));
  if (
    numericCols.length ||
    temporalInstantCols.length ||
    temporalWallClockCols.length
  )
    root.appendChild(
      buildNumericFieldsSection(
        rows,
        numericCols,
        temporalInstantCols,
        temporalWallClockCols,
      ),
    );

  return root;
}
