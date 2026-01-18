import React from "react";
import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function KnowledgePhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={1}
            variant="knowledge"
            title="Consigli per essere un buon terapeuta"
            subtitle="Sedute 1-2"
            items={[
                "Ascolta attivamente il paziente senza interrompere la narrazione.",
                "Costruisci un'alleanza terapeutica basata sulla fiducia e l'accoglienza.",
                "Mantieni un atteggiamento empatico e non giudicante per favorire l'apertura."
            ]}
            className={className}
            style={style}
        />
    );
}
