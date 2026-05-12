from pathlib import Path

from flask import Flask, redirect, render_template, send_from_directory

app = Flask(__name__, static_url_path="", template_folder="templates")
ROOT = Path(__file__).resolve().parent


def collect_watch_files():
    root = Path(__file__).resolve().parent
    extra = []
    for folder in ["templates", "styles", "scripts", "datasets"]:
        path = root / folder
        if path.exists():
            extra.extend(str(p) for p in path.rglob("*") if p.is_file())
    return extra


@app.route("/")
def index():
    return render_template("analysis.html", active_route="analysis")


@app.route("/analysis")
@app.route("/analysis/")
def analysis_redirect():
    return redirect("/", code=308)


@app.route("/dataset/raw/")
def dataset_raw():
    return render_template("raw.html", active_route="dataset-raw")


@app.route("/dataset/refined/")
def dataset_refined():
    return render_template("refined.html", active_route="dataset-refined")

@app.route("/styles/<path:path>")
def serve_styles(path):
    return send_from_directory(ROOT / "styles", path)


@app.route("/scripts/<path:path>")
def serve_scripts(path):
    return send_from_directory(ROOT / "scripts", path)


@app.route("/images/<path:path>")
def serve_images(path):
    return send_from_directory(ROOT / "images", path)


@app.route("/datasets/<path:path>")
def serve_datasets(path):
    return send_from_directory(ROOT / "datasets", path)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, extra_files=collect_watch_files())
