from __future__ import annotations
from typing import List
import pandas as pd

from app.schemas import ExperimentRecord

DATASET_LABELS: dict[str, str] = {
    "deepweeds": "DeepWeeds",
    "weed6c": "Weed6c",
}

MODEL_LABELS: dict[str, str] = {
    "mobilenetv3small": "MobileNetV3-Small",
    "mobilenetv3large": "MobileNetV3-Large",
    "mobilenetv2": "MobileNetV2",
    "nasnetmobile": "NASNetMobile",
    "efficientnetv2b0": "EfficientNetV2-B0",
    "efficientnetv2b1": "EfficientNetV2-B1",
    "efficientnetv2b2": "EfficientNetV2-B2",
    "efficientnetv2b3": "EfficientNetV2-B3",
    "resnet50": "ResNet-50",
    "resnet101v2": "ResNet-101V2",
    "inceptionv3": "InceptionV3",
}


def build_dataframe(records: List[ExperimentRecord]) -> pd.DataFrame:
    df = pd.DataFrame([r.model_dump() for r in records])
    df["dataset"] = df["dataset"].replace(DATASET_LABELS)
    df["modelo"] = df["modelo"].replace(MODEL_LABELS)
    df["inference_time"] = pd.to_numeric(df["inference_time"], errors="coerce")
    df["pss_peak"] = pd.to_numeric(df["pss_peak"], errors="coerce")
    df.dropna(subset=["inference_time", "pss_peak", "modelo", "dataset", "device"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df
