import React, { createContext, useContext, useState, useCallback } from 'react';

interface GuestContextType {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  promptLogin: () => void;
  showLoginPrompt: boolean;
  dismissLoginPrompt: () => void;
  exitGuestMode: () => void;
}

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  setIsGuest: () => {},
  promptLogin: () => {},
  showLoginPrompt: false,
  dismissLoginPrompt: () => {},
  exitGuestMode: () => {},
});

export const useGuest = () => useContext(GuestContext);

export const GuestProvider: React.FC<{ children: React.ReactNode; initialIsGuest?: boolean }> = ({ children, initialIsGuest = false }) => {
  const [isGuest, setIsGuest] = useState(initialIsGuest);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const promptLogin = useCallback(() => {
    setShowLoginPrompt(true);
  }, []);

  const dismissLoginPrompt = useCallback(() => {
    setShowLoginPrompt(false);
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
  }, []);

  return (
    <GuestContext.Provider value={{ isGuest, setIsGuest, promptLogin, showLoginPrompt, dismissLoginPrompt, exitGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
};

export default GuestContext;
