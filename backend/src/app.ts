import express from "express";
import cors from "cors";
import pollRoutes from "./routes/poll.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK" });
});


app.use("/api/polls", pollRoutes);


app.use(errorHandler);
export default app;
