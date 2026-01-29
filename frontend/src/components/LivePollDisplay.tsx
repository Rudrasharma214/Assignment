import { Eye, X } from 'lucide-react';
import type { Poll, ResultMap } from '../types/poll';
import type { PollWithResults } from '../services/api';

interface Props {
    poll: Poll;
    results: ResultMap | undefined;
    remainingTime: number;
    onAskNewQuestion: () => void;
    studentCount?: number;
    voteCount?: number;
    onViewHistory?: () => void;
    showHistory?: boolean;
    onCloseHistory?: () => void;
    pollHistory?: PollWithResults[];
    historyLoading?: boolean;
    historyError?: string | null;
}

export function LivePollDisplay({
    poll,
    results,
    remainingTime,
    onAskNewQuestion,
    studentCount = 0,
    voteCount = 0,
    onViewHistory,
    showHistory = false,
    onCloseHistory,
    pollHistory = [],
    historyLoading = false,
    historyError = null,
}: Props) {
    const isPollEnded = poll.status === 'ENDED';
    const safeResults = results ?? {};
    const totalVotes = Object.values(safeResults).reduce((a, b) => a + b, 0);

    const allStudentsVoted = studentCount > 0 && voteCount >= studentCount;
    const canCreateNewPoll = isPollEnded || remainingTime === 0 || allStudentsVoted;

    if (showHistory) {
        return (
            <div className="min-h-screen bg-white px-10 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-2xl font-bold text-black">View Poll History</h1>
                        <button
                            onClick={onCloseHistory}
                            className="hover:bg-gray-100 rounded-full p-2 transition"
                        >
                            <X className="text-gray-600" size={24} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        {historyLoading && (
                            <p className="text-center text-gray-500">Loading...</p>
                        )}

                        {historyError && (
                            <p className="text-center text-red-500">{historyError}</p>
                        )}

                        {!historyLoading && !historyError && pollHistory.length === 0 && (
                            <p className="text-center text-gray-500">No poll history available</p>
                        )}

                        {!historyLoading && !historyError && Array.isArray(pollHistory) && pollHistory.map((item: PollWithResults, idx: number) => {
                            const historyPoll = item.poll as any;
                            const historyResults = item.results || {};
                            const historyTotal = Object.values(historyResults).reduce((a: number, b: number) => a + b, 0);

                            return (
                                <div key={historyPoll._id || idx}>
                                    <p className="text-sm font-semibold text-black mb-2">
                                        Question {idx + 1}
                                    </p>

                                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                                        <div className="bg-[#5A5A5A] text-white px-4 py-3 text-sm font-medium">
                                            {historyPoll.question}
                                        </div>

                                        <div className="p-4 space-y-2">
                                            {historyPoll.options?.map((opt: any, optIdx: number) => {
                                                const optId = opt._id?.toString() || opt.id;
                                                const votes = historyResults[optId] ?? 0;
                                                const pct = historyTotal ? Math.round((votes / historyTotal) * 100) : 0;

                                                return (
                                                    <div
                                                        key={optId || optIdx}
                                                        className="relative h-10 bg-[#E8E8E8] rounded-md overflow-hidden"
                                                    >
                                                        <div
                                                            className="absolute left-0 top-0 h-full bg-[#7C6CF6]"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                        <div className="relative h-full flex items-center justify-between px-4">
                                                            <div className="flex items-center gap-2.5 text-sm font-medium text-black">
                                                                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#7C6CF6] text-white text-xs font-semibold">
                                                                    {optIdx + 1}
                                                                </span>
                                                                {opt.text}
                                                            </div>
                                                            <span className="text-sm font-semibold text-black">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white px-6 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="flex justify-end mb-6">
                    <button
                        onClick={onViewHistory}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#7C6CF6] text-white text-sm font-medium"
                    >
                        <Eye size={16} />
                        View Poll history
                    </button>
                </div>

                <div className="mb-4">
                    <h2 className="text-base font-semibold text-black mb-4">
                        Question
                    </h2>
                </div>

                <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="bg-[#5A5A5A] text-white px-4 py-3 text-sm font-medium">
                        {poll.question}
                    </div>

                    <div className="p-4 space-y-2">
                        {poll.options.map((option, index) => {
                            const votes = safeResults[option.id] ?? 0;
                            const percentage = totalVotes
                                ? Math.round((votes / totalVotes) * 100)
                                : 0;

                            return (
                                <div
                                    key={option.id}
                                    className="relative h-10 bg-[#E8E8E8] rounded-md overflow-hidden"
                                >
                                    <div
                                        className="absolute left-0 top-0 h-full bg-[#7C6CF6]"
                                        style={{ width: `${percentage}%` }}
                                    />

                                    <div className="relative h-full flex items-center justify-between px-4">
                                        <div className="flex items-center gap-2.5 text-sm font-medium text-black">
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#7C6CF6] text-white text-xs font-semibold">
                                                {index + 1}
                                            </span>
                                            {option.text}
                                        </div>

                                        <span className="text-sm font-semibold text-black">
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onAskNewQuestion}
                        disabled={!canCreateNewPoll}
                        className={`mt-8 px-10 py-2.5 rounded-full text-sm font-medium ${!canCreateNewPoll
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#7C6CF6] text-white'
                            }`}
                    >
                        + Ask a new question
                    </button>
                </div>
            </div>
        </div>

    );
}