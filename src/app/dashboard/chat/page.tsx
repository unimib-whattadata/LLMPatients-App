import Link from "next/link";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SharedLayout } from "@/components/layout/SharedLayout";

// Mock data for virtual patients - in a real app this would come from the database
const virtualPatients = [
  {
    id: "john",
    name: "John",
    description: "Paziente con ansia generalizzata",
    image: "/images/patients/john.png",
    difficulty: "Intermedio",
  },
  {
    id: "juanita",
    name: "Juanita",
    description: "Paziente con depressione",
    image: "/images/patients/juanita.png",
    difficulty: "Avanzato",
  },
  {
    id: "todd",
    name: "Todd",
    description: "Paziente con disturbo bipolare",
    image: "/images/patients/todd.png",
    difficulty: "Principiante",
  },
];

function ChatSelectionContent() {
  return (
    <div className="dashboard-main">
      <div className="dashboard-card">
        <div className="dashboard-card-title">
          Seleziona un Paziente Virtuale per la Chat
        </div>
        <p className="text-text-secondary mb-8">
          Scegli un paziente virtuale per iniziare una conversazione e praticare le tue abilità terapeutiche.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {virtualPatients.map((patient) => (
            <Link
              key={patient.id}
              href={`/dashboard/chat/${patient.id}`}
              className="group block"
            >
              <div className="dashboard-stat-card hover:bg-surface-primary transition-colors duration-200 cursor-pointer">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-border-primary">
                    <img
                      src={patient.image}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {patient.name}
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    {patient.description}
                  </p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    patient.difficulty === "Principiante" 
                      ? "bg-success-100 text-success-800"
                      : patient.difficulty === "Intermedio"
                      ? "bg-warning-100 text-warning-800"
                      : "bg-danger-100 text-danger-800"
                  }`}>
                    {patient.difficulty}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ChatPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login?error=session-invalid&from=chat");
  }

  return (
    <SharedLayout
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email!,
        role: session.user.role,
        image: session.user.image,
      }}
      impersonation={session.impersonation ?? undefined}
      layoutType="dashboard"
      currentPage="/dashboard/chat"
    >
      <Suspense fallback={
        <div className="dashboard-main">
          <div className="dashboard-card">
            <div className="text-center">
              <div className="rounded-full h-12 w-12 border-b-2 border-success-600 mx-auto mb-4"></div>
              <p className="text-text-secondary">Loading chat selection...</p>
            </div>
          </div>
        </div>
      }>
        <ChatSelectionContent />
      </Suspense>
    </SharedLayout>
  );
}
