export async function loadRawDataset() {
  return d3.csv("/datasets/df_weather_fixed_utf8.csv");
}

export async function loadCleanedDataset() {
  return d3.csv("/datasets/cleaned-dataset.csv");
}