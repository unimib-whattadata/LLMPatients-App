import React from "react";

import { PhaseCard } from "~/components/dashboard/PhaseCard";

export function ConclusionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <PhaseCard
            phase={3}
            variant="conclusion"
            title="Conclusion"
            subtitle="Session 11"
            items={[
                "Summarize the key points that emerged throughout the therapeutic journey.",
                "Evaluate with the patient the effectiveness of the implemented strategies.",
                "Plan possible follow-ups or post-therapy deep dives."
            ]}
            className={className}
            style={style}
        />
    );
}
