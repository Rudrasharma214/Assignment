import type { Option, ResultMap } from '../types/poll';

interface ResultsListProps {
    options: Option[];
    results: ResultMap | undefined;
}

export function ResultsList({ options, results }: ResultsListProps) {
    const safeResults = results ?? {};
    const totalVotes = Object.values(safeResults).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-4">
            {options.map((option) => {
                const votes = safeResults[option.id] ?? 0;
                const percentage =
                    totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                return (
                    <div
                        key={option.id}
                        className="bg-gray-100 p-4 rounded-lg"
                    >
                        <div className="flex justify-between mb-2">
                            <span className="font-semibold text-gray-800">
                                {option.text}
                            </span>
                            <span className="text-blue-600 font-bold">
                                {votes} votes
                            </span>
                        </div>

                        <div className="w-full bg-gray-300 rounded-full h-6">
                            <div
                                className="bg-blue-500 h-6 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
