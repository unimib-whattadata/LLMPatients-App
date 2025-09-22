/** @type {import('drizzle-kit').Config} */
export default {
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./dev.db",
  },
};
