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
import keycloak from "../lib/keycloak";

interface AuthContextType {
  authenticated: boolean;
  token: string | null;
  user: any;
  dbUser: any;
  roles: string[];
  loading: boolean;
  login: () => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
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
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  // Helper to ensure 'employee' role exists if neither manager nor hr are assigned
  const normalizeRoles = (rawRoles: string[]): string[] => {
    const list = Array.from(new Set(rawRoles));
    const hasElevatedRole = list.some((r) =>
      ["manager", "hr", "admin"].includes(r.toLowerCase())
    );

    if (!hasElevatedRole && !list.includes("employee")) {
      list.push("employee");
    }
    return list;
  };

  const syncWithDatabase = async () => {
    try {
      if (!keycloak.token) return;

      const res = await fetch("/api/v1/auth/sync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
      });
      const json = await res.json();
      if (res.ok && json.data?.employee) {
        setDbUser(json.data.employee);
      } else if (res.ok && json.employee) {
        setDbUser(json.employee);
      }
    } catch (error) {
      console.error("Failed to sync employee with database:", error);
    }
  };

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

          const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
          const clientRoles =
            keycloak.tokenParsed?.resource_access?.["hrms-app"]?.roles ?? [];

          const processedRoles = normalizeRoles([...realmRoles, ...clientRoles]);
          setRoles(processedRoles);

          await syncWithDatabase();

          if (pathname === "/login") {
            router.replace("/");
          }

          if (intervalRef.current) clearInterval(intervalRef.current);

          intervalRef.current = setInterval(() => {
            keycloak
              .updateToken(30)
              .then(async (refreshed: boolean) => {
                if (refreshed && keycloak.token) {
                  setToken(keycloak.token);
                  setUser(keycloak.tokenParsed || null);

                  const updatedRealmRoles =
                    keycloak.tokenParsed?.realm_access?.roles ?? [];
                  const updatedClientRoles =
                    keycloak.tokenParsed?.resource_access?.["hrms-app"]
                      ?.roles ?? [];

                  setRoles(
                    normalizeRoles([...updatedRealmRoles, ...updatedClientRoles])
                  );

                  await syncWithDatabase();
                }
              })
              .catch(() => {
                keycloak.logout({
                  redirectUri: `${window.location.origin}/login`,
                });
              });
          }, 10000);
        } else {
          setToken(null);
          setUser(null);
          setDbUser(null);
          setRoles([]);

          if (pathname !== "/login") {
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Keycloak init failed", error);
        setAuthenticated(false);
        setToken(null);
        setUser(null);
        setDbUser(null);
        setRoles([]);
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

  const hasRole = (role: string) => {
    if (roles.includes(role)) return true;
    if (dbUser?.system_role === role) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F0]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#BCE061] rounded-xl flex items-center justify-center font-bold text-slate-800 text-xl animate-pulse">
            H
          </div>
          <p className="text-gray-500 font-medium">
            Initializing secure workspace...
          </p>
        </div>
      </div>
    );
  }

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
        dbUser,
        roles,
        loading,
        login,
        logout,
        hasRole,
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