const cron = require("node-cron");
const { connectDB } = require("../config/db");
const {
  arquivarExperimentosSemExecucoes,
} = require("./experimentCleanupService");

const CRON_EXPRESSION = "0 0 * * *";
const TIMEZONE = "America/Sao_Paulo";
const JOB_KEY = "__experimentCleanupJob";

async function executarLimpezaDeExperimentos() {
  try {
    await connectDB();
    const quantidadeArquivada = await arquivarExperimentosSemExecucoes();

    console.info(
      `[cron] Limpeza de experimentos concluída: ${quantidadeArquivada} arquivado(s).`,
    );
  } catch (err) {
    console.error("[cron] Erro na limpeza de experimentos:", err);
  }
}

function iniciarJobDeLimpezaDeExperimentos() {
  if (globalThis[JOB_KEY]) return;

  globalThis[JOB_KEY] = cron.schedule(
    CRON_EXPRESSION,
    executarLimpezaDeExperimentos,
    {
      name: "arquivar-experimentos-inativos",
      noOverlap: true,
      timezone: TIMEZONE,
    },
  );

  void executarLimpezaDeExperimentos();
}

module.exports = {
  iniciarJobDeLimpezaDeExperimentos,
};
