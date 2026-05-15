// Q6 – Region density: count distinct locations per region (bar chart, sorted desc)
// Container expected: <div id="q6-region-density"></div>

export function drawQ6RegionDensity(data) {
    const container = d3.select('#q6-region-density');
    container.selectAll('*').remove();
    if (!data || data.length === 0) return;

    // compute distinct location counts per region
    const grouped = d3.rollups(
        data.filter(d => d.region && d.locationName),
        v => new Set(v.map(r => r.locationName)).size,
        d => d.region
    ).map(([region, count]) => ({ region, count }));

    // sort descending
    grouped.sort((a, b) => d3.descending(a.count, b.count));

    const margin = { top: 44, right: 24, bottom: 120, left: 60 };
    const totalW = Math.max(760, container.node().getBoundingClientRect().width || 920);
    const totalH = 420;
    const W = totalW - margin.left - margin.right;
    const H = totalH - margin.top - margin.bottom;

    const svg = container.append('svg')
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('width', '100%')
        .style('overflow', 'visible');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(grouped.map(d => d.region)).range([0, W]).padding(0.18);
    const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d.count) ?? 1]).range([H, 0]).nice();

    // y axis
    g.append('g')
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format('d')))
        .selectAll('text')
        .attr('font-size', 11)
        .attr('fill', '#6b7280');

    // bars
    const bars = g.selectAll('rect.bar')
        .data(grouped, d => d.region)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.region))
        .attr('width', x.bandwidth())
        .attr('y', H)
        .attr('height', 0)
        .attr('fill', '#5b85aa')
        .on('mouseenter', function (event, d) {
            const tt = d3.select('body').select('.chart-tooltip');
            const tooltip = tt.empty() ? d3.select('body').append('div').attr('class', 'chart-tooltip') : tt;
            tooltip.style('opacity', 1).html(`<strong>${d.region}</strong><br/>Distinct locations: ${d.count}`);
            d3.select(this).transition().duration(120).attr('fill', '#3d6890');
        })
        .on('mousemove', (event) => {
            d3.select('body').select('.chart-tooltip').style('left', event.pageX + 12 + 'px').style('top', event.pageY - 28 + 'px');
        })
        .on('mouseleave', function () {
            d3.select('body').select('.chart-tooltip').style('opacity', 0);
            d3.select(this).transition().duration(120).attr('fill', '#5b85aa');
        });

    bars.transition()
        .duration(700)
        .attr('y', d => y(d.count))
        .attr('height', d => Math.max(0, H - y(d.count)));

    // value labels
    g.selectAll('text.val')
        .data(grouped, d => d.region)
        .join('text')
        .attr('class', 'val')
        .attr('x', d => x(d.region) + x.bandwidth() / 2)
        .attr('y', d => y(d.count) - 6)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', '#374151')
        .text(d => d.count);

    // x axis (rotated labels)
    g.append('g')
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-25)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.6em')
        .attr('dy', '0.25em')
        .attr('font-size', 11)
        .attr('fill', '#374151');

    // header
    g.append('text')
        .attr('x', 0)
        .attr('y', -18)
        .attr('font-size', 12)
        .attr('font-weight', 600)
        .attr('fill', '#374151')
        .text('Distinct locations per Region');
}
