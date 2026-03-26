import React, { createContext, useContext, useState, useCallback } from 'react';

interface GuestContextType {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  promptLogin: () => void;
  showLoginPrompt: boolean;
  dismissLoginPrompt: () => void;
}

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  setIsGuest: () => {},
  promptLogin: () => {},
  showLoginPrompt: false,
  dismissLoginPrompt: () => {},
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

  return (
    <GuestContext.Provider value={{ isGuest, setIsGuest, promptLogin, showLoginPrompt, dismissLoginPrompt }}>
      {children}
    </GuestContext.Provider>
  );
};

export default GuestContext;
