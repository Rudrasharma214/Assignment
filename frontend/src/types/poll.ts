export interface Option {
    id: string;
    text: string;
}

export interface Poll {
    id: string;
    question: string;
    options: Option[];
    duration: number;
    startedAt: number;
    status: 'ACTIVE' | 'ENDED';
}

export type ResultMap = {
    [optionId: string]: number;
};

export interface PollState {
    poll: Poll | null;
    remainingTime: number;
    results: ResultMap;
    hasVoted: boolean;
}
