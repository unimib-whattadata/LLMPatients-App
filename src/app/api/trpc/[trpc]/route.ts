import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { createLogger } from "~/lib/logger";

const logger = createLogger("tRPC");

const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      logger.error(`Failed on ${path ?? "<no-path>"}`, {
        path,
        error: error.message,
        stack: error.stack,
        environment: env.NODE_ENV,
      });
    },
  });

export { handler as GET, handler as POST };
