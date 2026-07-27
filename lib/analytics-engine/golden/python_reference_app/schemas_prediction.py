from __future__ import annotations
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from app.schemas import ChartResult


class PredictionRecord(BaseModel):
    experimento_id: str = Field(...)
    modelo: str
    dataset: str
    fold: int
    y_true_idx: int
    y_pred_idx: int
    correct: Optional[int] = None
    pred_confidence: Optional[float] = None
    prob_class_0: Optional[float] = None
    prob_class_1: Optional[float] = None
    prob_class_2: Optional[float] = None
    prob_class_3: Optional[float] = None
    prob_class_4: Optional[float] = None
    prob_class_5: Optional[float] = None
    prob_class_6: Optional[float] = None
    prob_class_7: Optional[float] = None
    prob_class_8: Optional[float] = None
    filename: Optional[str] = None


class MobileExecutionRecord(BaseModel):
    experimento_id: str = Field(...)
    modelo: str
    dataset: str
    device: str
    fold: Optional[int] = None
    rep: Optional[int] = None
    inference_time: float
    pss_peak: Optional[float] = None


class PredictionRequest(BaseModel):
    data: List[PredictionRecord] = Field(..., min_length=1)
    mobile_data: Optional[List[MobileExecutionRecord]] = None
    charts: Optional[List[str]] = None


class PredictionResponse(BaseModel):
    chart_metrics: Optional[ChartResult] = None
    chart_pareto: Optional[ChartResult] = None
    chart_pareto_by_dataset: Optional[Dict[str, ChartResult]] = None
    chart_f1_heatmap: Optional[ChartResult] = None
