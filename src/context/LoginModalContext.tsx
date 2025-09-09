'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoginModalContextType {
  showLoginModal: boolean;
  setShowLoginModal: (value: boolean) => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <LoginModalContext.Provider value={{ showLoginModal, setShowLoginModal }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}