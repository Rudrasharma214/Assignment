import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { usePollState } from '../hooks/usePollState';
import { usePollTimer } from '../hooks/usePollTimer';
import { getOrCreateStudentSessionId, getStudentName, setStudentName as saveStudentName } from '../utils/session';
import { PollQuestion } from '../components/PollQuestion';
import { StudentName } from '../components/StudentName';
import { OptionButton } from '../components/OptionButton';
import { Timer } from '../components/Timer';
import { ResultsList } from '../components/ResultsList';
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

    useEffect(() => {
        const savedName = getStudentName();
        if (savedName && !hasJoined) {
            setStudentNameState(savedName);
            const sessionId = getOrCreateStudentSessionId();
            socket.emit('join_student', {
                studentSessionId: sessionId,
                studentName: savedName
            });
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
                setHasJoined(true);
                setJoinError(null);
            }
            updateFromServerState(
                payload.poll,
                payload.remainingTime,
                payload.results,
                payload.hasVoted
            );
            setSelectedOption(null);
        };

        const handleErrorOnJoin = (payload: ErrorPayload) => {
            console.error('Socket error:', payload.message);
            if (payload.message.includes('name') && payload.message.includes('taken')) {
                setJoinError(payload.message);
                setHasJoined(false);
            } else if (hasJoined) {
                setVoteError(payload.message);
                setTimeout(() => setVoteError(null), 3000);
            }
        };

        socket.on('poll_state', handlePollStateOnJoin);
        socket.on('error', handleErrorOnJoin);

        return () => {
            socket.off('poll_state', handlePollStateOnJoin);
            socket.off('error', handleErrorOnJoin);
        };
    }, [socket, studentName, hasJoined, updateFromServerState]);

    useEffect(() => {
        if (!hasJoined) return;

        const handlePollStarted = (payload: PollStartedPayload) => {
            setPoll(payload.poll);
            setServerRemainingTime(payload.remainingTime);
            setResults(payload.results);
            setHasVoted(false);
            setSelectedOption(null);
            setVoteError(null);
        };

        const handleVoteUpdate = (payload: VoteUpdatePayload) => {
            setResults(payload.results);
        };

        const handlePollEnded = (payload: PollEndedPayload) => {
            setResults(payload.results);
            setServerRemainingTime(0);
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
    }, [
        hasJoined,
        socket,
        studentName,
        setPoll,
        setResults,
        setHasVoted,
        setServerRemainingTime
    ]);

    const handleVote = useCallback((optionId: string) => {
        if (poll && !hasVoted && remainingTime > 0) {
            setSelectedOption(optionId);
            setVoteError(null);
            socket.emit('submit_vote', { pollId: poll.id, optionId });
            setHasVoted(true);
        }
    }, [poll, hasVoted, remainingTime, socket, setHasVoted]);

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

    const isExpired = remainingTime === 0;
    const showResults = hasVoted || isExpired;

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
                            <PollQuestion question={poll.question} />

                            <div className="p-4 space-y-3">
                                {poll.options.map((option, idx) => (
                                    <OptionButton
                                        key={option.id}
                                        index={idx}
                                        text={option.text}
                                        disabled={hasVoted || isExpired}
                                        selected={selectedOption === option.id}
                                        onClick={() => handleVote(option.id)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                disabled={hasVoted || isExpired}
                                className="px-10 py-2.5 rounded-full bg-[#6E6BD8] text-white text-sm font-medium disabled:opacity-50"
                            >
                                Submit
                            </button>
                        </div>

                        {showResults && (
                            <div className="mt-6">
                                <ResultsList options={poll.options} results={results} />
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
