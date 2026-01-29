import type { Poll, ResultMap } from '../types/poll';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


export interface PollWithResults {
    poll: Poll;
    results: ResultMap;
}

export async function fetchPollHistory(): Promise<PollWithResults[]> {
    const response = await fetch(`${API_URL}/polls/history`);
    if (!response.ok) {
        throw new Error('Failed to fetch poll history');
    }
    const json = await response.json();
    return json.data || [];
}