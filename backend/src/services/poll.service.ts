import { Poll } from "../models/Poll.model";
import { Vote } from "../models/Vote.model";
import mongoose from "mongoose";
import AppError from "../utils/appError";
import { STATUS } from "../constants/statusCodes";

const pollTimers: Map<string, NodeJS.Timeout> = new Map();

const connectedStudents: Map<string, { sessionId: string; name: string }> = new Map();

export function aggregateResults(votes: Array<{ optionId: any }>): Record<string, number> {
    const resultMap: Record<string, number> = {};
    votes.forEach(v => {
        const key = v.optionId.toString();
        resultMap[key] = (resultMap[key] || 0) + 1;
    });
    return resultMap;
}

export class PollService {
    static addConnectedStudent(socketId: string, sessionId: string, name: string) {
        connectedStudents.set(socketId, { sessionId, name });
    }

    static removeConnectedStudent(socketId: string) {
        connectedStudents.delete(socketId);
    }

    static isStudentNameTaken(name: string, excludeSocketId?: string): boolean {
        for (const [socketId, student] of connectedStudents.entries()) {
            if (student.name.toLowerCase() === name.toLowerCase() && socketId !== excludeSocketId) {
                return true;
            }
        }
        return false;
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
            return { canCreate: true };
        }

        const remaining = this.calculateRemainingTime(activePoll);
        if (remaining <= 0) {
            await this.endPoll(activePoll._id.toString(), onPollEnded);
            return { canCreate: true };
        }

        const connectedSessionIds = this.getConnectedStudentSessionIds();
        if (connectedSessionIds.length === 0) {
            return { canCreate: false, reason: "Active poll in progress. Wait for timer to expire." };
        }

        const voteCount = await Vote.countDocuments({ pollId: activePoll._id });

        const allStudentVotes = await Vote.find({
            pollId: activePoll._id,
            studentSessionId: { $in: connectedSessionIds }
        });

        if (allStudentVotes.length >= connectedSessionIds.length) {
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
            throw new AppError(reason || "Cannot create new poll at this time", STATUS.BAD_REQUEST);
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

    static async getMostRecentPoll() {
        return Poll.findOne({}).sort({ createdAt: -1 }).exec();
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
        const votes = await Vote.find({ pollId }).lean();
        return aggregateResults(votes);
    }

    static async getHistoryWithResults() {
        const polls = await Poll.find({ status: "ENDED" }).sort({ createdAt: -1 }).lean();

        if (polls.length === 0) {
            return [];
        }

        const pollIds = polls.map(p => p._id);
        const votes = await Vote.find({ pollId: { $in: pollIds } }).lean();

        const votesByPoll = new Map<string, Array<{ optionId: any }>>();
        votes.forEach(vote => {
            const pollId = vote.pollId.toString();
            if (!votesByPoll.has(pollId)) {
                votesByPoll.set(pollId, []);
            }
            votesByPoll.get(pollId)!.push(vote);
        });

        return polls.map(poll => ({
            poll,
            results: aggregateResults(votesByPoll.get(poll._id.toString()) || [])
        }));
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

    static async handleStudentJoin(
        studentSessionId: string,
        studentName: string,
        socketId: string
    ): Promise<{
        poll: any | null;
        remainingTime: number;
        results: Record<string, number>;
        hasVoted: boolean
    }> {
        this.addConnectedStudent(socketId, studentSessionId, studentName);

        const activePoll = await this.getActivePoll();
        let mostRecentPoll = activePoll;

        if (!activePoll) {
            const recentPoll = await this.getMostRecentPoll();
            if (recentPoll && recentPoll.status === "ENDED") {
                const studentVoted = await Vote.findOne({
                    pollId: recentPoll._id,
                    studentSessionId
                }).lean();
                if (studentVoted) {
                    mostRecentPoll = recentPoll;
                }
            }
        }

        if (mostRecentPoll) {
            const remaining = mostRecentPoll.status === "ACTIVE"
                ? this.calculateRemainingTime(mostRecentPoll)
                : 0;
            const results = await this.getResults(mostRecentPoll._id.toString());
            const hasVoted = !!(await Vote.findOne({
                pollId: mostRecentPoll._id,
                studentSessionId
            }).lean());

            return {
                poll: mostRecentPoll,
                remainingTime: remaining,
                results,
                hasVoted
            };
        }

        return {
            poll: null,
            remainingTime: 0,
            results: {},
            hasVoted: false
        };
    }

    static async handleTeacherJoin(
        isRefresh: boolean
    ): Promise<{
        poll: any | null;
        remainingTime: number;
        results: Record<string, number>;
        studentCount: number;
        voteCount: number;
    }> {
        const activePoll = await this.getActivePoll();
        let pollToShow = activePoll;

        if (!activePoll && isRefresh) {
            pollToShow = await this.getMostRecentPoll();
        }

        if (pollToShow) {
            const remaining = pollToShow.status === "ACTIVE"
                ? this.calculateRemainingTime(pollToShow)
                : 0;
            const results = await this.getResults(pollToShow._id.toString());
            const voteCount = await Vote.countDocuments({ pollId: pollToShow._id });

            return {
                poll: pollToShow,
                remainingTime: remaining,
                results,
                studentCount: this.getConnectedStudentCount(),
                voteCount
            };
        }

        return {
            poll: null,
            remainingTime: 0,
            results: {},
            studentCount: this.getConnectedStudentCount(),
            voteCount: 0
        };
    }

    static async handleRequestPollState(
        studentSessionId?: string
    ): Promise<{
        poll: any | null;
        remainingTime: number;
        results: Record<string, number>;
        hasVoted: boolean;
    }> {
        const activePoll = await this.getActivePoll();
        const mostRecentPoll = activePoll || await this.getMostRecentPoll();

        if (mostRecentPoll) {
            const remaining = mostRecentPoll.status === "ACTIVE"
                ? this.calculateRemainingTime(mostRecentPoll)
                : 0;
            const results = await this.getResults(mostRecentPoll._id.toString());
            const hasVoted = studentSessionId
                ? !!(await Vote.findOne({ pollId: mostRecentPoll._id, studentSessionId }).lean())
                : false;

            return {
                poll: mostRecentPoll,
                remainingTime: remaining,
                results,
                hasVoted
            };
        }

        return {
            poll: null,
            remainingTime: 0,
            results: {},
            hasVoted: false
        };
    }

    static validatePollId(pollId: string): boolean {
        return mongoose.Types.ObjectId.isValid(pollId);
    }
}
