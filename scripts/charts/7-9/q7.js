// Q7 – Tần suất trạng thái thời tiết (horizontal bar chart)
// Container: <div id="bar-condition"></div>
// Controls: #q7-sort-order, #q7-sort-group

// ── Bar colors ──
const BAR_COLOR = "#5b85aa";
const BAR_COLOR_HOVER = "#3d6890";

// ── Theme ──
const TEXT_PRIMARY = "#374151";
const TEXT_MUTED = "#6b7280";
const GRID_STROKE = "#e5e7eb";
const AXIS_STROKE = "#d1d5db";
const GRID_DASH = "3 4";

// ── Layout ──
const MARGIN = { top: 28, right: 32, bottom: 64, left: 240 };
const ROW_HEIGHT_PX = 22;
const MIN_INNER_HEIGHT = 200;
const SVG_WIDTH = 920;
const BAR_RX = 2;

// ── Animation ──
const BAR_GROW_DURATION_MS = 700;
const BAR_GROW_STAGGER_MS = 18;
const HOVER_TRANSITION_MS = 120;
const VALUE_LABEL_DELAY_BASE_MS = 250;
const VALUE_LABEL_DURATION_MS = 300;
const TOOLTIP_OFFSET_X = 14;
const TOOLTIP_OFFSET_Y = -10;

// ── Typography ──
const FONT_SIZE_AXIS = 12;
const FONT_SIZE_AXIS_TITLE = 13;
const FONT_SIZE_BAR_VALUE = 11;

// ── Weather groups ──
const GROUP_ORDER = {
  good: 0,
  rain: 1,
  poorVisibility: 2,
  extreme: 3,
  other: 4,
};

const GROUP_LABEL_VI = {
  good: "Thời tiết đẹp / ôn hòa",
  rain: "Thời tiết mưa",
  poorVisibility: "Tầm nhìn kém",
  extreme: "Thời tiết cực đoan",
  other: "Khác",
};

const GROUP_AXIS_LABEL_FILL = {
  good: "#15803d",
  rain: "#1d4ed8",
  poorVisibility: "#6d28d9",
  extreme: "#b91c1c",
  other: "#4b5563",
};

function classifyWeatherGroup(conditionLabel) {
  const lowerCase = String(conditionLabel ?? "").toLowerCase();
  const textIncludesAnyToken = (tokens) =>
    tokens.some((token) => lowerCase.includes(token));

  if (
    textIncludesAnyToken([
      "thunderstorm",
      "severe",
      "extreme",
      "hurricane",
      "cyclone",
      "typhoon",
      "tornado",
      "hail",
      "blizzard",
      "squall",
      "dust storm",
      "snow storm",
      "snowstorm",
      "ice pellets",
      "violent storm",
    ]) ||
    (textIncludesAnyToken(["thunder"]) && textIncludesAnyToken(["storm"])) ||
    lowerCase.includes("thundery outbreaks")
  ) {
    return "extreme";
  }

  if (
    textIncludesAnyToken([
      "rain",
      "drizzle",
      "shower",
      "showers",
      "precip",
      "downpour",
    ]) ||
    /\bwet\b/i.test(lowerCase)
  ) {
    return "rain";
  }

  if (
    textIncludesAnyToken([
      "patchy fog",
      "areas of fog",
      "places with fog",
      "freezing fog",
      "fog",
      "mist",
      "misty",
      "haze",
      "thin fog",
      "thick fog",
    ]) ||
    /\b(low\s+)?visibility\b/i.test(lowerCase)
  ) {
    return "poorVisibility";
  }

  if (
    textIncludesAnyToken([
      "sunny",
      "clear",
      "fair",
      "fine",
      "bright",
      "cloudy",
      "overcast",
      "partly cloudy",
      "mostly cloudy",
      "mostly sunny",
      "mostly clear",
    ])
  ) {
    return "good";
  }

  return "other";
}

const SI_FORMAT = (numericValue) => {
  if (numericValue === 0) return "0K";
  if (Math.abs(numericValue) >= 1000)
    return d3.format("~s")(numericValue).replace("G", "B");
  return String(numericValue);
};

/** Cached chart rows; control listeners re-call draw with this data. */
let q7LatestData = null;

/** Bind sort controls once; redraw uses cached rows. */
function attachQ7ControlsOnce() {
  if (attachQ7ControlsOnce._attached) return;
  const sortOrderSelect = document.getElementById("q7-sort-order");
  const groupSortCheckbox = document.getElementById("q7-sort-group");
  if (!sortOrderSelect || !groupSortCheckbox) return;
  attachQ7ControlsOnce._attached = true;
  const rerunDrawWithCachedData = () => q7LatestData && drawQ7(q7LatestData);
  sortOrderSelect.addEventListener("change", rerunDrawWithCachedData);
  groupSortCheckbox.addEventListener("change", rerunDrawWithCachedData);
}

function readQ7SortOptions() {
  const sortOrderSelect = document.getElementById("q7-sort-order");
  const groupSortCheckbox = document.getElementById("q7-sort-group");
  const descending = !(sortOrderSelect?.value === "asc");
  const sortByGroupTotal = !!(groupSortCheckbox && groupSortCheckbox.checked);
  return { descending, sortByGroupTotal };
}

/** Sort condition rows by count, optionally grouped by weather category total. */
function sortCountRows(rows, descending, sortByGroupTotal) {
  const higherCountFirstMultiplier = descending ? -1 : 1;

  function compareRowsByCountThenConditionName(leftRow, rightRow) {
    const countCompared =
      (leftRow.count < rightRow.count
        ? -1
        : leftRow.count > rightRow.count
          ? 1
          : 0) * higherCountFirstMultiplier ||
      String(leftRow.condition).localeCompare(
        String(rightRow.condition),
        "en",
        { sensitivity: "base" },
      );
    return countCompared;
  }

  const workingCopy = [...rows];
  if (!sortByGroupTotal) {
    workingCopy.sort(compareRowsByCountThenConditionName);
    return workingCopy;
  }

  const rowsGroupedByWeather = d3.group(
    workingCopy,
    (row) => row.group ?? "other",
  );
  const groupKeyAndTotals = [...rowsGroupedByWeather.entries()].map(
    ([weatherGroupKey, groupRows]) => [
      weatherGroupKey,
      d3.sum(groupRows, (row) => row.count),
    ],
  );
  groupKeyAndTotals.sort((pairLeft, pairRight) => {
    const [, totalDaysLeftGroup] = pairLeft;
    const [, totalDaysRightGroup] = pairRight;
    const differenceByTotals = descending
      ? totalDaysRightGroup - totalDaysLeftGroup
      : totalDaysLeftGroup - totalDaysRightGroup;
    if (differenceByTotals !== 0) return differenceByTotals;
    return (
      (GROUP_ORDER[pairLeft[0]] ?? GROUP_ORDER.other) -
      (GROUP_ORDER[pairRight[0]] ?? GROUP_ORDER.other)
    );
  });

  const orderedRowsForChart = [];
  for (const [weatherGroupKey] of groupKeyAndTotals) {
    const rowsInSingleGroup = [
      ...(rowsGroupedByWeather.get(weatherGroupKey) ?? []),
    ];
    rowsInSingleGroup.sort(compareRowsByCountThenConditionName);
    orderedRowsForChart.push(...rowsInSingleGroup);
  }
  return orderedRowsForChart;
}

export function drawQ7(chartInputRows) {
  q7LatestData = chartInputRows;
  attachQ7ControlsOnce();

  const { descending, sortByGroupTotal } = readQ7SortOptions();

  /* ── Data ── */
  const baseRows = d3
    .rollups(
      chartInputRows.filter(
        (record) => record.condition && record.condition !== "Unknown",
      ),
      (rowsWithSameCondition) => rowsWithSameCondition.length,
      (record) => record.condition,
    )
    .map(([conditionLabel, dayCount]) => {
      const weatherGroup = classifyWeatherGroup(conditionLabel);
      return {
        condition: conditionLabel,
        count: dayCount,
        group: weatherGroup,
      };
    });

  const countRowsSorted = sortCountRows(baseRows, descending, sortByGroupTotal);
  const totalDaysAllConditions = d3.sum(countRowsSorted, (row) => row.count);

  const countLookupByCondition = new Map(
    countRowsSorted.map((row) => [row.condition, row]),
  );

  /* ── Layout ── */
  const margin = MARGIN;
  const rowPxHeight = ROW_HEIGHT_PX;
  const innerPlotHeight = Math.max(
    countRowsSorted.length * rowPxHeight,
    MIN_INNER_HEIGHT,
  );
  const svgOuterWidth = SVG_WIDTH;
  const svgOuterHeight = innerPlotHeight + margin.top + margin.bottom;
  const innerPlotWidth = svgOuterWidth - margin.left - margin.right;

  const chartRoot = d3.select("#bar-condition");
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
  const maxDayCount = d3.max(countRowsSorted, (row) => row.count) ?? 0;
  const xScaleFrequency = d3
    .scaleLinear()
    .domain([0, Math.ceil(maxDayCount / 1000) * 1000 || maxDayCount])
    .nice()
    .range([0, innerPlotWidth]);

  const yBandCondition = d3
    .scaleBand()
    .domain(countRowsSorted.map((row) => row.condition))
    .range([0, innerPlotHeight])
    .padding(0.25);

  const approxTickTarget = Math.min(
    8,
    Math.max(2, Math.round(innerPlotWidth / 90)),
  );

  /* ── Column header label ── */
  mainLayer
    .append("text")
    .attr("x", -margin.left + 12)
    .attr("y", -10)
    .attr("font-size", FONT_SIZE_AXIS)
    .attr("font-weight", 600)
    .attr("fill", TEXT_PRIMARY)
    .text("Day.Condition.Text");

  /* ── Grid ── */
  mainLayer
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerPlotHeight})`)
    .call(
      d3
        .axisBottom(xScaleFrequency)
        .ticks(approxTickTarget)
        .tickSize(-innerPlotHeight)
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
    .call(
      d3
        .axisBottom(xScaleFrequency)
        .ticks(approxTickTarget)
        .tickFormat(SI_FORMAT),
    )
    .call((axisGroup) =>
      axisGroup.select(".domain").attr("stroke", AXIS_STROKE),
    )
    .selectAll("text")
    .attr("font-size", FONT_SIZE_AXIS)
    .attr("fill", TEXT_MUTED);

  const axisGroupLeftConditions = mainLayer
    .append("g")
    .attr("class", "q7-axis-y");
  axisGroupLeftConditions
    .call(d3.axisLeft(yBandCondition).tickSize(0).tickPadding(8))
    .call((axisGroup) => axisGroup.select(".domain").remove());
  axisGroupLeftConditions
    .selectAll(".tick")
    .each(function (tickConditionLabel) {
      const chartRowForLabel = countLookupByCondition.get(tickConditionLabel);
      const bucket = chartRowForLabel?.group ?? "other";
      const labelFill =
        sortByGroupTotal && GROUP_AXIS_LABEL_FILL[bucket] != null
          ? GROUP_AXIS_LABEL_FILL[bucket]
          : TEXT_PRIMARY;
      d3.select(this)
        .select("text")
        .attr("font-size", FONT_SIZE_AXIS)
        .attr("fill", labelFill)
        .attr("font-weight", sortByGroupTotal ? "600" : "400");
    });

  /* ── X-axis label ── */
  mainLayer
    .append("text")
    .attr("x", innerPlotWidth / 2)
    .attr("y", innerPlotHeight + 48)
    .attr("text-anchor", "middle")
    .attr("font-size", FONT_SIZE_AXIS_TITLE)
    .attr("fill", TEXT_PRIMARY)
    .text("Frequency (Days)");

  /* ── Tooltip ── */
  const tooltipBase = d3.select("body").select(".chart-tooltip");
  const floatingTooltip = tooltipBase.empty()
    ? d3.select("body").append("div").attr("class", "chart-tooltip")
    : tooltipBase;

  function tooltipHtmlForRow(chartRow) {
    const pct = ((chartRow.count / totalDaysAllConditions) * 100).toFixed(1);
    const groupViLabel = GROUP_LABEL_VI[chartRow.group] ?? GROUP_LABEL_VI.other;
    return `<strong>${chartRow.condition}</strong><br/>
          Nhóm: ${groupViLabel}<br/>
         Số ngày: ${chartRow.count.toLocaleString("vi-VN")}<br/>
         Tỉ lệ: ${pct}%`;
  }

  /* ── Bars ── */
  const bars = mainLayer
    .selectAll("rect.bar")
    .data(countRowsSorted, (row) => row.condition)
    .join("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", (row) => yBandCondition(row.condition))
    .attr("height", yBandCondition.bandwidth())
    .attr("width", 0)
    .attr("fill", BAR_COLOR)
    .attr("rx", BAR_RX);

  function showTooltipForRow(mouseEvent, chartRow) {
    floatingTooltip.style("opacity", 1).html(tooltipHtmlForRow(chartRow));
    bars
      .filter((barRow) => barRow.condition === chartRow.condition)
      .transition()
      .duration(HOVER_TRANSITION_MS)
      .attr("fill", BAR_COLOR_HOVER);
  }

  function moveFloatingTooltip(mouseEvent) {
    floatingTooltip
      .style("left", mouseEvent.pageX + TOOLTIP_OFFSET_X + "px")
      .style("top", mouseEvent.pageY + TOOLTIP_OFFSET_Y + "px");
  }

  function hideTooltipRestoreBarFill(_mouseEvent, chartRow) {
    floatingTooltip.style("opacity", 0);
    bars
      .filter((barRow) => barRow.condition === chartRow.condition)
      .transition()
      .duration(HOVER_TRANSITION_MS)
      .attr("fill", BAR_COLOR);
  }

  bars
    .style("cursor", "pointer")
    .on("mouseenter", showTooltipForRow)
    .on("mousemove", moveFloatingTooltip)
    .on("mouseleave", hideTooltipRestoreBarFill);

  bars
    .transition()
    .duration(BAR_GROW_DURATION_MS)
    .delay((_row, rowIndex) => rowIndex * BAR_GROW_STAGGER_MS)
    .ease(d3.easeCubicOut)
    .attr("width", (row) => xScaleFrequency(row.count));

  axisGroupLeftConditions
    .selectAll(".tick")
    .style("cursor", "pointer")
    .on("mouseenter", (mouseEvent, tickConditionLabel) => {
      const chartRow = countLookupByCondition.get(tickConditionLabel);
      if (chartRow) showTooltipForRow(mouseEvent, chartRow);
    })
    .on("mousemove", moveFloatingTooltip)
    .on("mouseleave", (mouseEvent, tickConditionLabel) => {
      const chartRow = countLookupByCondition.get(tickConditionLabel);
      if (chartRow) hideTooltipRestoreBarFill(mouseEvent, chartRow);
    });

  /* ── Value labels ── */
  mainLayer
    .selectAll("text.bar-value")
    .data(countRowsSorted, (row) => row.condition)
    .join("text")
    .attr("class", "bar-value")
    .attr(
      "y",
      (row) => yBandCondition(row.condition) + yBandCondition.bandwidth() / 2,
    )
    .attr("x", (row) => xScaleFrequency(row.count) + 6)
    .attr("dy", "0.35em")
    .attr("font-size", FONT_SIZE_BAR_VALUE)
    .attr("fill", TEXT_MUTED)
    .attr("opacity", 0)
    .text((row) => row.count.toLocaleString("vi-VN"))
    .transition()
    .delay(
      (_row, rowIndex) =>
        VALUE_LABEL_DELAY_BASE_MS + rowIndex * BAR_GROW_STAGGER_MS,
    )
    .duration(VALUE_LABEL_DURATION_MS)
    .attr("opacity", 1);
}
