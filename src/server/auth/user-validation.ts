import { eq } from "drizzle-orm";

import type { UserRole } from "~/server/db/contracts";
import { db } from "~/server/db";
import { users } from "~/server/db/tables";

type UserQueryRow = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  image: string | null;
  isActive: boolean;
};

type UserCredentialsQueryRow = UserQueryRow & {
  password: string | null;
};

type ValidatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  image: string | null;
  isActive: boolean;
};

export type CredentialsValidatedUser = ValidatedUser & {
  passwordHash: string | null;
};

export interface UserValidationResult {
  isValid: boolean;
  user?: ValidatedUser;
  error?: string;
}

export interface UserCredentialsValidationResult {
  isValid: boolean;
  user?: CredentialsValidatedUser;
  error?: string;
}

export interface DatabaseValidationOptions {
  timeout?: number;
  retries?: number;
  skipCache?: boolean;
}

function mapValidatedUser(user: UserQueryRow): ValidatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role ?? "user") as UserRole,
    image: user.image,
    isActive: user.isActive,
  };
}

function mapCredentialsValidatedUser(
  user: UserCredentialsQueryRow,
): CredentialsValidatedUser {
  return {
    ...mapValidatedUser(user),
    passwordHash: user.password,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Database query timeout")),
          timeout,
        );
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchValidatedUser(
  where: ReturnType<typeof eq>,
  timeout: number,
): Promise<ValidatedUser | null> {
  const userResults = (await withTimeout(
    (db as any)
      .select({
        id: (users as any).id,
        email: (users as any).email,
        name: (users as any).name,
        role: (users as any).role,
        image: (users as any).image,
        isActive: (users as any).isActive,
      })
      .from(users)
      .where(where)
      .limit(1),
    timeout,
  )) as UserQueryRow[];

  const user = userResults[0];
  return user ? mapValidatedUser(user) : null;
}

async function fetchValidatedCredentialsUser(
  email: string,
  timeout: number,
): Promise<CredentialsValidatedUser | null> {
  const userResults = (await withTimeout(
    (db as any)
      .select({
        id: (users as any).id,
        email: (users as any).email,
        name: (users as any).name,
        role: (users as any).role,
        image: (users as any).image,
        isActive: (users as any).isActive,
        password: (users as any).password,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1),
    timeout,
  )) as UserCredentialsQueryRow[];

  const user = userResults[0];
  return user ? mapCredentialsValidatedUser(user) : null;
}

async function runValidation<T>(
  fetcher: () => Promise<T | null>,
  retries: number,
  missingError: string,
): Promise<{ isValid: boolean; user?: T; error?: string }> {
  let lastError: Error | null = null;
  const totalAttempts = Math.max(1, retries + 1);

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const user = await fetcher();

      if (!user) {
        return {
          isValid: false,
          error: missingError,
        };
      }

      return {
        isValid: true,
        user,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === totalAttempts) {
        break;
      }

      const delay = Math.min(250 * Math.pow(2, attempt - 1), 1000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    isValid: false,
    error: `Database validation failed: ${lastError?.message ?? "Unknown error"}`,
  };
}

export async function validateUserById(
  userId: string,
  options: DatabaseValidationOptions = {},
): Promise<UserValidationResult> {
  const { timeout = 5000, retries = 0 } = options;

  if (!userId) {
    return {
      isValid: false,
      error: "User ID is required for validation",
    };
  }

  return runValidation(
    () => fetchValidatedUser(eq(users.id, userId), timeout),
    retries,
    "User not found in database",
  );
}

export async function validateUserByEmail(
  email: string,
  options: DatabaseValidationOptions = {},
): Promise<UserValidationResult> {
  const { timeout = 5000, retries = 0 } = options;

  if (!email) {
    return {
      isValid: false,
      error: "Email is required for validation",
    };
  }

  return runValidation(
    () => fetchValidatedUser(eq(users.email, email), timeout),
    retries,
    "User not found in database",
  );
}

export async function validateUserByEmailForAuth(
  email: string,
  options: DatabaseValidationOptions = {},
): Promise<UserCredentialsValidationResult> {
  const { timeout = 5000, retries = 0 } = options;

  if (!email) {
    return {
      isValid: false,
      error: "Email is required for validation",
    };
  }

  return runValidation(
    () => fetchValidatedCredentialsUser(email, timeout),
    retries,
    "User not found in database",
  );
}

export async function checkUserRoleChange(
  userId: string,
  currentRole: string,
  options: DatabaseValidationOptions = {},
): Promise<{
  hasChanged: boolean;
  newRole?: string;
  error?: string;
}> {
  const validation = await validateUserById(userId, options);

  if (!validation.isValid || !validation.user) {
    return {
      hasChanged: false,
      error: validation.error ?? "User validation failed",
    };
  }

  const dbRole = validation.user.role;
  const hasChanged = dbRole !== currentRole;

  return {
    hasChanged,
    newRole: hasChanged ? dbRole : undefined,
  };
}

export async function validateUserAccountStatus(
  userId: string,
  options: DatabaseValidationOptions = {},
): Promise<{
  isActive: boolean;
  status?: string;
  error?: string;
}> {
  const validation = await validateUserById(userId, options);

  if (!validation.isValid || !validation.user) {
    return {
      isActive: false,
      error: validation.error ?? "User validation failed",
    };
  }

  return {
    isActive: validation.user.isActive,
    status: validation.user.isActive ? "active" : "inactive",
    error: validation.user.isActive ? undefined : "User account is inactive",
  };
}

export async function comprehensiveUserValidation(
  userId: string,
  expectedRole?: string,
  options: DatabaseValidationOptions = {},
): Promise<{
  isValid: boolean;
  user?: UserValidationResult["user"];
  roleChanged: boolean;
  accountActive: boolean;
  errors: string[];
}> {
  const validation = await validateUserById(userId, options);
  const errors: string[] = [];

  if (!validation.isValid || !validation.user) {
    return {
      isValid: false,
      roleChanged: false,
      accountActive: false,
      errors: [validation.error ?? "User validation failed"],
    };
  }

  const user = validation.user;
  const roleChanged = expectedRole ? user.role !== expectedRole : false;
  const accountActive = user.isActive;

  if (!accountActive) {
    errors.push("User account is inactive");
  }

  return {
    isValid: accountActive,
    user,
    roleChanged,
    accountActive,
    errors,
  };
}

export function createValidationConfig(
  overrides: Partial<DatabaseValidationOptions> = {},
): DatabaseValidationOptions {
  const isDevelopment = process.env.NODE_ENV === "development";

  return {
    timeout: isDevelopment ? 7000 : 3000,
    retries: isDevelopment ? 1 : 0,
    skipCache: false,
    ...overrides,
  };
}
