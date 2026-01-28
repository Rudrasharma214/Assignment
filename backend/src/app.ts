import express from "express";
import cors from "cors";
import pollRoutes from "./routes/poll.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { isDBConnected } from "./config/database";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const dbConnected = isDBConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "OK" : "DEGRADED",
    database: dbConnected ? "connected" : "disconnected"
  });
});


app.use("/api/polls", pollRoutes);


app.use(errorHandler);
export default app;
