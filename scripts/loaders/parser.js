export function parseForCharts(rows) {
  const parseDate = d3.timeParse("%Y-%m-%d");
  const parseTime = d3.timeParse("%I:%M %p");
  return rows
    .filter((d) => d["day.avgtemp_c"] !== "")
    .map((d) => {
      const rise = parseTime((d["astro.sunrise"] || "").trim());
      const set = parseTime((d["astro.sunset"] || "").trim());
      const hourOfDayLight =
        rise && set ? +((set - rise) / 3_600_000).toFixed(4) : null;

      return {
        locationName: (d["location.name"] || "").trim(),
        terrain: (d["location.terrain"] || "").trim(),
        date: parseDate(d.date),
        region: d["location.region"].trim(),
        temp: +d["day.avgtemp_c"],
        minTemp: +d["day.mintemp_c"],
        maxTemp: +d["day.maxtemp_c"],
        humidity: +d["day.avghumidity"],
        avgvis: +d["day.avgvis_km"],
        maxwind: +d["day.maxwind_kph"],
        precip: +d["day.totalprecip_mm"],
        uv: +d["day.uv"],
        condition: d["day.condition.text"] || "Unknown",
        lat: +d["location.lat"],
        lon: +d["location.lon"],
        sunrise: d["astro.sunrise"],
        sunset: d["astro.sunset"],
        hourOfDayLight,
      };
    })
    .filter((d) => d.date != null && !Number.isNaN(d.temp));
}
