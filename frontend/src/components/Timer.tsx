interface TimerProps {
  remainingTime: number;
}

export function Timer({ remainingTime }: TimerProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <span className="text-gray-900">Question 1</span>
      <span className="flex items-center gap-1 text-red-500">
        ⏱
        <span>00:{String(remainingTime).padStart(2, '0')}</span>
      </span>
    </div>
  );
}

