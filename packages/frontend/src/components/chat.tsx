"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const initialMessages = [
    {
        id: 0,
        sender: "system",
        text: "Interview session started",
        timestamp: "08:59",
    },
    {
        id: 1,
        sender: "interviewer",
        text: "Welcome! Can you tell me about yourself?",
        timestamp: "09:00",
    },
    {
        id: 2,
        sender: "candidate",
        text: "Sure, I recently graduated and have a passion for frontend development.",
        timestamp: "09:01",
    },
];

function formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
    const [input, setInput] = useState("");
    const [chat, setChat] = useState(initialMessages);
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        requestAnimationFrame(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "auto" });
        });
    }, [chat, isTyping]);

    useEffect(() => {
        if (input.length > 0) {
            setIsTyping(true);
        } else {
            setIsTyping(false);
        }
    }, [input]);

    const sendMessage = () => {
        if (!input.trim()) return;
        const newMessage = {
            id: Date.now(),
            sender: "candidate",
            text: input,
            timestamp: formatTime(new Date()),
        };
        setChat([...chat, newMessage]);
        setInput("");
        setIsTyping(false);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden box-border dark:bg-gray-900 dark:text-gray-100">
            <div className="flex justify-between items-center mb-2 w-full">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                    Interview Session
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 space-y-2 w-full pr-2 box-border scrollbar-none overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none]">
                <style>{`::-webkit-scrollbar { display: none; }`}</style>
                {chat.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full p-3 rounded-2xl shadow-md text-sm whitespace-pre-wrap break-words border relative box-border ${
                            msg.sender === "system"
                                ? "bg-yellow-100 dark:bg-yellow-800 text-center text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-600"
                                : msg.sender === "interviewer"
                                ? "bg-white dark:bg-gray-700 self-start text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                                : "bg-blue-500 text-white self-end border-blue-700"
                        }`}
                    >
                        <p>{msg.text}</p>
                        {msg.sender !== "system" && (
                            <span className="absolute bottom-1 right-3 text-xs text-gray-400 dark:text-gray-300">
                {msg.timestamp}
              </span>
                        )}
                    </motion.div>
                ))}
                {isTyping && (
                    <div className="text-sm text-gray-500 italic px-2">Jane is typing...</div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="flex gap-2 w-full box-border">
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 box-border transition-all bg-white dark:bg-gray-800 dark:text-white"
                            placeholder="Type your answer..."
                        />
                    </div>
                </div>
                <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl shadow hover:bg-blue-700 box-border"
                >
                    Send
                </button>
            </div>
        </div>
    );
}


