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
    const isLive = remainingTime > 0;
    const safeResults = results ?? {};
    const totalVotes = Object.values(safeResults).reduce((a, b) => a + b, 0);

    const allStudentsVoted = studentCount > 0 && voteCount >= studentCount;
    const canCreateNewPoll = !isLive || allStudentsVoted;

    return (
        <div className="min-h-screen flex justify-center pt-16">
            <div className="w-[520px]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-sm font-semibold text-black">
                        Question {isLive && studentCount > 0 && (
                            <span className="text-gray-500 font-normal">
                                ({voteCount}/{studentCount} voted)
                            </span>
                        )}
                    </h2>

                    <button
                        onClick={onViewHistory}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7C6CF6] text-white text-xs font-medium"
                    >
                        <Eye size={14} />
                        View Poll history
                    </button>
                </div>

                <div className="border border-[#7C6CF6] rounded-lg overflow-hidden">
                    <div className="bg-[#5F5F5F] text-white px-4 py-3 text-sm font-medium">
                        {poll.question}
                    </div>

                    <div className="p-4 space-y-3">
                        {poll.options.map((option, index) => {
                            const votes = safeResults[option.id] ?? 0;
                            const percentage = totalVotes
                                ? Math.round((votes / totalVotes) * 100)
                                : 0;

                            return (
                                <div
                                    key={option.id}
                                    className="relative h-9 bg-[#F2F2F2] rounded-md overflow-hidden"
                                >
                                    <div
                                        className="absolute left-0 top-0 h-full bg-[#6C6AD7]"
                                        style={{ width: `${percentage}%` }}
                                    />

                                    <div className="relative h-full flex items-center justify-between px-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-black">
                                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#6C6AD7] text-white text-xs">
                                                {index + 1}
                                            </span>
                                            {option.text}
                                        </div>

                                        <span className="text-xs font-semibold text-black">
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={onAskNewQuestion}
                        disabled={!canCreateNewPoll}
                        className={`mt-10 px-8 py-3 rounded-full text-sm font-medium ${!canCreateNewPoll
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-[#7C6CF6] text-white'
                            }`}
                    >
                        + Ask a new question
                    </button>
                </div>
            </div>

            {showHistory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold">Poll History</h3>
                            <button onClick={onCloseHistory} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                            {historyLoading && (
                                <div className="text-center py-8 text-gray-500">Loading...</div>
                            )}
                            {historyError && (
                                <div className="text-center py-8 text-red-500">{historyError}</div>
                            )}
                            {!historyLoading && !historyError && pollHistory.length === 0 && (
                                <div className="text-center py-8 text-gray-500">No poll history yet</div>
                            )}
                            {!historyLoading && !historyError && pollHistory.map((item: PollWithResults, idx: number) => {
                                const historyPoll = item.poll as any;
                                const historyResults = item.results || {};
                                const historyTotal = Object.values(historyResults).reduce((a: number, b: number) => a + b, 0);

                                return (
                                    <div key={historyPoll._id || idx} className="mb-6 border rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-2 text-sm font-medium">
                                            {historyPoll.question}
                                        </div>
                                        <div className="p-3 space-y-2">
                                            {historyPoll.options?.map((opt: any, optIdx: number) => {
                                                const optId = opt._id?.toString() || opt.id;
                                                const votes = historyResults[optId] ?? 0;
                                                const pct = historyTotal ? Math.round((votes / historyTotal) * 100) : 0;
                                                return (
                                                    <div key={optId || optIdx} className="relative h-8 bg-gray-100 rounded overflow-hidden">
                                                        <div
                                                            className="absolute left-0 top-0 h-full bg-[#6C6AD7] opacity-60"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                        <div className="relative h-full flex items-center justify-between px-3 text-sm">
                                                            <span>{opt.text}</span>
                                                            <span className="font-semibold">{pct}% ({votes})</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="px-4 py-2 text-xs text-gray-500 border-t">
                                            Total votes: {historyTotal}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
