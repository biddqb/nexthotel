import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { login as apiLogin, logout as apiLogout, me } from "./api";
import type { Role, User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const u = await me();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const ctx: AuthContextValue = {
    user,
    loading,
    async login(name, pin) {
      const u = await apiLogin(name, pin);
      setUser(u);
    },
    async logout() {
      try {
        await apiLogout();
      } finally {
        setUser(null);
      }
    },
    refresh,
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export function hasRoleAtLeast(user: User | null, role: Role): boolean {
  if (!user) return false;
  const rank: Record<Role, number> = { staff: 1, manager: 2, director: 3 };
  return rank[user.role] >= rank[role];
}
