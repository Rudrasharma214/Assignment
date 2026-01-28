import { useEffect, useCallback, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { usePollState } from '../hooks/usePollState';
import { usePollTimer } from '../hooks/usePollTimer';
import { LivePollDisplay } from '../components/LivePollDisplay';
import { CreatePollForm } from '../components/CreatePollForm';
import { fetchPollHistory } from '../services/api';
import type { PollWithResults } from '../services/api';
import type {
    CreatePollPayload,
    PollStatePayload,
    PollStartedPayload,
    VoteUpdatePayload,
    PollEndedPayload,
    ErrorPayload,
    AllStudentsVotedPayload
} from '../types/socket';
import { Sparkles } from 'lucide-react';

export function TeacherDashboard() {
    const { socket } = useSocket();
    const {
        poll,
        setPoll,
        results,
        setResults,
        serverRemainingTime,
        setServerRemainingTime,
        studentCount,
        setStudentCount,
        voteCount,
        setVoteCount,
        updateFromServerState,
        resetState
    } = usePollState();

    const [pollHistory, setPollHistory] = useState<PollWithResults[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const remainingTime = usePollTimer(serverRemainingTime);

    const loadPollHistory = useCallback(async () => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const history = await fetchPollHistory();
            setPollHistory(history);
        } catch (error: any) {
            setHistoryError(error.message || 'Failed to load poll history');
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        socket.emit('join_teacher');

        const handlePollState = (payload: PollStatePayload) => {
            updateFromServerState(
                payload.poll,
                payload.remainingTime,
                payload.results,
                false,
                payload.studentCount,
                payload.voteCount
            );
        };

        const handlePollStarted = (payload: PollStartedPayload) => {
            setPoll(payload.poll);
            setServerRemainingTime(payload.remainingTime);
            setResults(payload.results);
            setVoteCount(0);
        };

        const handleVoteUpdate = (payload: VoteUpdatePayload) => {
            setResults(payload.results);
            if (payload.voteCount !== undefined) setVoteCount(payload.voteCount);
            if (payload.studentCount !== undefined) setStudentCount(payload.studentCount);
        };

        const handlePollEnded = (payload: PollEndedPayload) => {
            setResults(payload.results);
            setServerRemainingTime(0);
        };

        const handleAllStudentsVoted = (_payload: AllStudentsVotedPayload) => {
            console.log('All students have voted');
        };

        const handleError = (payload: ErrorPayload) => {
            console.error('Socket error:', payload.message);
            alert(payload.message);
        };

        const handleConnect = () => {
            console.log('Reconnected, rejoining as teacher...');
            socket.emit('join_teacher');
        };

        socket.on('poll_state', handlePollState);
        socket.on('poll_started', handlePollStarted);
        socket.on('vote_update', handleVoteUpdate);
        socket.on('poll_ended', handlePollEnded);
        socket.on('all_students_voted', handleAllStudentsVoted);
        socket.on('error', handleError);
        socket.on('connect', handleConnect);

        return () => {
            socket.off('poll_state', handlePollState);
            socket.off('poll_started', handlePollStarted);
            socket.off('vote_update', handleVoteUpdate);
            socket.off('poll_ended', handlePollEnded);
            socket.off('all_students_voted', handleAllStudentsVoted);
            socket.off('error', handleError);
            socket.off('connect', handleConnect);
        };
    }, [socket, setPoll, setResults, setServerRemainingTime, setStudentCount, setVoteCount, updateFromServerState]);

    const handleCreatePoll = useCallback((payload: CreatePollPayload) => {
        socket.emit('create_poll', payload);
    }, [socket]);

    const handleAskNewQuestion = useCallback(() => {
        resetState();
    }, [resetState]);

    const handleViewHistory = useCallback(() => {
        setShowHistory(true);
        loadPollHistory();
    }, [loadPollHistory]);

    const handleCloseHistory = useCallback(() => {
        setShowHistory(false);
    }, []);

    return (
        <div className="min-h-screen bg-white px-10 py-8">
            <div className="max-w-6xl mx-auto">
                {!poll ? (
                    <>
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-4">
                                <Sparkles size={16} />
                                Intervue Poll
                            </div>

                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Let's Get Started
                            </h1>

                            <p className="text-gray-500 max-w-xl text-sm">
                                you'll have the ability to create and manage polls, ask questions, and
                                monitor your students' responses in real-time.
                            </p>
                        </div>

                        <CreatePollForm onSubmit={handleCreatePoll} />
                    </>
                ) : (
                    <LivePollDisplay
                        poll={poll}
                        results={results}
                        remainingTime={remainingTime}
                        onAskNewQuestion={handleAskNewQuestion}
                        studentCount={studentCount}
                        voteCount={voteCount}
                        onViewHistory={handleViewHistory}
                        showHistory={showHistory}
                        onCloseHistory={handleCloseHistory}
                        pollHistory={pollHistory}
                        historyLoading={historyLoading}
                        historyError={historyError}
                    />
                )}
            </div>
        </div>
    );
}