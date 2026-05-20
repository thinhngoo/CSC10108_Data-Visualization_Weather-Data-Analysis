// Q9 – Thời tiết giữa các khu vực (3 region-level bar charts).

const COLOR_TEMP = "#f3a85a";
const COLOR_HUMIDITY = "#80c9b8";
const COLOR_PRECIP = "#5b85aa";

const SI_FORMAT = (v) => {
  if (v === 0) return "0K";
  if (Math.abs(v) >= 1000) return d3.format("~s")(v).replace("G", "B");
  return String(v);
};

/** Parsed chart rows để tái render khi đổi sort (listeners gọi redraw). */
let q9CachedRows = null;

function attachQ9SortListenersOnce() {
  const root = document.getElementById("q9-controls");
  if (!root || root.dataset.listenersBound === "1") return;
  root.dataset.listenersBound = "1";

  const redraw = () => drawQ9FromCache();

  document.getElementById("q9-sort-metric")?.addEventListener("change", redraw);
  document.getElementById("q9-sort-order")?.addEventListener("change", redraw);
}

function readQ9SortOptions() {
  const metricEl = document.getElementById("q9-sort-metric");
  const orderEl = document.getElementById("q9-sort-order");
  return {
    metric: metricEl?.value ?? "temp",
    ascending: (orderEl?.value ?? "asc") === "asc",
  };
}

function syncedRegionOrder(metric, ascending, maps, regions) {
  const sortKeyMap =
    metric === "humidity"
      ? maps.humidity
      : metric === "precip"
        ? maps.precip
        : maps.temp;

  return [...regions].sort((a, b) => {
    const va = sortKeyMap.get(a);
    const vb = sortKeyMap.get(b);
    let c = ascending ? d3.ascending(va, vb) : d3.descending(va, vb);
    if (c !== 0) return c;
    return a.localeCompare(b, "vi");
  });
}

function rowsSortedByOwnValues(valueMap, ascending, regions) {
  const order = [...regions].sort((a, b) => {
    const va = valueMap.get(a);
    const vb = valueMap.get(b);
    let c = ascending ? d3.ascending(va, vb) : d3.descending(va, vb);
    if (c !== 0) return c;
    return a.localeCompare(b, "vi");
  });
  return order.map((region) => ({
    region,
    value: valueMap.get(region),
  }));
}

function drawQ9FromCache() {
  if (!q9CachedRows) return;
  const { regions, maps, precipMaxBase } = q9CachedRows;

  const { metric, ascending } = readQ9SortOptions();

  let avgTempRows;
  let avgHumRows;
  let precipRowsOrdered;

  if (metric === "none") {
    avgTempRows = rowsSortedByOwnValues(maps.temp, ascending, regions);
    avgHumRows = rowsSortedByOwnValues(maps.humidity, ascending, regions);
    precipRowsOrdered = rowsSortedByOwnValues(maps.precip, ascending, regions);
  } else {
    const regionOrder = syncedRegionOrder(metric, ascending, maps, regions);
    avgTempRows = regionOrder.map((region) => ({
      region,
      value: maps.temp.get(region),
    }));
    avgHumRows = regionOrder.map((region) => ({
      region,
      value: maps.humidity.get(region),
    }));
    precipRowsOrdered = regionOrder.map((region) => ({
      region,
      value: maps.precip.get(region),
    }));
  }

  drawRegionBar({
    selector: "#bar-region-temp",
    rows: avgTempRows,
    color: COLOR_TEMP,
    yLabel: "Average Daily Temperature (°C)",
    valueFmt: (v) => v.toFixed(2) + " °C",
    yTickFmt: (v) => v.toString(),
    yDomain: [
      0,
      Math.ceil((d3.max(avgTempRows, (d) => d.value) + 2) / 2.5) * 2.5,
    ],
    height: 360,
    yTicks: 12,
  });

  drawRegionBar({
    selector: "#bar-region-humidity",
    rows: avgHumRows,
    color: COLOR_HUMIDITY,
    yLabel: "Average Daily Humidity (%)",
    valueFmt: (v) => v.toFixed(2) + " %",
    yTickFmt: (v) => v.toString(),
    yDomain: [0, 100],
    height: 340,
    yTicks: 10,
  });

  drawRegionBar({
    selector: "#bar-region-precip",
    rows: precipRowsOrdered,
    color: COLOR_PRECIP,
    yLabel: "Total Daily Precipitation (mm)",
    valueFmt: (v) =>
      v.toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " mm",
    yTickFmt: SI_FORMAT,
    yDomain: [0, Math.ceil(precipMaxBase / 10000) * 10000],
    height: 340,
    yTicks: 5,
  });
}

export function drawQ9(data) {
  const valid = data.filter(
    (d) =>
      d.region &&
      Number.isFinite(d.temp) &&
      Number.isFinite(d.humidity) &&
      Number.isFinite(d.precip),
  );

  const avgTemp = d3
    .rollups(
      valid,
      (v) => d3.mean(v, (d) => d.temp),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }));

  const avgHum = d3
    .rollups(
      valid,
      (v) => d3.mean(v, (d) => d.humidity),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }));

  const sumPrecip = d3
    .rollups(
      valid,
      (v) => d3.sum(v, (d) => d.precip),
      (d) => d.region,
    )
    .map(([region, value]) => ({ region, value }));

  const tm = new Map(avgTemp.map((d) => [d.region, d.value]));
  const hm = new Map(avgHum.map((d) => [d.region, d.value]));
  const pm = new Map(sumPrecip.map((d) => [d.region, d.value]));

  const regions = [...new Set([...tm.keys(), ...hm.keys(), ...pm.keys()])].sort(
    (a, b) => a.localeCompare(b, "vi"),
  );

  const precipMaxBase = d3.max(sumPrecip, (d) => d.value) ?? 0;

  q9CachedRows = {
    regions,
    maps: { temp: tm, humidity: hm, precip: pm },
    precipMaxBase,
  };

  attachQ9SortListenersOnce();
  drawQ9FromCache();
}

/* ─────────────────────────────────────────────────────────── */

function drawRegionBar({
  selector,
  rows,
  color,
  yLabel,
  valueFmt,
  yTickFmt,
  yDomain,
  height,
  yTicks,
}) {
  const container = d3.select(selector);
  container.html("");

  /* ── Layout ── */
  /* Top: room for “Location.Region”. Bottom: wrapped region names must clear x-axis tickPadding */
  const margin = { top: 50, right: 16, bottom: 88, left: 64 };
  const totalW = 920;
  const totalH = height;
  const W = totalW - margin.left - margin.right;
  const H = totalH - margin.top - margin.bottom;

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("width", "100%")
    .style("overflow", "visible");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const x = d3
    .scaleBand()
    .domain(rows.map((d) => d.region))
    .range([0, W])
    .paddingInner(0.35)
    .paddingOuter(0.18);

  const y = d3.scaleLinear().domain(yDomain).range([H, 0]).nice();

  /* ── Top header (centered, like Tableau) ── */
  g.append("text")
    .attr("x", W / 2)
    .attr("y", -16)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .text("Location.Region");

  /* ── Grid ── */
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(yTicks).tickSize(-W).tickFormat(""))
    .call((ax) => {
      ax.select(".domain").remove();
      ax.selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3 4");
    });

  /* ── Axes ── */
  const xTickPad = 20;
  g.append("g")
    .attr("transform", `translate(0,${H})`)
    .call(d3.axisBottom(x).tickSize(0).tickPadding(xTickPad))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 11)
    .attr("fill", "#374151")
    .call(wrapTickLabel, x.bandwidth() + 14)
    /* Extra gap: axis pushes baseline; multi-line tspans still sit visually tight without this */
    .attr("dy", "1em");

  g.append("g")
    .call(d3.axisLeft(y).ticks(yTicks).tickFormat(yTickFmt))
    .call((ax) => ax.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 11)
    .attr("fill", "#6b7280");

  /* ── Y label ── */
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -H / 2)
    .attr("y", -48)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#374151")
    .text(yLabel);

  const barDur = 650;
  const barDelay = (_, i) => i * 60;

  /* ── Bars (grow-up transition) ── */
  g.selectAll("rect.bar")
    .data(rows, (d) => d.region)
    .join("rect")
    .attr("class", "bar")
    .attr("x", (d) => x(d.region))
    .attr("width", x.bandwidth())
    .attr("y", H)
    .attr("height", 0)
    .attr("fill", color)
    .attr("rx", 2)
    .transition()
    .duration(barDur)
    .delay(barDelay)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.value))
    .attr("height", (d) => H - y(d.value));

  /* ── Values above bars (replacing tooltip) ── */
  g.selectAll("text.bar-value")
    .data(rows, (d) => d.region)
    .join("text")
    .attr("class", "bar-value")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "alphabetic")
    .attr("font-size", 10)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .attr("x", (d) => x(d.region) + x.bandwidth() / 2)
    .attr("y", H)
    .text((d) => valueFmt(d.value))
    .transition()
    .duration(barDur)
    .delay(barDelay)
    .ease(d3.easeCubicOut)
    .attr("y", (d) => y(d.value) - 6);
}

/* ─────────────────────────────────────────────────────────── */
/* Wrap long horizontal tick labels onto two lines (works for
   un-rotated axis labels). */
function wrapTickLabel(textSel, width) {
  textSel.each(function () {
    const text = d3.select(this);
    const raw = text.text();
    const words = raw.split(/\s+/);
    if (words.length <= 1) return;

    const tryLayout = (a, b) => {
      const longest = Math.max(a.length, b.length);
      return longest * 6.5 <= width;
    };

    let bestSplit = -1;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      if (tryLayout(a, b)) {
        bestSplit = i;
        break;
      }
    }
    if (bestSplit === -1) {
      bestSplit = Math.ceil(words.length / 2);
    }

    const line1 = words.slice(0, bestSplit).join(" ");
    const line2 = words.slice(bestSplit).join(" ");

    text.text(null);
    text.append("tspan").attr("x", 0).attr("dy", "0em").text(line1);
    text.append("tspan").attr("x", 0).attr("dy", "1.1em").text(line2);
  });
}
