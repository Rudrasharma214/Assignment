interface PollQuestionProps {
  question: string;
}

export function PollQuestion({ question }: PollQuestionProps) {
  return (
    <div className="bg-gray-700 text-white px-4 py-3 text-sm font-medium rounded-t-md">
      {question}
    </div>
  );
}
