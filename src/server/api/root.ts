import { dashboardRouter } from "~/server/api/routers/dashboard";
import { userManagementRouter } from "~/server/api/routers/user-management";
import { impersonationRouter } from "~/server/api/routers/impersonation";
import { patientsRouter } from "~/server/api/routers/patients";
import { therapySessionsRouter } from "~/server/api/routers/therapy-sessions";
import { chatRouter } from "~/server/api/routers/chat";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter, // Add dashboard router for role-based dashboard functionality
  userManagement: userManagementRouter, // Add user management router for admin operations
  impersonation: impersonationRouter, // Add impersonation router for admin user impersonation
  patients: patientsRouter, // Add patients router for patient exploration functionality
  therapySessions: therapySessionsRouter,
  chat: chatRouter, // Add chat router for chat functionality
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
