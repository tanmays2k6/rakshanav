import React, { createContext, useContext, useState } from 'react';

const AIContext = createContext();

export function AIProvider({ children }) {
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', text: "Hello Tanmay! I'm your Gemini-powered Safety Assistant. How can I help you navigate safely today?" }
  ]);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), ...msg }]);
  };

  const updateLastMessage = (text) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'ai') {
        newMessages[newMessages.length - 1].text = text;
      }
      return newMessages;
    });
  };

  const clearHistory = () => {
    setMessages([{ id: 1, role: 'ai', text: "Hello again! How can I assist you today?" }]);
  };

  return (
    <AIContext.Provider value={{ messages, addMessage, updateLastMessage, clearHistory }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  return useContext(AIContext);
}
