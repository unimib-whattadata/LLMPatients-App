import assert from "node:assert/strict";

// Set synthetic configuration before importing application modules. No .env is loaded.
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://offline:offline@127.0.0.1:65432/offline",
  AUTH_SECRET: "offline-test-placeholder-secret-000000000000",
  NEXTAUTH_SECRET: "offline-test-placeholder-secret-000000000000",
  API: "remote",
  API_BASE_URL: "https://offline.invalid",
  API_INITIALIZE_PATIENT_ENDPOINT: "/patient",
  API_CHAT_RESPONSE_ENDPOINT: "/chat-response",
  API_SESSION_END_ENDPOINT: "/session-end",
  EXTERNAL_AI_API_KEY: "offline-test-token",
  TTS_PROVIDER: "none",
});

const [{ PatientResponseGenerator }, { RealExternalAIService }] =
  await Promise.all([
    import("../src/server/services/patient-response-generator/generator"),
    import("../src/server/services/patient-response-generator/real-service"),
  ]);

const patientInfo = {
  id: "offline-patient",
  name: "Offline Patient",
  age: 30,
  gender: "other",
  diagnosis: "Synthetic training case",
  difficulty: 1,
  psychologicalProfile: "Synthetic profile for an offline contract test",
  background: "No real patient data",
};
const sessionId = "offline-session";
const timestamp = "2026-01-01T00:00:00.000Z";
const originalFetch = globalThis.fetch;
const requests: Array<{ path: string; body: Record<string, unknown> }> = [];
let failRequests = false;

globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  assert.equal(url.origin, "https://offline.invalid");
  assert.equal(init?.method, "POST");
  assert.equal(
    new Headers(init?.headers).get("Authorization"),
    "Bearer offline-test-token",
  );
  const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
  requests.push({ path: url.pathname, body });

  if (failRequests) return new Response("synthetic failure", { status: 503 });

  const responses: Record<string, unknown> = {
    "/patient": {
      status: "success",
      code: "PATIENT_CREATED",
      external_patient_id: "offline-external-patient",
      message: "Synthetic patient initialized",
      timestamp,
    },
    "/chat-response": {
      message: "Synthetic remote response",
      reasoning_time: 0.2,
      emotion: "fear",
      topic: "training",
      timestamp,
      emotion_snapshot: {
        dominant: "fear",
        intensity: 1.5,
        vector: { fear: 1.5, care: -0.2 },
      },
      emotion_timeline: [
        { turn_index: 2, timestamp, emotion: "care", intensity: 0.4 },
        { turn_index: 1, timestamp, emotion: "fear", intensity: 1.5 },
        { turn_index: "invalid", timestamp },
      ],
    },
    "/session-end": {
      status: "finalized",
      message: "Synthetic session finalized",
      timestamp,
    },
  };
  assert.ok(
    url.pathname in responses,
    `Unexpected API endpoint ${url.pathname}`,
  );
  return Response.json(responses[url.pathname]);
};

try {
  const remote = new RealExternalAIService();
  const initialization = await remote.initializePatient({
    patientInfo,
    sessionId,
  });
  assert.equal(initialization.external_patient_id, "offline-external-patient");
  assert.equal(requests[0]?.body.difficulty_level, patientInfo.difficulty);
  assert.equal(requests[0]?.body.session_id, sessionId);

  const request = {
    external_patient_id: initialization.external_patient_id!,
    user_message: "How are you feeling today?",
    session_id: sessionId,
    step_id: 1,
    therapist_id: "offline-therapist",
  };
  const response = await remote.generateChatResponse(request);
  assert.equal(response.message, "Synthetic remote response");
  assert.equal(response.emotion, "FEAR");
  assert.equal(response.emotion_snapshot?.intensity, 1);
  assert.equal(response.emotion_snapshot?.vector.care, 0);
  assert.deepEqual(
    response.emotion_timeline?.map((point) => point.turn_index),
    [1, 2],
  );
  assert.equal(response.metadata?.apiType, "REAL");
  assert.deepEqual(requests[1]?.body, request);
  assert.equal((await remote.finalizeSession(request)).status, "finalized");

  failRequests = true;
  await assert.rejects(remote.generateChatResponse(request), /503/);
  failRequests = false;

  const requestCount = requests.length;
  const local = new PatientResponseGenerator(false);
  const localInitialization = await local.initializePatient({
    patientInfo,
    sessionId,
  });
  assert.equal(localInitialization.status, "success");
  const localRequest = {
    ...request,
    external_patient_id: localInitialization.external_patient_id!,
  };
  const first = await local.generateChatResponse(localRequest);
  const second = await local.generateChatResponse(localRequest);
  assert.equal(first.metadata?.apiType, "MOCK");
  assert.ok(first.message.length > 0);
  assert.equal(first.emotion_timeline?.length, 1);
  assert.equal(second.emotion_timeline?.length, 2);
  assert.equal((await local.finalizeSession(localRequest)).status, "finalized");
  const afterFinalize = await local.generateChatResponse(localRequest);
  assert.equal(afterFinalize.emotion_timeline?.length, 1);
  assert.equal(
    requests.length,
    requestCount,
    "Local simulation must make no HTTP calls",
  );

  console.log(
    "[offline] passed: remote API contracts, error propagation, emotion normalization, local chat and session cleanup; no database or provider calls",
  );
} finally {
  globalThis.fetch = originalFetch;
}
