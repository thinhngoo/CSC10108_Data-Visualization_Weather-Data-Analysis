# weather-d3

Weather data visualization dashboard built with **D3.js** and served by a small **Flask** app.

## Frontend / D3

Charts use **[D3.js v7](https://d3js.org/)**, loaded in `templates/base.html` from the official CDN (`https://d3js.org/d3.v7.min.js`).

## Data

- Raw preview: `datasets/df_weather_fixed_utf8.csv`
- Cleaned dataset (`python build_cleaned.py`): `datasets/cleaned-dataset.csv`.

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
templates/       Flask HTML templates (analysis, raw & cleaning dataset views)
styles/          CSS
scripts/         Loaders, page renderers, and D3 chart modules
  charts/        1-3 · 4-6 · 7-9 · 10-12 (analysis question ranges)
datasets/      CSV dataset served to the browser
build_cleaned.py   Writes datasets/cleaned-dataset.csv from the fixed raw CSV
server.py      Flask entrypoint (runs on :8000)
```

