import { Poll } from "../models/Poll.model";
import { Vote } from "../models/Vote.model";

const pollTimers: Map<string, NodeJS.Timeout> = new Map();

export class PollService {

    static async createPoll(data: {
        question: string;
        options: string[];
        duration: number;
    }, onPollEnded: (pollId: string, results: Record<string, number>) => void) {

        const activePoll = await Poll.findOne({ status: "ACTIVE" });

        if (activePoll) {
            throw new Error("Active poll already exists");
        }

        const poll = await Poll.create({
            question: data.question,
            options: data.options.map(o => ({ text: o })),
            duration: data.duration,
            startTime: new Date(),
            startedAt: new Date(),
            status: "ACTIVE"
        });

        this.schedulePollTimer(poll._id.toString(), data.duration, onPollEnded);

        return poll;
    }

    static async getActivePoll() {
        return Poll.findOne({ status: "ACTIVE" });
    }

    static calculateRemainingTime(poll: any) {
        const elapsed = Date.now() - new Date(poll.startedAt).getTime();
        const remaining = poll.duration * 1000 - elapsed;
        return Math.max(Math.floor(remaining / 1000), 0);
    }

    static schedulePollTimer(
        pollId: string,
        durationSeconds: number,
        onPollEnded: (pollId: string, results: Record<string, number>) => void
    ) {
        if (pollTimers.has(pollId)) {
            clearTimeout(pollTimers.get(pollId));
        }

        const timer = setTimeout(async () => {
            await this.endPoll(pollId, onPollEnded);
        }, durationSeconds * 1000);

        pollTimers.set(pollId, timer);
    }

    static async endPoll(
        pollId: string,
        onPollEnded: (pollId: string, results: Record<string, number>) => void
    ) {
        const updatedPoll = await Poll.findByIdAndUpdate(
            pollId,
            { status: "ENDED" },
            { new: true }
        );

        if (updatedPoll) {
            const results = await this.getResults(pollId);
            
            onPollEnded(pollId, results);

            pollTimers.delete(pollId);
        }
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

    static async getHistory() {
        return Poll.find({ status: "ENDED" }).sort({ createdAt: -1 });
    }

    static async recoverTimers(onPollEnded: (pollId: string, results: Record<string, number>) => void) {
        const activePolls = await Poll.find({ status: "ACTIVE" });

        for (const poll of activePolls) {
            const remaining = this.calculateRemainingTime(poll);

            if (remaining <= 0) {
                await this.endPoll(poll._id.toString(), onPollEnded);
            } else {
                this.schedulePollTimer(poll._id.toString(), remaining, onPollEnded);
            }
        }
    }

    static clearTimer(pollId: string) {
        if (pollTimers.has(pollId)) {
            clearTimeout(pollTimers.get(pollId));
            pollTimers.delete(pollId);
        }
    }
}
