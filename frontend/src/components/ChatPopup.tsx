import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import type { Socket } from 'socket.io-client';

interface Message {
    senderName: string;
    senderRole: string;
    content: string;
    timestamp: number;
}

interface Participant {
    socketId: string;
    name: string;
}

interface ChatPopupProps {
    socket: Socket;
    senderName: string;
    isTeacher: boolean;
}

export function ChatPopup({ socket, senderName, isTeacher }: ChatPopupProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleReceiveMessage = (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        };

        const handleParticipantsUpdate = (list: Participant[]) => {
            setParticipants(list);
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('participants_update', handleParticipantsUpdate);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('participants_update', handleParticipantsUpdate);
        };
    }, [socket]);

    useEffect(() => {
        if (isOpen && isTeacher) {
            socket.emit('get_participants');
        }
    }, [isOpen, socket, isTeacher]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!inputMessage.trim()) return;
        socket.emit('send_message', { content: inputMessage.trim() });
        setInputMessage('');
    };

    const handleKick = (studentSocketId: string) => {
        socket.emit('kick_student', { studentSocketId });
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed bottom-24 right-8 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col"
                    style={{ height: '400px' }}
                >
                    {/* Header with tabs */}
                    <div className="flex items-center border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'chat'
                                ? 'text-[#6C4CF1] border-b-2 border-[#6C4CF1]'
                                : 'text-gray-500'
                                }`}
                        >
                            Chat
                        </button>
                        {isTeacher && (
                            <button
                                onClick={() => {
                                    setActiveTab('participants');
                                    socket.emit('get_participants');
                                }}
                                className={`flex-1 py-3 text-sm font-medium transition ${activeTab === 'participants'
                                    ? 'text-[#6C4CF1] border-b-2 border-[#6C4CF1]'
                                    : 'text-gray-500'
                                    }`}
                            >
                                Participants
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    {activeTab === 'chat' ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {messages.length === 0 && (
                                    <p className="text-center text-gray-400 text-xs mt-4">
                                        No messages yet
                                    </p>
                                )}
                                {messages.map((msg, idx) => {
                                    const isOwn = msg.senderName === senderName;
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                                        >
                                            <span className="text-[10px] text-gray-400 mb-0.5">
                                                {msg.senderName}
                                            </span>
                                            <div
                                                className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${isOwn
                                                    ? 'bg-[#6C4CF1] text-white'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3 border-t border-gray-200">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type a message..."
                                        className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-md focus:outline-none"
                                        maxLength={500}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!inputMessage.trim()}
                                        className="px-3 py-2 bg-[#6C4CF1] text-white rounded-md disabled:opacity-50 hover:bg-[#5A3EE6] transition"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-3">
                            {participants.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm mt-4">
                                    No students connected
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {participants.map((p) => (
                                        <div
                                            key={p.socketId}
                                            className="flex items-center justify-between py-2.5 px-1 border-b border-gray-100"
                                        >
                                            <span className="text-sm text-gray-800">
                                                {p.name}
                                            </span>
                                            <button
                                                onClick={() => handleKick(p.socketId)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Kick out
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Floating chat button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-[#6C4CF1] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#5A3EE6] transition z-50"
            >
                <MessageCircle size={24} />
            </button>
        </>
    );
}
