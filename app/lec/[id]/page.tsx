"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Brain, 
  BookOpen, 
  MessageCircle, 
  Menu,
  ChevronLeft,
  ChevronRight,
  Target,
  Users,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import ContentRenderer from '@/components/content-renderer'
import QAsList from '@/components/qas-list'
import { useAuth } from '@/context/auth-context'
import { AuthForm } from '@/components/auth-form'
import { usePageTitle } from '@/hooks/use-page-title'
import { getApiUrl } from '@/lib/api'

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

export default function LecDetailPage() {
  const [activeSection, setActiveSection] = useState('mindmaps')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [lectureName, setLectureName] = useState<string>('Lecture')
  const [definitions, setDefinitions] = useState<Concept[]>(initialDefinitionsData)
  const [qas, setQas] = useState([
    {
      "question": "Was ist die Hauptfunktion des Präprozessors in einem Kompilierungsvorgang?",
      "answer": "Die Hauptfunktion des Präprozessors ist die Analyse des Quelltextes und die Durchführung von Textersetzungen, bevor der eigentliche Kompilierungsvorgang beginnt."
    },
    {
      "question": "Welche Arten von Textersetzungen und Analysen kann der Präprozessor durchführen?",
      "answer": "Der Präprozessor kann drei Hauptarten von Textersetzungen und Analysen durchführen: 1. Einschließen von Header-Dateien mit #include, 2. Definieren von Makros mit #define und deren spätere Ersetzung im Quelltext, und 3. Bedingte Kompilierung mit Direktiven wie #ifdef und #ifndef."
    }
  ])
  const [stepByStep, setStepByStep] = useState({
    concepts: [
      {
        conceptName: 'Initial Step-by-Step Concept',
        jargonDeconstruction: null,
        realWorldExample: null,
        processBreakdown: null,
        conceptualConnections: null
      }
    ]
  })
  const [mindmap, setMindmap] = useState<string>('') // Add mindmap state for storing the mermaid definition string
  const { user } = useAuth();
  const params = useParams()
  
  // Set dynamic page title based on lecture name
  usePageTitle(lectureName)
  // Function to detect and log path parameters
  const detectPathParameters = () => {
    const lectureId = Array.isArray(params.id) ? params.id[0] : params.id
    console.log("🔍 [PATH_DETECTION] Current lecture ID:", lectureId)
    
    if (lectureId) {
      console.log("🎯 [PATH_PARAMS] Detected lecture parameter:", lectureId)
      return lectureId
    } else {
      console.log("ℹ️ [PATH_PARAMS] No lecture ID parameter found")
      return null
    }
  }  // Function to fetch definitions from server (no caching)
  const fetchDefinitions = async (lectureId?: string) => {
    try {
      if(!user || !lectureId) {
        console.log('❌ No user or lecture ID available')
        return
      }      console.log('🌐 [FETCH] Fetching definitions from API for lecture:', lectureId)
      
      // API call to fetch lecture data with timestamp to prevent caching
      const timestamp = new Date().getTime()
      const url = getApiUrl(`api/v1/rooms/gemini/study/lecture/${lectureId}?t=${timestamp}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FETCH_SUCCESS] Raw API response:", data)
        
        // Extract and set lecture name for browser title
        if (data.name || data.lectureName || data.title) {
          const name = data.name || data.lectureName || data.title
          console.log("📝 [LECTURE_NAME] Setting lecture name:", name)
          setLectureName(name)
        }
        
        // Parse the definitions JSON string from the API response
        if (data.defintionsJson) {
          try {
            const parsedDefinitions = JSON.parse(data.defintionsJson)
            console.log("📝 [PARSE_SUCCESS] Parsed definitions:", parsedDefinitions)
            setDefinitions(parsedDefinitions || [])
          } catch (parseError) {
            console.error('❌ [PARSE_ERROR] Error parsing definitions JSON:', parseError)
            console.log("🔄 [FALLBACK] Using initial definitions data")
            setDefinitions(initialDefinitionsData)
          }
        } else {
          console.log('⚠️ [NO_DATA] No defintionsJson found in response, using initial data')
          setDefinitions(initialDefinitionsData)
        }
      } else {
        console.error('❌ [FETCH_ERROR] Failed to fetch definitions:', response.status, response.statusText)
        console.log("🔄 [FALLBACK] Using initial definitions data")
        setDefinitions(initialDefinitionsData)
      }
    } catch (error) {
      console.error('💥 [FETCH_ERROR] Error fetching definitions:', error)
      console.log("🔄 [FALLBACK] Using initial definitions data")
      // Fallback to initial data if fetch fails
      setDefinitions(initialDefinitionsData)
    }
  }  // Function to fetch QAs from server (no caching)
  const fetchQAs = async (lectureId?: string) => {
    try {
      if(!user || !lectureId) {
        console.log('❌ No user or lecture ID available for QAs')
        return
      }      console.log('🌐 [FETCH] Fetching QAs from API for lecture:', lectureId)
      
      // API call to fetch lecture data with timestamp to prevent caching
      const timestamp = new Date().getTime()
      const url = getApiUrl(`api/v1/rooms/gemini/study/lecture/${lectureId}?t=${timestamp}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FETCH_SUCCESS] Raw API response for QAs:", data)
        
        // Parse the QAs JSON string from the API response
        if (data.qaJson) {
          try {
            const parsedQAs = JSON.parse(data.qaJson)
            console.log("📝 [PARSE_SUCCESS] Parsed QAs:", parsedQAs)
            setQas(parsedQAs || [])
          } catch (parseError) {
            console.error('❌ [PARSE_ERROR] Error parsing QAs JSON:', parseError)
            console.log("🔄 [FALLBACK] Using initial QAs data")
            setQas([])
          }
        } else {
          console.log('⚠️ [NO_DATA] No qaJson found in response, using initial data')
          setQas([])
        }
      } else {
        console.error('❌ [FETCH_ERROR] Failed to fetch QAs:', response.status, response.statusText)
        console.log("🔄 [FALLBACK] Using initial QAs data")
        setQas([])
      }
    } catch (error) {
      console.error('💥 [FETCH_ERROR] Error fetching QAs:', error)
      console.log("🔄 [FALLBACK] Using initial QAs data")
      // Fallback to initial data if fetch fails
      setQas([])
    }
  }  // Function to fetch Step-by-Step data from server (no caching)
  const fetchStepByStep = async (lectureId?: string) => {
    try {
      if(!user || !lectureId) {
        console.log('❌ No user or lecture ID available for Step-by-Step')
        return
      }      console.log('🌐 [FETCH] Fetching Step-by-Step from API for lecture:', lectureId)
      
      // API call to fetch lecture data with timestamp to prevent caching
      const timestamp = new Date().getTime()
      const url = getApiUrl(`api/v1/rooms/gemini/study/lecture/${lectureId}?t=${timestamp}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FETCH_SUCCESS] Raw API response for Step-by-Step:", data)
        
        // Parse the Step-by-Step JSON string from the API response
        if (data.stepByStepJson) {
          try {
            const parsedStepByStep = JSON.parse(data.stepByStepJson)
            console.log("📝 [PARSE_SUCCESS] Parsed Step-by-Step:", parsedStepByStep)
            setStepByStep(parsedStepByStep || { concepts: [] })
          } catch (parseError) {
            console.error('❌ [PARSE_ERROR] Error parsing Step-by-Step JSON:', parseError)
            console.log("🔄 [FALLBACK] Using initial Step-by-Step data")
            setStepByStep({ concepts: [] })
          }
        } else {
          console.log('⚠️ [NO_DATA] No stepByStepJson found in response, using initial data')
          setStepByStep({ concepts: [] })
        }
      } else {
        console.error('❌ [FETCH_ERROR] Failed to fetch Step-by-Step:', response.status, response.statusText)
        console.log("🔄 [FALLBACK] Using initial Step-by-Step data")
        setStepByStep({ concepts: [] })
      }
    } catch (error) {
      console.error('💥 [FETCH_ERROR] Error fetching Step-by-Step:', error)
      console.log("🔄 [FALLBACK] Using initial Step-by-Step data")
      // Fallback to initial data if fetch fails
      setStepByStep({ concepts: [] })
    }
  }  // Function to fetch mindmap from server (no caching)
  const fetchMindmap = async (lectureId?: string) => {
    try {
      if(!user || !lectureId) {
        console.log('❌ No user or lecture ID available for mindmap')
        return
      }      console.log('🌐 [FETCH] Fetching mindmap from API for lecture:', lectureId)
      
      // API call to fetch lecture data with timestamp to prevent caching
      const timestamp = new Date().getTime()
      const url = getApiUrl(`api/v1/rooms/gemini/study/lecture/${lectureId}?t=${timestamp}`)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ [FETCH_SUCCESS] Raw API response for mindmap:", data)
        
        // Parse the mindmap JSON string from the API response
        if (data.mindMapsJson) {
          try {
            // The mindMapsJson is already a string, but it might be JSON-encoded, so try to parse it first
            let mindmapString = data.mindMapsJson;
            
            // Try to parse as JSON in case it's double-encoded
            try {
              const parsed = JSON.parse(data.mindMapsJson);
              if (typeof parsed === 'string') {
                mindmapString = parsed;
              }
            } catch {
              // If parsing fails, use the original string
              mindmapString = data.mindMapsJson;
            }
            
            // Clean up the string: remove excessive whitespace and normalize line breaks
            mindmapString = mindmapString
              .replace(/\\n/g, '\n')  // Replace literal \n with actual newlines
              .replace(/\n\s*\n/g, '\n')  // Remove double newlines
              .replace(/%%.*?%%/g, '')  // Remove mermaid comments that might cause errors
              .replace(/^%%.*$/gm, '')  // Remove comment lines
              .replace(/^%.*$/gm, '')   // Remove other potential comment formats
              .replace(/syntax error/gi, '') // Remove any syntax error text
              .replace(/mermaid version/gi, '') // Remove version text
              .replace(/error/gi, '') // Remove generic error text
              .split('\n')
              .filter((line: string) => line.trim() !== '' && !line.trim().startsWith('%')) // Remove empty lines and comment lines
              .join('\n')
              .trim();  // Remove leading/trailing whitespace
            
            console.log("📝 [PARSE_SUCCESS] Cleaned mindmap string:", mindmapString.substring(0, 200) + '...')
            setMindmap(mindmapString)
          } catch (parseError) {
            console.error('❌ [PARSE_ERROR] Error parsing mindmap JSON:', parseError)
            console.log("🔄 [FALLBACK] Using empty mindmap data")
            setMindmap('')
          }
        } else {
          console.log('⚠️ [NO_DATA] No mindMapsJson found in response, using empty data')
          setMindmap('')
        }
      } else {
        console.error('❌ [FETCH_ERROR] Failed to fetch mindmap:', response.status, response.statusText)
        console.log("🔄 [FALLBACK] Using empty mindmap data")
        setMindmap('')
      }
    } catch (error) {
      console.error('💥 [FETCH_ERROR] Error fetching mindmap:', error)
      console.log("🔄 [FALLBACK] Using empty mindmap data")
      // Fallback to empty data if fetch fails
      setMindmap('')
    }
  }  // Effect to fetch all data on every page load/reload
  useEffect(() => {
    console.log("🚀 [FETCH_DATA] Fetching all data on page load...")
    
    const lectureId = detectPathParameters()
    
    // Always fetch all data when component mounts or reloads
    fetchDefinitions(lectureId || undefined)
    fetchQAs(lectureId || undefined)
    fetchStepByStep(lectureId || undefined)
    fetchMindmap(lectureId || undefined)
  }, []) // Empty dependency array means this runs only on mount/reload

  // Effect to run path detection and re-fetch when path changes
  useEffect(() => {
    console.log("🚀 [PATH_DETECTION] Running path parameter detection...")
    
    const lectureId = detectPathParameters()
    
    // Combined logging for easy debugging
    console.log("📊 [COMBINED_PARAMS] Summary:", {
      lectureId: lectureId,
      paramType: typeof lectureId,
      hasUser: !!user
    })
    
    // Re-fetch all data when path changes (navigation)
    if (lectureId) {
      fetchDefinitions(lectureId)
      fetchQAs(lectureId)
      fetchStepByStep(lectureId)
      fetchMindmap(lectureId)
    }
    
  }, [params.id, user])

  // Debug logging for all state variables
  useEffect(() => {
    console.log('🔍 [DEBUG] Definitions state updated:', definitions);
    console.log('🔍 [DEBUG] Definitions count:', definitions?.length || 0);
  }, [definitions]);

  useEffect(() => {
    console.log('🔍 [DEBUG] QAs state updated:', qas);
    console.log('🔍 [DEBUG] QAs count:', qas?.length || 0);
  }, [qas]);

  useEffect(() => {
    console.log('🔍 [DEBUG] Step-by-Step state updated:', stepByStep);
    console.log('🔍 [DEBUG] Step-by-Step count:', stepByStep?.concepts?.length || 0);
  }, [stepByStep]);
  useEffect(() => {
    console.log('🔍 [DEBUG] Mindmap state updated:', mindmap);
    console.log('🔍 [DEBUG] Mindmap length:', mindmap?.length || 0);
  }, [mindmap]);
  // Content data mapping
  const contentData = {
    mindmaps: {
      title: 'Mind Maps',
      items: mindmap  // Use the state variable (string) instead of the static data
    },
    definitions: {
      title: 'Definitions',
      items: definitions  // Use the state variable instead of the static data
    },
    qas: {
      title: 'Questions & Answers',
      items: qas  // Use the dynamic QAs state instead of static data
    },
    'step-by-step': {
      title: 'Step-by-Step Guides',
      items: stepByStep  // Use the dynamic Step-by-Step state instead of static data
    }
  }

  const activeContent = contentData[activeSection as keyof typeof contentData]
  // Helper function to safely get item count for badges
  const getItemCount = (section: string) => {
    switch (section) {
      case 'definitions':
        return definitions?.length || 0
      case 'qas':
        return qas?.length || 0
      case 'step-by-step':
        return stepByStep?.concepts?.length || 0
      case 'mindmaps':
        return mindmap ? 1 : 0  // If there's a mindmap string, count is 1; otherwise 0
      default:
        return 0
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="max-w-md w-full">
          <AuthForm />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-800">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-16" : "w-80"
        )}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              {!sidebarCollapsed && (
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Learning Materials
                </h2>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </Button>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {[
                {
                  id: 'mindmaps',
                  icon: Brain,
                  label: 'MindMaps',
                  description: 'Visual learning diagrams',
                  badge: (mindmap ? 1 : 0).toString() // Dynamic badge based on actual mindmap count
                },
                {
                  id: 'definitions',
                  icon: BookOpen,
                  label: 'Definitions',
                  description: 'Key terms and concepts explained',
                  badge: (definitions?.length || 0).toString() // Dynamic badge based on actual definitions count
                },
                {
                  id: 'qas',
                  icon: HelpCircle,
                  label: 'QAs',
                  description: 'Questions and answers',
                  badge: (qas?.length || 0).toString() // Dynamic badge based on actual QAs count
                },
                {
                  id: 'step-by-step',
                  icon: Target,
                  label: 'Step-by-Step',
                  description: 'Guided tutorials and procedures',
                  badge: (stepByStep?.concepts?.length || 0).toString() // Dynamic badge based on actual Step-by-Step count
                }
              ].map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                
                return (
                  <button
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
                          </span>
                          {item.badge && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "ml-2 text-xs px-2 py-0.5",
                                isActive 
                                  ? "bg-white/20 text-white border-white/30" 
                                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                              )}
                            >
                              {item.badge}
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
        </div>

        {/* Main Content */}
        <div className={cn(
          "flex-1 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "ml-16" : "ml-80"
        )}>
          {/* Header */}
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
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {activeContent.title} - Lecture {params.id}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      {activeSection === 'mindmaps' 
                        ? `Interactive mind map exploration for lecture ${params.id}` 
                        : `Explore interactive learning materials for lecture ${params.id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="hidden sm:flex">
                    Lecture {params.id}
                  </Badge>
                  <Badge variant="outline" className="hidden sm:flex">
                    {`${getItemCount(activeSection)} items`}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Collaborate
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className={cn("h-[calc(100vh-81px)]", activeSection === 'mindmaps' ? "" : "p-6")}>
            <ContentRenderer 
              activeSection={activeSection}
              contentData={contentData}
              mindmapData={mindmap}
              definitionsData={definitions}
              qasData={qas}
              stepByStepData={stepByStep ? [stepByStep] : []}
            />
          </main>
        </div>
      </div>
    </div>
  )
}
