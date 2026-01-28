import { Request, Response } from "express";
import { PollService } from "../services/poll.service";

export class PollController {

  static async createPoll(req: Request, res: Response) {
    try {
      const poll =
        await PollService.createPoll(req.body, (pollId: string, results: Record<string, number>) => {
          console.log(`Poll ${pollId} ended with results:`, results);
        });

      res.status(201).json(poll);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getActivePoll(_req: Request, res: Response) {
    const poll =
      await PollService.getActivePoll();

    res.json(poll);
  }

  static async getHistory(_req: Request, res: Response) {
    const polls =
      await PollService.getHistory?.();

    res.json(polls);
  }

}