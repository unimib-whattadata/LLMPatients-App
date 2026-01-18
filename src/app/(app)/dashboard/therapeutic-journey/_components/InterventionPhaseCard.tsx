import React from "react";

import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function InterventionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={2}
            variant="intervention"
            title="Fase di Intervento"
            subtitle="Sedute 3-10"
            items={[
                "Utilizza tecniche di riformulazione per chiarire i concetti.",
                "Proponi strategie concrete e personalizzate per il paziente.",
                "Mantieni un approccio collaborativo e coinvolgente.",
                "Monitora i progressi e adatta l'intervento di conseguenza."
            ]}
            className={className}
            style={style}
        />
    );
}
