const fs = require("fs");
const csv = require("csv-parser");
const { MongoClient } = require("mongodb");

const uri = "mongodb://127.0.0.1:27017";

const client = new MongoClient(uri);

async function importarCSV() {
  try {
    await client.connect();

    console.log("MongoDB conectado");

    const db = client.db("testeCSV");

    const collection = db.collection("experimentos");

    const documentos = [];

    let experimentoAtual = null;

    let numeroExperimento = 0;

    fs.createReadStream("../data/dataset.csv")
      .pipe(csv())

      .on("data", (data) => {

        for (let chave in data) {

          if (chave.trim() === "") {
            delete data[chave];
            continue;
          }

          const valor = data[chave];

          if (valor.trim() === "") {
            delete data[chave];
            continue;
          }

          if (!isNaN(valor)) {
            data[chave] = Number(valor);
          }
        }

        if (data.rep === 0) {

          if (experimentoAtual) {
            documentos.push(experimentoAtual);
          }

          numeroExperimento++;

          experimentoAtual = {
            _id: numeroExperimento,
            execucoes: [],
          };
        }

        experimentoAtual.execucoes.push(data);
      })

      .on("end", async () => {

        if (experimentoAtual) {
          documentos.push(experimentoAtual);
        }

        await collection.insertMany(documentos);

        console.log("Importação concluída");

        console.log(documentos);

        await client.close();
      });

  } catch (err) {
    console.log(err);
  }
}

importarCSV();