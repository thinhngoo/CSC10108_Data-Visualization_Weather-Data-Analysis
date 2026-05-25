// Q8 – Nhiệt độ theo trạng thái thời tiết  (box plot per condition)
// Container element expected: <div id="box-condition-temp"></div>

const BOX_DARK = "#4ea3a8"; // Q1 → median (lower half)
const BOX_LIGHT = "#b9e4ec"; // median → Q3 (upper half)
const BOX_DARK_HOVER = "#3b8a8f";
const BOX_LIGHT_HOVER = "#9dd9e3";
const WHISKER_STROKE = "#6b7280";
const STRIP_STROKE = "#4ea3a8";
const BOX_STROKE = "white";
const STRIP_OPACITY = 0.08;

const TEXT_PRIMARY = "#374151";
const TEXT_MUTED = "#6b7280";
const GRID_STROKE = "#e5e7eb";
const AXIS_STROKE = "#d1d5db";
const GRID_DASH = "3 4";

const MARGIN = { top: 40, right: 24, bottom: 160, left: 64 };
const SVG_WIDTH = 980;
const SVG_HEIGHT = 620;
const Y_AXIS_TICKS = 7;
const BOX_ANIM_DURATION_MS = 600;
const BOX_ANIM_STAGGER_MS = 22;
const BOX_RECT_DELAY_MS = 200;
const BOX_RECT_DURATION_MS = 500;
const WHISKER_CAP_DELAY_MS = 400;
const WHISKER_CAP_DURATION_MS = 220;
const FONT_SIZE_AXIS = 12;
const FONT_SIZE_AXIS_TITLE = 13;
const FONT_SIZE_TICK = 11;
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = -10;

/** @readonly */
const Q8_SORT_METRICS = ["min", "max", "median", "mean"];

let q8LatestData = null;

function normalizeQ8SortMetric(valueFromDom) {
  return Q8_SORT_METRICS.includes(valueFromDom) ? valueFromDom : "median";
}

function attachQ8ControlsOnce() {
  if (attachQ8ControlsOnce._attached) return;
  const metricSelect = document.getElementById("q8-sort-metric");
  const orderSelect = document.getElementById("q8-sort-order");
  if (!metricSelect || !orderSelect) return;
  attachQ8ControlsOnce._attached = true;
  const rerunDrawFromCache = () => q8LatestData && drawQ8(q8LatestData);
  metricSelect.addEventListener("change", rerunDrawFromCache);
  orderSelect.addEventListener("change", rerunDrawFromCache);
}

function readQ8SortOptions() {
  const metricSelect = document.getElementById("q8-sort-metric");
  const orderSelect = document.getElementById("q8-sort-order");
  const sortMetric = normalizeQ8SortMetric(metricSelect?.value ?? "median");
  const descending = orderSelect?.value === "desc";
  return { sortMetric, descending };
}

/**
 * Sắp xếp mỗi hộp theo một chỉ số đã chọn (+ tie-break theo tên condition).
 */
function sortConditionStatsForDisplay(
  statsUnsorted,
  sortMetricKey,
  sortDescending,
) {
  const directionSign = sortDescending ? -1 : 1;
  return [...statsUnsorted].sort((leftRow, rightRow) => {
    const leftValue = Number(leftRow[sortMetricKey]);
    const rightValue = Number(rightRow[sortMetricKey]);
    const leftOk = Number.isFinite(leftValue);
    const rightOk = Number.isFinite(rightValue);
    if (!leftOk && !rightOk) {
      return String(leftRow.condition).localeCompare(
        String(rightRow.condition),
      );
    }
    if (!leftOk) return 1;
    if (!rightOk) return -1;
    const numericCompareRaw =
      leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    if (numericCompareRaw !== 0) return numericCompareRaw * directionSign;
    return String(leftRow.condition).localeCompare(
      String(rightRow.condition),
      "en",
      { sensitivity: "base" },
    );
  });
}

export function drawQ8(chartInputRows) {
  q8LatestData = chartInputRows;
  attachQ8ControlsOnce();

  const { sortMetric: sortMetricKey, descending } = readQ8SortOptions();

  /* ── Group temps by condition & compute box stats ── */
  const tempsGroupedByCondition = d3.rollups(
    chartInputRows.filter(
      (record) =>
        record.condition &&
        record.condition !== "Unknown" &&
        Number.isFinite(record.temp),
    ),
    (rowsForSameCondition) =>
      rowsForSameCondition.map((row) => row.temp).sort(d3.ascending),
    (record) => record.condition,
  );

  const conditionStatsUnsorted = tempsGroupedByCondition
    .map(([conditionLabel, sortedTempsAscending]) => {
      const quartileLower = d3.quantile(sortedTempsAscending, 0.25);
      const quartileMedian = d3.quantile(sortedTempsAscending, 0.5);
      const quartileUpper = d3.quantile(sortedTempsAscending, 0.75);
      return {
        condition: conditionLabel,
        temps: sortedTempsAscending,
        count: sortedTempsAscending.length,
        min: sortedTempsAscending[0],
        max: sortedTempsAscending[sortedTempsAscending.length - 1],
        q1: quartileLower,
        median: quartileMedian,
        q3: quartileUpper,
        mean: d3.mean(sortedTempsAscending),
      };
    });

  const conditionBoxStats = sortConditionStatsForDisplay(
    conditionStatsUnsorted,
    sortMetricKey,
    descending,
  );

  /* ── Layout ── */
  const margin = MARGIN;
  const svgOuterWidth = SVG_WIDTH;
  const svgOuterHeight = SVG_HEIGHT;
  const innerPlotWidth = svgOuterWidth - margin.left - margin.right;
  const innerPlotHeight = svgOuterHeight - margin.top - margin.bottom;

  const chartRoot = d3.select("#box-condition-temp");
  chartRoot.html("");

  const svg = chartRoot
    .append("svg")
    .attr("viewBox", `0 0 ${svgOuterWidth} ${svgOuterHeight}`)
    .attr("width", "100%")
    .style("overflow", "visible");

  const mainLayer = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  /* ── Scales ── */
  const xBandCondition = d3
    .scaleBand()
    .domain(conditionBoxStats.map((statRow) => statRow.condition))
    .range([0, innerPlotWidth])
    .paddingInner(0.45)
    .paddingOuter(0.25);

  const allMinMaxTemps = conditionBoxStats.flatMap((statRow) => [
    statRow.min,
    statRow.max,
  ]);
  const yScaleTemperature = d3
    .scaleLinear()
    .domain([
      Math.floor((d3.min(allMinMaxTemps) - 1) / 5) * 5,
      Math.ceil((d3.max(allMinMaxTemps) + 1) / 5) * 5,
    ])
    .range([innerPlotHeight, 0])
    .nice();

  /* ── Column header label (top, centered) ── */
  mainLayer
    .append("text")
    .attr("x", innerPlotWidth / 2)
    .attr("y", -18)
    .attr("text-anchor", "middle")
    .attr("font-size", FONT_SIZE_AXIS)
    .attr("font-weight", 600)
    .attr("fill", TEXT_PRIMARY)
    .text("Day.Condition.Text");

  /* ── Grid (horizontal) ── */
  mainLayer
    .append("g")
    .attr("class", "grid")
    .call(
      d3
        .axisLeft(yScaleTemperature)
        .ticks(Y_AXIS_TICKS)
        .tickSize(-innerPlotWidth)
        .tickFormat(""),
    )
    .call((axisGroup) => {
      axisGroup.select(".domain").remove();
      axisGroup
        .selectAll("line")
        .attr("stroke", GRID_STROKE)
        .attr("stroke-dasharray", GRID_DASH);
    });

  /* ── Axes ── */
  mainLayer
    .append("g")
    .attr("transform", `translate(0,${innerPlotHeight})`)
    .call(d3.axisBottom(xBandCondition).tickSize(0).tickPadding(10))
    .call((axisGroup) =>
      axisGroup.select(".domain").attr("stroke", AXIS_STROKE))
    .selectAll("text")
    .attr("font-size", FONT_SIZE_TICK)
    .attr("fill", TEXT_PRIMARY)
    .attr("transform", "rotate(-65)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.5em")
    .call(wrapTickLabelsOnWhitespace);

  mainLayer
    .append("g")
    .call(d3.axisLeft(yScaleTemperature).ticks(Y_AXIS_TICKS))
    .call((axisGroup) =>
      axisGroup.select(".domain").attr("stroke", AXIS_STROKE))
    .selectAll("text")
    .attr("font-size", FONT_SIZE_AXIS)
    .attr("fill", TEXT_MUTED);

  /* ── Y-axis label ── */
  mainLayer
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerPlotHeight / 2)
    .attr("y", -46)
    .attr("text-anchor", "middle")
    .attr("font-size", FONT_SIZE_AXIS_TITLE)
    .attr("fill", TEXT_PRIMARY)
    .text("Average Temperature (°C)");

  /* ── Tooltip ── */
  const tooltipBase = d3.select("body").select(".chart-tooltip");
  const floatingTooltip = tooltipBase.empty()
    ? d3.select("body").append("div").attr("class", "chart-tooltip")
    : tooltipBase;

  /* ── Strip plot (faint individual day ticks behind boxes) ── */
  const stripJitterHalfWidth = Math.min(
    xBandCondition.bandwidth() * 0.7,
    14,
  );
  const randomStripHorizontalOffset = d3.randomUniform(
    -stripJitterHalfWidth,
    stripJitterHalfWidth - 4,
  );

  const stripScatterLayer = mainLayer.append("g").attr("class", "strip-layer");
  conditionBoxStats.forEach((statRowForCondition) => {
    const conditionCenterX =
      xBandCondition(statRowForCondition.condition) +
      xBandCondition.bandwidth() / 2;
    const jitteredStripMarks = statRowForCondition.temps.map(
      (temperatureCelsius) => ({
        temperatureCelsius,
        stripStartX: conditionCenterX + randomStripHorizontalOffset(),
      }),
    );
    stripScatterLayer
      .append("g")
      .selectAll("line")
      .data(jitteredStripMarks)
      .join("line")
      .attr("x1", (stripPoint) => stripPoint.stripStartX)
      .attr("x2", (stripPoint) => stripPoint.stripStartX + 4)
      .attr("y1", (stripPoint) =>
        yScaleTemperature(stripPoint.temperatureCelsius),
      )
      .attr("y2", (stripPoint) =>
        yScaleTemperature(stripPoint.temperatureCelsius),
      )
      .attr("stroke", STRIP_STROKE)
      .attr("stroke-opacity", STRIP_OPACITY)
      .attr("stroke-width", 1);
  });

  /* ── Box groups (one per condition) ── */
  const boxGroups = mainLayer
    .selectAll("g.box")
    .data(conditionBoxStats, (statRow) => statRow.condition)
    .join("g")
    .attr("class", "box")
    .attr(
      "transform",
      (statRow) =>
        `translate(${xBandCondition(statRow.condition)},0)`,
    )
    .style("cursor", "pointer")
    .on("mouseenter", function (mouseEvent, statRow) {
      floatingTooltip.style("opacity", 1).html(
        `<strong>${statRow.condition}</strong><br/>
         Số ngày: ${statRow.count.toLocaleString("vi-VN")}<br/>
         Min: ${statRow.min.toFixed(1)} °C<br/>
         Q1: ${statRow.q1.toFixed(1)} °C<br/>
         Median: ${statRow.median.toFixed(1)} °C<br/>
         Q3: ${statRow.q3.toFixed(1)} °C<br/>
         Max: ${statRow.max.toFixed(1)} °C<br/>
         Mean: ${statRow.mean.toFixed(1)} °C`,
      );
      d3.select(this).select(".box-upper").attr("fill", BOX_LIGHT_HOVER);
      d3.select(this).select(".box-lower").attr("fill", BOX_DARK_HOVER);
    })
    .on("mousemove", (mouseEvent) => {
      floatingTooltip
        .style("left", mouseEvent.pageX + TOOLTIP_OFFSET_X + "px")
        .style("top", mouseEvent.pageY + TOOLTIP_OFFSET_Y + "px");
    })
    .on("mouseleave", function () {
      floatingTooltip.style("opacity", 0);
      d3.select(this).select(".box-upper").attr("fill", BOX_LIGHT);
      d3.select(this).select(".box-lower").attr("fill", BOX_DARK);
    });

  const bandWidth = xBandCondition.bandwidth();
  const boxCenterX = bandWidth / 2;

  /* Vertical whisker line (min → max) */
  boxGroups
    .append("line")
    .attr("class", "whisker-line")
    .attr("x1", boxCenterX)
    .attr("x2", boxCenterX)
    .attr("y1", (statRow) => yScaleTemperature(statRow.min))
    .attr("y2", (statRow) => yScaleTemperature(statRow.min))
    .attr("stroke", WHISKER_STROKE)
    .attr("stroke-width", 1)
    .transition()
    .duration(BOX_ANIM_DURATION_MS)
    .delay((_statRow, boxIndex) => boxIndex * BOX_ANIM_STAGGER_MS)
    .ease(d3.easeCubicOut)
    .attr("y2", (statRow) => yScaleTemperature(statRow.max));

  /* Whisker caps */
  const whiskerCapWidth = Math.min(bandWidth * 0.5, 18);
  boxGroups
    .append("line")
    .attr("class", "whisker-cap")
    .attr("x1", boxCenterX - whiskerCapWidth / 2)
    .attr("x2", boxCenterX + whiskerCapWidth / 2)
    .attr("y1", (statRow) => yScaleTemperature(statRow.min))
    .attr("y2", (statRow) => yScaleTemperature(statRow.min))
    .attr("stroke", WHISKER_STROKE)
    .attr("stroke-width", 1);

  boxGroups
    .append("line")
    .attr("class", "whisker-cap")
    .attr("x1", boxCenterX - whiskerCapWidth / 2)
    .attr("x2", boxCenterX + whiskerCapWidth / 2)
    .attr("y1", (statRow) => yScaleTemperature(statRow.max))
    .attr("y2", (statRow) => yScaleTemperature(statRow.max))
    .attr("stroke", WHISKER_STROKE)
    .attr("stroke-width", 1)
    .attr("opacity", 0)
    .transition()
    .delay((_statRow, boxIndex) => WHISKER_CAP_DELAY_MS + boxIndex * BOX_ANIM_STAGGER_MS)
    .duration(WHISKER_CAP_DURATION_MS)
    .attr("opacity", 1);

  /* Lower half (Q1 → median) — darker */
  boxGroups
    .append("rect")
    .attr("class", "box-lower")
    .attr("x", 0)
    .attr("width", bandWidth)
    .attr("y", (statRow) => yScaleTemperature(statRow.median))
    .attr("height", 0)
    .attr("fill", BOX_DARK)
    .attr("stroke", BOX_STROKE)
    .attr("stroke-width", 0.5)
    .transition()
    .delay((_statRow, boxIndex) => BOX_RECT_DELAY_MS + boxIndex * BOX_ANIM_STAGGER_MS)
    .duration(BOX_RECT_DURATION_MS)
    .ease(d3.easeCubicOut)
    .attr("y", (statRow) => yScaleTemperature(statRow.median))
    .attr(
      "height",
      (statRow) =>
        Math.max(
          0,
          yScaleTemperature(statRow.q1) -
            yScaleTemperature(statRow.median),
        ),
    );

  /* Upper half (median → Q3) — lighter */
  boxGroups
    .append("rect")
    .attr("class", "box-upper")
    .attr("x", 0)
    .attr("width", bandWidth)
    .attr("y", (statRow) => yScaleTemperature(statRow.median))
    .attr("height", 0)
    .attr("fill", BOX_LIGHT)
    .attr("stroke", BOX_STROKE)
    .attr("stroke-width", 0.5)
    .transition()
    .delay((_statRow, boxIndex) => BOX_RECT_DELAY_MS + boxIndex * BOX_ANIM_STAGGER_MS)
    .duration(BOX_RECT_DURATION_MS)
    .ease(d3.easeCubicOut)
    .attr("y", (statRow) => yScaleTemperature(statRow.q3))
    .attr(
      "height",
      (statRow) =>
        Math.max(
          0,
          yScaleTemperature(statRow.median) -
            yScaleTemperature(statRow.q3),
        ),
    );

  /* Median tick (sits on top, between two halves) */
  boxGroups
    .append("line")
    .attr("class", "median-line")
    .attr("x1", 0)
    .attr("x2", bandWidth)
    .attr("y1", (statRow) => yScaleTemperature(statRow.median))
    .attr("y2", (statRow) => yScaleTemperature(statRow.median))
    .attr("stroke", BOX_STROKE)
    .attr("stroke-width", 1.5);
}

/* ── Helper: wrap rotated tick label on whitespace ── */
function wrapTickLabelsOnWhitespace(textSelection) {
  textSelection.each(function () {
    const tickLabelShape = d3.select(this);
    const labelWords = tickLabelShape.text().split(/\s+/);
    if (labelWords.length <= 2) return;
    const midWordIndex = Math.ceil(labelWords.length / 2);
    const firstLine = labelWords.slice(0, midWordIndex).join(" ");
    const secondLine = labelWords.slice(midWordIndex).join(" ");
    tickLabelShape.text(null);
    tickLabelShape
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "0em")
      .text(firstLine);
    tickLabelShape
      .append("tspan")
      .attr("x", 0)
      .attr("dy", "1.1em")
      .text(secondLine);
  });
}
