export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ACTIVITY_TYPES = [
  "login",
  "dashboard_view",
  "profile_update",
  "simulation",
  "role_update",
] as const;
export type UserActivityType = (typeof USER_ACTIVITY_TYPES)[number];

export const MAX_THERAPY_SESSION_NUMBER = 11;
