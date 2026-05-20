export function drawQ2(data) {
  const container = d3.select("#box-region-temp");
  const quarterSelect = d3.select("#q2-quarter-select");
  const sortSelect = d3.select("#q2-sort-select");
  container.selectAll("svg").remove();

  if (!data || data.length === 0) return;

  const margin = { top: 30, right: 30, bottom: 80, left: 60 };
  const width = container.node().getBoundingClientRect().width || 800;
  const height = 450;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  let tooltip = d3.select("body").select(".d3-tooltip-q2");
  if (tooltip.empty()) {
    tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "d3-tooltip-q2")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "8px 12px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("z-index", 1000);
  }

  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand().range([0, innerWidth]).padding(0.4);
  const y = d3.scaleLinear().range([innerHeight, 0]);

  const regionsAll = Array.from(new Set(data.map((d) => d.region))).sort();
  const color = d3.scaleOrdinal().domain(regionsAll).range(d3.schemeSet2);

  const refLayer = g.append("g").attr("class", "q2-reference-layer");
  const refLine = refLayer
    .append("line")
    .attr("class", "q2-global-avg-line")
    .style("stroke", "#dc2626")
    .style("stroke-width", 2)
    .style("stroke-dasharray", "6 4")
    .style("pointer-events", "none")
    .style("opacity", 0);
  const refLabel = refLayer
    .append("text")
    .attr("class", "q2-global-avg-label")
    .attr("fill", "#dc2626")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .style("opacity", 0);

  const localRefLine = refLayer
    .append("line")
    .attr("class", "q2-local-avg-line")
    .style("stroke", "#2563eb")
    .style("stroke-width", 2)
    .style("stroke-dasharray", "4 4")
    .style("pointer-events", "none")
    .style("opacity", 0);
  const localRefLabel = refLayer
    .append("text")
    .attr("class", "q2-local-avg-label")
    .attr("fill", "#2563eb")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .style("opacity", 0);

  const xAxisGroup = g
    .append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${innerHeight})`);

  const yAxisGroup = g.append("g").attr("class", "y-axis");

  let activeRegion = null;

  function computeBoxPlotStats(regionData) {
    const sorted = regionData.sort((a, b) => d3.ascending(a.temp, b.temp));
    const temps = sorted.map((d) => d.temp);
    const q1 = d3.quantile(temps, 0.25) || 0;
    const median = d3.quantile(temps, 0.5) || 0;
    const q3 = d3.quantile(temps, 0.75) || 0;
    const iqr = q3 - q1;
    const minLimit = q1 - 1.5 * iqr;
    const maxLimit = q3 + 1.5 * iqr;

    const outliers = [];
    const normalPoints = [];
    sorted.forEach((d) => {
      if (d.temp < minLimit || d.temp > maxLimit) outliers.push(d);
      else normalPoints.push(d);
    });

    const min = normalPoints.length
      ? d3.min(normalPoints, (d) => d.temp)
      : q1;
    const max = normalPoints.length
      ? d3.max(normalPoints, (d) => d.temp)
      : q3;

    return {
      q1,
      median,
      q3,
      iqr,
      min,
      max,
      outliers,
      normalPoints,
      region: regionData[0].region,
    };
  }

  function orderedRegions(presentRegions, meanByRegion, sortMode) {
    const list = [...presentRegions];
    if (sortMode === "temp-asc") {
      list.sort((a, b) => (meanByRegion.get(a) ?? 0) - (meanByRegion.get(b) ?? 0));
    } else if (sortMode === "temp-desc") {
      list.sort((a, b) => (meanByRegion.get(b) ?? 0) - (meanByRegion.get(a) ?? 0));
    } else {
      list.sort(d3.ascending);
    }
    return list;
  }

  function update() {
    const quarter = quarterSelect.property("value");
    const sortMode = sortSelect.property("value") || "region";
    let filtered = data;

    if (quarter !== "All") {
      const q = +quarter;
      filtered = data.filter((d) => {
        const month = d.date.getMonth();
        return Math.floor(month / 3) + 1 === q;
      });
    }

    const globalAvg = d3.mean(filtered, (d) => d.temp);

    const grouped = d3.groups(filtered, (d) => d.region);
    const meanByRegion = new Map(
      grouped.map(([region, values]) => [
        region,
        d3.mean(values, (d) => d.temp),
      ]),
    );

    const boxData = grouped.map(([region, values]) =>
      computeBoxPlotStats(values),
    );

    if (boxData.length === 0) {
      g.selectAll(".box-group").remove();
      refLine.style("opacity", 0);
      refLabel.style("opacity", 0);
      return;
    }

    const presentRegions = boxData.map((d) => d.region);
    const domainR = orderedRegions(presentRegions, meanByRegion, sortMode);
    x.domain(domainR);

    const globalMin = d3.min(filtered, (d) => d.temp);
    const globalMax = d3.max(filtered, (d) => d.temp);
    y.domain([Math.min(0, globalMin - 5), globalMax + 5]).nice();

    if (globalAvg != null && !Number.isNaN(globalAvg)) {
      const yg = y(globalAvg);
      const inView = yg >= 0 && yg <= innerHeight;
      refLine
        .style("opacity", inView ? 1 : 0)
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", yg)
        .attr("y2", yg);
      refLabel
        .style("opacity", inView ? 1 : 0)
        .attr("x", innerWidth - 4)
        .attr("y", yg - 6)
        .attr("text-anchor", "end")
        .text(`${globalAvg.toFixed(1)}°C`);
    } else {
      refLine.style("opacity", 0);
      refLabel.style("opacity", 0);
    }

    xAxisGroup
      .transition()
      .duration(750)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-20)")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em");

    yAxisGroup
      .transition()
      .duration(750)
      .call(d3.axisLeft(y).tickFormat((d) => d + "°C"));

    const boxes = g.selectAll(".box-group").data(boxData, (d) => d.region);

    const boxEnter = boxes
      .enter()
      .append("g")
      .attr("class", "box-group")
      .attr("transform", (d) => `translate(${x(d.region)},0)`)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        if (activeRegion === d.region) {
          activeRegion = null;
          g.selectAll(".box-group")
            .transition()
            .duration(300)
            .style("opacity", 1);
          g.selectAll(".outlier")
            .transition()
            .duration(300)
            .style("fill", "#ff4a4a")
            .attr("r", 3);
        } else {
          activeRegion = d.region;
          g.selectAll(".box-group")
            .transition()
            .duration(300)
            .style("opacity", (groupD) =>
              groupD.region === d.region ? 1 : 0.2,
            );
          g.selectAll(".outlier")
            .transition()
            .duration(300)
            .style("fill", (outD) =>
              outD.region === d.region ? "#ff0000" : "#ccc",
            )
            .attr("r", (outD) => (outD.region === d.region ? 5 : 2));
        }
      });

    boxEnter.append("line").attr("class", "vert-line");
    boxEnter.append("rect").attr("class", "box-rect");
    boxEnter.append("line").attr("class", "median-line");

    const boxMerge = boxEnter.merge(boxes);

    boxMerge
      .transition()
      .duration(750)
      .attr("transform", (d) => `translate(${x(d.region)},0)`);

    boxMerge
      .select(".vert-line")
      .transition()
      .duration(750)
      .attr("x1", x.bandwidth() / 2)
      .attr("x2", x.bandwidth() / 2)
      .attr("y1", (d) => y(d.min))
      .attr("y2", (d) => y(d.max))
      .attr("stroke", "#333");

    boxMerge
      .select(".box-rect")
      .transition()
      .duration(750)
      .attr("x", 0)
      .attr("y", (d) => y(d.q3))
      .attr("height", (d) => Math.max(0, y(d.q1) - y(d.q3)))
      .attr("width", x.bandwidth())
      .attr("stroke", "#333")
      .attr("fill", (d) => color(d.region))
      .style("opacity", 0.8);

    boxMerge
      .select(".median-line")
      .transition()
      .duration(750)
      .attr("x1", 0)
      .attr("x2", x.bandwidth())
      .attr("y1", (d) => y(d.median))
      .attr("y2", (d) => y(d.median))
      .attr("stroke", "#333")
      .attr("stroke-width", 2);

    boxMerge
      .on("mouseover", function (event, d) {
        d3.select(this).select(".box-rect").style("opacity", 1);
        tooltip.transition().duration(200).style("opacity", 1);
        const meanR = meanByRegion.get(d.region);

        if (meanR != null && !Number.isNaN(meanR)) {
          const yMean = y(meanR);
          localRefLine
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", yMean)
            .attr("y2", yMean)
            .style("opacity", 1);
          localRefLabel
            .attr("x", innerWidth - 4)
            .attr("y", yMean - 6)
            .attr("text-anchor", "end")
            .text(`${d.region} TB: ${meanR.toFixed(1)}°C`)
            .style("opacity", 1);
        }

        tooltip
          .html(
            `<strong>${d.region}</strong><br/>` +
              `TB ngày: ${meanR != null ? meanR.toFixed(1) : "—"}°C<br/>` +
              `Max: ${d.max.toFixed(1)}°C<br/>` +
              `Q3: ${d.q3.toFixed(1)}°C<br/>` +
              `Median: ${d.median.toFixed(1)}°C<br/>` +
              `Q1: ${d.q1.toFixed(1)}°C<br/>` +
              `Min: ${d.min.toFixed(1)}°C`,
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).select(".box-rect").style("opacity", 0.8);
        tooltip.transition().duration(500).style("opacity", 0);
        localRefLine.style("opacity", 0);
        localRefLabel.style("opacity", 0);
      });

    const outliersData = [];
    boxData.forEach((bd) => {
      bd.outliers.forEach((out) =>
        outliersData.push({ ...out, region: bd.region }),
      );
    });

    const outliers = g
      .selectAll(".outlier")
      .data(outliersData, (d) => d.region + "-" + d.date.getTime());

    outliers
      .enter()
      .append("circle")
      .attr("class", "outlier")
      .attr("cx", (d) => x(d.region) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.temp))
      .attr("r", 3)
      .attr("fill", "#ff4a4a")
      .style("opacity", 0)
      .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip
          .html(
            `<strong>Ngoại lệ (${d.region})</strong><br/>` +
              `Date: ${d3.timeFormat("%Y-%m-%d")(d.date)}<br/>` +
              `Temp: ${d.temp.toFixed(1)}°C`,
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .merge(outliers)
      .transition()
      .duration(750)
      .attr("cx", (d) => x(d.region) + x.bandwidth() / 2)
      .attr("cy", (d) => y(d.temp))
      .style("opacity", 0.8)
      .style("fill", (d) =>
        activeRegion && activeRegion !== d.region ? "#ccc" : "#ff4a4a",
      )
      .attr("r", (d) => (activeRegion === d.region ? 5 : 3));

    outliers.exit().remove();
    boxes.exit().remove();

    if (activeRegion) {
      g.selectAll(".box-group").style("opacity", (d) =>
        d.region === activeRegion ? 1 : 0.2,
      );
    } else {
      g.selectAll(".box-group").style("opacity", 1);
    }

    refLayer.raise();
  }

  quarterSelect.on("change", update);
  sortSelect.on("change", update);

  update();
}
