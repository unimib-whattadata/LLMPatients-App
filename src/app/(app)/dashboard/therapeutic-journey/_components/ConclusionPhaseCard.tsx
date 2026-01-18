import React from "react";

export function ConclusionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={`flex flex-col items-start overflow-hidden rounded-[10px] border border-[#888888]/50 bg-[#232723] p-4 md:p-6 shadow-xl ${className}`}
            style={style}
        >
            <div className="relative flex w-full flex-col items-start gap-4 md:gap-4">
                {/* Header Phase Area */}
                <div className="flex w-full flex-col items-start gap-1 md:gap-1.5 leading-normal text-[#a7a0ca]">
                    <h3 className="font-serif text-lg md:text-xl font-bold not-italic">
                        Conclusione
                    </h3>
                    <p className="font-serif text-sm md:text-sm italic font-light">
                        Seduta 11
                    </p>
                </div>

                {/* Content Area */}
                <div className="flex w-full flex-col gap-2 md:gap-2 text-[#ECECEC]">
                    <h4 className="font-sans text-sm md:text-base font-bold leading-normal">
                        Consigli per essere un buon terapeuta
                    </h4>

                    <ul className="flex list-none flex-col gap-2 md:gap-2 font-sans text-xs md:text-xs leading-[1.5] md:leading-[1.5] pl-0">
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#a7a0ca' }} />
                            <span className="opacity-90">Riassumi i punti chiave emersi durante l&apos;intero percorso terapeutico.</span>
                        </li>
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#a7a0ca' }} />
                            <span className="opacity-90">Valuta insieme al paziente l&apos;efficacia delle strategie implementate.</span>
                        </li>
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#a7a0ca' }} />
                            <span className="opacity-90">Pianifica eventuali follow-up o approfondimenti post-terapia.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
