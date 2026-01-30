import React, { createContext, useContext, useState, useCallback } from 'react';

interface TTSContextType {
  isTTSActive: boolean;
  currentMessageId: string | null;
  setTTSActive: (active: boolean, messageId?: string) => void;
  stopTTS: () => void;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (!context) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};

interface TTSProviderProps {
  children: React.ReactNode;
}

export const TTSProvider: React.FC<TTSProviderProps> = ({ children }) => {
  const [isTTSActive, setIsTTSActive] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  const setTTSActive = useCallback((active: boolean, messageId?: string) => {
    setIsTTSActive(active);
    setCurrentMessageId(active ? (messageId || null) : null);
    console.log('🔊 TTS Context - State changed:', { active, messageId });
  }, []);

  const stopTTS = useCallback(() => {
    setIsTTSActive(false);
    setCurrentMessageId(null);
    console.log('🔇 TTS Context - Stopped');
  }, []);

  const value: TTSContextType = {
    isTTSActive,
    currentMessageId,
    setTTSActive,
    stopTTS
  };

  return (
    <TTSContext.Provider value={value}>
      {children}
    </TTSContext.Provider>
  );
};