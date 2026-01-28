import { Vote } from "../models/Vote.model";

export class VoteService {

  static async submitVote(
    pollId: string,
    studentName: string,
    optionId: string
  ) {

    if (!studentName) {
      throw new Error("Student not identified");
    }

    const existing =
      await Vote.findOne({ pollId, studentName });

    if (existing) {
      throw new Error("Already voted");
    }

    await Vote.create({
      pollId,
      studentName,
      optionId
    });

    return this.getResults(pollId);
  }

  static async getResults(pollId: string) {

    const votes =
      await Vote.find({ pollId });

    const resultMap: Record<string, number> = {};

    votes.forEach(v => {
      const key = v.optionId.toString();
      resultMap[key] = (resultMap[key] || 0) + 1;
    });

    return resultMap;
  }

}