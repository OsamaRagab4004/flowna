"use client"

import React, { useState, useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  Brain, 
  BookOpen, 
  MessageCircle, 
  Menu,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ContentRenderer from '@/components/content-renderer'
import QAsList from '@/components/qas-list'
import { AuthForm } from '@/components/auth-form'
import { useAuth } from '@/context/auth-context'
import { getApiUrl } from '@/lib/api'
import { steps } from 'framer-motion'

// Import Concept interface from definitions component
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

interface SidebarItem {
  id: string
  icon: React.ComponentType<any>
  label: string
  description: string
  badge?: string
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'mindmaps',
    icon: Brain,
    label: 'MindMaps',
    description: 'Visual learning diagrams',
    badge: '3'
  },  {
    id: 'definitions',
    icon: BookOpen,
    label: 'Definitions',
    description: 'Key terms and concepts explained',
    badge: '2' // Will be updated dynamically
  },
  {
    id: 'qas',
    icon: HelpCircle,
    label: 'QAs',
    description: 'Questions and answers',
    badge: '13'
  },
  {
    id: 'step-by-step',
    icon: Target,
    label: 'Step-by-Step',
    description: 'Guided tutorials and procedures',
    badge: '8'
  }
]

// Sample definitions data that matches the Concept interface
const initialDefinitionsData: Concept[] = [
  {
    "Concept": "Cognitive Load Theory",
    "The Core Definition": "A psychological theory that describes the amount of mental effort and working memory capacity used during learning and problem-solving tasks.",
    "Bring it to Life: Real-World Scenarios": {
      "The Professional Setting": "In instructional design, cognitive load theory guides how we present information to learners. For example, when training employees on new software, we break complex procedures into smaller chunks and provide visual aids to reduce cognitive load.",
      "The Everyday Example": "Like trying to learn a new recipe while someone is talking to you - your working memory becomes overloaded and you can't process both effectively."
    },
    "Simple Analogy": "Think of your brain like a computer's RAM - it can only handle so much information at once before it starts slowing down or crashing.",
    "Deeper Explanation for Beginners": "Cognitive Load Theory describes the amount of mental effort being used in working memory during learning. It suggests that learning is most effective when the cognitive load is optimized, not exceeding the capacity of working memory. The theory identifies three types of cognitive load: intrinsic (inherent difficulty of the material), extraneous (how information is presented), and germane (processing and construction of schemas).",
    "Keywords & Tags": ["cognitive load", "working memory", "instructional design", "learning theory"],
    "Common Misconceptions": [
      "This theory is often misunderstood as simply 'don't overload students with information.'",
      "People think all cognitive load is bad, but germane load is actually helpful for learning."
    ],
    "Notes & Simple Examples": [
      "Intrinsic load: The inherent difficulty of the material itself",
      "Extraneous load: Poor presentation that wastes mental resources",
      "Germane load: Mental effort that helps build understanding"
    ]
  },
  {
    "Concept": "Metacognition",
    "The Core Definition": "The awareness and understanding of one's own thought processes; essentially 'thinking about thinking'.",
    "Bring it to Life: Real-World Scenarios": {
      "The Professional Setting": "A project manager who regularly reflects on their decision-making process, identifies what worked and what didn't, and adjusts their approach for future projects.",
      "The Everyday Example": "When you realize you're not understanding a book and decide to re-read a section more slowly or look up unfamiliar terms."
    },
    "Simple Analogy": "Like having a personal coach inside your head who watches how you think and learn, then gives you tips on how to do it better.",
    "Deeper Explanation for Beginners": "Metacognition refers to 'thinking about thinking' - the awareness and understanding of one's own thought processes. It involves two key components: metacognitive knowledge (what you know about learning) and metacognitive regulation (how you monitor and control your learning). This includes planning strategies, monitoring comprehension, and evaluating learning outcomes.",
    "Keywords & Tags": ["metacognition", "self-reflection", "learning strategies", "self-regulation"],
    "Common Misconceptions": [
      "Metacognition is not just self-reflection - it's an active, strategic process",
      "It's not about being smart - it's about being aware of how you learn"
    ],
    "Notes & Simple Examples": [
      "Planning: Choosing the right strategy before starting a task",
      "Monitoring: Checking your understanding as you go",
      "Evaluating: Reflecting on what worked after completing a task"
    ]
  }
]

// Content data structure for general sections
const contentData = {
  mindmaps: {
    title: "Mind Maps",
    items: []
  },
  definitions: {
    title: "Definitions",
    items: []
  },
  qas: {
    title: "Questions & Answers",
    items: []
  },
  "step-by-step": {
    title: "Step by Step",
    items: []
  }
}

const qasData = [
  {
    "question": "Was ist die Hauptfunktion des Präprozessors in einem Kompilierungsvorgang?",
    "answer": "Die Hauptfunktion des Präprozessors ist die Analyse des Quelltextes und die Durchführung von Textersetzungen, bevor der eigentliche Kompilierungsvorgang beginnt."
  },
  {
    "question": "Welche Arten von Textersetzungen und Analysen kann der Präprozessor durchführen?",
    "answer": "Der Präprozessor kann drei Hauptarten von Textersetzungen und Analysen durchführen: 1. Einschließen von Header-Dateien mit #include, 2. Definieren von Makros mit #define und deren spätere Ersetzung im Quelltext, und 3. Bedingte Kompilierung mit Direktiven wie #ifdef und #ifndef."
  },
  {
    "question": "Was bewirkt die #include-Direktive des Präprozessors?",
    "answer": "Die #include-Direktive bewirkt, dass der Präprozessor den Inhalt der angegebenen Datei an die Stelle der Direktive in die aktuelle Datei einfügt. Dies ist eine einfache Textersetzung."
  },
  {
    "question": "Wie unterscheidet sich die Suche nach Header-Dateien bei <string.h> im Vergleich zu \"debug.h\"?",
    "answer": "Header-Dateien in spitzen Klammern wie <string.h> werden in Standard-Inklusionspfaden des Systems gesucht (z.B. /usr/include unter Linux). Header-Dateien in Anführungszeichen wie \"debug.h\" werden zuerst im aktuellen Verzeichnis und danach in den Standard-Inklusionspfaden gesucht."
  },
  {
    "question": "Was ist der Zweck der #define-Direktive des Präprozessors?",
    "answer": "Die #define-Direktive dient zur Definition von Makros, die als symbolische Namen für konstante Werte oder einfache, wiederkehrende Berechnungen (Inlining) verwendet werden können. Diese Makros werden im Quelltext durch den definierten Wert oder Ausdruck ersetzt."
  },
  {
    "question": "Warum wird empfohlen, bei #define-Makros für Berechnungen und Inlining, die gesamte Definition in Klammern zu setzen?",
    "answer": "Es wird empfohlen, die gesamte Definition in Klammern zu setzen, da der Präprozessor eine reine Textersetzung durchführt und keine Kenntnis von Operator-Prioritäten (wie Punkt-vor-Strich-Rechnung) hat. Dies verhindert unerwartete Ergebnisse bei der Expansion des Makros im Quelltext."
  },
  {
    "question": "Was ist bedingte Kompilierung und welche Direktiven werden dafür verwendet?",
    "answer": "Bedingte Kompilierung ermöglicht es, Teile des Quelltextes nur unter bestimmten Bedingungen zu kompilieren. Die dafür verwendeten Direktiven sind unter anderem #ifdef, #ifndef und #if, die es erlauben, Codeblöcke basierend auf der Definition von Makros oder spezifischen Werten einzuschließen oder auszuschließen."
  },
  {
    "question": "Wie kann #if 0 verwendet werden, um Codeabschnitte vom Kompilieren auszuschließen?",
    "answer": "Wenn #if 0 verwendet wird, werden alle Zeilen zwischen dieser Direktive und der schließenden #endif nicht vom Präprozessor verarbeitet und somit nicht kompiliert. Dies dient dazu, temporär Codeabschnitte zu deaktivieren."
  },
  {
    "question": "Warum ist der Ausschluss von Mehrfachinklusionen in Header-Dateien wichtig?",
    "answer": "Der Ausschluss von Mehrfachinklusionen ist wichtig, um zu verhindern, dass Definitionen von Typen, Funktionen oder Makros mehrfach in eine Datei oder in das spätere kompilierte Objektcode gelangen, was zu Kompilierungsfehlern führen würde."
  },
  {
    "question": "Wie wird eine Mehrfachinklusion in einer Header-datei typischerweise verhindert?",
    "answer": "Eine Mehrfachinklusion wird typischerweise durch eine sogenannte \"Include-Guard\"-Konstruktion verhindert. Diese besteht aus einer #ifndef-Prüfung auf ein eindeutiges Symbol, gefolgt von einer #define-Anweisung für dieses Symbol und den eigentlichen Inhalt der Header-Datei, abgeschlossen mit #endif. Wenn die Datei bereits einmal inkludiert wurde, ist das Symbol definiert und der Inhalt wird übersprungen."
  },
  {
    "question": "Welche Konvention wird üblicherweise für die Symbolnamen in Include Guards verwendet?",
    "answer": "Eine übliche Konvention ist, den Symbolnamen basierend auf dem Dateinamen zu erstellen, oft mit einem Unterstrich am Anfang und/oder Ende, z.B. für eine Datei 'test.h' das Symbol '_TEST_H' oder 'TEST_H'."
  },
  {
    "question": "Wie kann man die Ausgabe des Präprozessors für eine C-Datei mit GCC anzeigen?",
    "answer": "Mit dem Befehl `gcc -E <dateiname.c>` kann man die durch den Präprozessor erzeugte Zwischendarstellung des Quelltextes anzeigen lassen."
  },
  {
    "question": "Wie erzeugt man mit GCC eine Objektcode-Datei aus einer C-Quelldatei?",
    "answer": "Mit dem Befehl `gcc -c <dateiname.c>` erzeugt GCC eine Objektcode-Datei mit der Endung `.o`."
  }
]

const stepByStepData: any[] = []



function LecContent() {
  const [activeSection, setActiveSection] = useState('mindmaps')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [definitions, setDefinitions] = useState<Concept[]>(initialDefinitionsData)
  const { user } = useAuth();
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Function to detect and log path parameters
  const detectPathParameters = () => {
    console.log("🔍 [PATH_DETECTION] Current pathname:", pathname)
    
    // Extract path segments
    const pathSegments = pathname.split('/').filter(segment => segment !== '')
    console.log("📂 [PATH_SEGMENTS] Path segments:", pathSegments)
    
    // Check if there are parameters after /lec
    if (pathSegments[0] === 'lec' && pathSegments.length > 1) {
      const parameters = pathSegments.slice(1)
      console.log("🎯 [PATH_PARAMS] Detected parameters:", parameters)
      
      // Log each parameter with its position
      parameters.forEach((param, index) => {
        console.log(`📌 [PARAM_${index + 1}] Parameter ${index + 1}:`, param)
      })
      
      // Example: /lec/2 would log parameter "2"
      // Example: /lec/2/chapter/3 would log parameters ["2", "chapter", "3"]
      
      return parameters
    } else {
      console.log("ℹ️ [PATH_PARAMS] No additional path parameters found")
      return []
    }
  }

  // Function to detect and log search/query parameters
  const detectSearchParameters = () => {
    const searchParamsObj = Object.fromEntries(searchParams.entries())
    
    if (Object.keys(searchParamsObj).length > 0) {
      console.log("🔍 [SEARCH_PARAMS] Query parameters found:", searchParamsObj)
      return searchParamsObj
    } else {
      console.log("ℹ️ [SEARCH_PARAMS] No query parameters found")
      return {}
    }
  }

  // Function to fetch definitions from server
  const fetchDefinitions = async (lectureId?: string) => {
    try {

      if(!user ) {
          return
      }
      
      // Example API call - replace with your actual endpoint
      const url = lectureId ? getApiUrl(`/api/v1/rooms/gemini/study/lecture/${lectureId}`) : '/api/definitions'
      const response = await fetch(url, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
             Authorization: user ? `Bearer ${user.access_token}` : ''
          }
        }
      )
      if (response.ok) {
        const data: Concept[] = await response.json()
        setDefinitions(data)
      } else {
        console.error('Failed to fetch definitions:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching definitions:', error)
      // Fallback to initial data if fetch fails
      setDefinitions(initialDefinitionsData)
    }
  }
  // Effect to fetch definitions on every page load/reload
  useEffect(() => {
    console.log("🚀 [FETCH_DEFINITIONS] Fetching definitions on page load...")
    
    const pathParams = detectPathParameters()
    const lectureId = pathParams.length > 0 ? pathParams[0] : undefined
    
    // Always fetch definitions when component mounts or reloads
    fetchDefinitions(lectureId)
  }, []) // Empty dependency array means this runs only on mount/reload

  // Effect to run path detection and re-fetch when path changes
  useEffect(() => {
    console.log("🚀 [PATH_DETECTION] Running path parameter detection...")
    
    const pathParams = detectPathParameters()
    const searchParamsObj = detectSearchParameters()
    
    // Combined logging for easy debugging
    console.log("📊 [COMBINED_PARAMS] Summary:", {
      fullPath: pathname,
      pathParameters: pathParams,
      searchParameters: searchParamsObj,
      totalPathSegments: pathname.split('/').filter(segment => segment !== '').length
    })
    
    // Extract lecture ID from path if present
    const lectureId = pathParams.length > 0 ? pathParams[0] : undefined
    
    // Re-fetch definitions when path changes (navigation)
    fetchDefinitions(lectureId)
    
  }, [pathname, searchParams])

  const activeContent = contentData[activeSection as keyof typeof contentData]

    if (!user) {
      return <AuthForm />
    }
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="flex">
        {/* Sidebar */}
        <div className={cn(
          "fixed left-0 top-0 z-40 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shadow-lg",
          sidebarCollapsed ? "w-16" : "w-80"
        )}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Learning Hub
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Interactive Materials
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              
              return (                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id)
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left group",
                    isActive 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md" 
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                    isActive 
                      ? "bg-white/20" 
                      : "bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
                  )}>
                    <Icon className={cn(
                      "w-4 h-4 transition-all duration-200",
                      isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
                    )} />
                  </div>
                  
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {item.label}
                        </span>                        {(item.id === 'definitions' ? definitions.length.toString() : item.badge) && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "ml-2 text-xs px-2 py-0.5",
                              isActive 
                                ? "bg-white/20 text-white border-white/30" 
                                : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            )}
                          >
                            {item.id === 'definitions' ? definitions.length : item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs truncate mt-0.5",
                        isActive 
                          ? "text-white/80" 
                          : "text-slate-500 dark:text-slate-400"
                      )}>
                        {item.description}
                      </p>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-80"
        )}>          {/* Header */}
          <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>                  <div>                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {activeContent.title}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {activeSection === 'mindmaps' 
                        ? 'Interactive mind map exploration (General)' 
                        : 'Explore interactive learning materials and resources (General)'}
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      💡 Tip: Visit /lec/[number] (e.g., /lec/5) to access specific lecture materials
                    </p>
                  </div>
                </div>                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="hidden sm:flex">
                    {`${activeContent.items.length} items`}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Collaborate
                  </Button>
                </div>
              </div>
            </div>
          </header>          {/* Content Area */}
          <main className={cn("h-[calc(100vh-81px)]", activeSection === 'mindmaps' ? "" : "p-6")}>            <ContentRenderer 
              activeSection={activeSection}
              contentData={contentData}
              definitionsData={definitions}
              qasData={qasData}
              stepByStepData={stepByStepData}
            />

          
          </main>
        </div>
      </div>
    </div>
  )
}

export default function LecPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading lectures...</p>
        </div>
      </div>
    }>
      <LecContent />
    </Suspense>
  )
}