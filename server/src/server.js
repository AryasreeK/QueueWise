import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { services, tokens, createToken, queueSnapshot } from "./store.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", application: "QueueWise API", database: "demo-memory-mode" });
});

app.get("/api/services", (_req, res) => res.json(services));

app.get("/api/queue", (_req, res) => {
  const serviceQueues = queueSnapshot();
  const activeTokens = tokens.filter(token => ["waiting", "serving"].includes(token.status));
  const completed = tokens.filter(token => token.status === "completed");
  res.json({
    services: serviceQueues,
    tokens: [...tokens].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    stats: {
      total: tokens.length,
      waiting: tokens.filter(token => token.status === "waiting").length,
      serving: tokens.filter(token => token.status === "serving").length,
      completed: completed.length,
      active: activeTokens.length
    }
  });
});

app.post("/api/tokens", (req, res) => {
  const { serviceId, customerName } = req.body || {};
  if (!serviceId) return res.status(400).json({ message: "Please select a service." });
  const token = createToken(serviceId, customerName);
  if (!token) return res.status(404).json({ message: "Service not found." });
  res.status(201).json({ message: "Your token has been generated.", token });
});

app.patch("/api/tokens/:id/serve", (req, res) => {
  const token = tokens.find(item => item.id === req.params.id);
  if (!token) return res.status(404).json({ message: "Token not found." });
  if (token.status !== "waiting") return res.status(409).json({ message: "Only waiting tokens can be called." });

  const existingServing = tokens.find(item => item.serviceId === token.serviceId && item.status === "serving");
  if (existingServing) return res.status(409).json({ message: `${existingServing.tokenNumber} is already being served. Complete it first.` });

  token.status = "serving";
  token.servedAt = new Date().toISOString();
  res.json({ message: `${token.tokenNumber} is now being served.`, token });
});

app.patch("/api/tokens/:id/complete", (req, res) => {
  const token = tokens.find(item => item.id === req.params.id);
  if (!token) return res.status(404).json({ message: "Token not found." });
  if (token.status !== "serving") return res.status(409).json({ message: "Only a serving token can be completed." });
  token.status = "completed";
  token.completedAt = new Date().toISOString();
  res.json({ message: `${token.tokenNumber} has been completed.`, token });
});

app.patch("/api/tokens/:id/skip", (req, res) => {
  const token = tokens.find(item => item.id === req.params.id);
  if (!token) return res.status(404).json({ message: "Token not found." });
  if (!["waiting", "serving"].includes(token.status)) return res.status(409).json({ message: "This token is no longer active." });
  token.status = "skipped";
  res.json({ message: `${token.tokenNumber} has been skipped.`, token });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected. Note: queue API currently uses demo memory store.");
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      console.log("Starting in demo memory mode instead.");
    }
  }
  app.listen(PORT, () => console.log(`QueueWise API running at http://localhost:${PORT}`));
}

start();
