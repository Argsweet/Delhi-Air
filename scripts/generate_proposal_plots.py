import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

PLOTS_DIR = Path("proposal_plots")
PLOTS_DIR.mkdir(exist_ok=True)

FIRE_SEASON_PATH = Path("data/final/fire_season_2020_2024.csv")
FIRE_PM25_PATH = Path("data/final/fire_pm25_2021_2022.csv")
FIRE_POINTS_PATH = Path("data/processed/fire_points_2020_2024_with_state.csv")

fire = pd.read_csv(FIRE_SEASON_PATH, parse_dates=["date"])
merged = pd.read_csv(FIRE_PM25_PATH, parse_dates=["date"])


# ------------------------------------------------------------
# 1. Annual fire totals by state
# ------------------------------------------------------------
annual = fire.groupby("year")[
    ["punjab_fires", "haryana_fires", "delhi_fires", "other_fires"]
].sum()

plt.figure(figsize=(10, 6))
bottom = None

for col in ["punjab_fires", "haryana_fires", "delhi_fires", "other_fires"]:
    if bottom is None:
        plt.bar(annual.index, annual[col], label=col.replace("_", " ").title())
        bottom = annual[col].copy()
    else:
        plt.bar(annual.index, annual[col], bottom=bottom, label=col.replace("_", " ").title())
        bottom += annual[col]

plt.title("Annual VIIRS Fire Detections During Crop-Burning Season")
plt.xlabel("Year")
plt.ylabel("Total fire detections, Oct 1–Nov 30")
plt.legend()
plt.tight_layout()
plt.savefig(PLOTS_DIR / "01_annual_fire_totals_by_state.png", dpi=200)
plt.close()


# ------------------------------------------------------------
# 2. Daily fire season curves, 2020–2024
# ------------------------------------------------------------
plt.figure(figsize=(12, 6))

for year, group in fire.groupby("year"):
    plt.plot(
        group["season_day"],
        group["total_fires"],
        marker="o",
        markersize=2,
        linewidth=1.5,
        label=str(year)
    )

plt.title("Daily Fire Detections Rise Sharply During the Crop-Burning Window")
plt.xlabel("Day of season: Oct 1 to Nov 30")
plt.ylabel("Daily VIIRS fire detections")
plt.legend(title="Year")
plt.tight_layout()
plt.savefig(PLOTS_DIR / "02_daily_fire_season_curves_2020_2024.png", dpi=200)
plt.close()


# ------------------------------------------------------------
# 3. Punjab vs Haryana fire detections, 2023
# ------------------------------------------------------------
plot_2023 = fire[fire["year"] == 2023]

plt.figure(figsize=(12, 6))

plt.plot(
    plot_2023["season_day"],
    plot_2023["punjab_fires"],
    marker="o",
    markersize=2,
    linewidth=2,
    label="Punjab"
)

plt.plot(
    plot_2023["season_day"],
    plot_2023["haryana_fires"],
    marker="o",
    markersize=2,
    linewidth=2,
    label="Haryana"
)

plt.title("Punjab Dominates Fire Detections During the 2023 Burning Season")
plt.xlabel("Day of season: Oct 1 to Nov 30")
plt.ylabel("Daily VIIRS fire detections")
plt.legend()
plt.tight_layout()
plt.savefig(PLOTS_DIR / "03_punjab_vs_haryana_2023.png", dpi=200)
plt.close()


# ------------------------------------------------------------
# 4. Fire detection map, sampled
# ------------------------------------------------------------
if FIRE_POINTS_PATH.exists():
    points = pd.read_csv(FIRE_POINTS_PATH, parse_dates=["date"])

    # Sample for readability if there are too many points
    if len(points) > 40000:
        points_sample = points.sample(40000, random_state=42)
    else:
        points_sample = points.copy()

    plt.figure(figsize=(8, 8))

    for state, group in points_sample.groupby("state"):
        if state in ["Punjab", "Haryana", "Delhi"]:
            plt.scatter(
                group["longitude"],
                group["latitude"],
                s=1,
                alpha=0.35,
                label=state
            )

    plt.title("Fire Detections Cluster Across Punjab and Haryana")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.legend(markerscale=6)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "04_fire_detection_map_sampled.png", dpi=200)
    plt.close()


# ------------------------------------------------------------
# 5. Punjab fires and Delhi PM2.5, 2021
# Normalize both to 0–1 so timing is easier to compare.
# ------------------------------------------------------------
for year in [2021, 2022]:
    df_year = merged[merged["year"] == year].copy()

    df_year["punjab_fires_index"] = (
        df_year["punjab_fires"] / df_year["punjab_fires"].max()
    )

    df_year["pm25_index"] = (
        df_year["pm25_delhi"] / df_year["pm25_delhi"].max()
    )

    plt.figure(figsize=(12, 6))

    plt.plot(
        df_year["season_day"],
        df_year["punjab_fires_index"],
        marker="o",
        markersize=2,
        linewidth=2,
        label="Punjab fires, indexed"
    )

    plt.plot(
        df_year["season_day"],
        df_year["pm25_index"],
        marker="o",
        markersize=2,
        linewidth=2,
        linestyle="--",
        label="Delhi PM2.5, indexed"
    )

    plt.title(f"Punjab Fires and Delhi PM2.5 Rise in the Same Seasonal Window, {year}")
    plt.xlabel("Day of season: Oct 1 to Nov 30")
    plt.ylabel("Indexed value, 0 to 1")
    plt.legend()
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / f"05_fire_pm25_indexed_{year}.png", dpi=200)
    plt.close()


# ------------------------------------------------------------
# 6. Same-day relationship scatter
# ------------------------------------------------------------
plot_df = merged[merged["year"].isin([2021, 2022])].copy()

plt.figure(figsize=(8, 6))

for year, group in plot_df.groupby("year"):
    plt.scatter(
        group["punjab_fires"],
        group["pm25_delhi"],
        alpha=0.7,
        label=str(year)
    )

plt.title("Daily Fire Counts and Delhi PM2.5 Are Related, But Not One-to-One")
plt.xlabel("Punjab fire detections")
plt.ylabel("Delhi PM2.5")
plt.legend(title="Year")
plt.tight_layout()
plt.savefig(PLOTS_DIR / "06_punjab_fires_vs_delhi_pm25_scatter.png", dpi=200)
plt.close()


print("Saved proposal plots to:", PLOTS_DIR.resolve())