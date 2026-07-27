from __future__ import annotations
import numpy as np
import pandas as pd
from sklearn.metrics import f1_score


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    clean = df.astype(object).where(pd.notna(df), None)
    records = clean.to_dict(orient="records")
    for record in records:
        for key, value in record.items():
            if isinstance(value, np.bool_):
                record[key] = bool(value)
            elif isinstance(value, np.integer):
                record[key] = int(value)
            elif isinstance(value, np.floating):
                record[key] = float(value)
    return records


def compute_chart_metrics_stats(perf_df: pd.DataFrame) -> list[dict]:
    return _df_to_records(perf_df)


def compute_chart_pareto_stats(pareto_df: pd.DataFrame) -> list[dict]:
    return _df_to_records(pareto_df)


def compute_chart_pareto_stats_by_dataset(pareto_df: pd.DataFrame) -> dict[str, list[dict]]:
    return {dataset: _df_to_records(group) for dataset, group in pareto_df.groupby("dataset")}


def compute_chart_f1_heatmap_stats(pred_df: pd.DataFrame) -> list[dict]:
    records = []
    for (dataset, experimento_id), group in pred_df.groupby(["dataset", "experimento_id"]):
        modelo = group["modelo"].iloc[0]
        classes = sorted(group["y_true_idx"].unique())
        scores = f1_score(
            group["y_true_idx"], group["y_pred_idx"],
            average=None, labels=classes, zero_division=0
        )
        for cls, score in zip(classes, scores):
            records.append({
                "dataset": dataset, "experimento_id": experimento_id, "modelo": modelo,
                "class": int(cls), "f1": round(float(score), 4),
            })
    return records
