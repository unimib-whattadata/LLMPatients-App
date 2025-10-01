import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Patient Response Generator - Documentazione",
  description: "Documentazione completa del servizio Patient Response Generator",
};

export default function PatientResponseGeneratorDocs() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-page-background)' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--color-surface-primary)' }}>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Patient Response Generator
            </h1>
            <p className="text-xl mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Documentazione del servizio per la generazione di risposte dinamiche dei pazienti virtuali
            </p>
            <span className="inline-block text-white px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--color-primary-green)' }}>
              v1.0.0
            </span>
          </div>

          {/* Descrizione della documentazione */}
          <div className="rounded-xl p-6 mb-8" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Descrizione della documentazione</h2>
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Questa documentazione fornisce le specifiche tecniche per l'implementazione del servizio esterno di generazione risposte pazienti. Il servizio <strong>Patient Response Generator</strong> attualmente simula le chiamate API e fornisce le specifiche complete per l'integrazione con il servizio AI esterno.
            </p>
            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface-tertiary)', borderLeft: '4px solid var(--color-primary-yellow)' }}>
              <div className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Per gli sviluppatori del servizio esterno:</div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                Questa documentazione contiene tutte le informazioni necessarie per implementare l'API esterna che riceverà le chiamate dal Patient Response Generator.
              </div>
            </div>
          </div>

          {/* Passo 1 */}
          <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Passo 1</h2>
            

            {/* URL chiamato */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>URL chiamato</h3>
              <div className="p-4 rounded-lg font-mono text-sm overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-primary-green)' }}>
                <div className="mb-2">POST https://api.therapeutic-ai.com/v1/initialise-patient</div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Headers:</div>
                <div className="ml-4 text-xs">Authorization: Bearer {`{API_KEY}`}</div>
                <div className="ml-4 text-xs">Content-Type: application/json</div>
                <div className="ml-4 text-xs">X-API-Version: 1.0</div>
              </div>
            </div>

            {/* Informazioni passate */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Informazioni passate</h3>
              <div className="p-4 rounded-lg font-mono text-sm overflow-x-auto" style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-text-primary)' }}>
                <div>{`{`}</div>
                <div className="ml-4">patient: {`{`}</div>
                <div className="ml-8">id: "patient-123",</div>
                <div className="ml-8">name: "John",</div>
                <div className="ml-8">age: 45,</div>
                <div className="ml-8">gender: "male",</div>
                <div className="ml-8">diagnosis: "Disturbo d'ansia generalizzato",</div>
                <div className="ml-8">difficulty_level: 2,</div>
                <div className="ml-8">psychological_profile: "Stress cronico",</div>
                <div className="ml-8">background: "Storia clinica dettagliata...",</div>
                <div className="ml-8">current_medications: ["SSRI"],</div>
                <div className="ml-8">therapy_goals: ["Gestione stress", "Migliorare sonno"],</div>
                <div className="ml-8">previous_sessions: 0</div>
                <div className="ml-4">{`},`}</div>
                <div className="ml-4">session: {`{`}</div>
                <div className="ml-8">id: "session-456",</div>
                <div className="ml-8">step_id: 1,</div>
                <div className="ml-8">conversation_history: [</div>
                <div className="ml-12">{`{`} content: "Come ti senti oggi?", sender: "user", timestamp: "2024-01-15T10:30:00.000Z" {`}`},</div>
                <div className="ml-12">{`{`} content: "Oggi è difficile...", sender: "patient", timestamp: "2024-01-15T10:30:15.000Z" {`}`}</div>
                <div className="ml-8">]</div>
                <div className="ml-4">{`},`}</div>
                <div className="ml-4">user_message: "Come ti senti oggi?",</div>
                <div className="ml-4">timestamp: "2024-01-15T10:30:00.000Z"</div>
                <div>{`}`}</div>
              </div>
            </div>

            {/* Risposta attesa */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Risposta attesa</h3>
              <div className="p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4" style={{ backgroundColor: 'var(--color-surface-tertiary)', color: 'var(--color-primary-green)' }}>
                <div>{`{`}</div>
                <div className="ml-4">response: {`{`}</div>
                <div className="ml-8">message: "Oggi è un giorno difficile. Mi sento sopraffatto da tutto quello che devo fare al lavoro e a casa.",</div>
                <div className="ml-8">emotion: "sadness",</div>
                <div className="ml-8">timestamp: "2024-01-15T10:30:15.000Z"</div>
                <div className="ml-4">{`},`}</div>
                <div className="ml-4">metadata: {`{`}</div>
                <div className="ml-8">processing_time: 1.2,</div>
                <div className="ml-8">model_version: "v2.1",</div>
                <div className="ml-8">confidence: 0.87</div>
                <div className="ml-4">{`}`}</div>
                <div>{`}`}</div>
              </div>
              
              <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface-tertiary)', borderLeft: '4px solid var(--color-primary-yellow)' }}>
                <div className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Requisiti per il servizio esterno:</div>
                <ul className="list-disc list-inside space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <li>Il servizio deve generare risposte contestuali basate sul profilo psicologico del paziente</li>
                  <li>L'emozione deve essere determinata dal contesto della conversazione e dal profilo del paziente</li>
                  <li>Il timestamp deve essere generato al momento della risposta</li>
                  <li>Il tempo di risposta dovrebbe essere ragionevole (sotto i 5 secondi)</li>
                  <li>Il servizio deve gestire errori e restituire codici HTTP appropriati</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
