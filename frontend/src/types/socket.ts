import type { Poll, ResultMap } from './poll';

export interface JoinStudentPayload {
    studentSessionId: string;
    studentName: string;
}

export interface PollStatePayload {
    poll: Poll | null;
    remainingTime: number;
    results: ResultMap;
    hasVoted: boolean;
    studentCount?: number;
    voteCount?: number;
}

export interface PollStartedPayload {
    poll: Poll;
    remainingTime: number;
    results: ResultMap;
}

export interface VoteUpdatePayload {
    pollId: string;
    results: ResultMap;
    voteCount?: number;
    studentCount?: number;
}

export interface PollEndedPayload {
    pollId: string;
    results: ResultMap;
}

export interface AllStudentsVotedPayload {
    pollId: string;
}

export interface CreatePollPayload {
    question: string;
    options: string[];
    duration: number;
}

export interface SubmitVotePayload {
    pollId: string;
    optionId: string;
}

export interface ErrorPayload {
    message: string;
}
