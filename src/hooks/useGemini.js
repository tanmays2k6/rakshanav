import { useState, useCallback, useRef } from 'react';
import { useAIContext } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';

export function useGeminiChat() {
  const { messages, addMessage, updateLastMessage } = useAIContext();
  const { profile } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const [lastError, setLastError] = useState(null);
  const abortControllerRef = useRef(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setLastError(null);
    addMessage({ role: 'user', text });
    setIsTyping(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const aiMessageId = Date.now();
    addMessage({ id: aiMessageId, role: 'ai', text: '' });

    try {
      let loc = { lat: 12.9716, lng: 77.5946 }; // Default BLR
      if (navigator.geolocation) {
         try {
           const pos = await new Promise((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
           });
           loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         } catch(e) {
           console.warn("Could not fetch GPS for AI context. Using default location.");
         }
      }

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
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
                throw new Error(data.error);
              }
            } catch (e) {
               if (e.message !== 'Unexpected end of JSON input') {
                 // buffer partial chunks
               }
            }
          }
        }
      }
      
      if (!aiText) {
          throw new Error("Empty response received from Gemini Safety Assistant.");
      }

    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Chat API Error:', error);
      setIsTyping(false);
      const errMsg = "Gemini Safety Assistant is temporarily unavailable.";
      setLastError(error.message || errMsg);
      updateLastMessage(errMsg);
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

  return { messages, isTyping, lastError, sendMessage, stopGeneration };
}