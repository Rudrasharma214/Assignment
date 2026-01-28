import { Router } from "express";
import { PollController } from "../controllers/poll.controller";

const router = Router();

router.post("/", PollController.createPoll);
router.get("/active", PollController.getActivePoll);
router.get("/history", PollController.getHistory);

export default router;
