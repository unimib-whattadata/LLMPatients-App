import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Integration Guide - Patient Response Generator",
  description: "Complete technical documentation for external AI service integration with patient response generation system",
};

export default function PatientResponseGeneratorDocs() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-background)' }}>
      <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
              API Integration Guide
            </h1>
            <p className="text-3xl mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Patient Response Generator
            </p>
            <p className="text-xl max-w-4xl mx-auto leading-relaxed mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
              Complete technical documentation for implementing external AI services that generate contextual patient responses in therapeutic conversations.
            </p>
          </header>

          {/* Authentication */}
          <section className="p-10 shadow-xl mb-16" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <header className="flex items-center mb-10">
              <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl mr-6" style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Authentication</h2>
                <p className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>API authentication and security requirements</p>
              </div>
            </header>

            <div className="p-6" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>API Key</h3>
              <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                All requests must include a valid API key in the Authorization header.
              </p>
              <div className="p-4 font-mono text-sm" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
                <div>Authorization: Bearer {`{YOUR_API_KEY}`}</div>
              </div>
            </div>
          </section>


          {/* Passo 1 */}
          <section className="p-10 shadow-xl mb-16" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <header className="flex items-center mb-10">
              <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl mr-6" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                1
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Patient Initialization</h2>
                <p className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>Initialize patient in external AI service</p>
              </div>
            </header>

            {/* URL chiamato */}
            <section className="mb-12">
              <h3 className="text-3xl font-bold mb-8 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <div className="w-8 h-8 flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                API Endpoint
              </h3>
              <div className="p-8 font-mono text-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                <div className="mb-6">
                  <span className="px-4 py-2 text-sm font-semibold mr-4" style={{ backgroundColor: 'var(--color-primary-green)', color: 'white' }}>POST</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>https://api.therapeutic-ai.com/v1/initialise-patient</span>
                </div>
                <div className="text-lg mb-4 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Required Headers:</div>
                <div className="ml-6 text-lg space-y-3">
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>Authorization:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>Bearer {`{API_KEY}`}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>Content-Type:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>application/json</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>X-API-Version:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>1.0</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Informazioni passate */}
            <section className="mb-10">
              <h3 className="text-xl font-bold mb-6 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-3 h-3 mr-3" style={{ backgroundColor: 'var(--color-primary-green)' }}></span>
                Informazioni passate
              </h3>
              
              {/* Struttura JSON */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-1.5 h-1.5 mr-2" style={{ backgroundColor: 'var(--color-primary-yellow)' }}></span>
                  Struttura del JSON
                </h4>
                <div className="p-6 font-mono text-base overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                  <div className="text-blue-400">{"{"}</div>
                  <div className="ml-4"><span className="text-purple-400">id:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">name:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">age:</span> <span className="text-orange-400">number</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">gender:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">diagnosis:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">difficulty_level:</span> <span className="text-orange-400">number</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">psychological_profile:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">background:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">current_medications:</span> <span className="text-orange-400">string[]</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">therapy_goals:</span> <span className="text-orange-400">string[]</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">previous_sessions:</span> <span className="text-orange-400">number</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">session_id:</span> <span className="text-orange-400">string</span></div>
                  <div className="text-blue-400">{"}"}</div>
                </div>
              </div>

              {/* Esempio reale */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-1.5 h-1.5 mr-2" style={{ backgroundColor: 'var(--color-primary-yellow)' }}></span>
                  Esempio reale
                </h4>
                <div className="p-6 font-mono text-sm overflow-x-auto mb-4" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                  <div className="text-blue-400">{"{"}</div>
                  <div className="ml-4"><span className="text-purple-400">"id":</span> <span className="text-green-400">"patient-123"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"name":</span> <span className="text-green-400">"John"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"age":</span> <span className="text-orange-400">45</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"gender":</span> <span className="text-green-400">"male"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"diagnosis":</span> <span className="text-green-400">"Disturbo d'ansia generalizzato"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"difficulty_level":</span> <span className="text-orange-400">2</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"psychological_profile":</span> <span className="text-green-400">"Stress cronico"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"background":</span> <span className="text-green-400">"Storia clinica dettagliata..."</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"current_medications":</span> <span className="text-blue-400">[</span><span className="text-green-400">"SSRI"</span><span className="text-blue-400">]</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"therapy_goals":</span> <span className="text-blue-400">[</span><span className="text-green-400">"Gestione stress"</span><span className="text-gray-400">, </span><span className="text-green-400">"Migliorare sonno"</span><span className="text-blue-400">]</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"previous_sessions":</span> <span className="text-orange-400">0</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"session_id":</span> <span className="text-green-400">"session-456"</span></div>
                  <div className="text-blue-400">{"}"}</div>
                </div>
              </div>
            </section>

            {/* Risposta attesa */}
            <section className="mb-8">
              <h3 className="text-3xl font-bold mb-8 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <div className="w-8 h-8 flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Expected Response
              </h3>
              <div className="p-8 font-mono text-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4"><span className="text-purple-400">"status":</span> <span className="text-green-400">"success"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"code":</span> <span className="text-green-400">"PATIENT_CREATED"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"external_patient_id":</span> <span className="text-green-400">"ext_patient_789"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"message":</span> <span className="text-green-400">"Paziente inizializzato correttamente nel sistema esterno"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"timestamp":</span> <span className="text-green-400">"2024-01-15T10:30:15.000Z"</span></div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </section>
          </section>

          {/* Passo 2 */}
          <section className="p-10 shadow-xl" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <header className="flex items-center mb-10">
              <div className="w-16 h-16 flex items-center justify-center text-white font-bold text-2xl mr-6" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                2
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Chat Response Generation</h2>
                <p className="text-xl" style={{ color: 'var(--color-text-secondary)' }}>Generate contextual patient responses during conversation</p>
              </div>
            </header>

            {/* URL chiamato */}
            <section className="mb-12">
              <h3 className="text-3xl font-bold mb-8 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <div className="w-8 h-8 flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                API Endpoint
              </h3>
              <div className="p-8 font-mono text-lg overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                <div className="mb-6">
                  <span className="px-4 py-2 text-sm font-semibold mr-4" style={{ backgroundColor: 'var(--color-primary-green)', color: 'white' }}>POST</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>https://api.therapeutic-ai.com/v1/chat-response</span>
                </div>
                <div className="text-lg mb-4 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Required Headers:</div>
                <div className="ml-6 text-lg space-y-3">
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>Authorization:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>Bearer {`{API_KEY}`}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>Content-Type:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>application/json</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-32 font-semibold" style={{ color: 'var(--color-primary-green)' }}>X-API-Version:</span>
                    <span className="ml-4 px-3 py-1 text-sm" style={{ backgroundColor: 'var(--color-surface-primary)', color: 'var(--color-text-primary)' }}>1.0</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Informazioni passate */}
            <section className="mb-12">
              <h3 className="text-3xl font-bold mb-8 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <div className="w-8 h-8 flex items-center justify-center mr-4" style={{ backgroundColor: 'var(--color-primary-green)' }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Request Payload
              </h3>
              
              {/* Struttura JSON */}
              <div className="mb-8">
                <h4 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                  <div className="w-6 h-6 flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  JSON Schema
                </h4>
                <div className="p-6 font-mono text-base overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                  <div className="text-blue-400">{"{"}</div>
                  <div className="ml-4"><span className="text-purple-400">external_patient_id:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">user_message:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">session_id:</span> <span className="text-orange-400">string</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">step_id:</span> <span className="text-orange-400">number</span></div>
                  <div className="text-blue-400">{"}"}</div>
                </div>
              </div>

              {/* Esempio reale */}
              <div className="mb-8">
                <h4 className="text-2xl font-bold mb-6 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                  <div className="w-6 h-6 flex items-center justify-center mr-3" style={{ backgroundColor: 'var(--color-primary-yellow)' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Real Example
                </h4>
                <div className="p-6 font-mono text-sm overflow-x-auto mb-4" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                  <div className="text-blue-400">{"{"}</div>
                  <div className="ml-4"><span className="text-purple-400">"external_patient_id":</span> <span className="text-green-400">"ext_patient_789"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"user_message":</span> <span className="text-green-400">"Come ti senti oggi?"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"session_id":</span> <span className="text-green-400">"session-456"</span>,</div>
                  <div className="ml-4"><span className="text-purple-400">"step_id":</span> <span className="text-orange-400">2</span></div>
                  <div className="text-blue-400">{"}"}</div>
                </div>
              </div>
            </section>

            {/* Risposta attesa */}
            <section className="mb-6">
              <h3 className="text-xl font-bold mb-6 flex items-center" style={{ color: 'var(--color-text-primary)' }}>
                <span className="w-3 h-3 mr-3" style={{ backgroundColor: 'var(--color-primary-green)' }}></span>
                Risposta attesa
              </h3>
              <div className="p-6 font-mono text-base overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)' }}>
                <div className="text-blue-400">{"{"}</div>
                <div className="ml-4"><span className="text-purple-400">"message":</span> <span className="text-green-400">"Grazie per la sua domanda... A volte mi sento così confusa e non so bene come spiegare quello che provo. È come se avessi tante emozioni diverse che si mescolano insieme."</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"reasoning_time":</span> <span className="text-orange-400">3</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"emotion":</span> <span className="text-green-400">"confusion"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"topic":</span> <span className="text-green-400">"emozioni"</span>,</div>
                <div className="ml-4"><span className="text-purple-400">"timestamp":</span> <span className="text-green-400">"2024-01-15T10:30:20.000Z"</span></div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </section>
          </section>


      </div>
    </div>
  );
}
