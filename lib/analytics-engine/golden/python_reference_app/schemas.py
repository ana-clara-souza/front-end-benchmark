from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExperimentRecord(BaseModel):
    experimento_id: str = Field(...)
    modelo: str
    dataset: str
    fold: int
    device: str
    rep: int
    inference_time: float
    pss_baseline: Optional[float] = None
    pss_after_load: Optional[float] = None
    pss_warmup: Optional[float] = None
    pss_footprint: Optional[float] = None
    pss_peak: float
    brightness_pct: Optional[float] = None
    battery_pct: Optional[float] = None
    is_charging: Optional[str] = None
    airplane_mode: Optional[str] = None


class AnalyticsRequest(BaseModel):
    data: List[ExperimentRecord] = Field(..., min_length=1)
    charts: Optional[List[str]] = None


class ChartResult(BaseModel):
    image: Optional[str] = None
    stats: Optional[List[Dict[str, Any]]] = None


class AnalyticsResponse(BaseModel):
    chart1: Optional[ChartResult] = None
    chart2: Optional[ChartResult] = None
    chart3: Optional[ChartResult] = None
    chart4: Optional[ChartResult] = None
