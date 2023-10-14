const express = require("express");
const app = express();
const port = 3000;
const MongoClient = require("mongodb").MongoClient;

const url =
  "mongodb+srv://vr7798:HXBpYWtGfWZdk78T@cluster0.8bdfgi1.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(url, { useUnifiedTopology: true });

let estoqueCollection;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Conectado ao MongoDB");

    const db = client.db("seu-banco-de-dados");
    estoqueCollection = db.collection("estoque");

    const count = await estoqueCollection.countDocuments();
    if (count === 0) {
      await estoqueCollection.insertMany([
        { produto: "DNZ", quantidade: 100, registros: [] },
        // Adicione outros produtos conforme necessário
      ]);
    }
  } catch (err) {
    console.error("Erro na conexão com o MongoDB: " + err);
  }
}

connectToMongoDB();

app.use(express.json());
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/entrada", async (req, res) => {
  const { produto, quantidade } = req.body;
  if (quantidade <= 0) {
    return res.status(400).json({ error: "Quantidade inválida." });
  }

  const dataHora = new Date();

  const result = await estoqueCollection.findOneAndUpdate(
    { produto },
    {
      $inc: { quantidade },
      $push: { registros: { tipo: "entrada", quantidade, dataHora } },
    },
    { returnOriginal: false }
  );

  if (result.value) {
    res.json({
      message: `Entrada de ${quantidade} peças de ${produto} registrada.`,
    });
  } else {
    res.status(400).json({ error: "Produto não encontrado." });
  }
});

app.post("/saida", async (req, res) => {
  const { produto, quantidade } = req.body;
  if (quantidade <= 0) {
    return res.status(400).json({ error: "Quantidade inválida." });
  }

  const dataHora = new Date();

  const result = await estoqueCollection.findOneAndUpdate(
    { produto, quantidade: { $gte: quantidade } },
    {
      $inc: { quantidade: -quantidade },
      $push: { registros: { tipo: "saída", quantidade, dataHora } },
    },
    { returnOriginal: false }
  );

  if (result.value) {
    res.json({
      message: `Saída de ${quantidade} peças de ${produto} registrada.`,
    });
  } else {
    res
      .status(400)
      .json({ error: "Produto não encontrado ou estoque insuficiente." });
  }
});

app.get("/estoque/:produto", async (req, res) => {
  const { produto } = req.params;
  const result = await estoqueCollection.findOne({ produto });
  if (result) {
    res.json({
      produto: result.produto,
      quantidade: result.quantidade,
      registros: result.registros,
    });
  } else {
    res.status(404).json({ error: "Produto não encontrado." });
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
