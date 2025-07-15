// Utility function to calculate remaining time for timer
export const calculateRemainingTime = (startTime: number, originalDuration: number): number => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  return Math.max(0, originalDuration - elapsed);
};

// Utility function to format time as MM:SS or HH:MM:SS
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const getLocalName = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("name") || "Anonymous";
  }
  return "Anonymous";
};
