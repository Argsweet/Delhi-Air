import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(
    "data/processed/daily_fire_counts_wide_2020_2024.csv",
    parse_dates=["date"]
)

year = 2023
plot_df = df[df["year"] == year]

plt.figure(figsize=(12, 5))

plt.plot(
    plot_df["season_day"],
    plot_df["punjab_fires"],
    marker="o",
    markersize=2,
    linewidth=2,
    label="Punjab"
)

plt.plot(
    plot_df["season_day"],
    plot_df["haryana_fires"],
    marker="o",
    markersize=2,
    linewidth=2,
    label="Haryana"
)

plt.title("Punjab Dominates Crop-Season Fire Detections, 2023")
plt.xlabel("Day of crop-burning season: Oct 1 to Nov 30")
plt.ylabel("VIIRS fire detections")
plt.legend()
plt.tight_layout()
plt.show()