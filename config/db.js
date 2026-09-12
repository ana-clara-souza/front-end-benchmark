const { MongoClient } = require("mongodb");
const mongoose = require("mongoose");

const databaseName = process.env.MONGO_DB_NAME || "testeCSV";

let client;
let db;
let connectionPromise;

async function connectDB() {
  if (db && mongoose.connection.readyState === 1) return db;

  if (!connectionPromise) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("A variável MONGO_URI não foi configurada.");

    connectionPromise = (async () => {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(databaseName);
      await mongoose.connect(uri, { dbName: databaseName });
      return db;
    })().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

function getDB() {
  return db;
}

module.exports = {
  connectDB,
  getDB,
};
