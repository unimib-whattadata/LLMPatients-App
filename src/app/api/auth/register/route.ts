import { type NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "~/server/db";
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
  handleAuthErrorWithRetry,
} from "~/server/auth/error-handling";


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
    .refine((email) => {
      
      return email === "admin" || z.string().email().safeParse(email).success;
    }, "Please enter a valid email address or 'admin'"),
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
  console.log(`[${requestId}] Registration request started`);

  try {
    
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`[${requestId}] Failed to parse request body:`, error);
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
      console.log(`[${requestId}] Request validation successful:`, {
        email: validatedData.email,
        name: validatedData.name,
        role: validatedData.role,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.issues.map((err) => err.message).join(", ");
        console.warn(`[${requestId}] Validation failed:`, errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }
      throw error;
    }

    
    console.log(`[${requestId}] Checking if user already exists...`);
    const userExistsResult = await handleAuthErrorWithRetry(
      async () => {
        return await validateUserByEmail(
          validatedData.email,
          createValidationConfig({ timeout: 5000, retries: 2 }),
        );
      },
      (error) => handleDatabaseError(error),
      2, 
      {
        operation: "user_existence_check",
        email: validatedData.email,
        requestId,
      },
    );

    if (!userExistsResult.success) {
      console.error(
        `[${requestId}] Database error during user existence check:`,
        userExistsResult.error,
      );

      
      if (userExistsResult.error) {
        logAuthError(userExistsResult.error, {
          operation: "registration",
          requestId,
        });
      }

      return NextResponse.json(
        {
          error:
            "Unable to process registration at this time. Please try again later.",
        },
        { status: 503 }, 
      );
    }

    
    if (userExistsResult.result?.isValid) {
      console.warn(`[${requestId}] User already exists:`, validatedData.email);
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }, 
      );
    }

    
    console.log(`[${requestId}] Hashing password...`);
    let hashedPassword: string;
    try {
      const saltRounds = process.env.NODE_ENV === "production" ? 12 : 10;
      hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
    } catch (error) {
      console.error(`[${requestId}] Password hashing failed:`, error);
      return NextResponse.json(
        { error: "Failed to process password. Please try again." },
        { status: 500 },
      );
    }

    
    console.log(`[${requestId}] Creating new user in database...`);
    const createUserResult = await handleAuthErrorWithRetry(
      async () => {
        const newUser = await (db as any)
          .insert(users)
          .values({
            name: validatedData.name,
            email: validatedData.email,
            password: hashedPassword,
            role: validatedData.role, 
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          });

        if (newUser.length === 0) {
          throw new Error("User creation returned no records");
        }

        return newUser[0]!;
      },
      (error) => {
        
        if (error.message.includes("UNIQUE constraint")) {
          return createAuthError(
            AuthErrorType.DATABASE_QUERY_FAILED,
            "User with this email already exists",
            error.message,
            undefined,
            false,
            "low",
          );
        }
        return handleDatabaseError(error);
      },
      2, 
      { operation: "user_creation", email: validatedData.email, requestId },
    );

    if (!createUserResult.success || !createUserResult.result) {
      console.error(
        `[${requestId}] User creation failed:`,
        createUserResult.error,
      );

      
      if (createUserResult.error?.message.includes("already exists")) {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 },
        );
      }

      
      if (createUserResult.error) {
        logAuthError(createUserResult.error, {
          operation: "registration",
          requestId,
        });
      }

      return NextResponse.json(
        { error: "Failed to create user account. Please try again." },
        { status: 500 },
      );
    }

    const newUser = createUserResult.result;
    console.log(`[${requestId}] User created successfully:`, {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    
    console.log(`[${requestId}] Verifying user creation...`);
    const verificationResult = await validateUserByEmail(
      newUser.email,
      createValidationConfig({ timeout: 3000, retries: 1 }),
    );

    if (!verificationResult.isValid) {
      console.error(
        `[${requestId}] User verification failed after creation:`,
        verificationResult.error,
      );
      
      
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
      console.log(`[${requestId}] User creation verified successfully`);
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
    console.error(`[${requestId}] Unexpected registration error:`, error);

    
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
