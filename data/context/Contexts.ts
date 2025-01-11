// data/context/Contexts.ts
import { createContext } from 'react';

export type AuthContextType = {
  isFirstAuthContextInit: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  hasProfile: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  isFirstAuthContextInit: false,
  isLoggedIn: false,
  isAdmin: false,
  hasProfile: false
});
