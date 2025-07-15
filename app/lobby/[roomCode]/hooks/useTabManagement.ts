import { useState, useCallback } from 'react';

interface TabState {
  visibleTabs: Set<string>;
}

interface TabActions {
  setVisibleTabs: (tabs: React.SetStateAction<Set<string>>) => void;
  toggleTab: (tabId: string) => void;
}

export const useTabManagement = (
  initialTabs: string[] = ['study-room']
): TabState & TabActions => {
  const [visibleTabs, setVisibleTabs] = useState<Set<string>>(new Set(initialTabs));

  // Toggle function for tabs - memoized to prevent unnecessary re-renders
  const toggleTab = useCallback((tabId: string) => {
    setVisibleTabs(prev => {
      const newTabs = new Set(prev);
      if (newTabs.has(tabId)) {
        newTabs.delete(tabId);
      } else {
        newTabs.add(tabId);
      }
      return newTabs;
    });
  }, []);

  return {
    visibleTabs,
    setVisibleTabs,
    toggleTab
  };
};
