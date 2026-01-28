import { Vote } from "../models/Vote.model";
import { Poll } from "../models/Poll.model";
import mongoose from "mongoose";

export class VoteService {
  static async submitVote(
    pollId: string,
    studentSessionId: string,
    studentName: string,
    optionId: string
  ) {

    if (!studentSessionId) {
      throw new Error("Student session not identified");
    }

    if (!studentName) {
      throw new Error("Student name is required");
    }

    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error("Poll not found");
    }

    if (poll.status !== "ACTIVE") {
      throw new Error("Poll has ended");
    }

    const elapsed = Date.now() - new Date(poll.startedAt).getTime();
    const remaining = poll.duration * 1000 - elapsed;
    if (remaining <= 0) {
      throw new Error("Poll time has expired");
    }

    const optionExists = poll.options.some(
      (opt: any) => opt._id.toString() === optionId
    );
    if (!optionExists) {
      throw new Error("Invalid option");
    }

    try {
      const existingVote = await Vote.findOne({
        pollId: new mongoose.Types.ObjectId(pollId),
        studentSessionId
      }).lean();

      if (existingVote) {
        throw new Error("Already voted");
      }

      await Vote.create({
        pollId: new mongoose.Types.ObjectId(pollId),
        studentSessionId,
        studentName,
        optionId: new mongoose.Types.ObjectId(optionId)
      });
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error("Already voted");
      }
      if (error.message === "Already voted") {
        throw error;
      }
      throw error;
    }

    return this.getResults(pollId);
  }

  static async hasVoted(pollId: string, studentSessionId: string): Promise<boolean> {
    const existing = await Vote.findOne({ pollId, studentSessionId });
    return !!existing;
  }

  static async getResults(pollId: string) {
    const votes = await Vote.find({ pollId });

    const resultMap: Record<string, number> = {};

    votes.forEach(v => {
      const key = v.optionId.toString();
      resultMap[key] = (resultMap[key] || 0) + 1;
    });

    return resultMap;
  }

  static async getVoteCount(pollId: string): Promise<number> {
    return Vote.countDocuments({ pollId });
  }

  static async getVoterSessionIds(pollId: string): Promise<string[]> {
    const votes = await Vote.find({ pollId }).select('studentSessionId').lean();
    return votes.map(v => v.studentSessionId);
  }

}
