import { Router } from "express";
import { PollController } from "../controllers/poll.controller";

const router = Router();

router.get("/history", PollController.getHistory);

export default router;
