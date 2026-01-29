import { useState } from 'react';
import type { CreatePollPayload } from '../types/socket';

interface CreatePollFormProps {
    onSubmit: (payload: CreatePollPayload) => void;
}

export function CreatePollForm({ onSubmit }: CreatePollFormProps) {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState('60');
    const [customDuration, setCustomDuration] = useState('');

    const handleAddOption = () => {
        setOptions([...options, '']);
    };

    const handleRemoveOption = (index: number) => {
        if (options.length <= 2) {
            alert('At least 2 options are required');
            return;
        }
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
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

        const finalDuration = duration === 'custom' ? parseInt(customDuration, 10) : parseInt(duration, 10);

        if (isNaN(finalDuration) || finalDuration < 5 || finalDuration > 300) {
            alert('Duration must be between 5 and 300 seconds');
            return;
        }

        const payload: CreatePollPayload = {
            question: question.trim(),
            options: validOptions,
            duration: finalDuration,
        };

        onSubmit(payload);

        setQuestion('');
        setOptions(['', '']);
        setDuration('60');
        setCustomDuration('');
    };

    return (
        <>
            <div className="flex items-center justify-between mb-3 w-[75%]">
                <label className="text-sm font-semibold text-gray-800">
                    Enter your question
                </label>

                <div className="relative flex items-center gap-2">
                    <select
                        value={duration}
                        onChange={(e) => {
                            setDuration(e.target.value);
                            if (e.target.value !== 'custom') {
                                setCustomDuration('');
                            }
                        }}
                        className="
                appearance-none
                bg-[#F3F3F3]
                border
                border-gray-200
                shadow-sm
                text-sm
                font-medium
                text-gray-800
                px-3
                py-1
                pr-8
                rounded-sm
                focus:outline-none
                cursor-pointer
            "
                    >
                        {[10, 20, 30, 45, 60].map((sec) => (
                            <option key={sec} value={sec}>
                                {sec} seconds
                            </option>
                        ))}
                        <option value="custom">Custom</option>
                    </select>

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 text-xs">
                        ▼
                    </span>

                    {duration === 'custom' && (
                        <input
                            type="number"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                            placeholder="5-300 sec"
                            min="5"
                            max="300"
                            className="
                    bg-[#F3F3F3]
                    border
                    border-gray-200
                    shadow-sm
                    text-sm
                    font-medium
                    text-gray-800
                    px-3
                    py-1
                    rounded-sm
                    focus:outline-none
                    w-28
                "
                        />
                    )}
                </div>
            </div>
            <div className="relative w-[75%]">
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    maxLength={100}
                    placeholder="Ask questions like 'What is the capital of India?'"
                    rows={4}
                    className="
            w-full
            bg-[#F3F3F3]
            rounded-sm
            px-4
            py-4
            text-sm
            resize-none
            focus:outline-none
        "
                />

                <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
                    {question.length}/100
                </span>
            </div>



            <div className="w-[75%]">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">
                    Edit Options
                </h3>

                <div className="space-y-4">
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <div className="w-6 h-6 rounded-full bg-[#6C4CF1] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
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

                            {options.length > 2 && (
                                <button
                                    onClick={() => handleRemoveOption(index)}
                                    className="text-gray-400 hover:text-red-500 text-lg font-bold flex-shrink-0"
                                    title="Remove option"
                                >
                                    ×
                                </button>
                            )}
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
