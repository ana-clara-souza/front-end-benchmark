const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const User = require("../models/User");

function generateKey(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let key = "";

  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return key;
}

async function addExecucoes({ id, body, user }, field) {
  try {
    const { execucoes } = body;

    if (!Array.isArray(execucoes)) {
      return {
        status: 400,
        body: {
          message: "A lista de execuções é obrigatória.",
        },
      };
    }

    const agora = new Date();
    const atualizacao = {
      [field]: execucoes,
      updatedAt: agora,
    };

    if (execucoes.length > 0) {
      atualizacao.ultimaExecucaoEm = agora;
    }

    const result = await getDB()
      .collection("experimentos")
      .findOneAndUpdate(
        {
          _id: id.trim(),
          userId: new ObjectId(user.id),
          arquivado: { $ne: true },
        },
        {
          $set: atualizacao,
        },
        {
          returnDocument: "after",
        },
      );

    if (!result) {
      return {
        status: 404,
        body: {
          message: "Experimento não encontrado.",
        },
      };
    }

    const firstExecution =
      result.execucoesScript?.[0] || result.execucoesMobile?.[0];

    return {
      status: 200,
      body: {
        message: "Execuções atualizadas com sucesso.",
        experimento: {
          id: result._id,
          modelo: firstExecution?.modelo ?? null,
          dataset: firstExecution?.dataset ?? null,
          fold: firstExecution?.fold ?? null,
        },
        quantidade: {
          aiMetrics: result.execucoesScript?.length ?? 0,
          mobile: result.execucoesMobile?.length ?? 0,
        },
        updatedAt: result.updatedAt,
      },
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        message: "Erro ao atualizar execuções.",
        error: err.message,
      },
    };
  }
}

exports.getMyExperimentos = async ({ user }) => {
  try {
    const experimentos = await getDB()
      .collection("experimentos")
      .find({
        userId: new ObjectId(user.id),
        arquivado: { $ne: true },
      })
      .toArray();

    return {
      status: 200,
      body: experimentos,
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err.message,
      },
    };
  }
};

exports.getExperimentoById = async ({ id, user }) => {
  try {
    const experimento = await getDB()
      .collection("experimentos")
      .findOne({
        _id: id.trim(),
        userId: new ObjectId(user.id),
        arquivado: { $ne: true },
      });

    if (!experimento) {
      return {
        status: 404,
        body: {
          message: "Experimento não encontrado",
        },
      };
    }

    return {
      status: 200,
      body: experimento,
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err.message,
      },
    };
  }
};

exports.getExperimentoInfo = async ({ user }) => {
  try {
    const experimentos = await getDB()
      .collection("experimentos")
      .find({
        userId: new ObjectId(user.id),
        arquivado: { $ne: true },
      })
      .toArray();

    if (experimentos.length === 0) {
      return {
        status: 404,
        body: {
          message: "Nenhum experimento encontrado.",
        },
      };
    }

    return {
      status: 200,
      body: experimentos.map((exp) => ({
        _id: exp._id,
        nome: exp.nome,
        modelo: exp.execucoesScript?.[0]?.modelo ?? null,
        dataset: exp.execucoesScript?.[0]?.dataset ?? null,
        dispositivo: exp.execucoesMobile?.[0]?.dispositivo ?? null,
        qtdMobile: exp.execucoesMobile?.length ?? 0,
        qtdScript: exp.execucoesScript?.length ?? 0,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
      })),
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        message: "Erro interno do servidor.",
        error: err.message,
      },
    };
  }
};

exports.getExperimentosArquivados = async ({ user }) => {
  try {
    const experimentos = await getDB()
      .collection("experimentos")
      .find({
        userId: new ObjectId(user.id),
        arquivado: true,
      })
      .toArray();

    return {
      status: 200,
      body: experimentos.map((exp) => ({
        _id: exp._id,
        nome: exp.nome,
        modelo: exp.execucoesScript?.[0]?.modelo ?? null,
        dataset: exp.execucoesScript?.[0]?.dataset ?? null,
        dispositivo: exp.execucoesMobile?.[0]?.dispositivo ?? null,
        qtdMobile: exp.execucoesMobile?.length ?? 0,
        qtdScript: exp.execucoesScript?.length ?? 0,
        createdAt: exp.createdAt,
        updatedAt: exp.updatedAt,
      })),
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        message: "Erro ao buscar experimentos arquivados.",
        error: err.message,
      },
    };
  }
};

exports.addExecucoesScript = (input) => addExecucoes(input, "execucoesScript");

exports.addExecucoesMobile = (input) => addExecucoes(input, "execucoesMobile");

exports.deleteExperimento = async ({ id, user }) => {
  try {
    const query = {
      _id: id.trim(),
      userId: new ObjectId(user.id),
    };

    const collection = getDB().collection("experimentos");

    const experimento = await collection.findOne(query);

    if (!experimento) {
      return {
        status: 404,
        body: {
          message: "Experimento não encontrado",
        },
      };
    }

    await collection.deleteOne(query);

    await User.findByIdAndUpdate(user.id, {
      $pull: {
        experimentKeys: id,
      },
    });

    return {
      status: 200,
      body: {
        message: "Experimento deletado com sucesso",
      },
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err.message,
      },
    };
  }
};

exports.generateExperimentKey = async ({ user, nome }) => {
  try {
    const collection = getDB().collection("experimentos");

    let key;

    do {
      key = generateKey();
    } while (await collection.findOne({ _id: key }));

    const experimento = {
      _id: key,
      nome: nome,
      userId: new ObjectId(user.id),
      arquivado: false,
      execucoesScript: [],
      execucoesMobile: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await collection.insertOne(experimento);

    await User.findByIdAndUpdate(user.id, {
      $addToSet: {
        experimentKeys: key,
      },
    });

    return {
      status: 201,
      body: {
        message: "Experimento criado com sucesso",
        id: key,
        createdAt: experimento.createdAt,
      },
    };
  } catch (err) {
    return {
      status: 500,
      body: {
        message: "Erro ao gerar chave",
        error: err.message,
      },
    };
  }
};
