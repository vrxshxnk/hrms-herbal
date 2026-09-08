

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "https://auth.threemonkeys.in";
const REALM = process.env.KEYCLOAK_REALM || "hrms-herbal-realm";
const CLIENT_ID = process.env.KEYCLOAK_ADMIN_CLIENT_ID || "hrms-backend-service";
const CLIENT_SECRET = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || "";



async function getAdminToken(): Promise<string> {
  const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;
  
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to obtain Keycloak Admin Token: ${error}`);
  }

  const data = await res.json();
  return data.access_token;
}

interface CreateKeycloakUserParams {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName?: string;
}


export async function createKeycloakUser(params: CreateKeycloakUserParams): Promise<string> {
  const token = await getAdminToken();
  const createUserUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/users`;

  const res = await fetch(createUserUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: params.username || params.email,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      enabled: true,
      emailVerified: false,
      requiredActions: ["UPDATE_PASSWORD", "VERIFY_EMAIL"],
    }),
  });

  if (res.status === 409) {
    throw new Error("USER_EXISTS: A user with this email/username already exists in Keycloak.");
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Keycloak user creation failed: ${errText}`);
  }
  const locationHeader = res.headers.get("Location");
  if (!locationHeader) {
    throw new Error("Keycloak did not return a Location header for the created user.");
  }

  const keycloakId = locationHeader.split("/").pop()!;
  if (params.roleName) {
    await assignRoleToUser(token, keycloakId, params.roleName);
  }

  return keycloakId;
}


async function assignRoleToUser(token: string, userId: string, roleName: string) {

  const roleUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${roleName}`;
  const roleRes = await fetch(roleUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!roleRes.ok) return; 
  const roleData = await roleRes.json();
  const mappingUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`;
  await fetch(mappingUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([roleData]),
  });
}


export async function deleteKeycloakUser(userId: string): Promise<void> {
  try {
    const token = await getAdminToken();
    const deleteUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}`;
    await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error(`CRITICAL: Failed to rollback Keycloak user ${userId}:`, err);
  }
}