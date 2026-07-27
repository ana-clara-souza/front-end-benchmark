from __future__ import annotations
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

DATASET_LABELS: dict[str, str] = {"deepweeds": "DeepWeeds", "weed6c": "Weed6c"}
MODEL_LABELS: dict[str, str] = {
    "mobilenetv3small": "MobileNetV3-Small", "mobilenetv3large": "MobileNetV3-Large",
    "mobilenetv2": "MobileNetV2", "nasnetmobile": "NASNetMobile",
    "efficientnetv2b0": "EfficientNetV2-B0", "efficientnetv2b1": "EfficientNetV2-B1",
    "efficientnetv2b2": "EfficientNetV2-B2", "efficientnetv2b3": "EfficientNetV2-B3",
    "resnet50": "ResNet-50", "resnet101v2": "ResNet-101V2", "inceptionv3": "InceptionV3",
}


def build_prediction_dataframe(records: list) -> pd.DataFrame:
    df = pd.DataFrame([r.model_dump() for r in records])
    df["dataset"] = df["dataset"].replace(DATASET_LABELS)
    df["modelo"] = df["modelo"].replace(MODEL_LABELS)
    df["y_true_idx"] = pd.to_numeric(df["y_true_idx"], errors="coerce")
    df["y_pred_idx"] = pd.to_numeric(df["y_pred_idx"], errors="coerce")
    df.dropna(subset=["y_true_idx", "y_pred_idx", "modelo", "dataset", "experimento_id"], inplace=True)
    df["y_true_idx"] = df["y_true_idx"].astype(int)
    df["y_pred_idx"] = df["y_pred_idx"].astype(int)
    df.reset_index(drop=True, inplace=True)
    return df


def compute_performance_df(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for experimento_id, group in df.groupby("experimento_id"):
        y_true = group["y_true_idx"]
        y_pred = group["y_pred_idx"]
        modelo = group["modelo"].iloc[0]
        dataset = group["dataset"].iloc[0]
        acc = accuracy_score(y_true, y_pred)
        std = group.apply(lambda r: int(r["y_true_idx"] == r["y_pred_idx"]), axis=1).std()
        rows.append({
            "experimento_id": experimento_id, "modelo": modelo, "dataset": dataset,
            "accuracy": round(acc, 4),
            "std_accuracy": round(std, 4) if pd.notna(std) else None,
            "Precision": round(precision_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "Recall": round(recall_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "F1-score": round(f1_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "wP": round(precision_score(y_true, y_pred, average="weighted", zero_division=0), 4),
            "wR": round(recall_score(y_true, y_pred, average="weighted", zero_division=0), 4),
            "wF1": round(f1_score(y_true, y_pred, average="weighted", zero_division=0), 4),
        })
    perf = pd.DataFrame(rows)
    dataset_order = ["DeepWeeds", "Weed6c"]
    existing = [d for d in dataset_order if d in perf["dataset"].unique()]
    remaining = [d for d in perf["dataset"].unique() if d not in dataset_order]
    perf["dataset"] = pd.Categorical(perf["dataset"], categories=existing + remaining, ordered=True)
    perf = perf.sort_values(["dataset", "modelo", "experimento_id"]).reset_index(drop=True)
    return perf


def compute_inference_times(mobile_records: Optional[list]) -> Optional[pd.DataFrame]:
    if not mobile_records:
        return None
    df = pd.DataFrame(mobile_records)
    required = {"experimento_id", "modelo", "dataset", "device", "inference_time"}
    if not required.issubset(df.columns):
        return None
    df["dataset"] = df["dataset"].replace(DATASET_LABELS)
    df["modelo"] = df["modelo"].replace(MODEL_LABELS)
    df["inference_time"] = pd.to_numeric(df["inference_time"], errors="coerce")
    df.dropna(subset=["inference_time", "experimento_id"], inplace=True)
    summary = df.groupby(["experimento_id", "modelo", "dataset", "device"])["inference_time"].agg(
        mean_inference_time="mean", std_inference_time="std", count="count"
    ).reset_index()
    summary["mean_inference_time"] = summary["mean_inference_time"].round(2)
    summary["std_inference_time"] = summary["std_inference_time"].round(2)
    return summary


def find_pareto_optimal(df: pd.DataFrame, objectives_to_maximize: list, objectives_to_minimize: list) -> pd.DataFrame:
    is_pareto = pd.Series(True, index=df.index)
    for i, row_i in df.iterrows():
        if not is_pareto.loc[i]:
            continue
        for j, row_j in df.iterrows():
            if i == j:
                continue
            better_or_equal = True
            strictly_better = False
            for obj in objectives_to_maximize:
                if row_j[obj] < row_i[obj]:
                    better_or_equal = False
                    break
                if row_j[obj] > row_i[obj]:
                    strictly_better = True
            if not better_or_equal:
                continue
            for obj in objectives_to_minimize:
                if row_j[obj] > row_i[obj]:
                    better_or_equal = False
                    break
                if row_j[obj] < row_i[obj]:
                    strictly_better = True
            if better_or_equal and strictly_better:
                is_pareto.loc[i] = False
                break
    return df[is_pareto]
