import { Poll } from "../models/Poll.model";
import { Vote } from "../models/Vote.model";

const pollTimers: Map<string, NodeJS.Timeout> = new Map();

// Track connected students for "all students answered" check
const connectedStudents: Map<string, { sessionId: string; name: string }> = new Map();

export class PollService {
    static addConnectedStudent(socketId: string, sessionId: string, name: string) {
        connectedStudents.set(socketId, { sessionId, name });
    }

    static removeConnectedStudent(socketId: string) {
        connectedStudents.delete(socketId);
    }

    static getConnectedStudentCount(): number {
        return connectedStudents.size;
    }

    static getConnectedStudentSessionIds(): string[] {
        return Array.from(connectedStudents.values()).map(s => s.sessionId);
    }

    static async canCreateNewPoll(onPollEnded: (pollId: string, results: Record<string, number>) => void): Promise<{ canCreate: boolean; reason?: string }> {
        const activePoll = await Poll.findOne({ status: "ACTIVE" });

        if (!activePoll) {
            // No active poll, can create
            return { canCreate: true };
        }

        const remaining = this.calculateRemainingTime(activePoll);
        if (remaining <= 0) {
            // Poll time expired, end it and allow new poll
            await this.endPoll(activePoll._id.toString(), onPollEnded);
            return { canCreate: true };
        }

        // Check if all connected students have voted
        const connectedSessionIds = this.getConnectedStudentSessionIds();
        if (connectedSessionIds.length === 0) {
            // No students connected, allow new poll creation
            return { canCreate: false, reason: "Active poll in progress. Wait for timer to expire." };
        }

        const voteCount = await Vote.countDocuments({ pollId: activePoll._id });

        // Check if all connected students have voted
        const allStudentVotes = await Vote.find({
            pollId: activePoll._id,
            studentSessionId: { $in: connectedSessionIds }
        });

        if (allStudentVotes.length >= connectedSessionIds.length) {
            // All connected students have voted, end poll and allow new one
            await this.endPoll(activePoll._id.toString(), onPollEnded);
            return { canCreate: true };
        }

        return {
            canCreate: false,
            reason: `Active poll in progress. ${allStudentVotes.length}/${connectedSessionIds.length} students have voted.`
        };
    }

    static async createPoll(data: {
        question: string;
        options: string[];
        duration: number;
    }, onPollEnded: (pollId: string, results: Record<string, number>) => void) {

        const { canCreate, reason } = await this.canCreateNewPoll(onPollEnded);

        if (!canCreate) {
            throw new Error(reason || "Cannot create new poll at this time");
        }

        const now = new Date();
        const poll = await Poll.create({
            question: data.question,
            options: data.options.map(o => ({ text: o })),
            duration: data.duration,
            startTime: now,
            startedAt: now,
            status: "ACTIVE"
        });

        this.schedulePollTimer(poll._id.toString(), data.duration, onPollEnded);

        return poll;
    }

    static async getActivePoll() {
        return Poll.findOne({ status: "ACTIVE" });
    }

    static async getActivePollWithState() {
        const poll = await this.getActivePoll();
        if (!poll) return null;

        const results = await this.getResults(poll._id.toString());
        const remainingTime = this.calculateRemainingTime(poll);

        return {
            poll,
            results,
            remainingTime
        };
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

    static async getPollById(pollId: string) {
        const poll = await Poll.findById(pollId);
        if (!poll) return null;

        const results = await this.getResults(pollId);
        return { poll, results };
    }

    static async getHistoryWithResults() {
        const polls = await Poll.find({ status: "ENDED" }).sort({ createdAt: -1 });

        const pollsWithResults = await Promise.all(
            polls.map(async (poll) => {
                const results = await this.getResults(poll._id.toString());
                return {
                    poll,
                    results
                };
            })
        );

        return pollsWithResults;
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
