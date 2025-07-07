'use client'

import React, { useState } from 'react';

interface Concept {
    Concept: string;
    "The Core Definition": string;
    "Bring it to Life: Real-World Scenarios": {
        "The Professional Setting": string;
        "The Everyday Example": string;
    };
    "Simple Analogy": string;
    "Deeper Explanation for Beginners": string;
    "Keywords & Tags": string[];
    "Common Misconceptions": string[];
    "Notes & Simple Examples": string[];
}

interface DefinitionsListProps {
    definitions: Concept[];
}

// --- Helper Components ---

const ChevronIcon = ({ isOpen, className }: { isOpen: boolean, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${className}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
    >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const Section = ({ content, colorClass, icon }: { content: React.ReactNode, colorClass: string, icon: React.ReactNode }) => (
    <div className={`${colorClass} p-4 rounded-lg mb-4 flex gap-4 items-start`}>
        <div className="flex-shrink-0 text-2xl pt-0.5">{icon}</div>
        <div className="flex-grow text-gray-700 dark:text-gray-300 space-y-2">{content}</div>
    </div>
);

// --- Main Accordion Item Component ---
const AccordionItem = ({ itemData, isOpen, onToggle }: { itemData: Concept, isOpen: boolean, onToggle: () => void }) => {
    const {
        Concept,
        "The Core Definition": coreDefinition,
        "Bring it to Life: Real-World Scenarios": scenarios,
        "Simple Analogy": analogy,
        "Deeper Explanation for Beginners": deeperExplanation,
        "Keywords & Tags": keywords,
        "Common Misconceptions": misconceptions,
        "Notes & Simple Examples": notes,
    } = itemData;
    
    const icons = {
        definition: '📖',
        explanation: '🧠',
        analogy: '💡',
        misconceptions: '🤔',
        scenarios: '🔍',
        notes: '📝',
        tags: '🔑',
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg mb-4 overflow-hidden transition-all duration-500 hover:shadow-2xl">
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center p-5 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{Concept}</h2>
                <ChevronIcon isOpen={isOpen} className="text-indigo-500" />
            </button>
            {isOpen && (
                <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700">
                    <div className="pt-4">
                        {/* Core Definition */}
                        <Section content={<p>{coreDefinition}</p>} colorClass="bg-blue-50 dark:bg-blue-900/40" icon={icons.definition} />
                        
                        {/* Real-World Scenarios */}
                        <Section content={
                            <div className="space-y-4">
                               <div>
                                   
                                   <p className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">{scenarios["The Professional Setting"]}</p>
                               </div>
                               <div>
                                
                                   <p className="pl-2 border-l-2 border-gray-300 dark:border-gray-600">{scenarios["The Everyday Example"]}</p>
                               </div>
                            </div>
                        } colorClass="bg-teal-50 dark:bg-teal-900/40" icon={icons.scenarios} />

                        {/* Simple Analogy */}
                        <Section content={<p className="italic">"{analogy}"</p>} colorClass="bg-amber-50 dark:bg-amber-900/40" icon={icons.analogy} />

                        {/* Deeper Explanation */}
                        <Section content={<p>{deeperExplanation}</p>} colorClass="bg-indigo-50 dark:bg-indigo-900/40" icon={icons.explanation} />

                        {/* Common Misconceptions */}
                        <Section content={
                            <ul className="list-disc list-inside space-y-1">
                                {misconceptions.map((mc, index) => <li key={index}>{mc}</li>)}
                            </ul>
                        } colorClass="bg-red-50 dark:bg-red-900/40" icon={icons.misconceptions} />

                        {/* Notes & Simple Examples */}
                        <Section content={
                            <ul className="list-disc list-inside space-y-1">
                                {notes.map((note, index) => <li key={index}>{note}</li>)}
                            </ul>
                        } colorClass="bg-green-50 dark:bg-green-900/40" icon={icons.notes} />

                        {/* Keywords & Tags */}
                        <Section content={
                            <div className="flex flex-wrap gap-2">
                                {keywords.map((kw, index) => (
                                    <span key={index} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-md text-sm">
                                        {kw}
                                    </span>
                                ))}
                            </div>
                        } colorClass="bg-gray-50 dark:bg-gray-900/40" icon={icons.tags} />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const DefinitionsList = ({ definitions }: DefinitionsListProps) => {
    const [openItem, setOpenItem] = useState<string | null>(null);

    const handleToggle = (concept: string) => {
        setOpenItem(openItem === concept ? null : concept);
    };

    if (!definitions || definitions.length === 0) {
        return (
            <div className="w-full max-w-4xl mx-auto p-4 font-sans">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400">No definitions available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 font-sans">
            {definitions.map((item: Concept) => (
                <AccordionItem
                    key={item.Concept}
                    itemData={item}
                    isOpen={openItem === item.Concept}
                    onToggle={() => handleToggle(item.Concept)}
                />
            ))}
        </div>
    );
};

export default DefinitionsList;
