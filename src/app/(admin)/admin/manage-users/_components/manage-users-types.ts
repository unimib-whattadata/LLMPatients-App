import { z } from "zod";
import type { inferRouterInputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt?: Date | null;
}

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must contain at least 6 characters"),
  role: z.enum(["admin", "user"]),
});

export const editUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
});

type RouterInputs = inferRouterInputs<AppRouter>;

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type EditUserValues = z.infer<typeof editUserSchema>;
export type CreateUserInput = RouterInputs["userManagement"]["createUser"];

export interface UserStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
}
