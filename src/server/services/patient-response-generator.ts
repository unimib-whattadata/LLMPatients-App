/**
 * Patient Response Generator Service
 * 
 * This service handles patient response generation with support for:
 * - External AI model integration (when available)
 * - Fallback to predefined responses
 * - Mock responses for development
 */

export interface PatientResponse {
  message: string;
  emotion: "anger" | "anticipation" | "disgust" | "joy" | "sadness" | "surprise" | "trust" | "base";
  timestamp?: Date; // Make timestamp optional for predefined responses
}

export interface PatientInitializationResponse {
  status: "success" | "error";
  code: string;
  external_patient_id?: string;
  message: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  reasoning_time: number; // in seconds
  emotion: "anger" | "anticipation" | "disgust" | "joy" | "sadness" | "surprise" | "trust" | "base";
  topic: string;
  timestamp: string;
}

export interface ChatRequest {
  external_patient_id: string;
  user_message: string;
  session_id: string;
  step_id: number;
}

export interface PatientInfo {
  id: string;
  name: string;
  age: number;
  gender: string;
  diagnosis: string;
  difficulty: number;
  psychologicalProfile: string;
  background: string;
  currentMedications?: string[];
  therapyGoals?: string[];
  previousSessions?: number;
}

export interface GenerateResponseInput {
  patientInfo: PatientInfo;
  userMessage: string;
  stepId: number;
  sessionId: string;
  conversationHistory?: Array<{
    content: string;
    sender: "user" | "patient";
    timestamp: Date;
  }>;
}

export interface InitializePatientInput {
  patientInfo: PatientInfo;
  sessionId: string;
}

/**
 * Enhanced predefined responses for each patient
 * These will be used as fallback when external AI is not available
 */
const ENHANCED_PATIENT_RESPONSES: Record<string, PatientResponse[]> = {
  John: [
    { message: "Capisco la sua preoccupazione. È difficile gestire tutto questo stress...", emotion: "sadness" },
    { message: "Lei ha ragione, dovrei essere più proattivo. Ma a volte mi sento sopraffatto.", emotion: "anticipation" },
    { message: "Grazie per il suo supporto. Mi aiuta sapere che non sono solo in questo.", emotion: "trust" },
    { message: "Quando parlo di questi problemi, mi sento un po' meglio. È come se non fossi più solo.", emotion: "trust" },
    { message: "A volte penso che sia tutto nella mia testa. Ma poi ricordo che i sintomi sono reali.", emotion: "sadness" },
    { message: "Mia moglie dice che sono cambiato. Forse ha ragione, ma non so come tornare indietro.", emotion: "sadness" },
    { message: "Il lavoro mi sta consumando. Ogni giorno è una lotta per mantenere la concentrazione.", emotion: "anticipation" },
    { message: "Lei mi fa riflettere su cose che non avevo mai considerato. È... illuminante.", emotion: "surprise" },
  ],
  "Juanita Delgado": [
    { message: "Non so se ha senso parlare di questo. Ma forse... forse può aiutare.", emotion: "base" },
    { message: "Lei sembra capire. È raro trovare qualcuno che non mi giudichi.", emotion: "trust" },
    { message: "A volte mi sento così arrabbiata con tutto. Non so come gestire questa rabbia.", emotion: "anger" },
    { message: "È strano, ma quando parlo con lei mi sento meno sola. Non so perché.", emotion: "trust" },
    { message: "Tutto sembra così complicato. A volte vorrei solo scappare da tutto.", emotion: "sadness" },
    { message: "Lei mi fa delle domande che non mi sono mai posta. È... interessante.", emotion: "surprise" },
    { message: "La rabbia mi divora dall'interno. Non so come fermarla.", emotion: "anger" },
    { message: "Forse c'è speranza. Non lo so, ma per la prima volta non mi sento completamente persa.", emotion: "trust" },
  ],
  Todd: [
    { message: "Mi dispiace, è difficile per me parlare di queste cose. Mi sento così ansioso...", emotion: "anticipation" },
    { message: "Grazie per la sua pazienza. So che non è facile con me.", emotion: "sadness" },
    { message: "Quando lei mi fa queste domande, mi sento meno solo. È confortante.", emotion: "trust" },
    { message: "A volte ho paura di dire la cosa sbagliata. Ma lei non mi giudica.", emotion: "trust" },
    { message: "Il mio cuore batte forte quando parlo di certe cose. È normale?", emotion: "anticipation" },
    { message: "Dopo che papà è morto, tutto è cambiato. Non sono mai più riuscito a sentirmi sicuro.", emotion: "sadness" },
    { message: "Uscire di casa è diventato una sfida. L'ansia mi paralizza.", emotion: "anticipation" },
    { message: "Lei mi sta aiutando a capire cose su me stesso che non sapevo.", emotion: "surprise" },
  ],
};

/**
 * Context-aware response selection
 * Analyzes conversation history to select more appropriate responses
 */
function selectContextualResponse(
  patientInfo: PatientInfo,
  userMessage: string, 
  conversationHistory: GenerateResponseInput['conversationHistory'] = []
): PatientResponse {
  const responses = ENHANCED_PATIENT_RESPONSES[patientInfo.name] || [
    { message: "Interessante. Puoi elaborare ulteriormente?", emotion: "base" as const },
  ];

  // Simple keyword-based context analysis
  const userMessageLower = userMessage.toLowerCase();
  const recentMessages = conversationHistory.slice(-3).map(m => m.content.toLowerCase()).join(' ');

  // Filter responses based on context
  let filteredResponses = responses;

  // If user mentions specific topics, try to match responses
  if (userMessageLower.includes('famiglia') || userMessageLower.includes('moglie') || userMessageLower.includes('familiare')) {
    filteredResponses = responses.filter(r => 
      r.message.toLowerCase().includes('moglie') || 
      r.message.toLowerCase().includes('famiglia') ||
      r.message.toLowerCase().includes('papà')
    );
  }

  if (userMessageLower.includes('lavoro') || userMessageLower.includes('ufficio')) {
    filteredResponses = responses.filter(r => 
      r.message.toLowerCase().includes('lavoro') || 
      r.message.toLowerCase().includes('competente')
    );
  }

  if (userMessageLower.includes('ansia') || userMessageLower.includes('paura') || userMessageLower.includes('nervoso')) {
    filteredResponses = responses.filter(r => 
      r.message.toLowerCase().includes('ansioso') || 
      r.message.toLowerCase().includes('paura') ||
      r.message.toLowerCase().includes('battito')
    );
  }

  if (userMessageLower.includes('rabbia') || userMessageLower.includes('arrabbiato') || userMessageLower.includes('frustrato')) {
    filteredResponses = responses.filter(r => 
      r.message.toLowerCase().includes('rabbia') || 
      r.message.toLowerCase().includes('arrabbiata')
    );
  }

  if (userMessageLower.includes('speranza') || userMessageLower.includes('migliorare') || userMessageLower.includes('aiuto')) {
    filteredResponses = responses.filter(r => 
      r.message.toLowerCase().includes('speranza') || 
      r.message.toLowerCase().includes('aiuto') ||
      r.message.toLowerCase().includes('migliore')
    );
  }

  // If no contextual matches, use all responses
  if (filteredResponses.length === 0) {
    filteredResponses = responses;
  }

  // Select random response from filtered set and add timestamp
  const selectedResponse = filteredResponses[Math.floor(Math.random() * filteredResponses.length)];
  if (!selectedResponse) {
    // Fallback if no response found
    return {
      message: "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
      emotion: "base" as const,
      timestamp: new Date(),
    };
  }
  return {
    message: selectedResponse.message,
    emotion: selectedResponse.emotion,
    timestamp: new Date(),
  };
}

/**
 * External AI integration interface
 * This will be implemented when the external AI model is available
 */
export interface ExternalAIService {
  generateResponse(input: GenerateResponseInput): Promise<PatientResponse>;
  initializePatient(input: InitializePatientInput): Promise<PatientInitializationResponse>;
  generateChatResponse(input: ChatRequest): Promise<ChatResponse>;
}

/**
 * Mock external AI service for development
 * Simulates external AI with enhanced responses
 */
class MockExternalAIService implements ExternalAIService {
  async generateResponse(input: GenerateResponseInput): Promise<PatientResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    
    // Log the simulated API call for debugging
    console.log('Simulating External AI API Call:', {
      url: 'https://api.therapeutic-ai.com/v1/initialise-patient',
      method: 'POST',
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
        psychologicalProfile: input.patientInfo.psychologicalProfile
      },
      sessionId: input.sessionId,
      stepId: input.stepId,
      userMessage: input.userMessage.substring(0, 50) + '...'
    });
    
    // Use contextual response selection
    return selectContextualResponse(input.patientInfo, input.userMessage, input.conversationHistory);
  }

  async initializePatient(input: InitializePatientInput): Promise<PatientInitializationResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    // Log the simulated API call for debugging
    console.log('Simulating Patient Initialization API Call:', {
      url: 'https://api.therapeutic-ai.com/v1/initialise-patient',
      method: 'POST',
      patientInfo: {
        id: input.patientInfo.id,
        name: input.patientInfo.name,
        age: input.patientInfo.age,
        diagnosis: input.patientInfo.diagnosis,
        difficulty: input.patientInfo.difficulty,
        psychologicalProfile: input.patientInfo.psychologicalProfile
      },
      sessionId: input.sessionId
    });
    
    // Simulate successful patient creation
    return {
      status: "success",
      code: "PATIENT_CREATED",
      external_patient_id: `ext_patient_${Date.now()}`,
      message: "Paziente inizializzato correttamente nel sistema esterno",
      timestamp: new Date().toISOString()
    };
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    // Log the exact JSON being sent to external AI service (simulated)
    console.log('Simulating External AI Chat Response API Call with JSON:', JSON.stringify(input, null, 2));
    
    // Log the simulated API call for debugging
    console.log('Simulating Chat Response API Call:', {
      url: 'https://api.therapeutic-ai.com/v1/chat-response',
      method: 'POST',
      external_patient_id: input.external_patient_id,
      user_message: input.user_message.substring(0, 50) + '...',
      session_id: input.session_id,
      step_id: input.step_id
    });
    
    // Simulate chat response with reasoning time
    const topics = ["ansia", "depressione", "famiglia", "lavoro", "relazioni", "terapia", "farmaci", "sonno"];
    const emotions = ["sadness", "anger", "anticipation", "trust", "surprise", "joy", "base", "disgust"];
    
    const sampleResponses = [
      "Capisco la sua preoccupazione. È normale sentirsi così in questa situazione.",
      "Mi fa piacere che lei mi stia ascoltando. A volte è difficile esprimere questi sentimenti.",
      "Quando parlo di queste cose, mi sento un po' meglio. È come se non fossi più solo.",
      "Lei mi sta aiutando a capire cose su me stesso che non sapevo.",
      "A volte ho paura di dire la cosa sbagliata, ma lei non mi giudica.",
      "Grazie per la sua pazienza. So che non è facile con me.",
      "Quando lei mi fa queste domande, mi sento meno solo. È confortante.",
      "Il mio cuore batte forte quando parlo di certe cose. È normale?"
    ];
    
    const selectedResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)] || "Mi dispiace, non sono sicuro di come rispondere.";
    const selectedEmotion = emotions[Math.floor(Math.random() * emotions.length)] || "base";
    const selectedTopic = topics[Math.floor(Math.random() * topics.length)] || "generale";
    
    return {
      message: selectedResponse,
      reasoning_time: Math.floor(Math.random() * 3) + 1, // 1-3 seconds
      emotion: selectedEmotion as "anger" | "anticipation" | "disgust" | "joy" | "sadness" | "surprise" | "trust" | "base",
      topic: selectedTopic,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Real external AI service (to be implemented)
 * This will integrate with the actual external AI model
 */
class RealExternalAIService implements ExternalAIService {
  private apiUrl = 'https://api.therapeutic-ai.com/v1/initialise-patient';
  private apiKey = process.env.EXTERNAL_AI_API_KEY;

  async generateResponse(input: GenerateResponseInput): Promise<PatientResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0'
        },
        body: JSON.stringify({
          id: input.patientInfo.id,
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
          diagnosis: input.patientInfo.diagnosis,
          difficulty_level: input.patientInfo.difficulty,
          psychological_profile: input.patientInfo.psychologicalProfile,
          background: input.patientInfo.background,
          current_medications: input.patientInfo.currentMedications || [],
          therapy_goals: input.patientInfo.therapyGoals || [],
          previous_sessions: input.patientInfo.previousSessions || 0,
          session_id: input.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`External AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        message: data.response.message,
        emotion: data.response.emotion,
        timestamp: new Date(data.response.timestamp || new Date())
      };
    } catch (error) {
      console.error("External AI API call failed:", error);
      throw error;
    }
  }

  async initializePatient(input: InitializePatientInput): Promise<PatientInitializationResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0'
        },
        body: JSON.stringify({
          id: input.patientInfo.id,
          name: input.patientInfo.name,
          age: input.patientInfo.age,
          gender: input.patientInfo.gender,
          diagnosis: input.patientInfo.diagnosis,
          difficulty_level: input.patientInfo.difficulty,
          psychological_profile: input.patientInfo.psychologicalProfile,
          background: input.patientInfo.background,
          current_medications: input.patientInfo.currentMedications || [],
          therapy_goals: input.patientInfo.therapyGoals || [],
          previous_sessions: input.patientInfo.previousSessions || 0,
          session_id: input.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`External AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        status: data.status,
        code: data.code,
        external_patient_id: data.external_patient_id,
        message: data.message,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error("External AI API call failed:", error);
      throw error;
    }
  }

  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error("External AI API key not configured");
    }

    try {
      // Log the exact JSON being sent to external AI service
      console.log('Calling External AI Chat Response API with JSON:', JSON.stringify(input, null, 2));
      
      const response = await fetch('https://api.therapeutic-ai.com/v1/chat-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-API-Version': '1.0'
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error(`External AI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        message: data.message,
        reasoning_time: data.reasoning_time,
        emotion: data.emotion,
        topic: data.topic,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error("External AI API call failed:", error);
      throw error;
    }
  }
}

/**
 * Main patient response generator
 * Handles fallback logic between external AI and predefined responses
 */
export class PatientResponseGenerator {
  private externalAI: ExternalAIService;
  private useExternalAI: boolean;

  constructor(useExternalAI: boolean = false) {
    this.useExternalAI = useExternalAI;
    this.externalAI = useExternalAI 
      ? new RealExternalAIService() 
      : new MockExternalAIService();
  }

  /**
   * Generate a patient response
   * Tries external AI first, falls back to predefined responses
   */
  async generateResponse(input: GenerateResponseInput): Promise<PatientResponse> {
    try {
      if (this.useExternalAI) {
        return await this.externalAI.generateResponse(input);
      } else {
        // Use enhanced mock service
        return await this.externalAI.generateResponse(input);
      }
    } catch (error) {
      console.error("Error generating patient response:", error);
      
      // Fallback to simple predefined response
      const fallbackResponses = ENHANCED_PATIENT_RESPONSES[input.patientInfo.name] || [
        { message: "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?", emotion: "base" as const },
      ];
      
      const selectedResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      if (!selectedResponse) {
        // Fallback if no response found
        return {
          message: "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
          emotion: "base" as const,
          timestamp: new Date(),
        };
      }
      return {
        message: selectedResponse.message,
        emotion: selectedResponse.emotion,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update the external AI service
   * Call this when the external AI becomes available
   */
  setExternalAI(service: ExternalAIService) {
    this.externalAI = service;
    this.useExternalAI = true;
  }

  /**
   * Enable/disable external AI
   */
  setUseExternalAI(use: boolean) {
    this.useExternalAI = use;
  }

  /**
   * Initialize patient in external AI service
   * This is the Step 1 - Patient Initialization
   */
  async initializePatient(input: InitializePatientInput): Promise<PatientInitializationResponse> {
    try {
      if (this.useExternalAI) {
        return await this.externalAI.initializePatient(input);
      } else {
        // Use enhanced mock service
        return await this.externalAI.initializePatient(input);
      }
    } catch (error) {
      console.error("Error initializing patient:", error);
      
      // Fallback response
      return {
        status: "error",
        code: "INITIALIZATION_FAILED",
        message: "Errore durante l'inizializzazione del paziente nel servizio esterno",
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate chat response for ongoing conversation
   * This is the Step 2 - Chat Response Generation
   */
  async generateChatResponse(input: ChatRequest): Promise<ChatResponse> {
    try {
      if (this.useExternalAI) {
        return await this.externalAI.generateChatResponse(input);
      } else {
        // Use enhanced mock service
        return await this.externalAI.generateChatResponse(input);
      }
    } catch (error) {
      console.error("Error generating chat response:", error);
      
      // Fallback response
      return {
        message: "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
        reasoning_time: 0,
        emotion: "base",
        topic: "generale",
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const patientResponseGenerator = new PatientResponseGenerator(false); // Start with mock
