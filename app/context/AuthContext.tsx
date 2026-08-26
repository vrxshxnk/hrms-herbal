"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import keycloak from "../lib/keycloak";// Make sure this path is correct

interface AuthContextType {
  authenticated: boolean;
  token: string | null;
  user: any;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const initialized = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const [authenticated, setAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initKeycloak = async () => {
      if (initialized.current) return;
      initialized.current = true;

      try {
        const auth = await keycloak.init({
          onLoad: "check-sso",
          pkceMethod: "S256",
        });

        setAuthenticated(auth);

        if (auth && keycloak.token) {
          setToken(keycloak.token);
          setUser(keycloak.tokenParsed || null);
          document.cookie = `kc_token=${keycloak.token}; path=/; SameSite=Lax; Max-Age=3600`;

          // If user goes to /login while authenticated, push them to dashboard
          if (pathname === "/login") {
            router.replace("/");
          }

          if (intervalRef.current) clearInterval(intervalRef.current);

          // Refresh token logic
          intervalRef.current = setInterval(() => {
            keycloak
              .updateToken(30)
              .then((refreshed: boolean) => {
                if (refreshed && keycloak.token) {
                  setToken(keycloak.token);
                  document.cookie = `kc_token=${keycloak.token}; path=/; SameSite=Lax; Max-Age=3600`;
                }
              })
              .catch(() => {
                keycloak.logout({
                  redirectUri: `${window.location.origin}/login`,
                });
              });
          }, 10000);
        } else {
          // Not authenticated
          setToken(null);
          setUser(null);
          document.cookie = "kc_token=; path=/; Max-Age=0";

          if (pathname !== "/login") {
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Keycloak init failed", error);
        setAuthenticated(false);
        setToken(null);
        setUser(null);

        if (pathname !== "/login") {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    initKeycloak();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pathname, router]);

  const login = () => keycloak.login();

  const logout = () =>
    keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    });

  // Global Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0]">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 bg-[#BCE061] rounded-xl flex items-center justify-center font-bold text-slate-800 text-xl animate-pulse">
            H
          </div>
          <p className="text-gray-500 font-medium">Initializing secure workspace...</p>
        </div>
      </div>
    );
  }

  // Prevent flashing protected content before redirect
  if (!authenticated && pathname !== "/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0] text-gray-600 font-medium">
        Redirecting to login...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        token,
        user,
        loading,
        login,
        logout,
      }}
    >
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