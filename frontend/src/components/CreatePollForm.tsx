import { useState } from 'react';
import type { CreatePollPayload } from '../types/socket';

interface CreatePollFormProps {
    onSubmit: (payload: CreatePollPayload) => void;
}

export function CreatePollForm({ onSubmit }: CreatePollFormProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState('60');
    const [correctAnswer, setCorrectAnswer] = useState<number>(0);

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleCreatePoll = () => {
        if (!question.trim()) {
            alert('Please enter a question');
            return;
        }

        const validOptions = options.filter((opt) => opt.trim());
        if (validOptions.length < 2) {
            alert('Please provide at least 2 options');
            return;
        }

        const payload: CreatePollPayload = {
            question: question.trim(),
            options: validOptions,
            duration: parseInt(duration, 10),
        };

        onSubmit(payload);

        setQuestion('');
        setOptions(['', '']);
        setDuration('60');
        setCorrectAnswer(0);
    };

    return (
        <>
            <div className="mb-10">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-800">
                        Enter your question
                    </label>

                    <div className="relative inline-block">
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="
                appearance-none
                bg-gray-100
                text-sm
                font-medium
                text-gray-800
                px-4
                py-1.5
                pr-8
                rounded-md
                focus:outline-none
                cursor-pointer
                "
                        >
                            {[10, 20, 30, 45, 60].map((sec) => (
                                <option key={sec} value={sec}>
                                    {sec} seconds
                                </option>
                            ))}
                        </select>

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 text-xs">
                            ▼
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        maxLength={100}
                        placeholder="Ask questions like 'What is the capital of India?'"
                        rows={4}
                        className="w-full bg-gray-100 rounded-sm p-4 text-sm resize-none focus:outline-none"
                    />

                    <span className="absolute bottom-2 right-3 text-xs text-gray-400">
                        {question.length}/100
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-16">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                        Edit Options
                    </h3>

                    <div className="space-y-4">
                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#6C4CF1] text-white flex items-center justify-center text-xs font-semibold">
                                    {index + 1}
                                </div>

                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) =>
                                        handleOptionChange(index, e.target.value)
                                    }
                                    placeholder="Add option..."
                                    className="flex-1 bg-gray-100 px-4 py-2 rounded-sm text-sm focus:outline-none"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleAddOption}
                        className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#6C4CF1] border border-[#6C4CF1] rounded-md hover:bg-purple-50"
                    >
                        + Add More option
                    </button>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">
                        Is it Correct?
                    </h3>

                    <div className="space-y-5">
                        {options.map((_, index) => (
                            <div key={index} className="flex items-center gap-6">
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input
                                        type="radio"
                                        name="correct"
                                        checked={correctAnswer === index}
                                        onChange={() => setCorrectAnswer(index)}
                                    />
                                    Yes
                                </label>

                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="radio" disabled />
                                    No
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-8 right-10">
                <button
                    onClick={handleCreatePoll}
                    className="px-8 py-3 bg-[#6C4CF1] text-white rounded-full text-sm font-semibold hover:bg-[#5A3EE6]"
                >
                    Ask Question
                </button>
            </div>
        </>
    );
}
