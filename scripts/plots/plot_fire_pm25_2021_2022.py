import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv(
    "data/processed/merged_fire_pm25_daily.csv",
    parse_dates=["date"]
)

# Use complete years only
df = df[df["year"].isin([2021, 2022])].copy()

for year in [2021, 2022]:
    plot_df = df[df["year"] == year]

    fig, ax1 = plt.subplots(figsize=(12, 5))

    ax1.plot(
        plot_df["season_day"],
        plot_df["punjab_fires"],
        marker="o",
        markersize=2,
        linewidth=2,
        label="Punjab fire detections",
    )

    ax1.plot(
        plot_df["season_day"],
        plot_df["haryana_fires"],
        marker="o",
        markersize=2,
        linewidth=1.5,
        label="Haryana fire detections",
    )

    ax1.set_xlabel("Day of crop-burning season: Oct 1 to Nov 30")
    ax1.set_ylabel("VIIRS fire detections")

    ax2 = ax1.twinx()

    ax2.plot(
        plot_df["season_day"],
        plot_df["pm25_delhi"],
        marker="o",
        markersize=2,
        linewidth=2,
        linestyle="--",
        label="Delhi PM2.5",
    )

    ax2.set_ylabel("Delhi PM2.5")

    plt.title(f"Punjab/Haryana Fires and Delhi PM2.5, {year}")

    lines_1, labels_1 = ax1.get_legend_handles_labels()
    lines_2, labels_2 = ax2.get_legend_handles_labels()
    ax1.legend(lines_1 + lines_2, labels_1 + labels_2, loc="upper left")

    plt.tight_layout()
    plt.show()


