# weather-d3

Weather data visualization dashboard built with **D3.js** and served by a small **Flask** app.

## Pages

- **Home** (`/`): dashboard with 3 charts
  - **Line chart**: temperature over time (`scripts/charts/lineTemp.js`)
  - **Bar chart**: average temperature by region (`scripts/charts/barRegion.js`)
  - **Scatter plot**: temperature vs UV index (`scripts/charts/scatterUV.js`)
- **Raw dataset** (`/dataset/raw/`): preview of the CSV loaded by D3 (first 200 rows)
- **Refined dataset** (`/dataset/refined/`): preview of the refined data (first 200 rows)

## Data

- Raw preview: `datasets/df_weather_fixed_utf8.csv`
- Refined preview: `datasets/refined-dataset.csv`
- Analysis charts consume `parseForCharts()` output (typed fields from that refined CSV file)

## Run locally (Windows / PowerShell)

Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Start the server:

```powershell
python .\server.py
```

Then open:

- `http://localhost:8000/`

## Project structure

```text
templates/   Flask HTML templates (home/raw/refined)
styles/      CSS
scripts/     D3 charts, loaders, and page renderers
datasets/    CSV dataset served to the browser
server.py    Flask entrypoint (runs on :8000)
```

