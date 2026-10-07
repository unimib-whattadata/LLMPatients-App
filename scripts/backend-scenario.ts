import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import postgres from "postgres";

const processEnv = process.env as Record<string, string | undefined>;

processEnv.NODE_ENV = "test";
processEnv.AUTH_SECRET ??= "test-auth-secret-which-is-long-enough-12345";
processEnv.NEXTAUTH_SECRET ??=
  "test-nextauth-secret-which-is-long-enough-12345";
processEnv.API ??= "local";

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_IN_MS = 30 * ONE_DAY_IN_MS;
const SESSION_DURATION_TOLERANCE_MS = 60_000;
const STEP_EVALUATION_TIMEOUT_MS = Number(
  process.env.TEST_STEP_EVALUATION_TIMEOUT_MS ?? 180_000,
);
let closeScenarioDatabase: (() => Promise<void>) | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function applyPostgresMigrations(databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 1 });
  const migrationDir = join(process.cwd(), "drizzle-postgres");
  const files = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  try {
    for (const file of files) {
      const content = readFileSync(join(migrationDir, file), "utf8");
      const statements = content
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await sql.unsafe(statement);
      }
    }
  } finally {
    await sql.end({ timeout: 0 }).catch(() => undefined);
  }
}

function buildSessionUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "user";
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: null,
    role: user.role,
    isActive: user.isActive,
  };
}

function assertSessionDurationApprox(
  expiresAt: unknown,
  expectedDurationMs: number,
  label: string,
) {
  assert.equal(typeof expiresAt, "number", `${label} should be numeric`);
  const remainingMs = (expiresAt as number) - Date.now();
  assert.ok(
    Math.abs(remainingMs - expectedDurationMs) <= SESSION_DURATION_TOLERANCE_MS,
    `${label} expected about ${expectedDurationMs}ms, received ${remainingMs}ms`,
  );
}

async function main() {
  const databaseUrl = getRequiredEnv("DATABASE_URL");
  if (process.env.TEST_BACKEND_SCOPE === "application") {
    assert.equal(
      process.env.API,
      "local",
      "Application-only checks require API=local",
    );
  }
  assert.ok(
    Number.isFinite(STEP_EVALUATION_TIMEOUT_MS) &&
      STEP_EVALUATION_TIMEOUT_MS > 0,
    "TEST_STEP_EVALUATION_TIMEOUT_MS must be a positive number",
  );

  if (
    !databaseUrl.startsWith("postgres://") &&
    !databaseUrl.startsWith("postgresql://")
  ) {
    throw new Error("DATABASE_URL must be a PostgreSQL URL");
  }

  await applyPostgresMigrations(databaseUrl);

  const [
    { POST },
    { authConfig },
    { validateUserAccountStatus },
    { createCaller },
    { db, postgresClient },
    tables,
    { evaluateStepMissteps },
  ] = await Promise.all([
    import("../src/app/api/auth/register/route"),
    import("../src/server/auth/config"),
    import("../src/server/auth/user-validation"),
    import("../src/server/api/root"),
    import("../src/server/db"),
    import("../src/server/db/tables"),
    import("../src/server/services/misstep-evaluator"),
  ]);
  closeScenarioDatabase = async () => {
    await postgresClient.end({ timeout: 5 });
  };

  const {
    chat,
    chatStepEvaluations,
    impersonationSessions,
    patients,
    therapySessions,
    userActivities,
    users,
  } = tables as Record<string, any>;

  const dbAny = db as any;

  const waitForStepEvaluation = async (
    therapySessionId: string,
    stepNumber: number,
  ) => {
    const startedAt = Date.now();
    let lastStatus = "not created";

    while (Date.now() - startedAt < STEP_EVALUATION_TIMEOUT_MS) {
      const evaluationRows = await dbAny
        .select()
        .from(chatStepEvaluations)
        .where(
          and(
            eq(chatStepEvaluations.therapySessionId, therapySessionId),
            eq(chatStepEvaluations.stepNumber, stepNumber),
          ),
        );

      const evaluation = evaluationRows[0];
      lastStatus = evaluation?.status ?? "not created";
      if (evaluation?.status === "failed") {
        throw new Error(
          `Misstep evaluation failed: ${evaluation.errorMessage ?? "unknown error"}`,
        );
      }
      if (evaluation && evaluation.status !== "processing") {
        console.log(
          `[backend-scenario:postgres] misstep evaluation completed in ${Date.now() - startedAt}ms (model=${evaluation.modelName})`,
        );
        return evaluation;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
      `Timed out after ${STEP_EVALUATION_TIMEOUT_MS}ms waiting for misstep evaluation for ${therapySessionId}:${stepNumber} (status=${lastStatus})`,
    );
  };

  const assertCategoryPresent = (
    result: Awaited<ReturnType<typeof evaluateStepMissteps>>,
    categoryId: string,
  ) => {
    const category = result.categories.find((item) => item.id === categoryId);
    assert.ok(category, `Category ${categoryId} should exist`);
    assert.equal(category?.present, true, `${categoryId} should be present`);
  };
  const authCallbacks = authConfig.callbacks as unknown as {
    jwt?: (
      params: Record<string, unknown>,
    ) => Promise<Record<string, unknown> | null>;
    session?: (params: Record<string, unknown>) => Promise<{
      expires: string;
      user: ReturnType<typeof buildSessionUser>;
      impersonation?: unknown;
    }>;
  };
  const authEvents = authConfig.events as unknown as {
    signOut?: (message: Record<string, unknown>) => Promise<void>;
  };
  const jwtCallback = authCallbacks.jwt;
  const sessionCallback = authCallbacks.session;
  const signOutEvent = authEvents.signOut;
  assert.ok(jwtCallback);
  assert.ok(sessionCallback);
  assert.ok(signOutEvent);

  const buildSession = () => ({
    expires: new Date(Date.now() + 60_000).toISOString(),
    user: buildSessionUser({
      id: "placeholder-user",
      email: "placeholder@example.com",
      name: "Placeholder",
      role: "user",
      isActive: true,
    }),
  });

  const createCallerFor = (user: {
    id: string;
    email: string;
    name: string | null;
    role: "admin" | "user";
    isActive: boolean;
  }) =>
    createCaller({
      db,
      headers: new Headers(),
      session: {
        expires: new Date(Date.now() + 60_000).toISOString(),
        user: buildSessionUser(user),
      },
    });

  const insertUser = async (input: {
    name: string;
    email: string;
    role: "admin" | "user";
    password: string;
    isActive?: boolean;
  }) => {
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const rows = await dbAny
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        role: input.role,
        password: hashedPassword,
        isActive: input.isActive ?? true,
      })
      .returning();

    return rows[0] as {
      id: string;
      name: string | null;
      email: string;
      role: "admin" | "user";
      isActive: boolean;
    };
  };

  const registerPayload = {
    name: "Regular User",
    email: "student@example.com",
    password: "StrongPass1!",
    role: "user" as const,
  };

  const adminRegisterPayload = {
    name: "Admin Attempt",
    email: "admin-attempt@example.com",
    password: "StrongPass1!",
    role: "admin" as const,
  };

  const registerResponse = await POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registerPayload),
    }) as any,
  );
  assert.equal(registerResponse.status, 201);

  const duplicateRegisterResponse = await POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registerPayload),
    }) as any,
  );
  assert.equal(duplicateRegisterResponse.status, 409);

  const adminRegisterResponse = await POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(adminRegisterPayload),
    }) as any,
  );
  assert.equal(adminRegisterResponse.status, 201);

  const registeredUserRows = await dbAny
    .select()
    .from(users)
    .where(eq(users.email, registerPayload.email));
  const registeredUser = registeredUserRows[0] as {
    id: string;
    name: string | null;
    email: string;
    role: "admin" | "user";
    isActive: boolean;
  };
  assert.ok(registeredUser);

  const adminAttemptRows = await dbAny
    .select()
    .from(users)
    .where(eq(users.email, adminRegisterPayload.email));
  assert.equal(adminAttemptRows[0]?.role, "user");

  const adminUser = await insertUser({
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    password: "StrongPass1!",
  });
  const targetUser = await insertUser({
    name: "Target User",
    email: "target@example.com",
    role: "user",
    password: "StrongPass1!",
  });

  const adminCaller = createCallerFor(adminUser);
  const registeredUserCaller = createCallerFor(registeredUser);

  await assert.rejects(
    () =>
      adminCaller.userManagement.createUser({
        name: "Duplicate User",
        email: registerPayload.email,
        password: "StrongPass1!",
        role: "user",
      }),
    /already exists/i,
  );

  const createdUser = await adminCaller.userManagement.createUser({
    name: "Created User",
    email: "created@example.com",
    password: "StrongPass1!",
    role: "user",
  });
  assert.ok(createdUser?.id);

  const roleUpdated = await adminCaller.userManagement.updateUserRole({
    userId: registeredUser.id,
    role: "admin",
  });
  assert.equal(roleUpdated?.role, "admin");

  await dbAny
    .update(users)
    .set({ role: "user" })
    .where(eq(users.id, registeredUser.id));

  const activity = await registeredUserCaller.dashboard.recordActivity({
    activityType: "simulation",
    metadata: { source: "postgres" },
  });
  assert.ok(activity?.id);

  const activities = await registeredUserCaller.dashboard.getUserActivity({
    limit: 10,
  });
  assert.ok(activities.length >= 1);
  assert.equal(activities[0]?.type, "simulation");

  await dbAny
    .update(users)
    .set({ isActive: false })
    .where(eq(users.id, registeredUser.id));

  const accountStatus = await validateUserAccountStatus(registeredUser.id);
  assert.equal(accountStatus.isActive, false);

  const credentialsProvider = authConfig.providers[0] as {
    authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
    options?: {
      authorize?: (credentials: Record<string, unknown>) => Promise<unknown>;
    };
  };
  const authorizeCredentials =
    credentialsProvider.options?.authorize ?? credentialsProvider.authorize;
  const authorizeResult = await authorizeCredentials?.({
    email: registerPayload.email,
    password: registerPayload.password,
    rememberMe: false,
  });
  assert.equal(authorizeResult, null);

  await dbAny
    .update(users)
    .set({ isActive: true })
    .where(eq(users.id, registeredUser.id));

  const authorizeSuccessResult = await authorizeCredentials?.({
    email: registerPayload.email,
    password: registerPayload.password,
    rememberMe: false,
  });
  assert.ok(authorizeSuccessResult);
  assert.equal(
    (authorizeSuccessResult as { rememberMe?: boolean } | undefined)
      ?.rememberMe,
    false,
  );

  const authorizeRememberMeResult = await authorizeCredentials?.({
    email: registerPayload.email,
    password: registerPayload.password,
    rememberMe: "true",
  });
  assert.ok(authorizeRememberMeResult);
  assert.equal(
    (authorizeRememberMeResult as { rememberMe?: boolean } | undefined)
      ?.rememberMe,
    true,
  );

  const initialToken = await jwtCallback?.({
    token: {},
    user: {
      id: registeredUser.id,
      email: registeredUser.email,
      name: registeredUser.name,
      image: null,
      role: "user",
      isActive: true,
      rememberMe: false,
    },
    account: {
      provider: "credentials",
      access_token: undefined,
    },
    trigger: "signIn",
  });
  assert.ok(initialToken);
  assert.equal(initialToken?.role, "user");
  assert.equal(initialToken?.rememberMe, false);
  assert.ok(
    typeof initialToken?.sessionExpiresAt === "number" &&
      initialToken.sessionExpiresAt > Date.now(),
  );
  assertSessionDurationApprox(
    initialToken?.sessionExpiresAt,
    ONE_DAY_IN_MS,
    "Non-remembered session duration",
  );

  const rememberedToken = await jwtCallback?.({
    token: {},
    user: {
      id: registeredUser.id,
      email: registeredUser.email,
      name: registeredUser.name,
      image: null,
      role: "user",
      isActive: true,
      rememberMe: true,
    },
    account: {
      provider: "credentials",
      access_token: undefined,
    },
    trigger: "signIn",
  });
  assert.ok(rememberedToken);
  assert.equal(rememberedToken?.rememberMe, true);
  assertSessionDurationApprox(
    rememberedToken?.sessionExpiresAt,
    THIRTY_DAYS_IN_MS,
    "Remember-me session duration",
  );

  const rememberedSession = await sessionCallback?.({
    session: buildSession(),
    token: rememberedToken,
  });
  assert.equal(
    rememberedSession?.expires,
    new Date(rememberedToken?.sessionExpiresAt as number).toISOString(),
  );

  const refreshedRememberedToken = await jwtCallback?.({
    token: rememberedToken ?? {},
    trigger: "update",
  });
  assert.ok(refreshedRememberedToken);
  assert.equal(
    refreshedRememberedToken?.sessionExpiresAt,
    rememberedToken?.sessionExpiresAt,
  );

  await dbAny
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, registeredUser.id));

  const staleSession = await sessionCallback?.({
    session: buildSession(),
    token: initialToken,
  });
  assert.equal(staleSession?.user.role, "user");
  assert.equal(
    staleSession?.expires,
    new Date(initialToken?.sessionExpiresAt as number).toISOString(),
  );

  const expiredToken = await jwtCallback?.({
    token: {
      ...(initialToken ?? {}),
      sessionExpiresAt: Date.now() - 1_000,
    },
    trigger: "update",
  });
  assert.equal(expiredToken, null);

  const refreshedToken = await jwtCallback?.({
    token: initialToken ?? {},
    trigger: "update",
  });
  assert.ok(refreshedToken);
  assert.equal(refreshedToken?.role, "admin");

  const refreshedSession = await sessionCallback?.({
    session: buildSession(),
    token: refreshedToken,
  });
  assert.equal(refreshedSession?.user.role, "admin");

  await dbAny
    .update(users)
    .set({ role: "user" })
    .where(eq(users.id, registeredUser.id));

  const revertedToken = await jwtCallback?.({
    token: refreshedToken ?? {},
    trigger: "update",
  });
  assert.ok(revertedToken);
  assert.equal(revertedToken?.role, "user");

  const patientRows = await dbAny
    .insert(patients)
    .values({
      name: "Test Patient",
      age: 32,
      smallDescription: "Small description",
      details: "Detailed profile",
      clinicalCase: "Clinical case",
      objectives: JSON.stringify(["Goal 1"]),
      therapeuticJourney: JSON.stringify({ step: "intro" }),
      difficulty: 2,
      estimatedDuration: 30,
      isActive: true,
      chatterboxVoiceId: null,
    })
    .returning();
  const patient = patientRows[0];
  assert.ok(patient?.id);

  const userCaller = createCallerFor({
    ...registeredUser,
    role: "user",
    isActive: true,
  });

  await userCaller.dashboard.recordActivity({
    activityType: "login",
  });

  await Promise.all([
    userCaller.therapySessions.start({
      patientId: patient.id,
      sessionNumber: 1,
    }),
    userCaller.therapySessions.start({
      patientId: patient.id,
      sessionNumber: 1,
    }),
  ]);

  let sessionRows = await dbAny
    .select()
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.userId, registeredUser.id),
        eq(therapySessions.patientId, patient.id),
      ),
    );
  assert.equal(sessionRows.length, 1);

  const upgradedSession = await userCaller.therapySessions.start({
    patientId: patient.id,
    sessionNumber: 3,
  });
  assert.equal(upgradedSession.sessionNumber, 3);

  const therapySession = upgradedSession;
  const initResponse = await userCaller.chat.initializePatient({
    therapySessionId: therapySession.id,
  });
  assert.equal(initResponse.status, "success");
  assert.ok(initResponse.external_patient_id);

  const initializedSessionRows = await dbAny
    .select()
    .from(therapySessions)
    .where(eq(therapySessions.id, therapySession.id));
  assert.equal(
    initializedSessionRows[0]?.externalPatientId,
    initResponse.external_patient_id,
  );

  const initializedPatientRows = await dbAny
    .select()
    .from(patients)
    .where(eq(patients.id, patient.id));
  assert.equal(initializedPatientRows[0]?.externalPatientId ?? null, null);

  const generatedChatResponse = await userCaller.chat.generateChatResponse({
    therapySessionId: therapySession.id,
    user_message: "Hello from test",
    step_id: 1,
  });
  assert.equal(typeof generatedChatResponse.message, "string");
  if (process.env.API === "remote") {
    assert.equal(generatedChatResponse.metadata?.apiType, "REAL");
    assert.notEqual(generatedChatResponse.metadata?.endpoint, "FALLBACK");
    assert.notEqual(
      generatedChatResponse.message,
      "I'm sorry, I'm not sure how to respond. Could you repeat that?",
    );
    console.log("[backend-scenario:postgres] real patient response verified");
  }

  const messages = [
    {
      id: "msg-1",
      content: "Hello",
      sender: "user" as const,
      timestamp: new Date(),
      stepId: 11,
    },
  ];

  await Promise.all([
    userCaller.chat.saveChatStep({
      therapySessionId: therapySession.id,
      stepNumber: 11,
      messages,
    }),
    userCaller.chat.saveChatStep({
      therapySessionId: therapySession.id,
      stepNumber: 11,
      messages,
    }),
  ]);

  let chatRows = await dbAny
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.therapySessionId, therapySession.id),
        eq(chat.stepNumber, 11),
      ),
    );
  assert.equal(chatRows.length, 1);

  const preCompletionEvaluation = await userCaller.stepEvaluations.getByStep({
    therapySessionId: therapySession.id,
    stepNumber: 11,
  });
  assert.equal(preCompletionEvaluation, null);

  await assert.rejects(
    () =>
      userCaller.stepEvaluations.retryByStep({
        therapySessionId: therapySession.id,
        stepNumber: 11,
      }),
    /must be completed/i,
  );

  if (process.env.TEST_BACKEND_SCOPE === "application") {
    console.log(
      "[backend-scenario:postgres] application scope passed: migrations, registration, account roles/status, credentials, session expiry, activity, concurrent session creation, local chat, chat persistence and evaluation guards; model evaluation not run",
    );
    return;
  }

  await Promise.all([
    userCaller.chat.markStepDone({
      therapySessionId: therapySession.id,
      stepNumber: 11,
    }),
    userCaller.chat.markStepDone({
      therapySessionId: therapySession.id,
      stepNumber: 11,
    }),
  ]);

  chatRows = await dbAny
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.therapySessionId, therapySession.id),
        eq(chat.stepNumber, 11),
      ),
    );
  assert.equal(chatRows.length, 1);
  assert.equal(chatRows[0]?.done, true);

  sessionRows = await dbAny
    .select()
    .from(therapySessions)
    .where(eq(therapySessions.id, therapySession.id));
  assert.equal(sessionRows[0]?.isCompleted, true);
  assert.equal(sessionRows[0]?.activePatientSessionKey ?? null, null);

  const completedEvaluation = await waitForStepEvaluation(
    therapySession.id,
    11,
  );
  assert.equal(completedEvaluation.status, "completed");
  assert.equal(completedEvaluation.detectorVersion, "step-missteps-v1");
  assert.ok(completedEvaluation.resultJson);

  const evaluationRows = await dbAny
    .select()
    .from(chatStepEvaluations)
    .where(
      and(
        eq(chatStepEvaluations.therapySessionId, therapySession.id),
        eq(chatStepEvaluations.stepNumber, 11),
      ),
    );
  assert.equal(evaluationRows.length, 1);

  const evaluationPayload = JSON.parse(completedEvaluation.resultJson);
  assert.equal(Array.isArray(evaluationPayload.categories), true);
  assert.equal(typeof evaluationPayload.summary.detectedCount, "number");

  const evaluationFromRouter = await userCaller.stepEvaluations.getByStep({
    therapySessionId: therapySession.id,
    stepNumber: 11,
  });
  assert.equal(evaluationFromRouter?.status, "completed");

  const structureResult = await evaluateStepMissteps({
    therapySessionId: "synthetic-1",
    stepNumber: 3,
    patient: {
      id: "patient-1",
      name: "Synthetic Patient",
      background: "Mild anxiety, no acute safety risk.",
      objectives: ["Explore recent stressors"],
    },
    messages: [
      {
        id: "m1",
        content: "I had a hard week and felt overwhelmed.",
        sender: "patient",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "m2",
        content: "Tell me more.",
        sender: "user",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "m3",
        content: "It kept getting worse at work.",
        sender: "patient",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "m4",
        content: "That sounds difficult.",
        sender: "user",
        stepId: 3,
        timestamp: new Date(),
      },
    ],
  });
  assertCategoryPresent(structureResult, "lack_of_structure");

  const harmfulResult = await evaluateStepMissteps({
    therapySessionId: "synthetic-2",
    stepNumber: 3,
    patient: {
      id: "patient-2",
      name: "Synthetic Patient",
      background: "Mild anxiety, no acute safety risk.",
      objectives: ["Reduce avoidance"],
    },
    messages: [
      {
        id: "h1",
        content: "I panic when I have to speak up.",
        sender: "patient",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "h2",
        content: "You should just stop overreacting and do it.",
        sender: "user",
        stepId: 3,
        timestamp: new Date(),
      },
    ],
  });
  assertCategoryPresent(harmfulResult, "harmful_attitudes");

  const suicidePlanResult = await evaluateStepMissteps({
    therapySessionId: "synthetic-4",
    stepNumber: 4,
    patient: {
      id: "patient-4",
      name: "Synthetic Patient",
      background: "Recent hopelessness and withdrawal.",
      objectives: ["Assess safety"],
    },
    messages: [
      {
        id: "s1",
        content:
          "Sometimes I think I don't want to live anymore and I've thought about killing myself.",
        sender: "patient",
        stepId: 4,
        timestamp: new Date(),
      },
      {
        id: "s2",
        content: "Let's go back to your childhood for a moment.",
        sender: "user",
        stepId: 4,
        timestamp: new Date(),
      },
    ],
  });
  assertCategoryPresent(suicidePlanResult, "missing_suicide_plan");

  const boundaryResult = await evaluateStepMissteps({
    therapySessionId: "synthetic-5",
    stepNumber: 5,
    patient: {
      id: "patient-5",
      name: "Synthetic Patient",
      background: "Relationship instability.",
      objectives: ["Stabilize boundaries"],
    },
    messages: [
      {
        id: "b1",
        content: "I worry I am too much for people.",
        sender: "patient",
        stepId: 5,
        timestamp: new Date(),
      },
      {
        id: "b2",
        content: "You can text me anytime outside session if things get messy.",
        sender: "user",
        stepId: 5,
        timestamp: new Date(),
      },
    ],
  });
  assertCategoryPresent(boundaryResult, "professional_boundary_violation");

  const fallbackFilteredResult = await evaluateStepMissteps({
    therapySessionId: "synthetic-6",
    stepNumber: 3,
    patient: {
      id: "patient-6",
      name: "Synthetic Patient",
      background: "Panic symptoms in work conversations.",
      objectives: ["Reduce fear in high-pressure situations"],
    },
    messages: [
      {
        id: "f1",
        content: "I panic when I have to speak up in meetings.",
        sender: "patient",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "f2",
        content: "You should just stop overreacting and do it.",
        sender: "user",
        stepId: 3,
        timestamp: new Date(),
      },
      {
        id: "f3",
        content:
          "I'm sorry, I'm not sure how to respond. Could you repeat that?",
        sender: "patient",
        stepId: 3,
        timestamp: new Date(),
      },
    ],
  });
  assertCategoryPresent(fallbackFilteredResult, "harmful_attitudes");
  assert.equal(fallbackFilteredResult.summary.patientTurnCount, 1);
  assert.equal(fallbackFilteredResult.summary.transcriptTurnCount, 2);
  assert.equal(
    JSON.stringify(fallbackFilteredResult).includes(
      "I'm sorry, I'm not sure how to respond. Could you repeat that?",
    ),
    false,
  );

  const restartedSession = await userCaller.therapySessions.start({
    patientId: patient.id,
    sessionNumber: 1,
  });
  assert.notEqual(restartedSession.id, therapySession.id);

  sessionRows = await dbAny
    .select()
    .from(therapySessions)
    .where(
      and(
        eq(therapySessions.userId, registeredUser.id),
        eq(therapySessions.patientId, patient.id),
      ),
    );
  assert.equal(sessionRows.length, 2);

  const impersonationStart = await adminCaller.impersonation.startImpersonation(
    {
      targetUserId: targetUser.id,
      reason: "Testing postgres",
    },
  );
  assert.equal(impersonationStart.success, true);

  await assert.rejects(
    () =>
      adminCaller.impersonation.startImpersonation({
        targetUserId: targetUser.id,
        reason: "duplicate",
      }),
    /active impersonation session/i,
  );

  const impersonationHistory =
    await adminCaller.impersonation.getImpersonationHistory({
      page: 1,
      limit: 10,
    });
  assert.ok(impersonationHistory.sessions.length >= 1);
  assert.equal(impersonationHistory.sessions[0]?.targetUser?.id, targetUser.id);

  const usersForImpersonation =
    await adminCaller.impersonation.getUsersForImpersonation({
      page: 1,
      limit: 20,
    });
  assert.ok(
    usersForImpersonation.users.some((user) => user.id === targetUser.id),
  );

  await signOutEvent?.({
    token: {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      isActive: adminUser.isActive,
      impersonation: {
        isActive: true,
        originalAdminId: adminUser.id,
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.name,
        sessionId: impersonationStart.sessionId,
        startedAt: new Date(impersonationStart.startedAt).getTime(),
      },
    },
  });

  let activeImpersonationRows = await dbAny
    .select()
    .from(impersonationSessions)
    .where(
      and(
        eq(impersonationSessions.adminUserId, adminUser.id),
        eq(impersonationSessions.isActive, true),
      ),
    );
  assert.equal(activeImpersonationRows.length, 0);

  const restartedImpersonation =
    await adminCaller.impersonation.startImpersonation({
      targetUserId: targetUser.id,
      reason: "Retest postgres",
    });
  assert.equal(restartedImpersonation.success, true);

  const systemStats = await adminCaller.dashboard.getSystemStats();
  assert.equal(Number(systemStats.totalUsers), 5);
  assert.equal(Number(systemStats.activeUsers), 1);
  assert.equal(Number(systemStats.adminUsers), 1);
  assert.ok(systemStats.recentActivities.length >= 1);

  const studentStats = await adminCaller.dashboard.getStudentStats();
  assert.equal(Number(studentStats.totalStudents), 4);
  assert.equal(Number(studentStats.activeStudents), 1);
  assert.equal(Number(studentStats.totalSimulations), 1);
  assert.equal(Number(studentStats.completionRate), 25);

  const userList = await adminCaller.userManagement.getAllUsers({
    limit: 10,
    offset: 0,
  });
  assert.equal(userList.totalCount, 5);
  assert.equal(userList.users.length, 5);

  const userStats = await adminCaller.userManagement.getUserStats();
  assert.equal(Number(userStats.totalUsers), 5);
  assert.equal(Number(userStats.adminUsers), 1);
  assert.equal(Number(userStats.regularUsers), 4);

  const impersonationEnd = await adminCaller.impersonation.endImpersonation({});
  assert.equal(impersonationEnd.success, true);

  activeImpersonationRows = await dbAny
    .select()
    .from(impersonationSessions)
    .where(
      and(
        eq(impersonationSessions.adminUserId, adminUser.id),
        eq(impersonationSessions.isActive, true),
      ),
    );
  assert.equal(activeImpersonationRows.length, 0);

  const storedActivities = await dbAny.select().from(userActivities);
  assert.ok(storedActivities.length >= 1);

  const deletedUserToken = await jwtCallback?.({
    token: {},
    user: {
      id: createdUser.id,
      email: "created@example.com",
      name: "Created User",
      image: null,
      role: "user",
      isActive: true,
      rememberMe: false,
    },
    account: {
      provider: "credentials",
      access_token: undefined,
    },
    trigger: "signIn",
  });
  assert.ok(deletedUserToken);

  await dbAny.delete(users).where(eq(users.id, createdUser.id));

  const deletedUserRefresh = await jwtCallback?.({
    token: deletedUserToken ?? {},
    trigger: "update",
  });
  assert.equal(deletedUserRefresh, null);

  console.log("[backend-scenario:postgres] passed");
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeScenarioDatabase?.();
  });
