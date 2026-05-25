# weather-d3

Weather data visualization dashboard built with **D3.js** and served by a small **Flask** app.

## Frontend

Charts use **[D3.js v7](https://d3js.org/)**, loaded in `templates/base.html` from the official CDN (`https://d3js.org/d3.v7.min.js`).

## Data

- Raw dataset: `datasets/df_weather_fixed_utf8.csv`
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

Then open `http://localhost:8000/`

## Project structure

```text
server.py              Flask entrypoint (runs on :8000)
build_cleaned.py       Writes datasets/cleaned-dataset.csv from the fixed raw CSV
requirements.txt       Python dependencies

templates/             Flask HTML templates
  base.html            Layout shell, D3 CDN, shared assets
  _sidebar.html        Navigation sidebar partial
  analysis.html        Chart dashboard (Q1–Q12)
  raw.html             Raw dataset table view
  cleaning.html        Data cleaning / profile overview

scripts/               Frontend ES modules
  main.js              Route bootstrapping, data load, chart dispatch
  loaders/
    load.js            Fetch raw & cleaned CSV
    parser.js          Parse cleaned rows for charts
    index.js           Loader exports
  pages/
    dataset.js         Raw table & cleaning page UI
    cleaning.js        Column profiles, string/numeric field summaries
  charts/              D3 chart modules by question range
    1-3/               Q1–Q3
    4-6/               Q4–Q6
    7-9/               Q7–Q9
    10-12/             Q10–Q12

styles/                CSS (variables, layout, sidebar, charts, dataset views)
datasets/              Data served to the browser
  df_weather_fixed_utf8.csv   Raw weather export
  cleaned-dataset.csv         Cleaned CSV (from build_cleaned.py)
  countries.geojson           Country boundaries (maps)
  vn.json                     Vietnam region geometry
```

