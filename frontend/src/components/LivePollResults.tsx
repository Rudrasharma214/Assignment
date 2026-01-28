import { Timer } from './Timer';

interface Props {
  poll: any;
  results: Record<number, number>;
  remainingTime: number;
}

export function LivePollResults({
  poll,
  results,
  remainingTime,
}: Props) {
  const totalVotes = Object.values(results).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-3xl mx-auto mt-20">
      <h2 className="text-xl font-semibold mb-2">
        {poll.question}
      </h2>

      <Timer remainingTime={remainingTime} />

      <div className="mt-6 space-y-3">
        {poll.options.map((opt: string, index: number) => {
          const votes = results[index] || 0;
          const percent = totalVotes
            ? Math.round((votes / totalVotes) * 100)
            : 0;

          return (
            <div key={index} className="relative bg-gray-100 rounded">
              <div
                className="absolute inset-y-0 left-0 bg-purple-500 rounded"
                style={{ width: `${percent}%` }}
              />
              <div className="relative flex justify-between px-4 py-2 text-sm font-medium">
                <span>{opt}</span>
                <span>{percent}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {remainingTime <= 0 && (
        <p className="mt-8 text-center text-gray-500 text-sm">
          Poll ended. You can ask a new question.
        </p>
      )}
    </div>
  );
}
