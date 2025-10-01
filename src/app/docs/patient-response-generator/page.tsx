import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Integration Guide - Patient Response Generator",
  description:
    "Complete technical documentation for external AI service integration with patient response generation system",
};

export default function PatientResponseGeneratorDocs() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-page-background)" }}
    >
      <div className="container mx-auto px-4 py-8">
        <header className="mb-16 text-center">
          <h1
            className="mb-6 text-6xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            API Integration Guide
          </h1>
          <p
            className="mb-4 text-3xl"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Patient Response Generator
          </p>
          <p
            className="mx-auto mb-8 max-w-4xl text-xl leading-relaxed"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Complete technical documentation for implementing external AI
            services that generate contextual patient responses in therapeutic
            conversations.
          </p>
        </header>

        {/* Authentication */}
        <section
          className="mb-16 p-10 shadow-xl"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          <header className="mb-10 flex items-center">
            <div
              className="mr-6 flex h-16 w-16 items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: "var(--color-primary-yellow)" }}
            >
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            <div>
              <h2
                className="mb-2 text-4xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Authentication
              </h2>
              <p
                className="text-xl"
                style={{ color: "var(--color-text-secondary)" }}
              >
                API authentication and security requirements
              </p>
            </div>
          </header>

          <div
            className="p-6"
            style={{ backgroundColor: "var(--color-surface-tertiary)" }}
          >
            <h3
              className="mb-4 text-xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              API Key
            </h3>
            <p
              className="mb-4"
              style={{ color: "var(--color-text-secondary)" }}
            >
              All requests must include a valid API key in the Authorization
              header.
            </p>
            <div
              className="p-4 font-mono text-sm"
              style={{ backgroundColor: "var(--color-surface-primary)" }}
            >
              <div>Authorization: Bearer {`{YOUR_API_KEY}`}</div>
            </div>
          </div>
        </section>

        {/* Passo 1 */}
        <section
          className="mb-16 p-10 shadow-xl"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          <header className="mb-10 flex items-center">
            <div
              className="mr-6 flex h-16 w-16 items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: "var(--color-primary-green)" }}
            >
              1
            </div>
            <div>
              <h2
                className="mb-2 text-4xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Patient Initialization
              </h2>
              <p
                className="text-xl"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Initialize patient in external AI service
              </p>
            </div>
          </header>

          {/* URL chiamato */}
          <section className="mb-12">
            <h3
              className="mb-8 flex items-center text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <div
                className="mr-4 flex h-8 w-8 items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              API Endpoint
            </h3>
            <div
              className="overflow-x-auto p-8 font-mono text-lg"
              style={{ backgroundColor: "var(--color-surface-tertiary)" }}
            >
              <div className="mb-6">
                <span
                  className="mr-4 px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--color-primary-green)",
                    color: "white",
                  }}
                >
                  POST
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  https://api.therapeutic-ai.com/v1/initialise-patient
                </span>
              </div>
              <div
                className="mb-4 text-lg font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Required Headers:
              </div>
              <div className="ml-6 space-y-3 text-lg">
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    Authorization:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Bearer {`{API_KEY}`}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    Content-Type:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    application/json
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    X-API-Version:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    1.0
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Informazioni passate */}
          <section className="mb-10">
            <h3
              className="mb-6 flex items-center text-xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <span
                className="mr-3 h-3 w-3"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              ></span>
              Informazioni passate
            </h3>

            {/* Struttura JSON */}
            <div className="mb-6">
              <h4
                className="text-md mb-3 flex items-center font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <span
                  className="mr-2 h-1.5 w-1.5"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                ></span>
                Struttura del JSON
              </h4>
              <div
                className="overflow-x-auto p-6 font-mono text-base"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">id:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">name:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">age:</span>{" "}
                  <span className="text-orange-400">number</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">gender:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">diagnosis:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">difficulty_level:</span>{" "}
                  <span className="text-orange-400">number</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    psychological_profile:
                  </span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">background:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">current_medications:</span>{" "}
                  <span className="text-orange-400">string[]</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">therapy_goals:</span>{" "}
                  <span className="text-orange-400">string[]</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">previous_sessions:</span>{" "}
                  <span className="text-orange-400">number</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">session_id:</span>{" "}
                  <span className="text-orange-400">string</span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>

            {/* Esempio reale */}
            <div className="mb-6">
              <h4
                className="text-md mb-3 flex items-center font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <span
                  className="mr-2 h-1.5 w-1.5"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                ></span>
                Esempio reale
              </h4>
              <div
                className="mb-4 overflow-x-auto p-6 font-mono text-sm"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;id&quot;:</span>{" "}
                  <span className="text-green-400">
                    &quot;patient-123&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;name&quot;:</span>{" "}
                  <span className="text-green-400">&quot;John&quot;</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;age&quot;:</span>{" "}
                  <span className="text-orange-400">45</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;gender&quot;:</span>{" "}
                  <span className="text-green-400">&quot;male&quot;</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;diagnosis&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;Disturbo d&apos;ansia generalizzato&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;difficulty_level&quot;:
                  </span>{" "}
                  <span className="text-orange-400">2</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;psychological_profile&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;Stress cronico&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;background&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;Storia clinica dettagliata...&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;current_medications&quot;:
                  </span>{" "}
                  <span className="text-blue-400">[</span>
                  <span className="text-green-400">&quot;SSRI&quot;</span>
                  <span className="text-blue-400">]</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;therapy_goals&quot;:
                  </span>{" "}
                  <span className="text-blue-400">[</span>
                  <span className="text-green-400">
                    &quot;Gestione stress&quot;
                  </span>
                  <span className="text-gray-400">, </span>
                  <span className="text-green-400">
                    &quot;Migliorare sonno&quot;
                  </span>
                  <span className="text-blue-400">]</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;previous_sessions&quot;:
                  </span>{" "}
                  <span className="text-orange-400">0</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;session_id&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;session-456&quot;
                  </span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>
          </section>

          {/* Risposta attesa */}
          <section className="mb-8">
            <h3
              className="mb-8 flex items-center text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <div
                className="mr-4 flex h-8 w-8 items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              Expected Response
            </h3>
            <div
              className="overflow-x-auto p-8 font-mono text-lg"
              style={{ backgroundColor: "var(--color-surface-tertiary)" }}
            >
              <div className="text-blue-400">{"{"}</div>
              <div className="ml-4">
                <span className="text-purple-400">&quot;status&quot;:</span>{" "}
                <span className="text-green-400">&quot;success&quot;</span>,
              </div>
              <div className="ml-4">
                <span className="text-purple-400">&quot;code&quot;:</span>{" "}
                <span className="text-green-400">
                  &quot;PATIENT_CREATED&quot;
                </span>
                ,
              </div>
              <div className="ml-4">
                <span className="text-purple-400">
                  &quot;external_patient_id&quot;:
                </span>{" "}
                <span className="text-green-400">
                  &quot;ext_patient_789&quot;
                </span>
                ,
              </div>
              <div className="ml-4">
                <span className="text-purple-400">&quot;message&quot;:</span>{" "}
                <span className="text-green-400">
                  &quot;Paziente inizializzato correttamente nel sistema
                  esterno&quot;
                </span>
                ,
              </div>
              <div className="ml-4">
                <span className="text-purple-400">&quot;timestamp&quot;:</span>{" "}
                <span className="text-green-400">
                  &quot;2024-01-15T10:30:15.000Z&quot;
                </span>
              </div>
              <div className="text-blue-400">{"}"}</div>
            </div>
          </section>
        </section>

        {/* Passo 2 */}
        <section
          className="p-10 shadow-xl"
          style={{ backgroundColor: "var(--color-surface-secondary)" }}
        >
          <header className="mb-10 flex items-center">
            <div
              className="mr-6 flex h-16 w-16 items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: "var(--color-primary-green)" }}
            >
              2
            </div>
            <div>
              <h2
                className="mb-2 text-4xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Chat Response Generation
              </h2>
              <p
                className="text-xl"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Generate contextual patient responses during conversation
              </p>
            </div>
          </header>

          {/* URL chiamato */}
          <section className="mb-12">
            <h3
              className="mb-8 flex items-center text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <div
                className="mr-4 flex h-8 w-8 items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              API Endpoint
            </h3>
            <div
              className="overflow-x-auto p-8 font-mono text-lg"
              style={{ backgroundColor: "var(--color-surface-tertiary)" }}
            >
              <div className="mb-6">
                <span
                  className="mr-4 px-4 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--color-primary-green)",
                    color: "white",
                  }}
                >
                  POST
                </span>
                <span
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  https://api.therapeutic-ai.com/v1/chat-response
                </span>
              </div>
              <div
                className="mb-4 text-lg font-semibold"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Required Headers:
              </div>
              <div className="ml-6 space-y-3 text-lg">
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    Authorization:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    Bearer {`{API_KEY}`}
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    Content-Type:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    application/json
                  </span>
                </div>
                <div className="flex items-center">
                  <span
                    className="w-32 font-semibold"
                    style={{ color: "var(--color-primary-green)" }}
                  >
                    X-API-Version:
                  </span>
                  <span
                    className="ml-4 px-3 py-1 text-sm"
                    style={{
                      backgroundColor: "var(--color-surface-primary)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    1.0
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Informazioni passate */}
          <section className="mb-12">
            <h3
              className="mb-8 flex items-center text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <div
                className="mr-4 flex h-8 w-8 items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              Request Payload
            </h3>

            {/* Struttura JSON */}
            <div className="mb-8">
              <h4
                className="mb-6 flex items-center text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <div
                  className="mr-3 flex h-6 w-6 items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                >
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                JSON Schema
              </h4>
              <div
                className="overflow-x-auto p-6 font-mono text-base"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">external_patient_id:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">user_message:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">session_id:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">step_id:</span>{" "}
                  <span className="text-orange-400">number</span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>

            {/* Esempio reale */}
            <div className="mb-8">
              <h4
                className="mb-6 flex items-center text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <div
                  className="mr-3 flex h-6 w-6 items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                >
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                Real Example
              </h4>
              <div
                className="mb-4 overflow-x-auto p-6 font-mono text-sm"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;external_patient_id&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;ext_patient_789&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;user_message&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;Come ti senti oggi?&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;session_id&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;session-456&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;step_id&quot;:</span>{" "}
                  <span className="text-orange-400">2</span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>
          </section>

          {/* Risposta attesa */}
          <section className="mb-6">
            <h3
              className="mb-8 flex items-center text-3xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <div
                className="mr-4 flex h-8 w-8 items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-green)" }}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              Expected Response
            </h3>

            {/* JSON Schema */}
            <div className="mb-8">
              <h4
                className="mb-6 flex items-center text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <div
                  className="mr-3 flex h-6 w-6 items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                >
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                JSON Schema
              </h4>
              <div
                className="overflow-x-auto p-6 font-mono text-base"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">message:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">reasoning_time:</span>{" "}
                  <span className="text-orange-400">number</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">emotion:</span>{" "}
                  <span className="text-orange-400">
                    &quot;anger&quot; | &quot;anticipation&quot; |
                    &quot;disgust&quot; | &quot;joy&quot; | &quot;sadness&quot;
                    | &quot;surprise&quot; | &quot;trust&quot; |
                    &quot;base&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">topic:</span>{" "}
                  <span className="text-orange-400">string</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">timestamp:</span>{" "}
                  <span className="text-orange-400">string (ISO 8601)</span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>

            {/* Real Example */}
            <div className="mb-8">
              <h4
                className="mb-6 flex items-center text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <div
                  className="mr-3 flex h-6 w-6 items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                >
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                Real Example
              </h4>
              <div
                className="overflow-x-auto p-6 font-mono text-base"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;message&quot;:</span>{" "}
                  <span className="text-green-400">
                    &quot;Grazie per la sua domanda... A volte mi sento così
                    confusa e non so bene come spiegare quello che provo. È come
                    se avessi tante emozioni diverse che si mescolano
                    insieme.&quot;
                  </span>
                  ,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;reasoning_time&quot;:
                  </span>{" "}
                  <span className="text-orange-400">3</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;emotion&quot;:</span>{" "}
                  <span className="text-green-400">&quot;sadness&quot;</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">&quot;topic&quot;:</span>{" "}
                  <span className="text-green-400">&quot;emozioni&quot;</span>,
                </div>
                <div className="ml-4">
                  <span className="text-purple-400">
                    &quot;timestamp&quot;:
                  </span>{" "}
                  <span className="text-green-400">
                    &quot;2024-01-15T10:30:20.000Z&quot;
                  </span>
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>

            {/* Possible Emotion Values */}
            <div className="mb-8">
              <h4
                className="mb-6 flex items-center text-2xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                <div
                  className="mr-3 flex h-6 w-6 items-center justify-center"
                  style={{ backgroundColor: "var(--color-primary-yellow)" }}
                >
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                Possible Emotion Values
              </h4>
              <div
                className="p-6"
                style={{ backgroundColor: "var(--color-surface-tertiary)" }}
              >
                <p
                  className="mb-4 text-lg"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  The <code className="text-green-400">emotion</code> field must
                  be one of the following values:
                </p>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;anger&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">
                      &quot;anticipation&quot;
                    </code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;disgust&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;joy&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;sadness&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;surprise&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;trust&quot;</code>
                  </div>
                  <div
                    className="p-3"
                    style={{ backgroundColor: "var(--color-surface-primary)" }}
                  >
                    <code className="text-green-400">&quot;base&quot;</code>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
