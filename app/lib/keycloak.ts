import Keycloak from "keycloak-js";

const keycloak =
  typeof window !== "undefined"
    ? new Keycloak({
        url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://auth.threemonkeys.in",
        realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "hrms-herbal-realm",
        clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "hrms-app",
      })
    : ({} as Keycloak);

export default keycloak;