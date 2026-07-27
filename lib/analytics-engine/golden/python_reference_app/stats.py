from __future__ import annotations
import pandas as pd
from app.charts.utils import compute_ci95


def compute_chart1_stats(df: pd.DataFrame) -> list[dict]:
    records = []
    for dataset, group in df.groupby("dataset"):
        values = group["pss_peak"]
        q1, median, q3 = values.quantile([0.25, 0.5, 0.75])
        iqr = q3 - q1
        whisker_low = max(values.min(), q1 - 1.5 * iqr)
        whisker_high = min(values.max(), q3 + 1.5 * iqr)
        outliers = values[(values < whisker_low) | (values > whisker_high)]
        records.append({
            "dataset": dataset,
            "n": int(values.count()),
            "mean": round(values.mean(), 2),
            "std": round(values.std(), 2) if pd.notna(values.std()) else None,
            "min": round(values.min(), 2),
            "q1": round(q1, 2),
            "median": round(median, 2),
            "q3": round(q3, 2),
            "max": round(values.max(), 2),
            "iqr": round(iqr, 2),
            "whisker_low": round(whisker_low, 2),
            "whisker_high": round(whisker_high, 2),
            "outliers": [round(v, 2) for v in outliers.tolist()],
        })
    return records


def compute_chart2_stats(df: pd.DataFrame) -> list[dict]:
    summary = df.groupby(["dataset", "modelo", "device", "experimento_id"])["pss_peak"].agg(
        mean="mean", std="std", count="count"
    ).reset_index()
    records = []
    for _, r in summary.iterrows():
        ci_lower, ci_upper = compute_ci95(r["mean"], r["std"], r["count"])
        records.append({
            "dataset": r["dataset"], "modelo": r["modelo"], "device": r["device"],
            "experimento_id": r["experimento_id"], "n": int(r["count"]),
            "mean": round(r["mean"], 2),
            "std": round(r["std"], 2) if pd.notna(r["std"]) else None,
            "ci_lower": round(ci_lower, 2), "ci_upper": round(ci_upper, 2),
        })
    return records


def compute_chart3_stats(df: pd.DataFrame) -> list[dict]:
    summary = df.groupby(["modelo", "device", "dataset", "experimento_id"])["inference_time"].agg(
        mean="mean", std="std", count="count"
    ).reset_index()
    records = []
    for _, r in summary.iterrows():
        ci_lower, ci_upper = compute_ci95(r["mean"], r["std"], r["count"])
        records.append({
            "modelo": r["modelo"], "device": r["device"], "dataset": r["dataset"],
            "experimento_id": r["experimento_id"], "n": int(r["count"]),
            "mean": round(r["mean"], 2),
            "std": round(r["std"], 2) if pd.notna(r["std"]) else None,
            "ci_lower": round(ci_lower, 2), "ci_upper": round(ci_upper, 2),
        })
    return records


def compute_chart4_stats(df: pd.DataFrame) -> list[dict]:
    summary = df.groupby(["modelo", "device", "dataset", "experimento_id"])["inference_time"].agg(
        mean="mean", std="std", count="count"
    ).reset_index()
    records = []
    for _, r in summary.iterrows():
        ci_lower, ci_upper = compute_ci95(r["mean"], r["std"], r["count"])
        records.append({
            "modelo": r["modelo"], "device": r["device"], "dataset": r["dataset"],
            "experimento_id": r["experimento_id"], "n": int(r["count"]),
            "ips_mean": round(1000 / r["mean"], 2),
            "ips_ci_lower": round(1000 / ci_upper, 2) if ci_upper > 0 else None,
            "ips_ci_upper": round(1000 / ci_lower, 2) if ci_lower > 0 else None,
        })
    return records
