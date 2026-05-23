// Q4 – Vietnam geographic heatmap using province coordinates and a country boundary
// Container expected: <div id="q4-heatmap"></div>

const VIETNAM_GEOJSON_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

function getTooltip() {
  const existing = d3.select("body").select(".chart-tooltip");
  return existing.empty() ? d3.select("body").append("div").attr("class", "chart-tooltip") : existing;
}

function formatTemp(value) {
  return `${value.toFixed(1)} °C`;
}

function formatMonthLabel(date) {
  return d3.timeFormat("%b %Y")(date);
}

function buildProvinceSummary(data) {
  return Array.from(d3.group(data, (d) => d.locationName), ([locationName, rows]) => {
    const first = rows[0];
    return {
      locationName,
      region: first.region,
      terrain: first.terrain,
      lat: d3.mean(rows, (d) => d.lat),
      lon: d3.mean(rows, (d) => d.lon),
      avgTemp: d3.mean(rows, (d) => d.temp),
      avgHumidity: d3.mean(rows, (d) => d.humidity),
      totalPrecip: d3.sum(rows, (d) => d.precip),
      samples: rows.length,
    };
  }).filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && Number.isFinite(d.avgTemp));
}

function createScales(provinces) {
  const tempExtent = d3.extent(provinces, (d) => d.avgTemp);
  return {
    tempScale: d3
      .scaleSequential()
      .domain([tempExtent[0] ?? 0, tempExtent[1] ?? 1])
      .interpolator(d3.interpolateRgbBasis(["#1d4ed8", "#06b6d4", "#facc15", "#f97316", "#dc2626"])),
    opacityScale: d3.scaleLinear().domain([tempExtent[0] ?? 0, tempExtent[1] ?? 1]).range([0.08, 0.35]),
    radiusScale: d3.scaleLinear().domain([tempExtent[0] ?? 0, tempExtent[1] ?? 1]).range([14, 30]),
    tempExtent,
  };
}

function addLegend(defs, legendLayer, tempScale, tempExtent, provincesCount) {
  const legendWidth = 170;
  const legendHeight = 12;

  const legendGradient = defs
    .append("linearGradient")
    .attr("id", "q4-legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");

  [
    [0, tempExtent[0] ?? 0],
    [1, tempExtent[1] ?? 1],
  ].forEach(([offset, temp]) => {
    legendGradient.append("stop").attr("offset", `${offset * 100}%`).attr("stop-color", tempScale(temp));
  });

  legendLayer
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .attr("font-size", 12)
    .attr("font-weight", 600)
    .attr("fill", "#334155")
    .text("Average temperature");

  legendLayer
    .append("rect")
    .attr("x", 0)
    .attr("y", 12)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 999)
    .attr("fill", "url(#q4-legend-gradient)");

  legendLayer
    .append("text")
    .attr("x", 0)
    .attr("y", 42)
    .attr("font-size", 11)
    .attr("fill", "#64748b")
    .text(formatTemp(tempExtent[0] ?? 0));

  legendLayer
    .append("text")
    .attr("x", legendWidth)
    .attr("y", 42)
    .attr("text-anchor", "end")
    .attr("font-size", 11)
    .attr("fill", "#64748b")
    .text(formatTemp(tempExtent[1] ?? 0));

  legendLayer
    .append("text")
    .attr("x", 0)
    .attr("y", 62)
    .attr("font-size", 11)
    .attr("fill", "#64748b")
    .text(`${provincesCount} provinces`);
}

function renderPoints(layer, points, tempScale, opacityScale, radiusScale) {
  const enterDuration = 360;
  const updateDuration = 420;
  const exitDuration = 260;
  const hoverDuration = 180;

  // heat blobs with smooth enter/update/exit transitions
  const blobs = layer.selectAll("circle.heat-blob").data(points, (d) => d.locationName);
  blobs
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "heat-blob")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", 0)
          .attr("fill", (d) => tempScale(d.avgTemp))
          .attr("fill-opacity", 0)
          .attr("filter", "url(#q4-heat-blur)"),
      (update) => update,
      (exit) => exit.transition().duration(exitDuration).ease(d3.easeCubicOut).attr("r", 0).attr("fill-opacity", 0).remove(),
    )
    .call((sel) => sel.transition().duration(updateDuration).ease(d3.easeCubicOut).attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", (d) => radiusScale(d.avgTemp)).attr("fill", (d) => tempScale(d.avgTemp)).attr("fill-opacity", (d) => opacityScale(d.avgTemp)));

  // location points with animation
  const pts = layer.selectAll("circle.location-point").data(points, (d) => d.locationName);
  pts
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "location-point")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", 0)
          .attr("fill", "#0f172a")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.4)
          .style("cursor", "pointer"),
      (update) => update,
      (exit) => exit.transition().duration(exitDuration).ease(d3.easeCubicOut).attr("r", 0).remove(),
    )
    .call((sel) => sel.transition().duration(enterDuration).ease(d3.easeCubicOut).attr("cx", (d) => d.x).attr("cy", (d) => d.y).attr("r", 3.4));

  // attach tooltip handlers
  layer.selectAll("circle.location-point")
    .on("mouseenter", function (event, d) {
      const tooltip = getTooltip();
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${d.locationName}</strong><br/>Vùng: ${d.region}<br/>Nhiệt độ TB: ${formatTemp(d.avgTemp)}<br/>Độ ẩm TB: ${d.avgHumidity.toFixed(1)}%<br/>Tổng mưa: ${d.totalPrecip.toFixed(1)} mm<br/>Mẫu: ${d.samples}`,
        );
      d3.select(this).transition().duration(hoverDuration).ease(d3.easeCubicOut).attr("r", 5.4);
    })
    .on("mousemove", (event) => {
      const tooltip = getTooltip();
      tooltip.style("left", `${event.pageX + 14}px`).style("top", `${event.pageY - 30}px`);
    })
    .on("mouseleave", function () {
      const tooltip = getTooltip();
      tooltip.style("opacity", 0);
      d3.select(this).transition().duration(hoverDuration).ease(d3.easeCubicOut).attr("r", 3.4);
    });
}

function renderFallback(container, provinces, innerWidth, innerHeight, margin, tempScale, opacityScale, radiusScale, defs, legendLayer, tempExtent) {
  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${innerWidth + margin.left + margin.right} ${innerHeight + margin.top + margin.bottom}`)
    .attr("width", "100%")
    .attr("role", "img")
    .attr("aria-label", "Vietnam heatmap")
    .style("overflow", "hidden");

  defs
    .append("filter")
    .attr("id", "q4-heat-blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", 6);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const mapLayer = g.append("g");
  const pointLayer = g.append("g");

  const projection = d3
    .geoMercator()
    .center([107.4, 16.2])
    .scale(Math.min(innerWidth * 5.2, innerHeight * 7.4))
    .translate([innerWidth / 2, innerHeight / 2 + 10]);

  const points = provinces
    .map((d) => {
      const projected = projection([d.lon, d.lat]);
      return projected ? { ...d, x: projected[0], y: projected[1] } : null;
    })
    .filter(Boolean)
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

  const hull = d3.polygonHull(points.map((d) => [d.x, d.y]));
  if (hull) {
    mapLayer
      .append("path")
      .attr("d", `M${hull.map((p) => p.join(",")).join("L")}Z`)
      .attr("fill", "#eef2ff")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5);
  }

  renderPoints(mapLayer, points, tempScale, opacityScale, radiusScale);
  addLegend(defs, legendLayer, tempScale, tempExtent, provinces.length);
}

export function drawQ4Heatmap(data) {
  const container = d3.select("#q4-heatmap");
  container.selectAll("*").remove();
  if (!data || data.length === 0) return;

  const provinces = buildProvinceSummary(data);
  if (provinces.length === 0) return;

  const width = Math.max(760, container.node().getBoundingClientRect().width || 960);
  const height = 560;
  const margin = { top: 22, right: 24, bottom: 24, left: 24 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { tempScale, opacityScale, radiusScale, tempExtent } = createScales(provinces);

  const controls = container
    .append("div")
    .attr("class", "q4-controls")
    .style("margin-bottom", "8px")
    .style("font-family", "sans-serif")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "12px");

  controls.append("div").attr("class", "q4-slider-label").text("Month:");

  const sliderWrap = controls.append('div').attr('class','q4-slider-wrap');

  const btnLeft = sliderWrap.append('button').attr('type','button').attr('class','q4-slider-button q4-slider-left').html('◀');

  const slider = sliderWrap
    .append("input")
    .attr("type", "range")
    .attr("id", "q4-month-slider")
    .attr("min", 0)
    .attr("max", 0)
    .attr("value", 0)
    .attr('class','q4-slider-range');

  const btnRight = sliderWrap.append('button').attr('type','button').attr('class','q4-slider-button q4-slider-right').html('▶');

  const btnReset = controls.append('button').attr('type','button').attr('class','q4-reset-btn').text('Reset view');

  const sliderText = controls
    .append("span")
    .attr("class", "q4-slider-text")
    .style("font-weight", "600");

  // small helpers for buttons
  btnLeft.on('click', () => {
    const el = document.getElementById('q4-month-slider');
    if (!el) return;
    const v = Math.max(Number(el.min || 0), Number(el.value) - 1);
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  btnRight.on('click', () => {
    const el = document.getElementById('q4-month-slider');
    if (!el) return;
    const v = Math.min(Number(el.max || 0), Number(el.value) + 1);
    el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const svg = container
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("role", "img")
    .attr("aria-label", "Vietnam heatmap")
    .style("overflow", "hidden");

  const defs = svg.append("defs");
  defs
    .append("filter")
    .attr("id", "q4-heat-blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", 6);

  const zoomRoot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const scene = zoomRoot.append("g").attr("class", "q4-scene");
  const mapLayer = scene.append("g").attr("class", "q4-map-layer");
  const pointLayer = scene.append("g").attr("class", "q4-point-layer");
  const legendLayer = zoomRoot.append("g").attr("transform", `translate(${innerWidth - 190}, 10)`);

  mapLayer
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("rx", 18)
    .attr("fill", "rgba(255, 255, 255, 0.52)");

  const zoomBehavior = d3.zoom().scaleExtent([1, 8]).on("zoom", (event) => {
    scene.attr("transform", event.transform);
  });
  svg.call(zoomBehavior);

  const countriesUrl = "/datasets/countries.geojson";
  const drawFallbackNow = () => {
    renderFallback(container, provinces, innerWidth, innerHeight, margin, tempScale, opacityScale, radiusScale, defs, legendLayer, tempExtent);
  };

  // debounce helper for slider input
  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  const months = Array.from(
    new Set(data.map((d) => new Date(d.date.getFullYear(), d.date.getMonth(), 1).getTime())),
  )
    .map(Number)
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  if (months.length === 0) months.push(new Date());

  const monthFormat = d3.timeFormat("%b %Y");
  slider.attr("max", months.length - 1).attr("value", months.length - 1);
  sliderText.text(monthFormat(months[months.length - 1]));

  function provincesForMonth(monthDate) {
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const slice = data.filter((d) => d.date && d.date.getFullYear() === year && d.date.getMonth() === month);
    return buildProvinceSummary(slice.length ? slice : data);
  }

  function updateForProvinces(provs, projection, path, countryPath) {
    const projectedPoints = provs
      .map((d) => {
        const projected = projection([d.lon, d.lat]);
        return projected ? { ...d, x: projected[0], y: projected[1] } : null;
      })
      .filter(Boolean)
      .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));

    // update country fill/outline path instead of recreating (cheaper)
    const countrySel = mapLayer.select('path.q4-country');
    if (!countrySel.empty()) countrySel.attr('d', countryPath);
    const outlineSel = mapLayer.select('path.q4-country-outline');
    if (!outlineSel.empty()) outlineSel.attr('d', countryPath);

    // update heat blobs on mapLayer with transitions
    mapLayer.selectAll("circle.heat-blob").data(projectedPoints, (d) => d.locationName)
      .join(
        enter => enter.append('circle').attr('class','heat-blob').attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',0).attr('fill',d=>tempScale(d.avgTemp)).attr('fill-opacity',0).attr('filter','url(#q4-heat-blur)').attr('clip-path','url(#q4-vietnam-clip)'),
        update => update,
        exit => exit.transition().duration(200).attr('r',0).attr('fill-opacity',0).remove()
      )
      .call(sel => sel.transition().duration(200).attr('cx',d=>d.x).attr('cy',d=>d.y).attr('r',d=>radiusScale(d.avgTemp)).attr('fill',d=>tempScale(d.avgTemp)).attr('fill-opacity',d=>opacityScale(d.avgTemp)));

    // province borders are rendered once (after country path is established)

    renderPoints(pointLayer, projectedPoints, tempScale, opacityScale, radiusScale);

    legendLayer.selectAll('*').remove();
    defs.select('#q4-legend-gradient').remove();
    addLegend(defs, legendLayer, tempScale, tempExtent, provs.length);

    // keep the outline on top
    mapLayer
      .append('path')
      .attr('d', countryPath)
      .attr('fill', 'none')
      .attr('stroke', '#263238')
      .attr('stroke-width', 1.6)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('pointer-events', 'none');

    // ensure province borders remain on top
    try {
      mapLayer.selectAll('.q4-province-borders').raise();
    } catch (e) {
      // ignore if selection not present
    }
  }

  d3.json(countriesUrl)
    .catch(() => d3.json(VIETNAM_GEOJSON_URL))
    .then((geo) => {
      const vietnamFeature = geo?.features?.find((feature) => feature.properties?.name === 'Vietnam');
      if (!vietnamFeature) {
        drawFallbackNow();
        return;
      }

      const projection = d3.geoMercator().fitSize([innerWidth, innerHeight], vietnamFeature);
      const path = d3.geoPath(projection);
      const countryPath = path(vietnamFeature);

      defs
        .append('clipPath')
        .attr('id', 'q4-vietnam-clip')
        .append('path')
        .attr('d', countryPath);

      // create country fill and outline once; update.js will update 'd' instead of recreating
      mapLayer.append('path').attr('class', 'q4-country').attr('d', countryPath).attr('fill', '#eef2ff').attr('stroke', '#334155').attr('stroke-width', 1.5).attr('vector-effect', 'non-scaling-stroke');
      mapLayer.append('path').attr('class', 'q4-country-outline').attr('d', countryPath).attr('fill', 'none').attr('stroke', '#263238').attr('stroke-width', 1.6).attr('vector-effect', 'non-scaling-stroke').style('pointer-events', 'none');

      // render province borders once (prefer local vn.json; fallback to Voronoi on aggregated provinces)
      (function renderProvinceBorders() {
        d3.json('/datasets/vn.json')
          .then((local) => {
            const features = local?.features || [];
            if (features.length) {
              const g = mapLayer.append('g').attr('class', 'q4-province-borders').attr('clip-path', 'url(#q4-vietnam-clip)');
              g.selectAll('path').data(features).join('path').attr('d', path).attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 0.6).attr('vector-effect', 'non-scaling-stroke').style('pointer-events', 'none');
              return;
            }
            throw new Error('no-features');
          })
          .catch(() => {
            const projectedAll = provinces
              .map((d) => {
                const p = projection([d.lon, d.lat]);
                return p ? { ...d, x: p[0], y: p[1] } : null;
              })
              .filter(Boolean)
              .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y));
            if (projectedAll.length > 2) {
              try {
                const pts = projectedAll.map((p) => [p.x, p.y]);
                const delaunay = d3.Delaunay.from(pts);
                const voronoi = delaunay.voronoi([0, 0, innerWidth, innerHeight]);
                const g = mapLayer.append('g').attr('class', 'q4-province-borders').attr('clip-path', 'url(#q4-vietnam-clip)');
                g.selectAll('path').data(projectedAll).join('path').attr('d', (d, i) => voronoi.renderCell(i)).attr('fill', 'none').attr('stroke', '#1f2937').attr('stroke-width', 0.6).attr('vector-effect', 'non-scaling-stroke').style('pointer-events', 'none');
              } catch (e) {
                // ignore
              }
            }
          });
      })();

      const redraw = () => {
        const idx = +slider.property('value');
        const monthDate = months[idx] || months[months.length - 1];
        sliderText.text(monthFormat(monthDate));
        updateForProvinces(provincesForMonth(monthDate), projection, path, countryPath);
      };

      // debounce slider input to avoid excessive redraws
      slider.on('input', debounce(redraw, 120));
      // attach reset handler now that svg & zoomBehavior exist
      try {
        btnReset.on('click', () => {
          svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity);
        });
      } catch (e) {
        // ignore if btnReset missing
      }

      redraw();
    })
    .catch(() => {
      drawFallbackNow();
    });
}

function renderHtmlLegend(containerSel, tempScale, tempExtent, provincesCount) {
  // containerSel is a d3 selection of the outer container div
  const existing = containerSel.select('.q4-legend');
  existing.remove();
  const legend = containerSel
    .append('div')
    .attr('class', 'q4-legend')
    .style('pointer-events', 'auto');

  const legendWidth = 170;
  const g = legend.append('div').attr('class', 'q4-legend-inner');
  g.append('div').attr('class', 'q4-legend-title').text('Average temperature');
  g.append('div')
    .attr('class', 'q4-legend-bar')
    .style('width', `${legendWidth}px`)
    .style('height', '12px')
    .style('border-radius', '999px')
    .style('background', `linear-gradient(90deg, ${tempScale(tempExtent[0])} 0%, ${tempScale((tempExtent[0]+tempExtent[1])/2)} 50%, ${tempScale(tempExtent[1])} 100%)`);

  const labels = g.append('div').attr('class', 'q4-legend-labels');
  labels.append('span').attr('class', 'q4-legend-min').text(formatTemp(tempExtent[0] ?? 0));
  labels.append('span').attr('class', 'q4-legend-count').text(`${provincesCount} provinces`);
  labels.append('span').attr('class', 'q4-legend-max').text(formatTemp(tempExtent[1] ?? 0));
}