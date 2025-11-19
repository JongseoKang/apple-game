import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { TAUNT_MESSAGES } from '../constants';
import { ChatMessagePayload } from '../types';

interface ChatWidgetProps {
  currentUser: string;
  messages: ChatMessagePayload[];
  onSendMessage: (text: string, isTaunt?: boolean) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ currentUser, messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll removed as requested
  /* 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  */

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText, false);
    setInputText('');
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col overflow-hidden h-[300px] mt-4">
      
      {/* Header */}
      <div className="bg-gray-50 p-3 border-b flex items-center gap-2 text-gray-600">
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-bold">커플 채팅방</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-4">
            농락 메시지로 대화를 시작해봐! 😈
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender === currentUser;
          return (
            <div 
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-gray-400 mb-1 px-1">
                {msg.sender}
              </div>
              <div 
                className={`
                  max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm
                  ${isMe 
                    ? 'bg-amber-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }
                  ${msg.isTaunt ? 'font-bold animate-bounce-short' : ''}
                `}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Taunt Carousel */}
      <div className="bg-white border-t border-gray-100 p-2">
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {TAUNT_MESSAGES.map((taunt, idx) => (
            <button
              key={idx}
              onClick={() => onSendMessage(taunt, true)}
              className="flex-shrink-0 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-100 hover:bg-red-100 active:scale-95 transition-all whitespace-nowrap"
            >
              {taunt}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="flex gap-2 mt-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 transition-all"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes bounce-short {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
        }
        .animate-bounce-short {
            animation: bounce-short 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};