import { Request, Response, NextFunction } from "express";
import { PollService } from "../services/poll.service";
import { sendResponse } from "../utils/response";
import { STATUS } from "../constants/statusCodes";

export class PollController {

  static async getHistory(_req: Request, res: Response, next: NextFunction) {
    try {
      const polls = await PollService.getHistoryWithResults();
      
      sendResponse(res, STATUS.OK, "Poll history fetched successfully", polls);
    } catch (error: any) {
      next(error);
    }
  }

}