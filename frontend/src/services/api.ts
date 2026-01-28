import type { Poll, ResultMap } from '../types/poll';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


export interface PollWithResults {
    poll: Poll;
    results: ResultMap;
}

export interface ActivePollState {
    poll: Poll | null;
    remainingTime: number;
    results: ResultMap;
}

export async function fetchPollHistory(): Promise<PollWithResults[]> {
    const response = await fetch(`${API_URL}/polls/history`);
    if (!response.ok) {
        throw new Error('Failed to fetch poll history');
    }
    return response.json();
}

export async function fetchActivePoll(): Promise<ActivePollState | null> {
    const response = await fetch(`${API_URL}/polls/active`);
    if (!response.ok) {
        throw new Error('Failed to fetch active poll');
    }
    return response.json();
}

export async function fetchPollResults(pollId: string): Promise<PollWithResults | null> {
    const response = await fetch(`${API_URL}/polls/${pollId}/results`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch poll results');
    }
    return response.json();
}

export async function checkVoteStatus(pollId: string, sessionId: string): Promise<boolean> {
    const response = await fetch(
        `${API_URL}/polls/${pollId}/vote-status?sessionId=${encodeURIComponent(sessionId)}`
    );
    if (!response.ok) {
        throw new Error('Failed to check vote status');
    }
    const data = await response.json();
    return data.hasVoted;
}