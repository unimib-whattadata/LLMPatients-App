CREATE TABLE "llmpatient_account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "llmpatient_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"senderId" text NOT NULL,
	"message" text NOT NULL,
	"messageType" text DEFAULT 'text' NOT NULL,
	"metadata" json,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llmpatient_patients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"medicalHistory" text,
	"currentMedications" text,
	"allergies" text,
	"emergencyContact" text,
	"phone" text,
	"email" text,
	"address" text,
	"notes" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llmpatient_session" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionToken" text NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "llmpatient_session_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE "llmpatient_therapySessions" (
	"id" text PRIMARY KEY NOT NULL,
	"patientId" text NOT NULL,
	"therapistId" text NOT NULL,
	"sessionDate" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"sessionType" text NOT NULL,
	"notes" text,
	"goals" text,
	"progress" text,
	"homework" text,
	"nextSessionDate" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llmpatient_userActivity" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"resource" text,
	"details" json,
	"ipAddress" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llmpatient_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"image" text,
	"password" text,
	"role" text DEFAULT 'patient' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llmpatient_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "llmpatient_verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "llmpatient_account" ADD CONSTRAINT "llmpatient_account_userId_llmpatient_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."llmpatient_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD CONSTRAINT "llmpatient_chat_sessionId_llmpatient_therapySessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."llmpatient_therapySessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_chat" ADD CONSTRAINT "llmpatient_chat_senderId_llmpatient_user_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."llmpatient_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_session" ADD CONSTRAINT "llmpatient_session_userId_llmpatient_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."llmpatient_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_therapySessions" ADD CONSTRAINT "llmpatient_therapySessions_patientId_llmpatient_patients_id_fk" FOREIGN KEY ("patientId") REFERENCES "public"."llmpatient_patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_therapySessions" ADD CONSTRAINT "llmpatient_therapySessions_therapistId_llmpatient_user_id_fk" FOREIGN KEY ("therapistId") REFERENCES "public"."llmpatient_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llmpatient_userActivity" ADD CONSTRAINT "llmpatient_userActivity_userId_llmpatient_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."llmpatient_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "llmpatient_account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_idx" ON "llmpatient_account" USING btree ("provider","providerAccountId");--> statement-breakpoint
CREATE INDEX "chat_sessionId_idx" ON "llmpatient_chat" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "chat_senderId_idx" ON "llmpatient_chat" USING btree ("senderId");--> statement-breakpoint
CREATE INDEX "chat_createdAt_idx" ON "llmpatient_chat" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "patients_name_idx" ON "llmpatient_patients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "patients_isActive_idx" ON "llmpatient_patients" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_idx" ON "llmpatient_session" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "llmpatient_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "therapySessions_patientId_idx" ON "llmpatient_therapySessions" USING btree ("patientId");--> statement-breakpoint
CREATE INDEX "therapySessions_therapistId_idx" ON "llmpatient_therapySessions" USING btree ("therapistId");--> statement-breakpoint
CREATE INDEX "therapySessions_sessionDate_idx" ON "llmpatient_therapySessions" USING btree ("sessionDate");--> statement-breakpoint
CREATE INDEX "therapySessions_status_idx" ON "llmpatient_therapySessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "userActivity_userId_idx" ON "llmpatient_userActivity" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "userActivity_action_idx" ON "llmpatient_userActivity" USING btree ("action");--> statement-breakpoint
CREATE INDEX "userActivity_createdAt_idx" ON "llmpatient_userActivity" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "email_idx" ON "llmpatient_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "role_idx" ON "llmpatient_user" USING btree ("role");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_token_idx" ON "llmpatient_verificationToken" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_identifier_token_idx" ON "llmpatient_verificationToken" USING btree ("identifier","token");