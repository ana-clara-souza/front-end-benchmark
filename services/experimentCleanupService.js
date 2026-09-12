const { getDB } = require("../config/db");

const DIAS_SEM_EXECUCOES_PARA_ARQUIVAR = 14;

async function arquivarExperimentosSemExecucoes() {
  try {
    const agora = new Date();
    const limite = new Date(
      agora.getTime() -
        DIAS_SEM_EXECUCOES_PARA_ARQUIVAR * 24 * 60 * 60 * 1000,
    );

    const resultado = await getDB()
      .collection("experimentos")
      .updateMany(
        {
          arquivado: { $ne: true },
          $or: [
            { ultimaExecucaoEm: { $lte: limite } },
            {
              ultimaExecucaoEm: { $exists: false },
              updatedAt: { $lte: limite },
            },
          ],
        },
        {
          $set: {
            arquivado: true,
            updatedAt: agora,
          },
        },
      );

    return resultado.modifiedCount;
  } catch (err) {
    console.error("Erro ao arquivar experimentos:", err);
    return 0;
  }
}

module.exports = {
  arquivarExperimentosSemExecucoes,
};
