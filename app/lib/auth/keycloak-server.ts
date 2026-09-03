import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

const KEYCLOAK_ISSUER = process.env.KEYCLOAK_ISSUER!;
if (!KEYCLOAK_ISSUER) {
  throw new Error("KEYCLOAK_ISSUER is not configured");
}
const KEYCLOAK_JWKS = createRemoteJWKSet(
  new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`),
);

export interface KeycloakClaims extends JWTPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  resource_access?: {
    [clientId: string]: {
      roles?: string[];
    };
  };
}

export async function verifyKeycloakToken(
  token: string,
): Promise<KeycloakClaims> {
  const { payload } = await jwtVerify(token, KEYCLOAK_JWKS, {
    issuer: KEYCLOAK_ISSUER,
  });
  if (!payload.sub) {
    throw new Error("Token does not contain subject");
  }
  return payload as KeycloakClaims;
}
