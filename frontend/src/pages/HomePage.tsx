import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);

  const handleContinue = () => {
    if (selectedRole === 'student') navigate('/student');
    if (selectedRole === 'teacher') navigate('/teacher');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-6 py-2 mb-6 rounded-full bg-[#6C4CF1] text-white text-sm font-semibold">
            <Sparkles size={16} />
            <span>Intervue Poll</span>
          </div>

          <h1 className="text-[44px] leading-tight font-bold text-gray-900 mb-4">
            Welcome to the <span className="font-extrabold">Live Polling System</span>
          </h1>

          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Please select the role that best describes you to begin using the live polling system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <button
            onClick={() => setSelectedRole('student')}
            className={`p-8 rounded-xl border transition-all text-left
              ${
                selectedRole === 'student'
                  ? 'border-[#6C4CF1] bg-[#F4F1FF]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              I’m a Student
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry
            </p>
          </button>

          <button
            onClick={() => setSelectedRole('teacher')}
            className={`p-8 rounded-xl border transition-all text-left
              ${
                selectedRole === 'teacher'
                  ? 'border-[#6C4CF1] bg-[#F4F1FF]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              I’m a Teacher
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Submit answers and view live poll results in real time
            </p>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className="w-[220px] py-3 rounded-full bg-[#6C4CF1] text-white font-semibold
                       hover:bg-[#5A3EE6] transition
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
