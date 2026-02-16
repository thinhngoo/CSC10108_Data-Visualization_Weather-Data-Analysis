export async function loadData() {
  return d3.csv("/datasets/df_weather_fixed_utf8.csv");
}
