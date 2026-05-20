import pandas as pd
from pathlib import Path

IN_PATH = Path("data/processed/daily_fire_counts_by_state_2020_2024.csv")
OUT_PATH = Path("data/processed/daily_fire_counts_wide_2020_2024.csv")

df = pd.read_csv(IN_PATH, parse_dates=["date"])

wide = (
    df.pivot_table(
        index=["date", "year", "month", "day", "season_day"],
        columns="state_group",
        values="fire_count",
        aggfunc="sum",
        fill_value=0,
    )
    .reset_index()
)

wide.columns.name = None

wide = wide.rename(columns={
    "Punjab": "punjab_fires",
    "Haryana": "haryana_fires",
    "Delhi": "delhi_fires",
    "Other": "other_fires",
})

for col in ["punjab_fires", "haryana_fires", "delhi_fires", "other_fires"]:
    if col not in wide.columns:
        wide[col] = 0

wide["total_fires"] = (
    wide["punjab_fires"]
    + wide["haryana_fires"]
    + wide["delhi_fires"]
    + wide["other_fires"]
)

wide = wide[
    [
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
]

wide.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print(wide.head())

print("\nAnnual totals:")
print(
    wide.groupby("year")[
        ["punjab_fires", "haryana_fires", "delhi_fires", "other_fires", "total_fires"]
    ].sum()
)

print("\nPeak Punjab fire day by year:")
peaks = wide.loc[wide.groupby("year")["punjab_fires"].idxmax()]
print(peaks[["year", "date", "season_day", "punjab_fires", "haryana_fires", "total_fires"]])