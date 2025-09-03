import React, { createContext } from 'react';
export const authDataContext = createContext();

function AuthContext({ children }) {
  // Use Vite env variable, fallback to localhost
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";
  let value = { serverUrl };
  return (
    <authDataContext.Provider value={value}>
      {children}
    </authDataContext.Provider>
  );
}

export default AuthContext;
