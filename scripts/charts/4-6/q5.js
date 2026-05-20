// Q5 – Side-by-side comparison: coastal vs inland across multiple metrics
// Container expected: <div id="q5-coastal"></div>

export function drawQ5(data) {
    const container = d3.select("#q5-coastal");
    container.selectAll("*").remove();
    if (!data || data.length === 0) return;
    // classify locations: coastal if terrain contains 'ven biển'
    const isCoastal = (d) => (String(d.terrain || "").toLowerCase().includes("ven biển") ? "Coastal" : "Inland");

    // metrics to compare
    const metrics = [
        { key: "humidity", label: "Avg Humidity (%)", fmt: (v) => v.toFixed(1) },
        { key: "temp", label: "Avg Temp (°C)", fmt: (v) => v.toFixed(1) },
        { key: "avgvis", label: "Avg Vis (km)", fmt: (v) => v.toFixed(1) },
        { key: "maxwind", label: "Max Wind (kph)", fmt: (v) => v.toFixed(1) },
        { key: "uv", label: "UV Index", fmt: (v) => v.toFixed(1) },
        { key: "precip", label: "Total Precip (mm)", fmt: (v) => v.toFixed(1) },
    ];

    // (quarter filter removed) — draw using full dataset by default

    const width = Math.max(760, container.node().getBoundingClientRect().width || 900);
    const height = 360;
    const margin = { top: 28, right: 16, bottom: 68, left: 44 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%");
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const panelW = innerW / metrics.length;
    const color = d3.scaleOrdinal().domain(["Coastal", "Inland"]).range(["#2563eb", "#ef4444"]);

    const tooltip = d3.select("body").select(".chart-tooltip");
    const tt = tooltip.empty() ? d3.select("body").append("div").attr("class", "chart-tooltip") : tooltip;

    function monthToQuarter(m) {
        return Math.floor(m / 3) + 1;
    }

    function computeStats(q) {
        let rows = data.filter((d) => Number.isFinite(d.temp));
        if (q && q !== "all") {
            rows = rows.filter((d) => d.date && monthToQuarter(d.date.getMonth()) === +q);
        }
        const grouped = d3.groups(rows, (d) => isCoastal(d));
        const stats = new Map();
        grouped.forEach(([group, rws]) => {
            const m = {};
            metrics.forEach((mt) => {
                m[mt.key] = d3.mean(rws, (r) => r[mt.key]);
            });
            stats.set(group, m);
        });
        return stats;
    }

    // containers per metric for updates
    const panels = [];

    // initial draw setup (panels with empty bars)
    const initStats = computeStats("all");
    const groups = ["Coastal", "Inland"].filter((g) => initStats.has(g));

    // optional y axis group reference for first panel
    let firstYAxisG = null;

    metrics.forEach((mt, i) => {
        const x0 = i * panelW;
        const panelG = g.append("g").attr("transform", `translate(${x0},0)`);

        const vals = groups.map((g) => initStats.get(g)[mt.key]).filter((v) => v != null && !Number.isNaN(v));
        const ymax = d3.max(vals) ?? 1;
        const y = d3.scaleLinear().domain([0, ymax * 1.15]).range([innerH, 0]).nice();
        const x = d3.scaleBand().domain(groups).range([0, panelW - 10]).padding(0.25);

        if (i === 0) {
            panelG.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5)).selectAll("text").attr("font-size", 11);
        } else {
            // placeholder axis group for layout; do not render left axis on other panels
            panelG.append("g").attr("class", "y-axis");
        }

        panelG
            .append("text")
            .attr("x", (panelW - 10) / 2)
            .attr("y", -8)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .text(mt.label);

        const bars = panelG
            .selectAll("rect")
            .data(groups)
            .join("rect")
            .attr("x", (d) => x(d))
            .attr("width", x.bandwidth())
            .attr("y", innerH)
            .attr("height", 0)
            .attr("fill", (d) => color(d))
            .style("cursor", "pointer")
            .on("mouseenter", function (event, d) {
                const v = initStats.get(d)[mt.key];
                tt.style("opacity", 1).html(`<strong>${d}</strong><br/>${mt.label}: ${mt.fmt(v)}`);
                d3.select(this).transition().duration(120).attr("opacity", 0.85);
            })
            .on("mousemove", (event) => tt.style("left", event.pageX + 12 + "px").style("top", event.pageY - 28 + "px"))
            .on("mouseleave", function () {
                tt.style("opacity", 0);
                d3.select(this).transition().duration(120).attr("opacity", 1);
            });

        const valsText = panelG
            .selectAll("text.val")
            .data(groups)
            .join("text")
            .attr("class", "val")
            .attr("x", (d) => x(d) + x.bandwidth() / 2)
            .attr("y", innerH)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("fill", "#374151")
            .text((d) => {
                const v = initStats.get(d)[mt.key];
                return v != null && !Number.isNaN(v) ? mt.fmt(v) : "";
            });

        panels.push({ mt, panelG, x, y, bars, valsText });
    });

    // legend
    const legend = g.append("g").attr("transform", `translate(${innerW - 160},${-2})`);
    groups.forEach((gname, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 18})`);
        row.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(gname));
        row.append("text").attr("x", 18).attr("y", 10).attr("font-size", 12).text(gname);
    });

    function updateForQuarter(q) {
        const stats = computeStats(q);
        const groupsNow = ["Coastal", "Inland"].filter((g) => stats.has(g));

        panels.forEach((p, i) => {
            const mt = p.mt;
            const panelG = p.panelG;
            const x = p.x;
            const y = p.y;

            const vals = groupsNow.map((g) => stats.get(g)[mt.key]).filter((v) => v != null && !Number.isNaN(v));
            const ymax = d3.max(vals) ?? 1;
            y.domain([0, ymax * 1.15]).nice();

            // update axis for first panel only
            if (i === 0) {
                panelG.select('.y-axis').transition().duration(600).call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('font-size', 11);
            }

            // update bars
            // update x domain to current groups
            x.domain(groupsNow);

            const bars = panelG.selectAll('rect').data(groupsNow);
            bars.join(
                (enter) => enter.append('rect').attr('x', (d) => x(d)).attr('width', x.bandwidth()).attr('y', innerH).attr('height', 0).attr('fill', (d) => color(d)).style('cursor', 'pointer'),
                (update) => update,
                (exit) => exit.remove(),
            )
                .on('mouseenter', function (event, d) {
                    const v = stats.get(d)[mt.key];
                    tt.style('opacity', 1).html(`<strong>${d}</strong><br/>${mt.label}: ${mt.fmt(v)}`);
                    d3.select(this).transition().duration(120).attr('opacity', 0.85);
                })
                .on('mousemove', (event) => tt.style('left', event.pageX + 12 + 'px').style('top', event.pageY - 28 + 'px'))
                .on('mouseleave', function () {
                    tt.style('opacity', 0);
                    d3.select(this).transition().duration(120).attr('opacity', 1);
                })
                .transition()
                .duration(600)
                .attr('x', (d) => x(d))
                .attr('width', x.bandwidth())
                .attr('y', (d) => y(stats.get(d)[mt.key] ?? 0))
                .attr('height', (d) => Math.max(0, innerH - y(stats.get(d)[mt.key] ?? 0)));

            // update labels
            const valsText = panelG.selectAll('text.val').data(groupsNow);
            valsText.join('text').attr('class', 'val').attr('x', (d) => x(d) + x.bandwidth() / 2).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#374151')
                .transition().duration(600).attr('y', (d) => y(stats.get(d)[mt.key] ?? 0) - 6).text((d) => {
                    const v = stats.get(d)[mt.key];
                    return v != null && !Number.isNaN(v) ? mt.fmt(v) : '';
                });
        });
    }

    // initial transition (draw with full data)
    updateForQuarter('all');
}
