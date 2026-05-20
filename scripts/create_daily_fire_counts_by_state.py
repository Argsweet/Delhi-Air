import pandas as pd
from pathlib import Path

IN_PATH = Path("data/processed/fire_points_2020_2024_with_state.csv")
OUT_PATH = Path("data/processed/daily_fire_counts_by_state_2020_2024.csv")

df = pd.read_csv(IN_PATH, parse_dates=["date"])

# Keep the main states for your story
main_states = ["Punjab", "Haryana", "Delhi"]

df["state_group"] = df["state"].where(df["state"].isin(main_states), "Other")

daily_state = (
    df.groupby(["date", "state_group"])
    .size()
    .reset_index(name="fire_count")
)

# Fill missing date-state combinations with 0
years = sorted(df["year"].unique())
all_dates = []

for year in years:
    dates = pd.date_range(f"{year}-10-01", f"{year}-11-30", freq="D")
    for state in main_states + ["Other"]:
        temp = pd.DataFrame({
            "date": dates,
            "state_group": state
        })
        all_dates.append(temp)

full = pd.concat(all_dates, ignore_index=True)

daily_state = full.merge(daily_state, on=["date", "state_group"], how="left")
daily_state["fire_count"] = daily_state["fire_count"].fillna(0).astype(int)

daily_state["year"] = daily_state["date"].dt.year
daily_state["month"] = daily_state["date"].dt.month
daily_state["day"] = daily_state["date"].dt.day
daily_state["season_day"] = (
    daily_state["date"] - pd.to_datetime(daily_state["year"].astype(str) + "-10-01")
).dt.days + 1

daily_state.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", daily_state.shape)

print("\nTotal fires by state and year:")
summary = (
    daily_state
    .groupby(["year", "state_group"])["fire_count"]
    .sum()
    .reset_index()
    .pivot(index="year", columns="state_group", values="fire_count")
)

print(summary)