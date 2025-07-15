import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  duration: {
    hours: number;
    minutes: number;
  };
}

export interface SessionManagementHook {
  // Goals
  sessionGoals: Goal[];
  setSessionGoals: (goals: Goal[]) => void;
  handleGoalToggle: (goalId: string) => Promise<void>;
  handleAddGoal: (goalText: string, duration?: { hours: number; minutes: number }) => void;
  handleDeleteGoal: (goalId: string) => void;
  getGoalsFromServer: () => Promise<void>;
  
  // Session hours goal
  sessionGoalHours: number;
  setSessionGoalHours: (hours: number) => void;
  handleStudyGoalSubmit: () => void;
  handleStudyGoalCancel: () => void;
  handleOpenStudyGoal: () => void;
  showStudyGoal: boolean;
  setShowStudyGoal: (show: boolean) => void;
  tempStudyGoal: number;
  setTempStudyGoal: (goal: number) => void;
  
  // Sessions
  sessions: { id: number; title: string; }[];
  setSessions: (sessions: { id: number; title: string; }[]) => void;
  showSessionList: boolean;
  setShowSessionList: (show: boolean) => void;
  handleSessionSelect: (sessionId: string) => void;
  
  // Lectures
  lectures: { lectureId: number; title: string; creationTime: string; }[];
  setLectures: (lectures: { lectureId: number; title: string; creationTime: string; }[]) => void;
  handleLectureSelect: (lectureId: string) => void;
  
  // Study stats
  studyTimeMinutes: number;
  practiceTimeMinutes: number;
  setStudyTimeMinutes: (minutes: number) => void;
  setPracticeTimeMinutes: (minutes: number) => void;
  
  // Discord
  discordLink: string;
  setDiscordLink: (link: string) => void;
  handleDiscordLinkSave: (link: string) => void;
  fetchDiscordLink: () => void;
  
  // Fetch functions
  fetchLectures: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  updateRoomStats: () => Promise<void>;
  setRoomGoalStudyHours: () => void;
}

export const useSessionManagement = (
  user: any,
  roomCode: string,
  router: any,
  leaveRoom: () => void
): SessionManagementHook => {
  const { toast } = useToast();
  
  // Goals state
  const [sessionGoals, setSessionGoals] = useState<Goal[]>([]);
  
  // Session hours goal state
  const [sessionGoalHours, setSessionGoalHours] = useState(0);
  const [showStudyGoal, setShowStudyGoal] = useState(false);
  const [tempStudyGoal, setTempStudyGoal] = useState(0);
  
  // Sessions state
  const [sessions, setSessions] = useState<{ id: number; title: string; }[]>([]);
  const [showSessionList, setShowSessionList] = useState(false);
  const isSessionsFetched = useRef<boolean>(false);
  
  // Lectures state
  const [lectures, setLectures] = useState<{ lectureId: number; title: string; creationTime: string; }[]>([]);
  const isLecturesFetched = useRef<boolean>(false);
  
  // Study stats
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0);
  const [practiceTimeMinutes, setPracticeTimeMinutes] = useState(0);
  
  // Discord
  const [discordLink, setDiscordLink] = useState<string>("");

  // Fetch goals from server
  const getGoalsFromServer = useCallback(async () => {
    if (!user || !roomCode) {
      console.warn("Cannot fetch goals: missing user or room code");
      return;
    }

    console.log("📡 [FETCH_GOALS] Fetching goals from server", { roomCode, user: user.name });

    try {
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/goals/all"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
        body: JSON.stringify({ roomJoinCode: roomCode }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [FETCH_GOALS] Goals fetched successfully:", data);
        
        // Transform the goals data to match the expected format
        const transformedGoals = data.map((goal: any) => ({
          id: goal.id || "",
          text: goal.goalTitle || goal.title || "",
          done: goal.done || false,
          duration: {
            hours: goal.hours || 0,
            minutes: goal.minutes || 0
          }
        }));
        
        setSessionGoals(transformedGoals);
        console.log("📝 [FETCH_GOALS] Updated session goals:", transformedGoals);
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [FETCH_GOALS] Failed to fetch goals:", errorData);
        toast({
          title: "Error",
          description: `Failed to fetch goals: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ [FETCH_GOALS] Network error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch goals. Please check your connection.",
        variant: "destructive"
      });
    }
  }, [user, roomCode, toast]);

  // Handle goal toggle
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
      const response = await fetch(getApiUrl("api/v1/squadgames/rooms/goals/toggle"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          id: goalId,
          roomJoinCode: roomCode,
          done: !goalToToggle.done
        }),
      });

      if (response.ok) {
        console.log("✅ [TOGGLE_GOAL] Goal toggled successfully on server");
        
        // Optimistically update the local state
        setSessionGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId ? { ...goal, done: !goal.done } : goal
          )
        );
        
      } else {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
        console.error("❌ [TOGGLE_GOAL] Failed to toggle goal:", errorData);
        toast({
          title: "Error",
          description: `Failed to toggle goal: ${errorData.message}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ [TOGGLE_GOAL] Network error:", error);
      toast({
        title: "Error",
        description: "Failed to toggle goal. Please check your connection.",
        variant: "destructive"
      });
    }
  }, [sessionGoals, user, roomCode, toast]);

  // Handle add goal
  const handleAddGoal = useCallback((goalText: string, duration?: { hours: number; minutes: number }) => {
    // Ensure duration values are properly set as integers, preserving the original values
    const durationHours = duration?.hours || 0;
    const durationMinutes = duration?.minutes || 0;
    
    console.log("📝 [ADD_GOAL] Adding goal with duration:", {
      goalText,
      originalDuration: duration,
      durationHours,
      durationMinutes
    });

    const goalRequestBody = {
      roomJoinCode: roomCode,
      goalTitle: goalText,
      hours: durationHours,
      minutes: durationMinutes,
      done: false
    };
    
    const res = fetch(getApiUrl("api/v1/squadgames/rooms/goals/add"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user?.access_token}`
      },
      body: JSON.stringify(goalRequestBody)
    });
    
    res.then(async response => {
      if (response.ok) {
        const data = await response.json();
        console.log("✅ [ADD_GOAL] Goal added successfully:", data);
        
        toast({
          title: "Goal Added",
          description: `Goal "${goalText}" added successfully`,
        });
      } else {
        console.error("❌ [ADD_GOAL] Failed to add goal:", response.statusText);
        toast({
          title: "Error",
          description: "Failed to add goal. Please try again.",
          variant: "destructive"
        });
      }
    }).catch(error => {
      console.error("❌ [ADD_GOAL] Network error:", error);
      toast({
        title: "Error",
        description: "Network error. Please check your connection.",
        variant: "destructive"
      });
    });
  }, [roomCode, user, toast]);

  // Handle delete goal
  const handleDeleteGoal = useCallback((goalId: string) => {
    // Find the goal to be deleted
    const goalToDelete = sessionGoals.find(goal => goal.id === goalId);
    
    if (goalToDelete) {
      // Console log the deleted goal details
      console.log("🗑️ [DELETE_GOAL] Goal deleted:", {
        id: goalToDelete.id,
        text: goalToDelete.text,
        done: goalToDelete.done,
        deletedAt: new Date().toISOString(),
        totalGoalsRemaining: sessionGoals.length - 1
      });

      const goalRequestBody = {
        id: goalId,
        roomJoinCode: roomCode,
      };
      
      fetch(getApiUrl("api/v1/squadgames/rooms/goals/delete"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(goalRequestBody)
      }).then(async response => {
        if (response.ok) {
          console.log("✅ [DELETE_GOAL] Goal deleted successfully from server");
          
          // Remove the goal from local state
          setSessionGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalId));
          
          toast({
            title: "Goal Deleted",
            description: `Goal "${goalToDelete.text}" deleted successfully`,
          });
        } else {
          console.error("❌ [DELETE_GOAL] Failed to delete goal:", response.statusText);
          toast({
            title: "Error",
            description: "Failed to delete goal. Please try again.",
            variant: "destructive"
          });
        }
      }).catch(error => {
        console.error("❌ [DELETE_GOAL] Network error:", error);
        toast({
          title: "Error",
          description: "Network error. Please check your connection.",
          variant: "destructive"
        });
      });
    }
  }, [sessionGoals, roomCode, user, toast]);

  // Study goal handlers
  const handleStudyGoalSubmit = useCallback(() => {
    if (tempStudyGoal > 0) {
      fetch(getApiUrl("api/v1/squadgames/rooms/set-room-hours-goal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
          studyHoursGoal: tempStudyGoal,
        }),
      });
      
      setSessionGoalHours(tempStudyGoal);
      setShowStudyGoal(false);
      
    } else {
      toast({
        title: "Invalid Goal",
        description: "Please enter a valid study goal",
        variant: "destructive"
      });
    }
  }, [tempStudyGoal, user, roomCode, toast]);

  const handleStudyGoalCancel = useCallback(() => {
    setTempStudyGoal(sessionGoalHours);
    setShowStudyGoal(false);
  }, [sessionGoalHours]);

  const handleOpenStudyGoal = useCallback(() => {
    setTempStudyGoal(sessionGoalHours);
    setShowStudyGoal(true);
  }, [sessionGoalHours]);

  // Session handlers
  const handleSessionSelect = useCallback((sessionId: string) => {
    console.log("🎮 [SESSION_SELECT] Session selected:", sessionId);
    
    // Find the selected session from the sessions array (convert id to string for comparison)
    const selectedSession = sessions.find((session) => String(session.id) === sessionId);
    
    if (!selectedSession) {
      console.error("❌ [SESSION_SELECT] Selected session not found:", sessionId);
      toast({
        title: "Error",
        description: "Selected session not found",
        variant: "destructive"
      });
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
        console.log("✅ [SESSION_SELECT] Session scheduled successfully");
      } else {
        console.error("❌ [SESSION_SELECT] Failed to schedule session");
      }
    });

    router.push(`/mcq/${selectedSession.id}?roomCode=${roomCode}`);
  }, [sessions, user, roomCode, router, toast]);

  // Lecture handlers
  const handleLectureSelect = useCallback((lectureId: string) => {
    console.log("🎓 [LECTURE_SELECT] Lecture selected:", lectureId);
    
    // Find the selected lecture from the lectures array (convert id to string for comparison)
    const selectedLecture = lectures.find((lecture) => String(lecture.lectureId) === lectureId);
    
    if (!selectedLecture) {
      console.error("❌ [LECTURE_SELECT] Selected lecture not found:", lectureId);
      toast({
        title: "Error",
        description: "Selected lecture not found",
        variant: "destructive"
      });
      return;
    }

    router.push(`/lec/${selectedLecture.lectureId}`);
  }, [lectures, router, toast]);

  // Fetch functions
  const fetchLectures = useCallback(async () => {
    if (isLecturesFetched.current) {
      console.log("📖 [FETCH_LECTURES] Lectures already fetched, skipping");
      return;
    }
    
    try {
      const res = await fetch(getApiUrl("api/v1/rooms/gemini/study/lectures/" + roomCode), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
      });
      
      if (!res.ok) {
        console.error("❌ [FETCH_LECTURES] Failed to fetch lectures:", res.statusText);
        return;
      }

      // If response is ok, parse JSON and update lectures
      const data = await res.json();
      setLectures(data);
      isLecturesFetched.current = true;
      console.log("✅ [FETCH_LECTURES] Lectures fetched successfully:", data);
    } catch (error) {
      console.error("❌ [FETCH_LECTURES] Network error:", error);
    }
  }, [roomCode, user]);

  const fetchSessions = useCallback(async () => {
    if (!user || !roomCode) {
      console.warn("Cannot fetch sessions: missing user or room code");
      return;
    }
    
    console.log("📡 [FETCH_SESSIONS] Fetching sessions from server", { roomCode, user: user.name });
    
    try {
      const response = await fetch(getApiUrl("api/v1/rooms/practice/sessions/" + roomCode), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
        isSessionsFetched.current = true;
        console.log("✅ [FETCH_SESSIONS] Sessions fetched successfully:", data);
      } else {
        console.error("❌ [FETCH_SESSIONS] Failed to fetch sessions:", response.statusText);
      }
    } catch (error) {
      console.error("❌ [FETCH_SESSIONS] Network error:", error);
    }
  }, [user, roomCode]);

  const updateRoomStats = useCallback(async () => {
    if (!user || !roomCode) return;

    try {
      const res = await fetch(getApiUrl("api/v1/squadgames/rooms/session-time"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setStudyTimeMinutes(data.roomStudyMinutes || 0);
        setPracticeTimeMinutes(data.roomPractiseMinutes || 0);
        console.log("✅ [UPDATE_ROOM_STATS] Room stats updated:", data);
      }
    } catch (error) {
      console.error("❌ [UPDATE_ROOM_STATS] Error updating room stats:", error);
    }
  }, [user, roomCode]);

  const setRoomGoalStudyHours = useCallback(() => {
    if (!user || !roomCode) {
      console.warn("Cannot set room goal study hours: missing user or room code");
      return;
    }
    
    if (sessionGoalHours <= 0) {
      console.log("📊 [SET_ROOM_HOURS_GOAL] No session goal hours set, fetching from server");
      
      const hours = localStorage.getItem(`sessionGoal_${roomCode}`);
      if (hours) {
        try {
          const parsedHours = JSON.parse(hours);
          setSessionGoalHours(parsedHours);
          console.log("📊 [SET_ROOM_HOURS_GOAL] Loaded session goal hours from localStorage:", parsedHours);
          return;
        } catch (e) {
          console.error("Error parsing session goal hours from localStorage:", e);
        }
      }
      
      // Fetch from server
      fetch(getApiUrl("api/v1/squadgames/rooms/room-hours-goal"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          roomJoinCode: roomCode,
        }),
      }).then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          setSessionGoalHours(data.roomHoursGoal || 0);
          localStorage.setItem(`sessionGoal_${roomCode}`, JSON.stringify(data.roomHoursGoal || 0));
          console.log("📥 [SET_ROOM_HOURS_GOAL] Fetched room hours goal:", data);
        } else {
          console.error("❌ [SET_ROOM_HOURS_GOAL] Failed to fetch room hours goal");
        }
      });
    }
  }, [user, roomCode, sessionGoalHours]);

  const fetchDiscordLink = useCallback(() => {
    if (!user || !roomCode) return;
    
    fetch(getApiUrl("api/v1/squadgames/rooms/discord-link"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({
        roomJoinCode: roomCode,
      }),
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        setDiscordLink(data.discordLink || "");
        console.log("📥 [FETCH_DISCORD_LINK] Fetched discord link:", data);
      } else {
        console.error("❌ [FETCH_DISCORD_LINK] Failed to fetch discord link");
      }
    });
  }, [user, roomCode]);

  const handleDiscordLinkSave = useCallback((link: string) => {
    setDiscordLink(link);
    
    if (!user || !roomCode) return;
    
    fetch(getApiUrl("api/v1/squadgames/rooms/set-discord-link"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user?.access_token}`,
      },
      body: JSON.stringify({
        roomJoinCode: roomCode,
        discordLink: link,
      }),
    }).then(async (response) => {
      if (response.ok) {
        console.log("✅ [SAVE_DISCORD_LINK] Discord link saved successfully");
        toast({
          title: "Discord Link Saved",
          description: "Discord link updated successfully",
        });
      } else {
        console.error("❌ [SAVE_DISCORD_LINK] Failed to save discord link");
        toast({
          title: "Error",
          description: "Failed to save discord link",
          variant: "destructive"
        });
      }
    });
  }, [user, roomCode, toast]);

  return {
    // Goals
    sessionGoals,
    setSessionGoals,
    handleGoalToggle,
    handleAddGoal,
    handleDeleteGoal,
    getGoalsFromServer,
    
    // Session hours goal
    sessionGoalHours,
    setSessionGoalHours,
    handleStudyGoalSubmit,
    handleStudyGoalCancel,
    handleOpenStudyGoal,
    showStudyGoal,
    setShowStudyGoal,
    tempStudyGoal,
    setTempStudyGoal,
    
    // Sessions
    sessions,
    setSessions,
    showSessionList,
    setShowSessionList,
    handleSessionSelect,
    
    // Lectures
    lectures,
    setLectures,
    handleLectureSelect,
    
    // Study stats
    studyTimeMinutes,
    practiceTimeMinutes,
    setStudyTimeMinutes,
    setPracticeTimeMinutes,
    
    // Discord
    discordLink,
    setDiscordLink,
    handleDiscordLinkSave,
    fetchDiscordLink,
    
    // Fetch functions
    fetchLectures,
    fetchSessions,
    updateRoomStats,
    setRoomGoalStudyHours
  };
};
