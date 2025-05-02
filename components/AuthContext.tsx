"use client";

import React, { createContext, useContext } from "react";
// Commenting out authentication logic to directly expose the web app
// import { auth, googleProvider } from "../lib/utils";
// import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";

interface AuthContextType {
  user: null; // Temporarily set user to null
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const user = null; // Temporarily set user to null
  const loading = false; // Disable loading state

  const signInWithGoogle = async () => {
    console.warn("Authentication is disabled.");
  };

  const logOut = async () => {
    console.warn("Authentication is disabled.");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};