import pandas as pd
import geopandas as gpd
from pathlib import Path

FIRE_PATH = Path("data/processed/fire_points_2020_2024.csv")
STATES_PATH = Path("data/geo/india_states.geojson")
OUT_PATH = Path("data/processed/fire_points_2020_2024_with_state.csv")

# Load fire points
fires = pd.read_csv(FIRE_PATH, parse_dates=["date"])

# Convert fire points to GeoDataFrame
fires_gdf = gpd.GeoDataFrame(
    fires,
    geometry=gpd.points_from_xy(fires["longitude"], fires["latitude"]),
    crs="EPSG:4326"
)

# Load Indian state boundaries
states = gpd.read_file(STATES_PATH)

print("State columns:")
print(states.columns)

# You may need to adjust this depending on the GeoJSON column names.
# Common names include: ST_NM, NAME_1, state, NAME, shapeName
possible_name_cols = ["ST_NM", "NAME_1", "state", "STATE", "NAME", "shapeName"]

state_col = None
for col in possible_name_cols:
    if col in states.columns:
        state_col = col
        break

if state_col is None:
    raise ValueError(f"Could not find state name column. Columns are: {states.columns.tolist()}")

states = states[[state_col, "geometry"]].rename(columns={state_col: "state"})

# Spatial join: assign each fire point to a state polygon
labeled = gpd.sjoin(
    fires_gdf,
    states,
    how="left",
    predicate="within"
)

# Clean up
labeled["state"] = labeled["state"].fillna("Other")

# Keep only normal dataframe columns, remove geometry/index_right
labeled = pd.DataFrame(labeled.drop(columns=["geometry", "index_right"], errors="ignore"))

labeled.to_csv(OUT_PATH, index=False)

print(f"Saved: {OUT_PATH}")
print("Shape:", labeled.shape)

print("\nFire detections by state:")
print(labeled["state"].value_counts().head(20))