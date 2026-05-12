export async function loadRawDataset() {
  return d3.csv("/datasets/df_weather_fixed_utf8.csv");
}

export async function loadRefinedDataset() {
  return d3.csv("/datasets/refined-dataset.csv");
}