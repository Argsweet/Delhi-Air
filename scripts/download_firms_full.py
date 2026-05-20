import time
from io import StringIO
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
import requests

MAP_KEY = "90486991c213d3a0435f4feb876f3198"

# Punjab + Haryana + Delhi bounding box
BBOX = "73.5,27.5,78.8,32.7"

# Historical VIIRS S-NPP product
SOURCE = "VIIRS_SNPP_SP"

START_YEAR = 2020
END_YEAR = 2024

RAW_DIR = Path("data/raw/firms_chunks")
RAW_DIR.mkdir(parents=True, exist_ok=True)

OUT_PATH = Path("data/raw/firms_fire_2020_2024_oct_nov.csv")


def date_chunks(start_date, end_date, chunk_days=5):
    current = start_date
    while current <= end_date:
        chunk_end = min(current + timedelta(days=chunk_days - 1), end_date)
        day_range = (chunk_end - current).days + 1
        yield current, day_range
        current = chunk_end + timedelta(days=1)


all_dfs = []

for year in range(START_YEAR, END_YEAR + 1):
    start = datetime(year, 10, 1)
    end = datetime(year, 11, 30)

    print(f"\nDownloading {year}...")

    for chunk_start, day_range in date_chunks(start, end, chunk_days=5):
        date_str = chunk_start.strftime("%Y-%m-%d")

        url = (
            f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
            f"{MAP_KEY}/{SOURCE}/{BBOX}/{day_range}/{date_str}"
        )

        print(f"  {date_str} for {day_range} days")

        response = requests.get(url, timeout=60)

        if response.status_code != 200:
            print("  Failed:", response.status_code)
            print(response.text[:300])
            continue

        text = response.text.strip()

        if text.startswith("Invalid") or text.startswith("Error"):
            print("  API error:", text[:300])
            continue

        df = pd.read_csv(StringIO(text))

        if df.empty:
            print("  No rows")
            continue

        df["query_start_date"] = date_str
        df["query_day_range"] = day_range
        df["source_product"] = SOURCE

        chunk_file = RAW_DIR / f"firms_{year}_{date_str}.csv"
        df.to_csv(chunk_file, index=False)

        all_dfs.append(df)

        print(f"  Rows: {len(df):,}")

        time.sleep(0.5)

if not all_dfs:
    raise RuntimeError("No data downloaded. Check source, map key, dates, or bbox.")

full = pd.concat(all_dfs, ignore_index=True)

# Remove exact duplicate detections if any chunks overlap accidentally
full = full.drop_duplicates()

full.to_csv(OUT_PATH, index=False)

print("\nDone.")
print(f"Saved: {OUT_PATH}")
print(f"Total rows: {len(full):,}")
print("Date range:", full["acq_date"].min(), "to", full["acq_date"].max())
print("Columns:", full.columns.tolist())