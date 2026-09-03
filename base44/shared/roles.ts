// Role and authorization helpers shared across functions.

export const STAFF_ROLES = ["staff", "admin", "owner"];
export const ADMIN_ROLES = ["admin", "owner"];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function isAdmin(role) {
  return ADMIN_ROLES.includes(role);
}

export function isOwner(role) {
  return role === "owner";
}

export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}