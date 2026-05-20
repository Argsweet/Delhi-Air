import pandas as pd
from pathlib import Path

RAW_PATH = Path("data/raw/delhi_air_pollution_hourly.csv")
OUT_PATH = Path("data/processed/delhi_pm25_daily.csv")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(RAW_PATH)

# Convert hourly timestamp
df["datetime"] = pd.to_datetime(df["date"])
df["date"] = df["datetime"].dt.date
df["date"] = pd.to_datetime(df["date"])

# Daily averages
daily = (
    df.groupby("date")
    .agg(
        pm25_delhi=("pm2_5", "mean"),
        pm10_delhi=("pm10", "mean"),
        no2_delhi=("no2", "mean"),
        o3_delhi=("o3", "mean"),
        co_delhi=("co", "mean"),
        records_per_day=("pm2_5", "count"),
    )
    .reset_index()
)

daily["year"] = daily["date"].dt.year
daily["month"] = daily["date"].dt.month
daily["day"] = daily["date"].dt.day

# Keep only crop-burning season
daily = daily[daily["month"].isin([10, 11])].copy()

daily["season_day"] = (
    daily["date"] - pd.to_datetime(daily["year"].astype(str) + "-10-01")
).dt.days + 1

daily.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", daily.shape)
print("Date range:", daily["date"].min(), "to", daily["date"].max())

print("\nRows by year:")
print(daily.groupby("year").size())

print("\nPM2.5 summary by year:")
print(daily.groupby("year")["pm25_delhi"].describe())

print("\nFirst rows:")
print(daily.head())