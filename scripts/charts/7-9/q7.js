// Q7 – Tần suất trạng thái thời tiết (horizontal bar chart)
// Container element expected: <div id="bar-condition"></div>
// Controls: #q7-sort-order, #q7-sort-group

const BAR_COLOR = "#5b85aa";
const BAR_COLOR_HOVER = "#3d6890";

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

let q7LatestData = null;

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

/** @param {{ condition: string, count: number, group?: string }[]} rows */
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

  /* Thứ tự nhóm = tổng số ngày của cả nhóm (tăng/giảm theo ô Sắp xếp). */
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
  const margin = { top: 28, right: 32, bottom: 64, left: 240 };
  const rowPxHeight = 22;
  const innerPlotHeight = Math.max(countRowsSorted.length * rowPxHeight, 200);
  const svgOuterWidth = 920;
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

  /* ── Column header label (top-left) ── */
  mainLayer
    .append("text")
    .attr("x", -margin.left + 12)
    .attr("y", -10)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#374151")
    .text("Day.Condition.Text");

  /* ── Grid (vertical) ── */
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
        .attr("stroke", "#e5e7eb")
        .attr("stroke-dasharray", "3 4");
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
    .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "#d1d5db"))
    .selectAll("text")
    .attr("font-size", 12)
    .attr("fill", "#6b7280");

  const axisGroupLeftConditions = mainLayer
    .append("g")
    .attr("class", "q7-axis-y");
  axisGroupLeftConditions
    .call(d3.axisLeft(yBandCondition).tickSize(0).tickPadding(8))
    .call((axisGroup) => axisGroup.select(".domain").remove());
  axisGroupLeftConditions.selectAll(".tick").each(function (tickConditionLabel) {
    const chartRowForLabel =
      countLookupByCondition.get(tickConditionLabel);
    const bucket = chartRowForLabel?.group ?? "other";
    const labelFill =
      sortByGroupTotal && GROUP_AXIS_LABEL_FILL[bucket] != null
        ? GROUP_AXIS_LABEL_FILL[bucket]
        : "#374151";
    d3.select(this)
      .select("text")
      .attr("font-size", 12)
      .attr("fill", labelFill)
      .attr("font-weight", sortByGroupTotal ? "600" : "400");
  });

  /* ── Axis label (X) ── */
  mainLayer
    .append("text")
    .attr("x", innerPlotWidth / 2)
    .attr("y", innerPlotHeight + 48)
    .attr("text-anchor", "middle")
    .attr("font-size", 13)
    .attr("fill", "#374151")
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

  /* ── Bars (with grow-in transition) ── */
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
    .attr("rx", 2);

  function showTooltipForRow(mouseEvent, chartRow) {
    floatingTooltip.style("opacity", 1).html(tooltipHtmlForRow(chartRow));
    bars
      .filter((barRow) => barRow.condition === chartRow.condition)
      .transition()
      .duration(120)
      .attr("fill", BAR_COLOR_HOVER);
  }

  function moveFloatingTooltip(mouseEvent) {
    floatingTooltip
      .style("left", mouseEvent.pageX + 14 + "px")
      .style("top", mouseEvent.pageY - 10 + "px");
  }

  function hideTooltipRestoreBarFill(_mouseEvent, chartRow) {
    floatingTooltip.style("opacity", 0);
    bars
      .filter((barRow) => barRow.condition === chartRow.condition)
      .transition()
      .duration(120)
      .attr("fill", BAR_COLOR);
  }

  bars
    .style("cursor", "pointer")
    .on("mouseenter", showTooltipForRow)
    .on("mousemove", moveFloatingTooltip)
    .on("mouseleave", hideTooltipRestoreBarFill);

  bars
    .transition()
    .duration(700)
    .delay((_row, rowIndex) => rowIndex * 18)
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

  /* ── Value labels at end of bars (fade in after grow) ── */
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
    .attr("font-size", 11)
    .attr("fill", "#6b7280")
    .attr("opacity", 0)
    .text((row) => row.count.toLocaleString("vi-VN"))
    .transition()
    .delay((_row, rowIndex) => 250 + rowIndex * 18)
    .duration(300)
    .attr("opacity", 1);
}
