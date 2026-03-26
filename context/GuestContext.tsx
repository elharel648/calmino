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

interface GuestProviderProps {
  children: React.ReactNode;
  initialIsGuest?: boolean;
  onExitGuest?: () => void;
}

export const GuestProvider: React.FC<GuestProviderProps> = ({ children, initialIsGuest = false, onExitGuest }) => {
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
    onExitGuest?.();
  }, [onExitGuest]);

  return (
    <GuestContext.Provider value={{ isGuest, setIsGuest, promptLogin, showLoginPrompt, dismissLoginPrompt, exitGuestMode }}>
      {children}
    </GuestContext.Provider>
  );
};

export default GuestContext;
