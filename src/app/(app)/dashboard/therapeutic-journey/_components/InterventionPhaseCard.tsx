import React from "react";

import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function InterventionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={2}
            variant="intervention"
            title="Intervention Phase"
            subtitle="Sessions 3-10"
            items={[
                "Use reframing techniques to clarify key concepts.",
                "Propose concrete, personalized strategies for the patient.",
                "Maintain a collaborative and engaging approach.",
                "Monitor progress and adapt interventions accordingly."
            ]}
            className={className}
            style={style}
        />
    );
}
