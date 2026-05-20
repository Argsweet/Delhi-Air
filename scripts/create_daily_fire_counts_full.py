import pandas as pd
from pathlib import Path

IN_PATH = Path("data/processed/fire_points_2020_2024.csv")
OUT_PATH = Path("data/processed/daily_fire_counts_2020_2024.csv")

df = pd.read_csv(IN_PATH, parse_dates=["date"])

daily = (
    df.groupby("date")
    .size()
    .reset_index(name="fire_count_total")
)

# Fill every Oct-Nov date for each year
years = sorted(df["year"].unique())

all_dates = []
for year in years:
    dates = pd.date_range(f"{year}-10-01", f"{year}-11-30", freq="D")
    all_dates.append(pd.DataFrame({"date": dates}))

full_dates = pd.concat(all_dates, ignore_index=True)

daily = full_dates.merge(daily, on="date", how="left")
daily["fire_count_total"] = daily["fire_count_total"].fillna(0).astype(int)

daily["year"] = daily["date"].dt.year
daily["month"] = daily["date"].dt.month
daily["day"] = daily["date"].dt.day
daily["season_day"] = (
    daily["date"] - pd.to_datetime(daily["year"].astype(str) + "-10-01")
).dt.days + 1

daily.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", daily.shape)

print("\nPeak fire day by year:")
peaks = daily.loc[daily.groupby("year")["fire_count_total"].idxmax()]
print(peaks[["year", "date", "season_day", "fire_count_total"]])

print("\nTotal fires by year:")
totals = daily.groupby("year")["fire_count_total"].sum()
print(totals)