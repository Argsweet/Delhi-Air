import pandas as pd
from pathlib import Path

RAW_PATH = Path("data/raw/firms_fire_2020_2024_oct_nov.csv")
OUT_PATH = Path("data/processed/fire_points_2020_2024.csv")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(RAW_PATH)

# Convert date
df["date"] = pd.to_datetime(df["acq_date"])

# Add date columns
df["year"] = df["date"].dt.year
df["month"] = df["date"].dt.month
df["day"] = df["date"].dt.day

# Keep only October-November just in case
df = df[df["month"].isin([10, 11])].copy()

# Oct 1 = 1, Nov 30 = 61
df["season_day"] = (
    df["date"] - pd.to_datetime(df["year"].astype(str) + "-10-01")
).dt.days + 1

# Keep D3-useful columns
keep_cols = [
    "latitude",
    "longitude",
    "date",
    "year",
    "month",
    "day",
    "season_day",
    "acq_time",
    "satellite",
    "instrument",
    "confidence",
    "bright_ti4",
    "bright_ti5",
    "frp",
    "daynight",
    "type",
]

df = df[keep_cols]

df.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", df.shape)
print("Years:", sorted(df["year"].unique()))
print("Date range:", df["date"].min(), "to", df["date"].max())
print(df.head())