import { Vote } from "../models/Vote.model";
import { Poll } from "../models/Poll.model";
import mongoose from "mongoose";
import { aggregateResults } from "./poll.service";
import AppError from "../utils/appError";
import { STATUS } from "../constants/statusCodes";

export class VoteService {
  static async submitVote(
    pollId: string,
    studentSessionId: string,
    studentName: string,
    optionId: string
  ): Promise<{ results: Record<string, number>; voteCount: number; allVoted: boolean; studentCount: number }> {

    if (!studentSessionId) {
      throw new AppError("Student session not identified", STATUS.BAD_REQUEST);
    }

    if (!studentName) {
      throw new AppError("Student name is required", STATUS.BAD_REQUEST);
    }

    if (!mongoose.Types.ObjectId.isValid(pollId)) {
      throw new AppError("Invalid poll ID", STATUS.BAD_REQUEST);
    }

    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      throw new AppError("Poll not found", STATUS.NOT_FOUND);
    }

    if (poll.status !== "ACTIVE") {
      throw new AppError("Poll has ended", STATUS.BAD_REQUEST);
    }

    const elapsed = Date.now() - new Date(poll.startedAt).getTime();
    const remaining = poll.duration * 1000 - elapsed;
    if (remaining <= 0) {
      throw new AppError("Poll time has expired", STATUS.BAD_REQUEST);
    }

    const optionExists = poll.options.some(
      (opt: any) => opt._id.toString() === optionId
    );
    if (!optionExists) {
      throw new AppError("Invalid option", STATUS.BAD_REQUEST);
    }

    try {
      await Vote.create({
        pollId: new mongoose.Types.ObjectId(pollId),
        studentSessionId,
        studentName,
        optionId: new mongoose.Types.ObjectId(optionId)
      });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new AppError("Already voted", STATUS.CONFLICT);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw error;
    }

    const [votes, voteCount] = await Promise.all([
      Vote.find({ pollId }).lean(),
      Vote.countDocuments({ pollId })
    ]);

    const results = aggregateResults(votes);

    return {
      results,
      voteCount,
      allVoted: false,
      studentCount: 0
    };
  }

  static async hasVoted(pollId: string, studentSessionId: string): Promise<boolean> {
    const existing = await Vote.findOne({ pollId, studentSessionId }).lean();
    return !!existing;
  }

  static async getResults(pollId: string) {
    const votes = await Vote.find({ pollId }).lean();
    return aggregateResults(votes);
  }

  static async getVoteCount(pollId: string): Promise<number> {
    return Vote.countDocuments({ pollId });
  }

  static async getVoterSessionIds(pollId: string): Promise<string[]> {
    const votes = await Vote.find({ pollId }).select('studentSessionId').lean();
    return votes.map(v => v.studentSessionId);
  }

}
