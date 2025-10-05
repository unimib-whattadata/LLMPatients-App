import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { users } from "~/server/db/tables";


export interface UserValidationResult {
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    image: string | null;
  };
  error?: string;
}

export interface DatabaseValidationOptions {
  timeout?: number; 
  retries?: number; 
  skipCache?: boolean; 
}

export async function validateUserById(
  userId: string,
  options: DatabaseValidationOptions = {},
): Promise<UserValidationResult> {
  const { timeout = 5000, retries = 3 } = options;

  if (!userId) {
    return {
      isValid: false,
      error: "User ID is required for validation",
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `User validation attempt ${attempt}/${retries} for user ID: ${userId}`,
      );

      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Database query timeout")), timeout);
      });

      const queryPromise = (db as any)
        .select({
          id: (users as any).id,
          email: (users as any).email,
          name: (users as any).name,
          role: (users as any).role,
          image: (users as any).image,
        })
        .from(users)
        .where(eq((users as any).id, userId))
        .limit(1);

      const userResults = await Promise.race([queryPromise, timeoutPromise]);

      if (userResults.length === 0) {
        console.warn(`User validation failed: User not found for ID ${userId}`);
        return {
          isValid: false,
          error: "User not found in database",
        };
      }

      const user = userResults[0]!;
      console.log(`User validation successful for ID ${userId}:`, {
        email: user.email,
        role: user.role,
      });

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? "user",
          image: user.image,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `User validation attempt ${attempt}/${retries} failed:`,
        lastError.message,
      );

      
      if (attempt === retries) {
        break;
      }

      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `User validation failed after ${retries} attempts:`,
    lastError?.message,
  );
  return {
    isValid: false,
    error: `Database validation failed: ${lastError?.message ?? "Unknown error"}`,
  };
}

export async function validateUserByEmail(
  email: string,
  options: DatabaseValidationOptions = {},
): Promise<UserValidationResult> {
  const { timeout = 5000, retries = 3 } = options;

  if (!email) {
    return {
      isValid: false,
      error: "Email is required for validation",
    };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `Email validation attempt ${attempt}/${retries} for email: ${email}`,
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Database query timeout")), timeout);
      });

      const queryPromise = (db as any)
        .select({
          id: (users as any).id,
          email: (users as any).email,
          name: (users as any).name,
          role: (users as any).role,
          image: (users as any).image,
        })
        .from(users)
        .where(eq((users as any).email, email))
        .limit(1);

      const userResults = await Promise.race([queryPromise, timeoutPromise]);

      if (userResults.length === 0) {
        console.warn(
          `Email validation failed: User not found for email ${email}`,
        );
        return {
          isValid: false,
          error: "User not found in database",
        };
      }

      const user = userResults[0]!;
      console.log(`Email validation successful for ${email}:`, {
        id: user.id,
        role: user.role,
      });

      return {
        isValid: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role ?? "user",
          image: user.image,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Email validation attempt ${attempt}/${retries} failed:`,
        lastError.message,
      );

      if (attempt === retries) {
        break;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `Email validation failed after ${retries} attempts:`,
    lastError?.message,
  );
  return {
    isValid: false,
    error: `Database validation failed: ${lastError?.message ?? "Unknown error"}`,
  };
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

  if (hasChanged) {
    console.log(
      `Role change detected for user ${userId}: ${currentRole} -> ${dbRole}`,
    );
  }

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
    isActive: true,
    status: "active",
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
  const errors: string[] = [];
  let roleChanged = false;
  let accountActive = false;

  
  const userValidation = await validateUserById(userId, options);
  if (!userValidation.isValid || !userValidation.user) {
    errors.push(userValidation.error ?? "User validation failed");
    return {
      isValid: false,
      roleChanged: false,
      accountActive: false,
      errors,
    };
  }

  const user: UserValidationResult["user"] = userValidation.user;

  
  if (expectedRole) {
    const roleCheck = await checkUserRoleChange(userId, expectedRole, options);
    if (roleCheck.error) {
      errors.push(roleCheck.error);
    } else {
      roleChanged = roleCheck.hasChanged;
    }
  }

  
  const statusCheck = await validateUserAccountStatus(userId, options);
  if (statusCheck.error) {
    errors.push(statusCheck.error);
  } else {
    accountActive = statusCheck.isActive;
  }

  const isValid = errors.length === 0 && accountActive;

  return {
    isValid,
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
    timeout: isDevelopment ? 10000 : 5000, 
    retries: isDevelopment ? 5 : 3, 
    skipCache: false,
    ...overrides,
  };
}
