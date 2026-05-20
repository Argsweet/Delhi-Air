import pandas as pd
from pathlib import Path

FINAL_DIR = Path("data/final")
FINAL_DIR.mkdir(parents=True, exist_ok=True)

# 1. Five-year fire season overview
fire = pd.read_csv("data/processed/daily_fire_counts_wide_2020_2024.csv")

fire_cols = [
    "date",
    "year",
    "month",
    "day",
    "season_day",
    "punjab_fires",
    "haryana_fires",
    "delhi_fires",
    "other_fires",
    "total_fires",
]

fire = fire[fire_cols]
fire.to_csv(FINAL_DIR / "fire_season_2020_2024.csv", index=False)

# 2. Linked fire + PM2.5 story
merged = pd.read_csv("data/processed/merged_fire_pm25_daily_2021_2022.csv")

merged_cols = [
    "date",
    "year",
    "month",
    "day",
    "season_day",
    "punjab_fires",
    "haryana_fires",
    "delhi_fires",
    "other_fires",
    "total_fires",
    "pm25_delhi",
    "pm10_delhi",
    "no2_delhi",
    "o3_delhi",
    "co_delhi",
]

merged = merged[merged_cols]
merged.to_csv(FINAL_DIR / "fire_pm25_2021_2022.csv", index=False)

print("Saved final D3 datasets:")
print(FINAL_DIR / "fire_season_2020_2024.csv", fire.shape)
print(FINAL_DIR / "fire_pm25_2021_2022.csv", merged.shape)

print("\nFire PM2.5 rows by year:")
print(merged.groupby("year").size())