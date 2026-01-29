import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSocket } from '../hooks/useSocket';
import { usePollState } from '../hooks/usePollState';
import { usePollTimer } from '../hooks/usePollTimer';
import { getOrCreateStudentSessionId, getStudentName, setStudentName as saveStudentName } from '../utils/session';
import { calculateTotalVotes, calculatePercentage } from '../utils/pollCalculations';
import { StudentName } from '../components/StudentName';
import { OptionButton } from '../components/OptionButton';
import { Timer } from '../components/Timer';
import type {
    PollStatePayload,
    PollStartedPayload,
    VoteUpdatePayload,
    PollEndedPayload,
    ErrorPayload
} from '../types/socket';
import { Sparkles } from 'lucide-react';

export function StudentDashboard() {
    const { socket } = useSocket();
    const {
        poll,
        setPoll,
        results,
        setResults,
        serverRemainingTime,
        setServerRemainingTime,
        hasVoted,
        setHasVoted,
        updateFromServerState
    } = usePollState();

    const remainingTime = usePollTimer(serverRemainingTime);

    const [studentName, setStudentNameState] = useState(() => getStudentName() || '');
    const [hasJoined, setHasJoined] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [voteError, setVoteError] = useState<string | null>(null);
    const [isLoadingState, setIsLoadingState] = useState(true);

    const safeResults = results ?? {};
    const totalVotes = useMemo(() => calculateTotalVotes(safeResults), [safeResults]);

    const stateRef = useRef({ updateFromServerState, setPoll, setResults, setHasVoted, setServerRemainingTime, setIsLoadingState, setJoinError, setVoteError, setHasJoined });

    useEffect(() => {
        stateRef.current = { updateFromServerState, setPoll, setResults, setHasVoted, setServerRemainingTime, setIsLoadingState, setJoinError, setVoteError, setHasJoined };
    });

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (isLoadingState) {
                console.warn('Loading timeout reached');
                setIsLoadingState(false);
            }
        }, 10000);

        return () => clearTimeout(timeout);
    }, [isLoadingState]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!e.defaultPrevented) {
                sessionStorage.setItem('student_tab_closing', 'true');
            }
        };

        const handlePageShow = () => {
            sessionStorage.removeItem('student_tab_closing');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pageshow', handlePageShow);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    useEffect(() => {
        const savedName = getStudentName();
        if (savedName && !hasJoined) {
            setStudentNameState(savedName);
            const sessionId = getOrCreateStudentSessionId();
            socket.emit('join_student', {
                studentSessionId: sessionId,
                studentName: savedName
            });
        } else if (!savedName) {
            setIsLoadingState(false);
        }
    }, [socket, hasJoined]);

    const handleJoin = useCallback(() => {
        if (studentName.trim()) {
            setJoinError(null);
            saveStudentName(studentName.trim());
            const sessionId = getOrCreateStudentSessionId();
            socket.emit('join_student', {
                studentSessionId: sessionId,
                studentName: studentName.trim()
            });
        }
    }, [studentName, socket]);

    useEffect(() => {
        const handlePollStateOnJoin = (payload: PollStatePayload) => {
            if (!hasJoined && studentName.trim()) {
                stateRef.current.setHasJoined(true);
                stateRef.current.setJoinError(null);
            }
            stateRef.current.updateFromServerState(
                payload.poll,
                payload.remainingTime,
                payload.results,
                payload.hasVoted
            );
            setSelectedOption(null);
            stateRef.current.setIsLoadingState(false);
        };

        const handleErrorOnJoin = (payload: ErrorPayload) => {
            console.error('Socket error:', payload.message);
            stateRef.current.setIsLoadingState(false);
            if (payload.message.includes('name') && payload.message.includes('taken')) {
                stateRef.current.setJoinError(payload.message);
                stateRef.current.setHasJoined(false);
            } else if (hasJoined) {
                stateRef.current.setVoteError(payload.message);
                setTimeout(() => stateRef.current.setVoteError(null), 3000);
            } else {
                stateRef.current.setJoinError(payload.message);
            }
        };

        socket.on('poll_state', handlePollStateOnJoin);
        socket.on('error', handleErrorOnJoin);

        return () => {
            socket.off('poll_state', handlePollStateOnJoin);
            socket.off('error', handleErrorOnJoin);
        };
    }, [socket, studentName, hasJoined]);

    useEffect(() => {
        if (!hasJoined) return;

        const handlePollStarted = (payload: PollStartedPayload) => {
            stateRef.current.setPoll(payload.poll);
            stateRef.current.setServerRemainingTime(payload.remainingTime);
            stateRef.current.setResults(payload.results);
            stateRef.current.setHasVoted(false);
            setSelectedOption(null);
            stateRef.current.setVoteError(null);
        };

        const handleVoteUpdate = (payload: VoteUpdatePayload) => {
            stateRef.current.setResults(payload.results);
        };

        const handlePollEnded = (payload: PollEndedPayload) => {
            stateRef.current.setResults(payload.results);
            stateRef.current.setServerRemainingTime(0);
        };

        const handleConnect = () => {
            console.log('Reconnected, requesting poll state...');
            const sessionId = getOrCreateStudentSessionId();
            socket.emit('join_student', {
                studentSessionId: sessionId,
                studentName: studentName.trim()
            });
        };

        socket.on('poll_started', handlePollStarted);
        socket.on('vote_update', handleVoteUpdate);
        socket.on('poll_ended', handlePollEnded);
        socket.on('connect', handleConnect);

        return () => {
            socket.off('poll_started', handlePollStarted);
            socket.off('vote_update', handleVoteUpdate);
            socket.off('poll_ended', handlePollEnded);
            socket.off('connect', handleConnect);
        };
    }, [hasJoined, socket, studentName]);

    const handleSelectOption = useCallback((optionId: string) => {
        if (!hasVoted && remainingTime > 0) {
            setSelectedOption(optionId);
        }
    }, [hasVoted, remainingTime]);

    const handleSubmitVote = useCallback(() => {
        if (poll && selectedOption && !hasVoted && remainingTime > 0) {
            setVoteError(null);
            socket.emit('submit_vote', { pollId: poll.id, optionId: selectedOption });
            setHasVoted(true);
        }
    }, [poll, selectedOption, hasVoted, remainingTime, socket, setHasVoted]);

    if (isLoadingState) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
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
        );
    }

    if (!hasJoined) {
        return (
            <StudentName
                studentName={studentName}
                setStudentName={setStudentNameState}
                onJoin={handleJoin}
                error={joinError}
            />
        );
    }

    const isExpired = (remainingTime === 0) || (poll?.status === 'ENDED' && poll !== null);
    const showResults = (hasVoted ?? false) || isExpired;
    const isButtonDisabled = (hasVoted ?? false) || isExpired;

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {poll ? (
                    <div className="space-y-4">
                        <Timer remainingTime={remainingTime} />

                        {voteError && (
                            <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                                {voteError}
                            </div>
                        )}

                        <div className="border border-purple-300 rounded-md overflow-hidden">
                            <div className="bg-gray-700 text-white px-4 py-3 text-sm font-medium rounded-t-md">
                                {poll.question}
                            </div>

                            <div className="p-4 space-y-3">
                                {showResults ? (
                                    poll.options.map((option, idx) => {
                                        const votes = safeResults[option.id] ?? 0;
                                        const percentage = calculatePercentage(votes, totalVotes);

                                        return (
                                            <div
                                                key={option.id}
                                                className="relative h-12 rounded-md overflow-hidden bg-[#E8E8E8]"
                                            >
                                                <div
                                                    className="absolute left-0 top-0 h-full bg-[#7C6CF6]"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                                <div className="relative h-full flex items-center justify-between px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-[#7C6CF6] text-white">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800">
                                                            {option.text}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800">
                                                        {percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    poll.options.map((option, idx) => (
                                        <OptionButton
                                            key={option.id}
                                            index={idx}
                                            text={option.text}
                                            disabled={isButtonDisabled}
                                            selected={selectedOption === option.id}
                                            onClick={() => handleSelectOption(option.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {!showResults && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSubmitVote}
                                    disabled={isButtonDisabled || !selectedOption}
                                    className="px-10 py-2.5 rounded-full bg-[#6E6BD8] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Submit
                                </button>
                            </div>
                        )}

                        {showResults && (
                            <div className="text-center py-4">
                                <p className="text-gray-800 text-2xl font-medium">
                                    Wait for the teacher to ask a new question..
                                </p>
                            </div>
                        )}
                    </div>

                ) : (
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-4">
                            <Sparkles size={16} />
                            Intervue Poll
                        </div>

                        <div className="flex justify-center mb-8">
                            <div className="spinner" />
                        </div>


                        <h2 className="text-2xl font-bold text-gray-900">
                            Wait for the teacher to ask questions..
                        </h2>
                    </div>
                )}
            </div>
        </div>
    );
}
