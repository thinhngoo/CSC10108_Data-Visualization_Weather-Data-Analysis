# weather-d3

Weather data visualization dashboard built with **D3.js** and served by a small **Flask** app.

## Pages

- **Home** (`/`): dashboard with 3 charts
  - **Line chart**: temperature over time (`scripts/charts/lineTemp.js`)
  - **Bar chart**: average temperature by region (`scripts/charts/barRegion.js`)
  - **Scatter plot**: temperature vs UV index (`scripts/charts/scatterUV.js`)
- **Raw dataset** (`/dataset/raw/`): preview of the CSV loaded by D3 (first 200 rows)
- **Cleaning dataset** (`/dataset/cleaning/`): preview of the cleaned/transformed data (first 200 rows)

## Data

- Source file: `datasets/df_weather_fixed_utf8.csv`
- Loaded in: `scripts/loaders/load.js` via `d3.csv("/datasets/df_weather_fixed_utf8.csv")`
- Cleaned in: `scripts/loaders/clean.js`
  - filters out rows missing `day.avgtemp_c`
  - parses `date` as a `Date` object
  - trims `location.region`, coerces numeric fields (`temp`, `uv`, `lat`, `lon`)

## Run locally (Windows / PowerShell)

Create a virtual environment and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
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
templates/   Flask HTML templates (home/raw/cleaning)
styles/      CSS
scripts/     D3 charts, loaders, and page renderers
datasets/    CSV dataset served to the browser
server.py    Flask entrypoint (runs on :8000)
```

