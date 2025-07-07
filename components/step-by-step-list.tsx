"use client"

import React, { useState, useEffect, useMemo, useCallback, JSX } from 'react';
import { ChevronRight, ChevronDown, ChevronsDownUp, Menu, X, BookOpen, Workflow, Lightbulb, Binary, CaseSensitive, Languages } from 'lucide-react';

// --- Type Definitions ---
interface JargonDeconstructionData {
  term: string;
  simpleExplanation: string;
  analogy: string;
}

interface RealWorldExampleData {
  scenarioName: string | { de: string; en: string };
  input: string | { de: string; en: string };
  output: string | { de: string; en: string };
  steps: { step: number; action: string | { de: string; en: string } }[];
  conceptApplication: string | { de: string; en: string };
}

interface ProcessBreakdownData {
  processName: string;
  stages: { stage: string; description: string }[];
}

interface ConceptualConnectionsData {
  biggerPicture: string;
  whatIfScenario: string;
}

interface Concept {
  conceptName: string;
  jargonDeconstruction: JargonDeconstructionData | null;
  realWorldExample: RealWorldExampleData | null;
  processBreakdown: ProcessBreakdownData | null;
  conceptualConnections: ConceptualConnectionsData | null;
}

interface ConceptsData {
  concepts: Concept[];
}

type Language = 'de' | 'en';

const translations = {
  de: {
    title: "Kryptographie-Konzepte",
    tocTitle: "Inhaltsverzeichnis",
    jargonTitle: "Begriffserklärung",
    termLabel: "Term",
    explanationLabel: "Einfache Erklärung",
    analogyLabel: "Analogie",
    processTitle: "Prozessablauf",
    processLabel: "Prozessablauf",
    stagesLabel: "Stage",
    exampleTitle: "Praxisbeispiel",
    inputLabel: "Input",
    outputLabel: "Output",
    stepsLabel: "Schritte",
    connectionsTitle: "Konzeptionelle Zusammenhänge",
    biggerPictureLabel: "Das große Ganze",
    whatIfLabel: "Was-wäre-wenn-Szenario",
    noConcepts: "Keine gültigen Konzeptdaten zum Anzeigen gefunden.",
    noConceptsInToc: "Keine Konzepte im JSON gefunden.",
    jsonDataLabel: "JSON-Daten",
  },
  en: {
    title: "Cryptography Concepts",
    tocTitle: "Table of Contents",
    jargonTitle: "Jargon Deconstruction",
    termLabel: "Term",
    explanationLabel: "Simple Explanation",
    analogyLabel: "Analogy",
    processTitle: "Process Breakdown",
    processLabel: "Process Breakdown",
    stagesLabel: "Stage",
    exampleTitle: "Real-World Example",
    inputLabel: "Input",
    outputLabel: "Output",
    stepsLabel: "Steps",
    connectionsTitle: "Conceptual Connections",
    biggerPictureLabel: "The Bigger Picture",
    whatIfLabel: "What-If Scenario",
    noConcepts: "No valid concept data found to display.",
    noConceptsInToc: "No concepts found in JSON.",
    jsonDataLabel: "JSON Data",
  },
};

/**
 * Helper function to create a URL-friendly slug from a string.
 * This is used for creating unique IDs for section linking.
 */
const createSlug = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
};

/**
 * Helper function to get text in the correct language
 */
const getLocalizedText = (text: string | { de: string; en: string } | undefined, language: Language): string => {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[language] || text.de || '';
};


// --- Sub-Components for Rendering Specific JSON Structures ---

const JargonDeconstruction = ({ data, language, isOpen, onToggle }: { 
  data: JargonDeconstructionData, 
  language: Language,
  isOpen: boolean,
  onToggle: () => void 
}) => (
  <div className="mt-4 border border-blue-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 bg-blue-50 dark:bg-gray-800/50 hover:bg-blue-100 dark:hover:bg-gray-800/70 transition-colors duration-200 text-left"
    >
      <h4 className="flex items-center justify-between text-lg font-semibold text-blue-800 dark:text-blue-300">        <div className="flex items-center">
          <BookOpen className="w-5 h-5 mr-3" />
          {translations[language].jargonTitle}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 transition-transform duration-200" /> : <ChevronRight className="w-5 h-5 transition-transform duration-200" />}
      </h4>
    </button>    {isOpen && (
      <div className="bg-white dark:bg-gray-900/50 overflow-hidden transition-all duration-300 ease-in-out">
        <div className="p-4 space-y-3 animate-in fade-in-0 slide-in-from-top-1">
          {data.term && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{translations[language].termLabel}:</p>
              <p className="font-mono text-sm bg-gray-100 dark:bg-gray-900 p-2 rounded-md text-blue-600 dark:text-blue-400">{data.term}</p>
            </div>
          )}
          {data.simpleExplanation && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{translations[language].explanationLabel}:</p>
              <p className="text-gray-600 dark:text-gray-400">{data.simpleExplanation}</p>
            </div>
          )}
          {data.analogy && (
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">{translations[language].analogyLabel}:</p>
              <blockquote className="border-l-4 border-blue-300 dark:border-blue-600 pl-3 italic text-gray-600 dark:text-gray-400">
                {data.analogy}
              </blockquote>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const ProcessBreakdown = ({ data, language, isOpen, onToggle }: { 
  data: ProcessBreakdownData, 
  language: Language,
  isOpen: boolean,
  onToggle: () => void 
}) => (
  <div className="mt-4 border border-green-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 bg-green-50 dark:bg-gray-800/50 hover:bg-green-100 dark:hover:bg-gray-800/70 transition-colors duration-200 text-left"
    >
      <h4 className="flex items-center justify-between text-lg font-semibold text-green-800 dark:text-green-300">        <div className="flex items-center">
          <Workflow className="w-5 h-5 mr-3" />
          {data.processName || translations[language].processTitle}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 transition-transform duration-200" /> : <ChevronRight className="w-5 h-5 transition-transform duration-200" />}
      </h4>
    </button>    {isOpen && (
      <div className="bg-white dark:bg-gray-900/50 overflow-hidden transition-all duration-300 ease-in-out">
        <div className="p-4 animate-in fade-in-0 slide-in-from-top-1">
          <ol className="space-y-3 list-decimal list-inside">
            {data.stages && data.stages.map(item => (
              <li key={item.stage} className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{item.stage}:</span> {item.description}
              </li>
            ))}
          </ol>
        </div>
      </div>
    )}
  </div>
);

const RealWorldExample = ({ data, language, isOpen, onToggle }: { 
  data: RealWorldExampleData, 
  language: Language,
  isOpen: boolean,
  onToggle: () => void 
}) => (
  <div className="mt-4 border border-indigo-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 bg-indigo-50 dark:bg-gray-800/50 hover:bg-indigo-100 dark:hover:bg-gray-800/70 transition-colors duration-200 text-left"
    >
      <h4 className="flex items-center justify-between text-lg font-semibold text-indigo-800 dark:text-indigo-300">        <div className="flex items-center">
          <Binary className="w-5 h-5 mr-3" />
          {getLocalizedText(data.scenarioName, language) || translations[language].exampleTitle}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 transition-transform duration-200" /> : <ChevronRight className="w-5 h-5 transition-transform duration-200" />}
      </h4>
    </button>    {isOpen && (
      <div className="bg-white dark:bg-gray-900/50 overflow-hidden transition-all duration-300 ease-in-out">
        <div className="p-4 space-y-4 animate-in fade-in-0 slide-in-from-top-1">
          {data.input && <div><p className="font-semibold">{translations[language].inputLabel}:</p><p>{getLocalizedText(data.input, language)}</p></div>}
          {data.output && <div><p className="font-semibold">{translations[language].outputLabel}:</p><p>{getLocalizedText(data.output, language)}</p></div>}
          {data.steps && (
            <div>
              <p className="font-semibold mb-2">{translations[language].stepsLabel}:</p>
              <ol className="space-y-2 list-none">
                {data.steps.map(item => (
                  <li key={item.step} className="flex items-start">
                    <span className="flex items-center justify-center w-6 h-6 mr-3 text-sm font-bold text-white bg-indigo-500 rounded-full flex-shrink-0">{item.step}</span>
                    <span>{getLocalizedText(item.action, language)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {data.conceptApplication && <p className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-md">{getLocalizedText(data.conceptApplication, language)}</p>}
        </div>
      </div>
    )}
  </div>
);

const ConceptualConnections = ({ data, language, isOpen, onToggle }: { 
  data: ConceptualConnectionsData, 
  language: Language,
  isOpen: boolean,
  onToggle: () => void 
}) => (
  <div className="mt-4 border border-yellow-200 dark:border-gray-700 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 bg-yellow-50 dark:bg-gray-800/50 hover:bg-yellow-100 dark:hover:bg-gray-800/70 transition-colors duration-200 text-left"
    >
      <h4 className="flex items-center justify-between text-lg font-semibold text-yellow-800 dark:text-yellow-300">        <div className="flex items-center">
          <Lightbulb className="w-5 h-5 mr-3" />
          {translations[language].connectionsTitle}
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5 transition-transform duration-200" /> : <ChevronRight className="w-5 h-5 transition-transform duration-200" />}
      </h4>
    </button>    {isOpen && (
      <div className="bg-white dark:bg-gray-900/50 overflow-hidden transition-all duration-300 ease-in-out">
        <div className="p-4 space-y-3 text-gray-600 dark:text-gray-400 animate-in fade-in-0 slide-in-from-top-1">
          {data.biggerPicture && <p><span className="font-semibold text-gray-700 dark:text-gray-300">{translations[language].biggerPictureLabel}:</span> {data.biggerPicture}</p>}
          {data.whatIfScenario && (
            <p className="italic">
              <span className="font-semibold not-italic text-gray-700 dark:text-gray-300">{translations[language].whatIfLabel}:</span> {data.whatIfScenario}
            </p>
          )}
        </div>
      </div>
    )}
  </div>
);


/**
 * The main component for rendering the entire JSON structure.
 * It maps over the `concepts` array and renders each one in a card.
 */
const JsonRenderer = ({ data, language, allExpanded, onToggleAll }: { 
  data: ConceptsData, 
  language: Language,
  allExpanded?: boolean,
  onToggleAll?: () => void 
}) => {
  // State to track which sections are open for each concept
  const [openSections, setOpenSections] = useState<{[conceptIndex: number]: {[sectionType: string]: boolean}}>({});

  // Effect to handle toggle all functionality
  useEffect(() => {
    if (typeof allExpanded === 'boolean') {
      const newOpenSections: {[conceptIndex: number]: {[sectionType: string]: boolean}} = {};
      if (data && data.concepts) {
        data.concepts.forEach((_, conceptIndex) => {
          newOpenSections[conceptIndex] = {
            jargon: allExpanded,
            example: allExpanded,
            process: allExpanded,
            connections: allExpanded
          };
        });
      }
      setOpenSections(newOpenSections);
    }
  }, [allExpanded, data]);

  const toggleSection = useCallback((conceptIndex: number, sectionType: string) => {
    setOpenSections(prev => ({
      ...prev,
      [conceptIndex]: {
        ...prev[conceptIndex],
        [sectionType]: !prev[conceptIndex]?.[sectionType]
      }
    }));
  }, []);

  const isSectionOpen = useCallback((conceptIndex: number, sectionType: string) => {
    return openSections[conceptIndex]?.[sectionType] ?? false;
  }, [openSections]);

  if (!data || !data.concepts || !Array.isArray(data.concepts)) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {translations[language].noConcepts}
      </div>
    );
  }

  return (
    <div className="space-y-6">      {/* Toggle All Button */}
      {onToggleAll && (
        <div className="flex justify-end mb-4">
          <button
            onClick={onToggleAll}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            {allExpanded ? (
              <ChevronDown className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="w-4 h-4 transition-transform duration-200" />
            )}
            <span className="font-medium">
              {allExpanded ? 'Collapse All Sections' : 'Expand All Sections'}
            </span>
          </button>
        </div>
      )}
      
      <div className="space-y-12">
        {data.concepts.map((concept, conceptIndex) => {
          if (!concept || !concept.conceptName) return null;
          
          const slug = createSlug(concept.conceptName);

          return (
            <article key={slug} id={slug} className="bg-white dark:bg-gray-800/80 rounded-xl shadow-lg overflow-hidden transition-shadow hover:shadow-2xl scroll-mt-24">
              <div className="p-6 md:p-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  {concept.conceptName}
                </h2>
                {concept.jargonDeconstruction && (
                  <JargonDeconstruction 
                    data={concept.jargonDeconstruction} 
                    language={language}
                    isOpen={isSectionOpen(conceptIndex, 'jargon')}
                    onToggle={() => toggleSection(conceptIndex, 'jargon')}
                  />
                )}
                {concept.realWorldExample && (
                  <RealWorldExample 
                    data={concept.realWorldExample} 
                    language={language}
                    isOpen={isSectionOpen(conceptIndex, 'example')}
                    onToggle={() => toggleSection(conceptIndex, 'example')}
                  />
                )}
                {concept.processBreakdown && (
                  <ProcessBreakdown 
                    data={concept.processBreakdown} 
                    language={language}
                    isOpen={isSectionOpen(conceptIndex, 'process')}
                    onToggle={() => toggleSection(conceptIndex, 'process')}
                  />
                )}
                {concept.conceptualConnections && (
                  <ConceptualConnections 
                    data={concept.conceptualConnections} 
                    language={language}
                    isOpen={isSectionOpen(conceptIndex, 'connections')}
                    onToggle={() => toggleSection(conceptIndex, 'connections')}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};


/**
 * Extracts `conceptName` headlines for the Table of Contents.
 */
const TableOfContents = ({ data, onLinkClick, language }: { data: ConceptsData | null, onLinkClick: () => void, language: Language }) => {
  const headlines = useMemo(() => {
    if (!data || !data.concepts || !Array.isArray(data.concepts)) return [];
    return data.concepts
      .filter(concept => concept && concept.conceptName)
      .map(concept => ({
        text: concept.conceptName,
        slug: createSlug(concept.conceptName),
      }));
  }, [data]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onLinkClick();
  };

  return (
    <nav className="p-4 space-y-3">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center"><CaseSensitive className="w-5 h-5 mr-2"/> {translations[language].tocTitle}</h2>
      {headlines.length > 0 ? (
        <ul className="space-y-2">
          {headlines.map(({ text, slug }, index) => (
            <li key={index}>
              <a href={`#${slug}`} onClick={(e) => handleLinkClick(e, slug)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 flex items-start group">
                <ChevronRight className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                <span>{text}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{translations[language].noConceptsInToc}</p>
      )}
    </nav>
  );
};


/**
 * The main App component that ties everything together.
 */
interface StepByStepListProps {
  stepByStepData?: ConceptsData;
}

export default function StepByStepList({ stepByStepData }: StepByStepListProps): JSX.Element {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedJson, setParsedJson] = useState<ConceptsData | null>(stepByStepData || null);
  const [error, setError] = useState('');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [language, setLanguage] = useState<Language>('de');
  const [allExpanded, setAllExpanded] = useState(false);

  // Debug logging
  console.log('🔍 [STEP_BY_STEP_LIST] Received stepByStepData:', stepByStepData);
  console.log('🔍 [STEP_BY_STEP_LIST] Parsed JSON state:', parsedJson);

  // Function to toggle all sections at once
  const toggleAllSections = useCallback(() => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    
    // We'll need to pass this down to JsonRenderer
  }, [allExpanded]);
  useEffect(() => {
    if (stepByStepData) {
      setParsedJson(stepByStepData);
      setError('');
      return;
    }
    
    try {
      if (jsonInput.trim() === '') {
        setParsedJson(null);
        setError('');
        return;
      }
      const data = JSON.parse(jsonInput);
      setParsedJson(data);
      setError('');
    } catch (e) {
      setError('Ungültiges JSON-Format. Bitte überprüfen Sie die Syntax.');
      setParsedJson(null);
    }
  }, [jsonInput, stepByStepData]);
  
  const handleTocLinkClick = useCallback(() => {
     if (window.innerWidth < 1024) {
        setIsTocOpen(false);
     }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans">
      <header className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{translations[language].title}</h1>
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => setLanguage(lang => lang === 'de' ? 'en' : 'de')}
                        className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                        aria-label="Switch Language"
                    >
                       <Languages className="h-5 w-5 mr-2"/>
                       <span className="font-semibold">{language.toUpperCase()}</span>
                    </button>
                    <button 
                        onClick={() => setIsInputVisible(!isInputVisible)}
                        className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Toggle JSON Input"
                    >
                       <ChevronsDownUp className="h-5 w-5"/>
                    </button>
                    <button 
                        onClick={() => setIsTocOpen(!isTocOpen)} 
                        className="lg:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Toggle Table of Contents"
                    >
                        {isTocOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>
        </div>
      </header>
      
      {isInputVisible && (
        <div className="p-4 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
            <div className="container mx-auto">
                <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {translations[language].jsonDataLabel}
                </label>
                <textarea id="json-input" value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} className="w-full h-48 p-3 font-mono text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        </div>
      )}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap lg:flex-nowrap lg:space-x-8">          <main className="w-full lg:w-2/3 py-8">
            {parsedJson ? (
              <JsonRenderer 
                data={parsedJson} 
                language={language} 
                allExpanded={allExpanded}
                onToggleAll={toggleAllSections}
              />
            ) : (
                <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    {translations[language].noConcepts}
                </div>
            )}
          </main>
          
          <aside className="hidden lg:block w-1/3 py-8 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
             <div className="bg-white dark:bg-gray-800/80 rounded-lg shadow p-4">
                <TableOfContents data={parsedJson} onLinkClick={() => {}} language={language} />
             </div>
          </aside>

          <div className={`fixed inset-0 z-30 transform transition-transform duration-300 ease-in-out lg:hidden ${isTocOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsTocOpen(false)}></div>
            <div className="relative w-80 max-w-[calc(100%-4rem)] h-full ml-auto bg-gray-50 dark:bg-gray-800 shadow-xl overflow-y-auto">
                <div className="flex justify-end p-2 border-b dark:border-gray-700">
                    <button onClick={() => setIsTocOpen(false)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
              <TableOfContents data={parsedJson} onLinkClick={handleTocLinkClick} language={language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
