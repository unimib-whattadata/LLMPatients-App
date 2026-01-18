import React from "react";

import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function ConclusionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={3}
            variant="conclusion"
            title="Conclusione"
            subtitle="Seduta 11"
            items={[
                "Riassumi i punti chiave emersi durante l'intero percorso terapeutico.",
                "Valuta insieme al paziente l'efficacia delle strategie implementate.",
                "Pianifica eventuali follow-up o approfondimenti post-terapia."
            ]}
            className={className}
            style={style}
        />
    );
}
