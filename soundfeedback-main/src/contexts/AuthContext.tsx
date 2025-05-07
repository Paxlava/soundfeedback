import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

interface User {
  uid: string;
  email?: string;
  emailVerified: boolean;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthContextType>({
    user: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthState({
          user: {
            uid: user.uid,
            email: user.email || "",
            emailVerified: user.emailVerified,
            username: user.displayName || "",
          },
          error: null,
        });
      } else {
        setAuthState({
          user: null,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
