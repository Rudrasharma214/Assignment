import { Poll } from "../models/Poll.model";

export class PollService {

    static async createPoll(data: {
        question: string;
        options: string[];
        duration: number;
    }) {

        const activePoll =
            await Poll.findOne({ status: "ACTIVE" });

        if (activePoll) {
            throw new Error("Active poll already exists");
        }

        const poll = await Poll.create({
            question: data.question,
            options: data.options.map(o => ({ text: o })),
            duration: data.duration,
            startTime: new Date(),
            status: "ACTIVE"
        });

        return poll;
    }

    static async getActivePoll() {
        return Poll.findOne({ status: "ACTIVE" });
    }

    static async endPoll(pollId: string) {
        return Poll.findByIdAndUpdate(
            pollId,
            { status: "ENDED" },
            { new: true }
        );
    }

    static calculateRemainingTime(poll: any) {
        const elapsed =
            Date.now() - new Date(poll.startTime).getTime();

        const remaining =
            poll.duration * 1000 - elapsed;

        return Math.max(
            Math.floor(remaining / 1000),
            0
        );
    }

    static async getHistory() {
        return Poll.find({ status: "ENDED" })
            .sort({ createdAt: -1 });
    }

}