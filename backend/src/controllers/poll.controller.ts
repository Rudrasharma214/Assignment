import { Request, Response, NextFunction } from "express";
import { PollService } from "../services/poll.service";
import { VoteService } from "../services/vote.service";

export class PollController {

  static async createPoll(req: Request, res: Response, next: NextFunction) {
    try {
      const { canCreate, reason } = await PollService.canCreateNewPoll(
        (pollId: string, results: Record<string, number>) => {
          console.log(`Poll ${pollId} ended with results:`, results);
        }
      );

      if (!canCreate) {
        res.status(400).json({ message: reason || "Cannot create poll at this time" });
        return;
      }

      const poll =
        await PollService.createPoll(req.body, (pollId: string, results: Record<string, number>) => {
          console.log(`Poll ${pollId} ended with results:`, results);
        });

      res.status(201).json(poll);
    } catch (error: any) {
      next(error);
    }
  }

  static async getActivePoll(_req: Request, res: Response, next: NextFunction) {
    try {
      const pollState = await PollService.getActivePollWithState();
      res.json(pollState);
    } catch (error: any) {
      next(error);
    }
  }

  static async getHistory(_req: Request, res: Response, next: NextFunction) {
    try {
      const polls = await PollService.getHistoryWithResults();
      res.json(polls);
    } catch (error: any) {
      next(error);
    }
  }

  static async getPollResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { pollId } = req.params;
      const pollData = await PollService.getPollById(pollId);

      if (!pollData) {
        res.status(404).json({ message: "Poll not found" });
        return;
      }

      res.json(pollData);
    } catch (error: any) {
      next(error);
    }
  }

  static async checkVoteStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { pollId } = req.params;
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ message: "Session ID required" });
        return;
      }

      const hasVoted = await VoteService.hasVoted(pollId, sessionId);
      res.json({ hasVoted });
    } catch (error: any) {
      next(error);
    }
  }

}