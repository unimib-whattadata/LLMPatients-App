import type { ServiceType } from "./types";

export class PatientResponseGeneratorError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: string;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = "PatientResponseGeneratorError";
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

export class APIConfigurationError extends PatientResponseGeneratorError {
  constructor(message: string = "API configuration error") {
    super(message, "API_CONFIG_ERROR", 500);
    this.name = "APIConfigurationError";
  }
}

export class ExternalAIServiceError extends PatientResponseGeneratorError {
  public readonly serviceType: ServiceType;
  public readonly requestId?: string;

  constructor(
    message: string,
    serviceType: ServiceType,
    requestId?: string,
    statusCode: number = 502,
  ) {
    super(message, "EXTERNAL_AI_ERROR", statusCode);
    this.name = "ExternalAIServiceError";
    this.serviceType = serviceType;
    this.requestId = requestId;
  }
}

export class PatientInitializationError extends PatientResponseGeneratorError {
  public readonly patientId: string;

  constructor(message: string, patientId: string, statusCode: number = 400) {
    super(message, "PATIENT_INITIALIZATION_ERROR", statusCode);
    this.name = "PatientInitializationError";
    this.patientId = patientId;
  }
}

export class ResponseGenerationError extends PatientResponseGeneratorError {
  public readonly patientId: string;
  public readonly stepId: number;

  constructor(
    message: string,
    patientId: string,
    stepId: number,
    statusCode: number = 500,
  ) {
    super(message, "RESPONSE_GENERATION_ERROR", statusCode);
    this.name = "ResponseGenerationError";
    this.patientId = patientId;
    this.stepId = stepId;
  }
}
