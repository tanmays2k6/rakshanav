import { useState, useCallback, useRef } from 'react';
import { useAIContext } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';

export function useGeminiChat() {
  const { messages, addMessage, updateLastMessage } = useAIContext();
  const { profile } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef(null);

  const fallbackEngine = (text) => {
    const t = text.toLowerCase();
    if (t.includes('help') || t.includes('emergency') || t.includes('sos')) {
      return "I've detected an emergency keyword. I am navigating you to the Emergency Dashboard immediately. <action type=\"navigate\" target=\"/dashboard/emergency\" />";
    }
    if (t.includes('report') || t.includes('hazard') || t.includes('pothole')) {
      return "Sure, I can help you report a hazard. Let me open the Report Hazard tool for you. <action type=\"navigate\" target=\"/dashboard/report\" />";
    }
    if (t.includes('route') || t.includes('navigate') || t.includes('direction')) {
      return "I can help with navigation. Let me open the Safe Route Engine for you. <action type=\"navigate\" target=\"/dashboard/navigation\" />";
    }
    if (t.includes('live') || t.includes('track') || t.includes('share')) {
      return "Let's share your live location. Opening Live Tracking. <action type=\"navigate\" target=\"/dashboard/live\" />";
    }
    return "I'm currently operating in Offline Fallback Mode. I can still help you navigate to features like Emergency SOS, Route Planning, or Hazard Reporting. Just ask!";
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    addMessage({ role: 'user', text });
    setIsTyping(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const aiMessageId = Date.now();
    addMessage({ id: aiMessageId, role: 'ai', text: '' });

    try {
      // Mock fast GPS
      const loc = { lat: 12.9716, lng: 77.5946 }; // Default BLR

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          message: text,
          history: messages,
          context: {
            location: loc,
            profile: profile
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setIsTyping(false);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let aiText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                aiText += data.text;
                updateLastMessage(aiText);
              } else if (data.error) {
                console.error("Stream Error:", data.error);
                throw new Error("Stream error from backend");
              }
            } catch (e) {
               // wait for next buffer
            }
          }
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Chat error, using fallback:', error);
      setIsTyping(false);
      const fallbackMsg = fallbackEngine(text);
      updateLastMessage(fallbackMsg);
    } finally {
      abortControllerRef.current = null;
    }

  }, [messages, addMessage, updateLastMessage, profile]);

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
    }
  };

  return { messages, isTyping, sendMessage, stopGeneration };
}