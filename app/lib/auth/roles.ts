// Keep UI controls and API permissions aligned with the roles issued by Keycloak.
export function hasHRRole(roles: readonly string[]) {
  return roles.some((role) =>
    ["hr", "hr_admin", "hradmin", "admin", "system_admin"].includes(role.toLowerCase()),
  );
}

export function hasManagerRole(roles: readonly string[]) {
  return roles.some((role) => ["manager", "super_manager"].includes(role.toLowerCase()));
}

export function hasAdminRole(roles: readonly string[]) {
  return roles.some((role) => ["admin", "system_admin"].includes(role.toLowerCase()));
}
