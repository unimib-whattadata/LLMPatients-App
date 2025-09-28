import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

const isDevelopment = process.env.NODE_ENV === "development";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid persisting stale data in development for faster feedback loops
        staleTime: isDevelopment ? 0 : 30 * 1000,
        ...(isDevelopment ? { refetchOnWindowFocus: true } : {}),
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
