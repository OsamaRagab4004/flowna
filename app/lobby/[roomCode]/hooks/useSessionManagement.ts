import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

interface Goal {
  id: string;
  text: string;
  done: boolean;
  duration?: { hours: number; minutes: number };
}

interface SessionState {
  lectures: { lectureId: number; title: string; creationTime: string }[];
  sessions: { id: number; title: string }[];
  showSessionList: boolean;
  sessionGoals: Goal[];
  sessionGoalHours: number;
  tempStudyGoal: number;
  showStudyGoal: boolean;
  studyTimeMinutes: number;
  practiceTimeMinutes: number;
  discordLink: string;
}

interface SessionActions {
  setLectures: (lectures: { lectureId: number; title: string; creationTime: string }[]) => void;
  setSessions: (sessions: { id: number; title: string }[]) => void;
  setShowSessionList: (show: boolean) => void;
  setSessionGoals: (goals: Goal[]) => void;
  setSessionGoalHours: (hours: number) => void;
  setTempStudyGoal: (goal: number) => void;
  setShowStudyGoal: (show: boolean) => void;
  setStudyTimeMinutes: (minutes: number) => void;
  setPracticeTimeMinutes: (minutes: number) => void;
  setDiscordLink: (link: string) => void;
  fetchLectures: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  refetchSessions: () => Promise<void>;
  getGoalsFromServer: () => Promise<void>;
  fetchDiscordLink: () => void;
  handleLectureSelect: (lectureId: string) => void;
  handleSessionSelect: (sessionId: string) => void;
  handleStudyGoalSubmit: () => void;
  handleStudyGoalCancel: () => void;
  handleOpenStudyGoal: () => void;
  handleGoalToggle: (goalId: string) => Promise<void>;
  handleAddGoal: (goalText: string, duration?: { hours: number; minutes: number }) => void;
  handleDeleteGoal: (goalId: string) => void;
  handleDiscordLinkSave: (link: string) => void;
  addStudyTime: (timeInMinutes: number, sessionType: 'study' | 'practice') => Promise<void>;
  updateRoomStats: () => Promise<void>;
  setRoomGoalStudyHours: () => void;
}

export const useSessionManagement = (
  roomCode: string,
  user: any,
  router: any
): SessionState & SessionActions => {
  const { toast } = useToast();
  
  const [lectures, setLectures] = useState<{ lectureId: number; title: string; creationTime: string }[]>([]);
  const [sessions, setSessions] = useState<{ id: number; title: string }[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const [sessionGoals, setSessionGoals] = useState<Goal[]>([]);
  const [sessionGoalHours, setSessionGoalHours] = useState(0);
  const [tempStudyGoal, setTempStudyGoal] = useState(0);
  const [showStudyGoal, setShowStudyGoal] = useState(false);
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0);
  const [practiceTimeMinutes, setPracticeTimeMinutes] = useState(0);
  const [discordLink, setDiscordLink] = useState<string>("");
  
  const isLecturesFetched = useRef<boolean>(false);
  const isSessionsFetched = useRef<boolean>(false);

  // Function to fetch lectures
  const fetchLectures = useCallback(async () => {
    if (isLecturesFetched.current) return;
    
    try {
      const res = await fetch(getApiUrl(`api/v1/rooms/gemini/study/lectures/${roomCode}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
      });
      
      if (!res.ok) {
        console.error("Failed to fetch lectures");
        return;
      }

      const data = await res.json();
      setLectures(data);
      isLecturesFetched.current = true;
    } catch (error) {
      console.error("Error fetching lectures:", error);
    }
  }, [roomCode, user?.access_token]);

  // Function to fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!user || !roomCode) {
      console.warn("⚠️ [FETCH_SESSIONS] Cannot fetch sessions: missing user or room code");
      return;
    }
    
    console.log("📡 [FETCH_SESSIONS] Fetching sessions from server", { roomCode, user: user.name });
    
    try {
      const res = await fetch(getApiUrl(`api/v1/squadgames/questions-collector/room/${roomCode}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ [FETCH_SESSIONS] Failed to fetch sessions:", res.statusText);
        toast({
          title: "Error",
          description: "Failed to fetch sessions. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // If response is ok, parse JSON and update sessions
      const data = await res.json();
      console.log("✅ [FETCH_SESSIONS] Sessions fetched successfully:", data);
      setSessions(data);
      isSessionsFetched.current = true; // Mark as fetched
    } catch (error) {
      console.error("❌ [FETCH_SESSIONS] Error fetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch sessions. Please try again.",
        variant: "destructive"
      });
    }
  }, [roomCode, user, toast]);

  // Function to force refetch sessions (ignoring the fetched flag)
  const refetchSessions = useCallback(async () => {
    if (!user || !roomCode) {
      console.warn("⚠️ [REFETCH_SESSIONS] Cannot refetch sessions: missing user or room code");
      return;
    }
    
    console.log("🔄 [REFETCH_SESSIONS] Force refetching sessions from server", { roomCode, user: user.name });
    
    try {
      const res = await fetch(getApiUrl(`api/v1/squadgames/questions-collector/room/${roomCode}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      });

      if (!res.ok) {
        console.error("❌ [REFETCH_SESSIONS] Failed to refetch sessions:", res.statusText);
        toast({
          title: "Error",
          description: "Failed to refetch sessions. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const data = await res.json();
      console.log("✅ [REFETCH_SESSIONS] Sessions refetched successfully:", data);
      setSessions(data);
    } catch (error) {
      console.error("❌ [REFETCH_SESSIONS] Error refetching sessions:", error);
      toast({
        title: "Error",
        description: "Failed to refetch sessions. Please try again.",
        variant: "destructive"
      });
    }
  }, [roomCode, user, toast]);

  // Function to get goals from server
  const getGoalsFromServer = useCallback(async () => {
    if (!user || !roomCode) return;

    console.log("📡 [FETCH_GOALS] Fetching goals from server", { roomCode, user: user.name });

    try {
      const res = await fetch(getApiUrl(`api/v1/goals/${roomCode}`), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      });
      
      if (!res.ok) {
        console.error("Failed to fetch goals");
        return;
      }

      const data = await res.json();
      setSessionGoals(data);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  }, [roomCode, user]);

  // Function to fetch Discord link
  const fetchDiscordLink = useCallback(() => {
    // Implementation would go here
    console.log("📡 [FETCH_DISCORD] Fetching Discord link");
  }, []);

  // Function to handle lecture selection
  const handleLectureSelect = useCallback((lectureId: string) => {
    console.log("🎓 [LECTURE_SELECT] Lecture selected:", lectureId);
    
    const selectedLecture = lectures.find((lecture) => String(lecture.lectureId) === lectureId);
    
    if (!selectedLecture) {
      console.error("Selected lecture not found");
      return;
    }

    router.push(`/lec/${selectedLecture.lectureId}`);
  }, [lectures, router]);

  // Function to handle session selection
  const handleSessionSelect = useCallback((sessionId: string) => {
    console.log("🎮 [SESSION_SELECT] Session selected:", sessionId);
    
    // Find the selected session from the sessions array (convert id to string for comparison)
    const selectedSession = sessions.find((session) => String(session.id) === sessionId);
    
    if (!selectedSession) {
      console.error("Selected session not found");
      return;
    }

    // Close the session list
    setShowSessionList(false);

    // Add exam to Scheduler and trigger event for other users to open exam
    fetch(getApiUrl("api/v1/scheduler/schedule"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",       
        Authorization: `Bearer ${user?.access_token}`
      },
      body: JSON.stringify({
        roomId: roomCode,
        collectorId: selectedSession.id,
      }),
    }).then((response) => {
      if (response.ok) {
        console.log("✅ [SESSION_SELECT] Exam scheduled successfully, server will send EXAM_STARTED event");
      } else {
        console.error("❌ [SESSION_SELECT] Failed to schedule exam");
        toast({
          title: "Error",
          description: "Failed to start exam session. Please try again.",
          variant: "destructive"
        });
      }
    }).catch((error) => {
      console.error("❌ [SESSION_SELECT] Error scheduling exam:", error);
      toast({
        title: "Error",
        description: "Failed to start exam session. Please try again.",
        variant: "destructive"
      });
    });

    // Note: Don't redirect immediately - wait for server to send EXAM_STARTED event
    // The useRoomMessageHandler will handle the EXAM_STARTED event and redirect all users
  }, [sessions, roomCode, user, toast]);

  // Study goal handlers
  const handleStudyGoalSubmit = useCallback(() => {
    if (tempStudyGoal > 0) {
      setSessionGoalHours(tempStudyGoal);
      setShowStudyGoal(false);
      toast({
        title: "Study Goal Set",
        description: `Study goal set to ${tempStudyGoal} hours`,
      });
    } else {
      toast({
        title: "Invalid Goal",
        description: "Please enter a valid study goal",
        variant: "destructive"
      });
    }
  }, [tempStudyGoal, toast]);

  const handleStudyGoalCancel = useCallback(() => {
    setTempStudyGoal(sessionGoalHours);
    setShowStudyGoal(false);
  }, [sessionGoalHours]);

  const handleOpenStudyGoal = useCallback(() => {
    setTempStudyGoal(sessionGoalHours);
    setShowStudyGoal(true);
  }, [sessionGoalHours]);

  // Goal management handlers
  const handleGoalToggle = useCallback(async (goalId: string) => {
    const goalToToggle = sessionGoals.find(goal => goal.id === goalId);
    if (!goalToToggle) return;

    console.log("🔄 [TOGGLE_GOAL] Toggling goal:", {
      id: goalId,
      text: goalToToggle.text,
      currentDone: goalToToggle.done,
      newDone: !goalToToggle.done
    });

    try {
      const response = await fetch(getApiUrl(`api/v1/goals/${goalId}/toggle`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({ done: !goalToToggle.done }),
      });

      if (response.ok) {
        setSessionGoals(prev => 
          prev.map(goal => 
            goal.id === goalId ? { ...goal, done: !goal.done } : goal
          )
        );
      }
    } catch (error) {
      console.error("Error toggling goal:", error);
    }
  }, [sessionGoals, user]);

  const handleAddGoal = useCallback((goalText: string, duration?: { hours: number; minutes: number }) => {
    const durationHours = duration?.hours || 0;
    const newGoal: Goal = {
      id: Date.now().toString(),
      text: goalText,
      done: false,
      duration: { hours: durationHours, minutes: duration?.minutes || 0 }
    };
    
    setSessionGoals(prev => [...prev, newGoal]);
  }, []);

  const handleDeleteGoal = useCallback((goalId: string) => {
    setSessionGoals(prev => prev.filter(goal => goal.id !== goalId));
  }, []);

  const handleDiscordLinkSave = useCallback((link: string) => {
    setDiscordLink(link);
    toast({
      title: "Discord Link Saved",
      description: "Discord link has been updated",
    });
  }, [toast]);

  // Function to add study time
  const addStudyTime = useCallback(async (timeInMinutes: number, sessionType: 'study' | 'practice') => {
    if (!user || !roomCode) return;

    try {
      const response = await fetch(getApiUrl("api/v1/study-time"), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          roomCode,
          timeInMinutes,
          sessionType,
        }),
      });

      if (response.ok) {
        if (sessionType === 'study') {
          setStudyTimeMinutes(prev => prev + timeInMinutes);
        } else {
          setPracticeTimeMinutes(prev => prev + timeInMinutes);
        }
      }
    } catch (error) {
      console.error("Error adding study time:", error);
    }
  }, [user, roomCode]);

  // Function to update room stats
  const updateRoomStats = useCallback(async () => {
    if (!user || !roomCode) return;

    try {
      const res = await fetch(getApiUrl("api/v1/squadgames/rooms/session-time"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setStudyTimeMinutes(data.studyTime || 0);
        setPracticeTimeMinutes(data.practiceTime || 0);
      }
    } catch (error) {
      console.error("Error updating room stats:", error);
    }
  }, [user, roomCode]);

  // Function to set room goal study hours (placeholder)
  const setRoomGoalStudyHours = useCallback(() => {
    console.log("🎯 [SET_ROOM_GOAL] Setting room goal study hours");
    // This is a placeholder function that was called in the backup but not defined
    // It might be used to initialize or sync study hour goals for the room
  }, []);

  return {
    lectures,
    sessions,
    showSessionList,
    sessionGoals,
    sessionGoalHours,
    tempStudyGoal,
    showStudyGoal,
    studyTimeMinutes,
    practiceTimeMinutes,
    discordLink,
    setLectures,
    setSessions,
    setShowSessionList,
    setSessionGoals,
    setSessionGoalHours,
    setTempStudyGoal,
    setShowStudyGoal,
    setStudyTimeMinutes,
    setPracticeTimeMinutes,
    setDiscordLink,
    fetchLectures,
    fetchSessions,
    refetchSessions,
    getGoalsFromServer,
    fetchDiscordLink,
    handleLectureSelect,
    handleSessionSelect,
    handleStudyGoalSubmit,
    handleStudyGoalCancel,
    handleOpenStudyGoal,
    handleGoalToggle,
    handleAddGoal,
    handleDeleteGoal,
    handleDiscordLinkSave,
    addStudyTime,
    updateRoomStats,
    setRoomGoalStudyHours
  };
};
