import { dashboardRouter } from "~/server/api/routers/dashboard";
import { userManagementRouter } from "~/server/api/routers/user-management";
import { impersonationRouter } from "~/server/api/routers/impersonation";
import { patientsRouter } from "~/server/api/routers/patients";
import { therapySessionsRouter } from "~/server/api/routers/therapy-sessions";
import { chatRouter } from "~/server/api/routers/chat";
import { stepEvaluationsRouter } from "~/server/api/routers/step-evaluations";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  userManagement: userManagementRouter,
  impersonation: impersonationRouter,
  patients: patientsRouter,
  therapySessions: therapySessionsRouter,
  chat: chatRouter,
  stepEvaluations: stepEvaluationsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
