import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("data/processed/daily_fire_counts_wide_2020_2024.csv")

annual = df.groupby("year")[["punjab_fires", "haryana_fires", "other_fires", "delhi_fires"]].sum()

annual.plot(kind="bar", stacked=True, figsize=(10, 5))

plt.title("Total VIIRS Fire Detections During Crop-Burning Season")
plt.xlabel("Year")
plt.ylabel("Total fire detections, Oct 1–Nov 30")
plt.tight_layout()
plt.show()