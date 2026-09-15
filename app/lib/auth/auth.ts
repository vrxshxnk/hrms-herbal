

import { verifyKeycloakToken } from "./keycloak-server";

export interface AuthenticatedUser {
  sub: string;
  email?: string;
  roles: string[];
}

// Interface for Keycloak JWT structure
export interface KeycloakJWTPayload {
  sub: string;
  email?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) { 
    throw new Error("Missing Authorization header");
  }

  const token = authorization.substring("Bearer ".length).trim();
  if (!token) {
    throw new Error("Missing bearer token");
  }

  // Cast payload to your defined payload type
  const payload = (await verifyKeycloakToken(token)) as KeycloakJWTPayload;
  console.log("payload yeh h :", payload);

  const realmRoles = payload.realm_access?.roles ?? [];
  const clientRoles = payload.resource_access?.["hrms-app"]?.roles ?? [];

  const roles = Array.from(new Set([...realmRoles, ...clientRoles]));

  return {
    sub: payload.sub,
    email: payload.email,
    roles,
  };
}