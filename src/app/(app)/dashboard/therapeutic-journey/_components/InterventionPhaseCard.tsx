import React from "react";

export function InterventionPhaseCard({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div
            className={`flex flex-col items-start overflow-hidden rounded-[10px] border border-[#888888]/50 bg-[#232723] p-4 md:p-6 shadow-xl ${className}`}
            style={style}
        >
            <div className="relative flex w-full flex-col items-start gap-4 md:gap-4">
                {/* Header Phase Area */}
                <div className="flex w-full flex-col items-start gap-1 md:gap-1.5 leading-normal text-[#C69A39]">
                    <h3 className="font-serif text-lg md:text-xl font-bold not-italic">
                        Fase di Intervento
                    </h3>
                    <p className="font-serif text-sm md:text-sm italic font-light">
                        Sedute 3-10
                    </p>
                </div>

                {/* Content Area */}
                <div className="flex w-full flex-col gap-2 md:gap-2 text-[#ECECEC]">
                    <h4 className="font-sans text-sm md:text-base font-bold leading-normal">
                        Consigli per essere un buon terapeuta
                    </h4>

                    <ul className="flex list-none flex-col gap-2 md:gap-2 font-sans text-xs md:text-xs leading-[1.5] md:leading-[1.5] pl-0">
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#C69A39' }} />
                            <span className="opacity-90">Utilizza tecniche di riformulazione per chiarire i concetti.</span>
                        </li>
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#C69A39' }} />
                            <span className="opacity-90">Proponi strategie concrete e personalizzate per il paziente.</span>
                        </li>
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#C69A39' }} />
                            <span className="opacity-90">Mantieni un approccio collaborativo e coinvolgente.</span>
                        </li>
                        <li className="flex items-start gap-2.5 md:gap-3">
                            <span className="mt-[6px] md:mt-[6px] h-1.5 w-1.5 md:h-1.5 md:w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#C69A39' }} />
                            <span className="opacity-90">Monitora i progressi e adatta l&apos;intervento di conseguenza.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
