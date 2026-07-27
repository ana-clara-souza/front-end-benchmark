import json
import sys
sys.path.insert(0, ".")

from app.schemas import ExperimentRecord
from app.schemas_prediction import PredictionRecord, MobileExecutionRecord
from app.etl import build_dataframe
from app.stats import compute_chart1_stats, compute_chart2_stats, compute_chart3_stats, compute_chart4_stats
from app.etl_prediction import build_prediction_dataframe, compute_performance_df, compute_inference_times
from app.stats_prediction import compute_chart_metrics_stats, compute_chart_f1_heatmap_stats, compute_chart_pareto_stats

# ---------------------------------------------------------------------------
# Payload mobile: caso simples + experimento_id repetido (mesmo modelo+dataset,
# devices diferentes) + repetições dentro do mesmo experimento (rep 0/1).
# ---------------------------------------------------------------------------
mobile_raw = [
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, device="2312CRNCCL", rep=0, inference_time=2033.700077, pss_peak=126.16015625),
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, device="2312CRNCCL", rep=1, inference_time=2010.442, pss_peak=128.30),
    dict(experimento_id="exp-002", modelo="resnet50", dataset="weed6c", fold=1, device="SM-S908E", rep=0, inference_time=147.335052, pss_peak=331.59765625),
    dict(experimento_id="exp-002", modelo="resnet50", dataset="weed6c", fold=1, device="SM-S908E", rep=199, inference_time=150.812, pss_peak=329.88),
    # mesmo modelo+dataset+device de exp-001, mas experimento distinto (reexecução)
    dict(experimento_id="exp-003", modelo="resnet50", dataset="weed6c", fold=1, device="2312CRNCCL", rep=0, inference_time=2100.0, pss_peak=140.0),
    dict(experimento_id="exp-003", modelo="resnet50", dataset="weed6c", fold=1, device="2312CRNCCL", rep=1, inference_time=2080.0, pss_peak=142.0),
    # outro dataset/modelo, device novo
    dict(experimento_id="exp-004", modelo="mobilenetv2", dataset="deepweeds", fold=1, device="Pixel6", rep=0, inference_time=80.0, pss_peak=90.0),
    dict(experimento_id="exp-004", modelo="mobilenetv2", dataset="deepweeds", fold=1, device="Pixel6", rep=1, inference_time=82.0, pss_peak=92.0),
]
mobile_records = [ExperimentRecord(**r) for r in mobile_raw]
mobile_df = build_dataframe(mobile_records)

golden = {
    "chart1": compute_chart1_stats(mobile_df),
    "chart2": compute_chart2_stats(mobile_df),
    "chart3": compute_chart3_stats(mobile_df),
    "chart4": compute_chart4_stats(mobile_df),
}

# ---------------------------------------------------------------------------
# Payload de predição: inclui assimetria de classes deliberada.
# exp-001 (weed6c): y_true so tem {0,1}; y_pred inclui um 2 (classe nunca
# verdadeira) -> testa union (chart_metrics) vs y_true-only (f1_heatmap).
# exp-002 (weed6c): sem mobile correspondente -> mean_inference_time = NaN
#   no merge do pareto, para validar o filtro de NaN (RF-08.1).
# ---------------------------------------------------------------------------
pred_raw = [
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=0, y_pred_idx=0),
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=1, y_pred_idx=1),
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=0, y_pred_idx=2),  # pred de classe nunca-true
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=1, y_pred_idx=0),

    dict(experimento_id="exp-002", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=0, y_pred_idx=0),
    dict(experimento_id="exp-002", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=1, y_pred_idx=1),

    dict(experimento_id="exp-003", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=0, y_pred_idx=1),
    dict(experimento_id="exp-003", modelo="resnet50", dataset="weed6c", fold=1, y_true_idx=1, y_pred_idx=1),

    dict(experimento_id="exp-004", modelo="mobilenetv2", dataset="deepweeds", fold=1, y_true_idx=0, y_pred_idx=0),
    dict(experimento_id="exp-004", modelo="mobilenetv2", dataset="deepweeds", fold=1, y_true_idx=1, y_pred_idx=1),
]
pred_records = [PredictionRecord(**r) for r in pred_raw]
pred_df = build_prediction_dataframe(pred_records)
perf_df = compute_performance_df(pred_df)

golden["chart_metrics"] = compute_chart_metrics_stats(perf_df)
golden["chart_f1_heatmap"] = compute_chart_f1_heatmap_stats(pred_df)

# mobile_data para o pareto: propositalmente SEM exp-002 (fica NaN no merge)
mobile_for_pred_raw = [
    dict(experimento_id="exp-001", modelo="resnet50", dataset="weed6c", device="2312CRNCCL", inference_time=2033.700077),
    dict(experimento_id="exp-003", modelo="resnet50", dataset="weed6c", device="2312CRNCCL", inference_time=2100.0),
    dict(experimento_id="exp-004", modelo="mobilenetv2", dataset="deepweeds", device="Pixel6", inference_time=80.0),
]
mobile_for_pred = [MobileExecutionRecord(**r) for r in mobile_for_pred_raw]
mobile_records_dump = [r.model_dump() for r in mobile_for_pred]
inference_summary = compute_inference_times(mobile_records_dump)

pareto_df = perf_df.merge(
    inference_summary[["experimento_id", "device", "mean_inference_time"]],
    on="experimento_id", how="left",
)
pareto_df["is_pareto_optimal"] = False
valid = pareto_df[pareto_df["mean_inference_time"].notna()]

from app.etl_prediction import find_pareto_optimal
for (dataset, device), subset in valid.groupby(["dataset", "device"]):
    pareto_pts = find_pareto_optimal(subset, objectives_to_maximize=["accuracy"], objectives_to_minimize=["mean_inference_time"])
    pareto_df.loc[pareto_pts.index, "is_pareto_optimal"] = True

golden["chart_pareto"] = compute_chart_pareto_stats(pareto_df)

with open("/home/claude/golden/golden.json", "w") as f:
    json.dump(golden, f, indent=2, default=str)

print("OK - golden file gerado")
print(json.dumps(golden, indent=2, default=str)[:2000])
