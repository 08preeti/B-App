import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("bapp_token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("bapp_user");
    return u ? JSON.parse(u) : null;
  });

  const login = (token, user) => {
    localStorage.setItem("bapp_token", token);
    localStorage.setItem("bapp_user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("bapp_token");
    localStorage.removeItem("bapp_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);