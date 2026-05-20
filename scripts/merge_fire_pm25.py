import pandas as pd
from pathlib import Path

FIRE_PATH = Path("data/processed/daily_fire_counts_wide_2020_2024.csv")
PM25_PATH = Path("data/processed/delhi_pm25_daily.csv")
OUT_PATH = Path("data/processed/merged_fire_pm25_daily.csv")

fires = pd.read_csv(FIRE_PATH, parse_dates=["date"])
pm25 = pd.read_csv(PM25_PATH, parse_dates=["date"])

merged = fires.merge(pm25, on=["date", "year", "month", "day", "season_day"], how="inner")

merged.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", merged.shape)
print("Date range:", merged["date"].min(), "to", merged["date"].max())

print("\nRows by year:")
print(merged.groupby("year").size())

print("\nColumns:")
print(merged.columns.tolist())

print("\nPreview:")
print(merged.head())