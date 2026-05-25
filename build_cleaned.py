"""
Build datasets/cleaned-dataset.csv from the fixed raw export.

Transforms:
  - location.region: rename "Tr [*]ung du và miền núi Bắc Bộ" → "Trung du và miền núi Bắc Bộ"
  - Remove snow column if present (e.g. day.totalsnow_cm)

Run (from repo root):

    python build_cleaned.py
"""

from __future__ import annotations

import csv
from pathlib import Path

REGION_BEFORE = "Tr [*]ung du và miền núi Bắc Bộ"
REGION_AFTER = "Trung du và miền núi Bắc Bộ"
REGION_KEY = "location.region"
DROP_COLUMNS_EXACT = frozenset({"day.totalsnow_cm"})


def _default_datasets_dir() -> Path:
    """CSV inputs/outputs live under datasets/ relative to this script."""
    return Path(__file__).resolve().parent / "datasets"


def _filtered_fieldnames(headers: list[str]) -> list[str]:
    return [h for h in headers if h not in DROP_COLUMNS_EXACT]


def create_cleaned_dataset(
    *,
    datasets_dir: Path | None = None,
    raw_filename: str = "df_weather_fixed_utf8.csv",
    output_filename: str = "cleaned-dataset.csv",
) -> Path:
    """
    Read df_weather_fixed_utf8.csv and write cleaned-dataset.csv.

    Returns path to written file.
    """
    base = Path(datasets_dir or _default_datasets_dir())
    src = base / raw_filename
    dst = base / output_filename

    if not src.is_file():
        raise FileNotFoundError(f"Missing input CSV: {src}")

    with src.open(encoding="utf-8", newline="") as f_in, dst.open(
        "w", encoding="utf-8", newline=""
    ) as f_out:
        reader = csv.DictReader(f_in)
        if not reader.fieldnames:
            raise ValueError(f"CSV has no header row: {src}")

        kept = _filtered_fieldnames(list(reader.fieldnames))
        writer = csv.DictWriter(
            f_out,
            fieldnames=kept,
            extrasaction="ignore",
            lineterminator="\n",
        )
        writer.writeheader()

        for row in reader:
            if row.get(REGION_KEY) == REGION_BEFORE:
                row[REGION_KEY] = REGION_AFTER
            writer.writerow({k: row.get(k, "") for k in kept})

    return dst


if __name__ == "__main__":
    path = create_cleaned_dataset()
    print(f"Wrote {path}")
