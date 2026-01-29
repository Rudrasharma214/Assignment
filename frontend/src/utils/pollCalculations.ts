export function calculateTotalVotes(results: Record<string, number>): number {
    return Object.values(results).reduce((a, b) => a + b, 0);
}

export function calculatePercentage(votes: number, totalVotes: number): number {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
}
