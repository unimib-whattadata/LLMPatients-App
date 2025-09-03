import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "~/server/db";
import { users } from "~/server/db/schema";

// Validation schema for registration
const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .trim(),
  email: z
    .string()
    .toLowerCase()
    .trim()
    .refine(
      (email) => {
        // Allow "admin" as a special case, otherwise validate as email
        return email === "admin" || z.string().email().safeParse(email).success;
      },
      "Please enter a valid email address or 'admin'"
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
      });

    if (newUser.length === 0) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Return success response (exclude password)
    return NextResponse.json(
      {
        message: "User registered successfully",
        user: newUser[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((err) => err.message).join(", ");
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}