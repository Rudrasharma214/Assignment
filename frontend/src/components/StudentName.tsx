import { Sparkles } from "lucide-react";

type Props = {
    studentName: string;
    setStudentName: (v: string) => void;
    onJoin: () => void;
    error?: string | null;
};

export function StudentName({ studentName, setStudentName, onJoin, error }: Props) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#6C4CF1] text-white text-xs font-semibold mb-4">
                    <Sparkles size={16} />
                    Intervue Poll
                </div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Let’s Get Started
                </h1>

                <p className="text-gray-500 text-sm leading-relaxed mb-10">
                    If you’re a student, you’ll be able to{" "}
                    <span className="font-semibold text-gray-700">
                        submit your answers
                    </span>
                    , participate in live polls, and see how your responses compare with
                    your classmates
                </p>

                <div className="text-left mb-8">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter your Name
                    </label>
                    <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && onJoin()}
                        placeholder="Rudra Sharma"
                        className={`w-full px-4 py-3 rounded-sm bg-gray-100 border focus:outline-none focus:ring-2 focus:ring-purple-500 ${error ? 'border-red-500' : 'border-gray-200'
                            }`}
                    />
                    {error && (
                        <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                </div>

                <button
                    onClick={onJoin}
                    disabled={!studentName.trim()}
                    className="
    px-10
    py-2.5
    rounded-full
    bg-[#6E6BD8]
    text-white
    text-sm
    font-medium
    transition
    disabled:opacity-50
    disabled:cursor-not-allowed
  "
                >
                    Continue
                </button>

            </div>
        </div>
    );
}
