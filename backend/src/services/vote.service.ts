import { Vote } from "../models/Vote.model";

export class VoteService {

  static async submitVote(
    pollId: string,
    studentSessionId: string,
    optionId: string
  ) {

    if (!studentSessionId) {
      throw new Error("Student session not identified");
    }

    const existing = await Vote.findOne({
      pollId,
      studentSessionId
    });

    if (existing) {
      throw new Error("Already voted");
    }

    await Vote.create({
      pollId,
      studentSessionId,
      optionId
    });

    return this.getResults(pollId);
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

}
