import { useState, useCallback } from 'react';
import type { Poll, ResultMap } from '../types/poll';


export function usePollState() {
    const [poll, setPoll] = useState<Poll | null>(null);
    const [results, setResults] = useState<ResultMap>({});
    const [serverRemainingTime, setServerRemainingTime] = useState<number>(0);
    const [hasVoted, setHasVoted] = useState<boolean>(false);
    const [studentCount, setStudentCount] = useState<number>(0);
    const [voteCount, setVoteCount] = useState<number>(0);

    const resetState = useCallback(() => {
        setPoll(null);
        setResults({});
        setServerRemainingTime(0);
        setHasVoted(false);
        setVoteCount(0);
    }, []);

    const updateFromServerState = useCallback((
        newPoll: Poll | null,
        newRemainingTime: number,
        newResults: ResultMap,
        newHasVoted: boolean,
        newStudentCount?: number,
        newVoteCount?: number
    ) => {
        setPoll(newPoll);
        setServerRemainingTime(newRemainingTime);
        setResults(newResults);
        setHasVoted(newHasVoted);
        if (newStudentCount !== undefined) setStudentCount(newStudentCount);
        if (newVoteCount !== undefined) setVoteCount(newVoteCount);
    }, []);

    return {
        poll,
        setPoll,
        results,
        setResults,
        serverRemainingTime,
        setServerRemainingTime,
        hasVoted,
        setHasVoted,
        studentCount,
        setStudentCount,
        voteCount,
        setVoteCount,
        resetState,
        updateFromServerState,
    };
}
