const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "10mb" }));

// Разрешаем запросы с сайта без установки cors
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Проверка сервера
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    server: "Future Vision V3",
    status: "online"
  });
});

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// AI запрос
app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured on Render"
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: message
    });

    res.json({
      success: true,
      reply: response.output_text
    });

  } catch (error) {
    console.error("OpenAI error:", error);

    res.status(500).json({
      success: false,
      error: error.message || "AI request failed"
    });
  }
});

// Запуск
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Future Vision V3 running on port ${PORT}`);
});
