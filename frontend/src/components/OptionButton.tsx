interface OptionButtonProps {
  text: string;
  disabled: boolean;
  index: number;
  selected?: boolean;
  onClick: () => void;
}

export function OptionButton({
  text,
  disabled,
  index,
  selected,
  onClick,
}: OptionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm
        border transition
        ${
          selected
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-200 bg-gray-50'
        }
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
    >
      <span
        className={`
          w-5 h-5 flex items-center justify-center rounded-full text-xs text-white
          ${selected ? 'bg-purple-500' : 'bg-gray-400'}
        `}
      >
        {index + 1}
      </span>

      <span className="text-gray-800">{text}</span>
    </button>
  );
}
