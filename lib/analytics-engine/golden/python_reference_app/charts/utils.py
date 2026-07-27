from __future__ import annotations
from typing import Optional, Tuple
import numpy as np
import pandas as pd
from scipy import stats as scipy_stats


def compute_ci95(mean: float, std: float, count: int) -> Tuple[float, float]:
    if count is None or count <= 1 or std is None or pd.isna(std):
        return mean, mean
    sem = std / np.sqrt(count)
    margin = sem * scipy_stats.t.ppf(0.975, count - 1)
    return mean - margin, mean + margin


def build_group_label(dataset: str, experimento_id: str, device: Optional[str] = None) -> str:
    label = f"{dataset} · {experimento_id}"
    if device:
        label = f"{label} ({device})"
    return label
