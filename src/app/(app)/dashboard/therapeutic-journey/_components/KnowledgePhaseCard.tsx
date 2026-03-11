import React from "react";
import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function KnowledgePhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={1}
            variant="knowledge"
            title="Tips to be a good therapist"
            subtitle="Sessions 1-2"
            items={[
                "Listen actively to the patient without interrupting their narrative.",
                "Build a therapeutic alliance based on trust and acceptance.",
                "Maintain an empathic, non-judgmental attitude to encourage openness."
            ]}
            className={className}
            style={style}
        />
    );
}
