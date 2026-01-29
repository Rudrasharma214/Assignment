import { useEffect, useCallback, useState, useRef } from 'react';
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
    const [isLoadingState, setIsLoadingState] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (isLoadingState) {
                console.warn('Loading timeout reached');
                setIsLoadingState(false);
            }
        }, 10000);

        return () => clearTimeout(timeout);
    }, [isLoadingState]);

    const remainingTime = usePollTimer(serverRemainingTime);

    const stateRef = useRef({ setPoll, setResults, setServerRemainingTime, setStudentCount, setVoteCount, updateFromServerState, setIsLoadingState, setIsBlocked });

    useEffect(() => {
        stateRef.current = { setPoll, setResults, setServerRemainingTime, setStudentCount, setVoteCount, updateFromServerState, setIsLoadingState, setIsBlocked };
    });

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
            stateRef.current.updateFromServerState(
                payload.poll,
                payload.remainingTime,
                payload.results,
                false,
                payload.studentCount,
                payload.voteCount
            );
            stateRef.current.setIsLoadingState(false);
        };

        const handlePollStarted = (payload: PollStartedPayload) => {
            stateRef.current.setPoll(payload.poll);
            stateRef.current.setServerRemainingTime(payload.remainingTime);
            stateRef.current.setResults(payload.results);
            stateRef.current.setVoteCount(0);
        };

        const handleVoteUpdate = (payload: VoteUpdatePayload) => {
            stateRef.current.setResults(payload.results);
            if (payload.voteCount !== undefined) stateRef.current.setVoteCount(payload.voteCount);
            if (payload.studentCount !== undefined) stateRef.current.setStudentCount(payload.studentCount);
        };

        const handlePollEnded = (payload: PollEndedPayload) => {
            stateRef.current.setResults(payload.results);
            stateRef.current.setServerRemainingTime(0);
        };

        const handleAllStudentsVoted = (_payload: AllStudentsVotedPayload) => {
            console.log('All students have voted');
        };

        const handleError = (payload: ErrorPayload) => {
            console.error('Socket error:', payload.message);
            stateRef.current.setIsLoadingState(false);

            if (payload.message.includes('Another teacher is already connected')) {
                stateRef.current.setIsBlocked(true);
            } else {
                alert(payload.message);
            }
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
    }, [socket]);

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
                {isBlocked ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center max-w-md">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-6">
                                <Sparkles size={16} />
                                Intervue Poll
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">
                                Teacher Session Active
                            </h1>
                            <p className="text-gray-600 mb-6">
                                Another teacher is already connected. Only one teacher can be active at a time.
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-2 bg-[#6C4CF1] text-white rounded-full text-sm font-semibold hover:bg-[#5A3EE6]"
                            >
                                Go to Home
                            </button>
                        </div>
                    </div>
                ) : isLoadingState ? (
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-4">
                                <Sparkles size={16} />
                                Intervue Poll
                            </div>
                            <div className="flex justify-center mb-4">
                                <div className="spinner" />
                            </div>
                            <p className="text-gray-500 text-sm">Loading...</p>
                        </div>
                    </div>
                ) : !poll ? (
                    <>
                        <div className="mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-4">
                                <Sparkles size={16} />
                                Intervue Poll
                            </div>

                            <h1 className="text-3xl font-base text-gray-900 mb-2">
                                Let's <strong> Get Started </strong>
                            </h1>

                            <p className="text-gray-500 max-w-xl text-sm">
                                you'll have the ability to create and manage polls, ask questions, and
                                monitor your students responses in real-time.
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