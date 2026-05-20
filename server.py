from pathlib import Path
import importlib.util

from flask import Flask, jsonify, redirect, render_template, send_from_directory

app = Flask(__name__, static_url_path="", template_folder="templates")
ROOT = Path(__file__).resolve().parent


def _load_build_cleaned_module():
    spec = importlib.util.spec_from_file_location(
        "build_cleaned_api", ROOT / "build_cleaned.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_BUILD_CLEANED = _load_build_cleaned_module()


def collect_watch_files():
    root = Path(__file__).resolve().parent
    extra = []
    for folder in ["templates", "styles", "scripts", "datasets"]:
        path = root / folder
        if path.exists():
            extra.extend(str(p) for p in path.rglob("*") if p.is_file())
    bc = root / "build_cleaned.py"
    if bc.is_file():
        extra.append(str(bc))
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


@app.route("/dataset/cleaning")
def dataset_cleaning_noslash():
    return redirect("/dataset/cleaning/", code=308)


@app.route("/dataset/cleaning/")
def dataset_cleaning():
    return render_template("cleaning.html", active_route="dataset-cleaning")


@app.route("/dataset/refined/")
@app.route("/dataset/refined")
def dataset_refined_redirect():
    return redirect("/dataset/cleaning/", code=308)


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


@app.post("/api/build-cleaned")
def api_build_cleaned():
    """
    Regenerate datasets/cleaned-dataset.csv (same logic as python build_cleaned.py).
    """
    try:
        out_path = _BUILD_CLEANED.create_cleaned_dataset()
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    return jsonify({"ok": True, "filename": out_path.name}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True, extra_files=collect_watch_files())
