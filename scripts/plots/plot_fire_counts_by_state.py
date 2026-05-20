import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(
    "data/processed/daily_fire_counts_by_state_2020_2024.csv",
    parse_dates=["date"]
)

# Start with one year for readability
year = 2023
plot_df = df[df["year"] == year]

plt.figure(figsize=(12, 5))

for state, group in plot_df.groupby("state_group"):
    plt.plot(
        group["season_day"],
        group["fire_count"],
        marker="o",
        markersize=2,
        linewidth=1.5,
        label=state
    )

plt.title(f"Daily VIIRS Fire Detections by State, {year}")
plt.xlabel("Day of crop-burning season: Oct 1 to Nov 30")
plt.ylabel("Fire detections")
plt.legend(title="State")
plt.tight_layout()
plt.show()