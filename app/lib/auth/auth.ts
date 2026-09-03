

import { verifyKeycloakToken } from "./keycloak-server";
export interface AuthenticatedUser {
  sub: string;
  email?: string;
  roles: string[];
}
export async function getAuthenticatedUser(request: Request):Promise<AuthenticatedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) { 
    throw new Error("Missing Authorization header");
  }

  const token = authorization.substring("Bearer ".length).trim();
   if (!token) {
    throw new Error("Missing bearer token");
  }
  const payload = await verifyKeycloakToken(token);
  const roles = payload.resource_access?.["hrms-appp"]?.roles ?? [];
  return {
     sub:payload.sub,
     email:payload.email,
     roles,
  };
}
