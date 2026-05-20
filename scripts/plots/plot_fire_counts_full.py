import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(
    "data/processed/daily_fire_counts_2020_2024.csv",
    parse_dates=["date"]
)

plt.figure(figsize=(12, 5))

for year, group in df.groupby("year"):
    plt.plot(
        group["season_day"],
        group["fire_count_total"],
        marker="o",
        markersize=2,
        linewidth=1.5,
        label=str(year)
    )

plt.title("Daily VIIRS Fire Detections in Punjab/Haryana/Delhi Region")
plt.xlabel("Day of crop-burning season: Oct 1 to Nov 30")
plt.ylabel("Fire detections")
plt.legend(title="Year")
plt.tight_layout()
plt.show()