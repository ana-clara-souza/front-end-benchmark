const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");

const MOBILE_CHARTS = ["chart1", "chart2", "chart3", "chart4"];
const PREDICTION_CHARTS = [
  "chart_metrics",
  "chart_pareto",
  "chart_pareto_by_dataset",
  "chart_f1_heatmap",
];

function matchesFilters(execution, filters) {
  return Object.entries(filters).every(([field, filterValue]) => {
    const executionValue = execution[field];

    if (filterValue === undefined || filterValue === null) return true;

    if (Array.isArray(filterValue)) {
      return filterValue.includes(executionValue);
    }

    if (typeof filterValue === "object" && !Array.isArray(filterValue)) {
      if (filterValue.gte !== undefined && executionValue < filterValue.gte)
        return false;

      if (filterValue.lte !== undefined && executionValue > filterValue.lte)
        return false;

      if (filterValue.gt !== undefined && executionValue <= filterValue.gt)
        return false;

      if (filterValue.lt !== undefined && executionValue >= filterValue.lt)
        return false;

      return true;
    }

    return executionValue === filterValue;
  });
}

async function getFilteredExecutions(
  collection,
  userId,
  filters,
  executionField,
) {
  let experimentos;

  if (filters._id) {
    if (Array.isArray(filters._id)) {
      experimentos = await collection
        .find({
          userId,
          _id: { $in: filters._id },
        })
        .toArray();
    } else {
      experimentos = await collection
        .find({
          userId,
          _id: filters._id,
        })
        .toArray();
    }
  } else {
    experimentos = await collection.find({ userId }).toArray();
  }

  const { _id, ...executionFilters } = filters;

  return experimentos.flatMap((experimento) =>
    (experimento[executionField] || [])
      .filter((execution) => matchesFilters(execution, executionFilters))
      .map((execution) => ({
        experimento_id: experimento._id,
        ...execution,
      })),
  );
}

function mobileMessage(charts, data) {
  return { charts, data };
}

function predictionMessage(charts, data, mobileData) {
  const message = { charts, data };

  const needsMobileData =
    charts.includes("chart_pareto") ||
    charts.includes("chart_pareto_by_dataset");

  if (needsMobileData) {
    message.mobile_data = mobileData;
  }

  return message;
}

async function createCharts({ body, user }) {
  try {
    const mobileFilters = body.mobileFilters || {};
    const scriptFilters = body.scriptFilters || {};

    const requestedCharts =
      Array.isArray(body.charts) && body.charts.length > 0
        ? body.charts
        : [...MOBILE_CHARTS, ...PREDICTION_CHARTS];

    const mobileCharts = requestedCharts.filter((chart) =>
      MOBILE_CHARTS.includes(chart),
    );

    const predictionCharts = requestedCharts.filter((chart) =>
      PREDICTION_CHARTS.includes(chart),
    );

    const needsMobileData =
      predictionCharts.includes("chart_pareto") ||
      predictionCharts.includes("chart_pareto_by_dataset");

    if (mobileCharts.length === 0 && predictionCharts.length === 0) {
      return {
        status: 400,
        body: {
          message: "Nenhum gráfico válido foi solicitado.",
        },
      };
    }

    const collection = getDB().collection("experimentos");
    const userId = new ObjectId(user.id);

    const [mobileData, predictionData] = await Promise.all([
      mobileCharts.length > 0 || needsMobileData
        ? getFilteredExecutions(
            collection,
            userId,
            mobileFilters,
            "execucoesMobile",
          )
        : [],

      predictionCharts.length > 0
        ? getFilteredExecutions(
            collection,
            userId,
            scriptFilters,
            "execucoesScript",
          )
        : [],
    ]);

    if (
      (mobileCharts.length > 0 && mobileData.length === 0) ||
      (needsMobileData && mobileData.length === 0) ||
      (predictionCharts.length > 0 && predictionData.length === 0)
    ) {
      return {
        status: 404,
        body: {
          message: "Nenhum dado encontrado para os gráficos solicitados.",
        },
      };
    }

    const messages = [];

    if (mobileCharts.length > 0) {
      messages.push(mobileMessage(mobileCharts, mobileData));
    }

    if (predictionCharts.length > 0) {
      messages.push(
        predictionMessage(predictionCharts, predictionData, mobileData),
      );
    }

    return {
      status: 200,
      body: messages.length === 1 ? messages[0] : messages,
    };
  } catch (error) {
    console.error(error);

    return {
      status: 500,
      body: {
        message: error.message,
      },
    };
  }
}

module.exports = { createCharts };
