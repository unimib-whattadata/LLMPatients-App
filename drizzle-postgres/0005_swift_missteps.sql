CREATE TABLE "llmpatient_chat_step_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"therapySessionId" text NOT NULL,
	"stepNumber" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"analysisMode" text DEFAULT 'heuristic' NOT NULL,
	"modelName" text,
	"detectorVersion" text NOT NULL,
	"resultJson" text,
	"errorMessage" text,
	"analyzedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "llmpatient_chat_step_evaluation_therapySessionId_llmpatient_therapy_session_id_fk" FOREIGN KEY ("therapySessionId") REFERENCES "public"."llmpatient_therapy_session"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "chat_step_evaluation_session_idx" ON "llmpatient_chat_step_evaluation" USING btree ("therapySessionId");--> statement-breakpoint
CREATE INDEX "chat_step_evaluation_status_idx" ON "llmpatient_chat_step_evaluation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "chat_step_evaluation_analyzed_at_idx" ON "llmpatient_chat_step_evaluation" USING btree ("analyzedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_step_evaluation_session_step_idx" ON "llmpatient_chat_step_evaluation" USING btree ("therapySessionId","stepNumber");
