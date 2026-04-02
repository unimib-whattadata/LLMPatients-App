import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "~/server/db";
import { isUniqueConstraintError } from "~/server/db/errors";
import { users } from "~/server/db/tables";
import {
  validateUserByEmail,
  createValidationConfig,
} from "~/server/auth/user-validation";
import {
  handleDatabaseError,
  logAuthError,
  createAuthError,
  AuthErrorType,
} from "~/server/auth/error-handling";
import { createLogger } from "~/lib/logger";

const logger = createLogger("Registration");


const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .trim()
    .regex(
      /^[a-zA-Z\s\u00C0-\u017F]+$/,
      "Name can only contain letters and spaces",
    ),
  email: z
    .string()
    .toLowerCase()
    .trim()
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
  role: z.enum(["admin", "user"]).optional().default("user"),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  const reqLogger = logger.child({ requestId });
  reqLogger.info("Processing registration request");

  try {
    
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      reqLogger.error("Invalid JSON in request body", error);
      return NextResponse.json(
        {
          error:
            "Invalid request body. Please ensure you're sending valid JSON.",
        },
        { status: 400 },
      );
    }

    let validatedData: z.infer<typeof registerSchema>;
    try {
      validatedData = registerSchema.parse(body);
      reqLogger.debug("Input validation passed", { email: validatedData.email, role: validatedData.role });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map((err) => err.message).join(", ");
        reqLogger.warn("Input validation failed", { errors: errorMessage });
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      throw error;
    }

    reqLogger.debug("Hashing password");
    let hashedPassword: string;
    try {
      const saltRounds = process.env.NODE_ENV === "production" ? 12 : 10;
      hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    } catch (error) {
      reqLogger.error("Failed to hash password", error);
      return NextResponse.json(
        { error: "Failed to process password. Please try again." },
        { status: 500 },
      );
    }

    
    reqLogger.debug("Creating user in database");
    let newUser:
      | {
          id: string;
          name: string | null;
          email: string;
          role: string | null;
        }
      | undefined;

    try {
      const insertedUsers = await (db as any)
        .insert(users)
        .values({
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          // Public self-registration is intentionally limited to standard users.
          role: "user",
        })
        .returning({
          id: (users as any).id,
          name: (users as any).name,
          email: (users as any).email,
          role: (users as any).role,
        });

      newUser = insertedUsers[0] as
        | {
            id: string;
            name: string | null;
            email: string;
            role: string | null;
          }
        | undefined;
    } catch (error) {
      if (isUniqueConstraintError(error, "email")) {
        reqLogger.warn("Registration rejected - user exists", {
          email: validatedData.email,
        });
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 },
        );
      }

      const authError = handleDatabaseError(
        error instanceof Error ? error : new Error(String(error)),
      );
      logAuthError(authError, {
        operation: "registration",
        requestId,
      });

      return NextResponse.json(
        { error: "Failed to create user account. Please try again." },
        { status: 500 },
      );
    }

    if (!newUser) {
      const authError = createAuthError(
        AuthErrorType.DATABASE_QUERY_FAILED,
        "User creation returned no records",
        undefined,
        undefined,
        false,
        "medium",
      );

      logAuthError(authError, {
        operation: "registration",
        requestId,
      });

      return NextResponse.json(
        { error: "Failed to create user account. Please try again." },
        { status: 500 },
      );
    }

    reqLogger.info("User created successfully", { id: newUser.id, email: newUser.email, role: newUser.role });

    
    reqLogger.debug("Verifying user creation");
    const verificationResult = await validateUserByEmail(
      newUser.email,
      createValidationConfig({ timeout: 3000, retries: 1 }),
    );

    if (!verificationResult.isValid) {
      reqLogger.error("Post-creation verification failed", { error: verificationResult.error });
      
      
      logAuthError(
        createAuthError(
          AuthErrorType.DATABASE_QUERY_FAILED,
          "User created but verification failed",
          verificationResult.error,
          newUser.id,
          false,
          "medium",
        ),
        { operation: "post_creation_verification", requestId },
      );
    } else {
      reqLogger.debug("User creation verified");
    }

    
    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    reqLogger.error("Unexpected error during registration", error);

    
    const authError = createAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      "Unexpected error during registration",
      error instanceof Error ? error.message : String(error),
      undefined,
      false,
      "critical",
    );

    logAuthError(authError, { operation: "registration", requestId });

    
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 },
    );
  }
}
