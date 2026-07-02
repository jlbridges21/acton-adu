/**
 * Profile roles (stored in Supabase `profiles.role`).
 *
 * - user: signed in but cannot view floorplans (default for new accounts)
 * - acton: can browse, filter, export PDFs
 * - admin: full access including upload and edit
 *
 * Grant access in Supabase SQL:
 *   update public.profiles set role = 'acton' where email = 'rep@acton.com';
 *   update public.profiles set role = 'admin' where email = 'admin@acton.com';
 */

export const ROLES = {
  USER: "user",
  ACTON: "acton",
  ADMIN: "admin",
};

export function canViewFloorplans(role) {
  return role === ROLES.ACTON || role === ROLES.ADMIN;
}

export function canManageFloorplans(role) {
  return role === ROLES.ADMIN;
}
