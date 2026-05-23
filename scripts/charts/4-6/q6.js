// Q6 – Region density: bubble map by region
// Container expected: <div id="q6-region-density"></div>

const VIETNAM_GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

const REGION_LABELS = new Map([
    ['trung du va mien nui bac bo', 'Trung du và miền núi Bắc Bộ'],
    ['tr ung du va mien nui bac bo', 'Trung du và miền núi Bắc Bộ'],
    ['dong bang song hong', 'Đồng bằng sông Hồng'],
    ['bac trung bo', 'Bắc Trung Bộ và Duyên hải miền Trung'],
    ['bac trung bo va duyen hai mien trung', 'Bắc Trung Bộ và Duyên hải miền Trung'],
    ['tay nguyen', 'Tây Nguyên'],
    ['dong nam bo', 'Đông Nam Bộ'],
    ['dong bang song cuu long', 'Đồng bằng sông Cửu Long'],
]);

function normalizeText(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function getTooltip() {
    const existing = d3.select('body').select('.chart-tooltip');
    return existing.empty() ? d3.select('body').append('div').attr('class', 'chart-tooltip') : existing;
}

function formatRegionLabel(region) {
    return REGION_LABELS.get(normalizeText(region)) || region;
}

function buildRegionSummary(data) {
    const valid = data.filter((d) => d.region && d.locationName && Number.isFinite(d.lat) && Number.isFinite(d.lon));
    return Array.from(
        d3.group(valid, (d) => formatRegionLabel(d.region)),
        ([region, rows]) => {
            const locations = Array.from(
                d3.group(rows, (d) => d.locationName),
                ([locationName, locationRows]) => ({
                    locationName,
                    lat: d3.mean(locationRows, (d) => d.lat),
                    lon: d3.mean(locationRows, (d) => d.lon),
                }),
            ).filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon));

            return {
                region,
                count: locations.length,
                lat: d3.mean(locations, (d) => d.lat),
                lon: d3.mean(locations, (d) => d.lon),
                locations,
            };
        },
    ).filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && d.count > 0);
}

function getVietnamFeature(geo) {
    return geo?.features?.find((feature) => {
        const properties = feature?.properties || {};
        const values = [properties.name, properties.NAME, properties.Name_EN, properties.ADMIN, properties.Name_VI].filter(Boolean);
        return values.some((value) => normalizeText(value) === 'vietnam');
    });
}

function drawBubbleLegend(layer, bubbleScale, maxCount) {
    layer.selectAll('*').remove();

    const values = [1, Math.max(1, Math.round(maxCount / 2)), maxCount].filter((value, index, array) => array.indexOf(value) === index);
    layer.append('text').attr('x', 0).attr('y', 0).attr('font-size', 12).attr('font-weight', 600).attr('fill', '#334155').text('Số lượng điểm đo');
    const item = layer.append('g').attr('transform', 'translate(0, 12)').selectAll('g').data(values).join('g').attr('transform', (d, index) => `translate(${index * 72}, 28)`);

    item.append('circle')
        .attr('cx', 18)
        .attr('cy', 18)
        .attr('r', (d) => bubbleScale(d))
        .attr('fill', '#93c5fd')
        .attr('fill-opacity', 0.8)
        .attr('stroke', '#1d4ed8')
        .attr('stroke-width', 1);

    item.append('text')
        .attr('x', 18)
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 11)
        .attr('font-weight', 700)
        .attr('fill', '#0f172a')
        .text((d) => d);
}

function drawBubbles(layer, regionPoints, bubbleScale, fillScale) {
    const tooltip = getTooltip();
    const items = layer.selectAll('g.region-bubble').data(regionPoints, (d) => d.region);

    const enter = items.enter().append('g').attr('class', 'region-bubble').style('cursor', 'pointer');

    enter.append('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', 0)
        .attr('fill', (d) => fillScale(d.count))
        .attr('fill-opacity', 0.9)
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 1.2)
        .attr('filter', 'url(#q6-soft-shadow)')
        .attr('role', 'img')
        .attr('aria-label', (d) => `${d.region}: ${d.count} địa điểm`);

    enter.append('text')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 800)
        .attr('fill', '#ffffff')
        .attr('paint-order', 'stroke')
        .attr('stroke', '#0f172a')
        .attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0)
        .text((d) => d.count);

    enter.append('text')
        .attr('class', 'region-label')
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('dx', (d) => bubbleScale(d.count) + 10)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('font-size', 10)
        .attr('fill', '#334155')
        .text((d) => d.region);

    const merged = enter.merge(items);

    merged.select('circle')
        .on('mouseenter', function (event, d) {
            tooltip
                .style('opacity', 1)
                .html(`<strong>${d.region}</strong><br/>Số lượng điểm đo: ${d.count}`);
            d3.select(this).transition().duration(120).attr('fill-opacity', 1);
        })
        .on('mousemove', (event) => {
            tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseleave', function () {
            tooltip.style('opacity', 0);
            d3.select(this).transition().duration(120).attr('fill-opacity', 0.9);
        });

    merged.transition().duration(650).ease(d3.easeCubicOut).select('circle')
        .attr('cx', (d) => d.x)
        .attr('cy', (d) => d.y)
        .attr('r', (d) => bubbleScale(d.count))
        .attr('fill', (d) => fillScale(d.count));

    merged.selectAll('text').filter(function (_, index) {
        return index === 0;
    }).transition().duration(650).ease(d3.easeCubicOut).attr('x', (d) => d.x).attr('y', (d) => d.y).attr('opacity', 1);

    merged.selectAll('text').filter(function (_, index) {
        return index === 1;
    }).transition().duration(650).ease(d3.easeCubicOut).attr('x', (d) => d.x).attr('y', (d) => d.y).attr('dy', (d) => bubbleScale(d.count) + 28);

    // region label visibility: hide on very small bubbles to reduce clutter
    merged.selectAll('text.region-label').transition().duration(650).ease(d3.easeCubicOut)
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('dx', (d) => bubbleScale(d.count) + 10)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('opacity', 1)
        .attr('paint-order', 'stroke')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3)
        .attr('stroke-linejoin', 'round');

    items.exit().remove();
}

function renderFallbackMap(container, regionData, totalW, totalH, margin, bubbleScale, fillScale) {
    const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('width', '100%')
        .attr('role', 'img')
        .attr('aria-label', 'Vietnam regional bubble map')
        .style('overflow', 'visible');

    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'q6-soft-shadow').append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 6).attr('flood-color', '#0f172a').attr('flood-opacity', 0.16);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const mapLayer = g.append('g');
    const bubbleLayer = g.append('g');
    const legendLayer = svg.append('g').attr('transform', `translate(${totalW - 224}, 18)`);

    const projection = d3.geoMercator()
        .center([108, 16])
        .scale(Math.min(innerWidthLike(totalW, margin) * 4.6, innerHeightLike(totalH, margin) * 6.4))
        .translate([innerWidthLike(totalW, margin) / 2, innerHeightLike(totalH, margin) / 2 + 8]);

    const projected = regionData
        .map((d) => {
            const point = projection([d.lon, d.lat]);
            return point ? { ...d, x: point[0], y: point[1] } : null;
        })
        .filter((d) => d && Number.isFinite(d.x) && Number.isFinite(d.y));

    const hull = d3.polygonHull(projected.map((d) => [d.x, d.y]));
    if (hull) {
        mapLayer
            .append('path')
            .attr('d', `M${hull.map((point) => point.join(',')).join('L')}Z`)
            .attr('fill', '#f1f5f9')
            .attr('stroke', '#334155')
            .attr('stroke-width', 1.4);
    }

    drawBubbles(bubbleLayer, projected, bubbleScale, fillScale);
    drawBubbleLegend(legendLayer, bubbleScale, d3.max(regionData, (d) => d.count) ?? 1);
}

function innerWidthLike(totalW, margin) {
    return totalW - margin.left - margin.right;
}

function innerHeightLike(totalH, margin) {
    return totalH - margin.top - margin.bottom;
}

export async function drawQ6RegionDensity(data) {
    const container = d3.select('#q6-region-density');
    container.selectAll('*').remove();
    if (!data || data.length === 0) return;

    const regionData = buildRegionSummary(data).sort((a, b) => d3.descending(a.count, b.count));
    if (regionData.length === 0) return;

    const totalW = Math.max(760, container.node().getBoundingClientRect().width || 960);
    const totalH = 560;
    const margin = { top: 56, right: 24, bottom: 24, left: 24 };
    const innerW = totalW - margin.left - margin.right;
    const innerH = totalH - margin.top - margin.bottom;

    const bubbleScale = d3.scaleSqrt().domain([0, d3.max(regionData, (d) => d.count) ?? 1]).range([16, 42]);
    const fillScale = d3.scaleSequential().domain([0, d3.max(regionData, (d) => d.count) ?? 1]).interpolator(d3.interpolateRgbBasis(['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8']));

    const svg = container
        .append('svg')
        .attr('viewBox', `0 0 ${totalW} ${totalH}`)
        .attr('width', '100%')
        .attr('role', 'img')
        .attr('aria-label', 'Vietnam regional bubble map')
        .style('overflow', 'visible');

    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'q6-soft-shadow').append('feDropShadow').attr('dx', 0).attr('dy', 4).attr('stdDeviation', 6).attr('flood-color', '#0f172a').attr('flood-opacity', 0.16);

    // Title removed — page-level description (templates/analysis.html) provides the Q6 description
    const titleLayer = svg.append('g').attr('transform', `translate(${margin.left}, 18)`);

    const fallback = () => renderFallbackMap(container, regionData, totalW, totalH, margin, bubbleScale, fillScale);

    try {
        const geo = await d3.json('/datasets/countries.geojson').catch(() => d3.json(VIETNAM_GEOJSON_URL));
        const vietnamFeature = getVietnamFeature(geo);

        if (!vietnamFeature) {
            fallback();
            return;
        }

        const projection = d3.geoMercator().fitSize([innerW, innerH], vietnamFeature);
        const path = d3.geoPath(projection);
        const countryPath = path(vietnamFeature);

        const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const mapLayer = root.append('g');
        const bubbleLayer = root.append('g');
        const outlineLayer = root.append('g');
        const legendLayer = svg.append('g').attr('transform', `translate(${totalW - 224}, 18)`);

        mapLayer
            .append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', innerW)
            .attr('height', innerH)
            .attr('rx', 18)
            .attr('fill', 'rgba(255, 255, 255, 0.72)')
            .attr('stroke', 'none');

        mapLayer.append('path')
            .attr('d', countryPath)
            .attr('fill', '#f8fafc')
            .attr('stroke', '#334155')
            .attr('stroke-width', 1.4)
            .attr('vector-effect', 'non-scaling-stroke');

        outlineLayer.append('path')
            .attr('d', countryPath)
            .attr('fill', 'none')
            .attr('stroke', '#0f172a')
            .attr('stroke-width', 1.2)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('pointer-events', 'none');

        const projectedRegionData = regionData
            .map((d) => {
                const projected = projection([d.lon, d.lat]);
                return projected ? { ...d, x: projected[0], y: projected[1] } : null;
            })
            .filter((d) => d && Number.isFinite(d.x) && Number.isFinite(d.y));

        drawBubbles(bubbleLayer, projectedRegionData, bubbleScale, fillScale);
        drawBubbleLegend(legendLayer, bubbleScale, d3.max(regionData, (d) => d.count) ?? 1);
    } catch (error) {
        fallback();
    }
}
