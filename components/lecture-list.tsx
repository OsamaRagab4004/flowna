"use client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Library, BookOpen } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo, useCallback, useMemo } from 'react';

interface Lecture {
  id: string;
  title: string;
  creationTime: string;
}

interface LectureListProps {
  lectures: Lecture[];
  onLectureSelect: (lectureId: string) => void;
}

// Memoized lecture item component for performance
const LectureItem = memo(({ lecture, onSelect }: { lecture: Lecture; onSelect: (id: string) => void }) => {
  const handleClick = useCallback(() => {
    // Open lecture in new tab
    window.open(`/lec/${lecture.id}`, '_blank');
  }, [lecture.id]);

  // Memoize the formatted date to avoid recalculating on every render
  const formattedDate = useMemo(() => {
    return new Date(lecture.creationTime).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [lecture.creationTime]);

  return (
    <li
      onClick={handleClick}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors duration-150 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
    >
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full flex-shrink-0">
        <BookOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-grow min-w-0 overflow-hidden">
        <p className="font-semibold text-gray-800 dark:text-gray-200 break-words whitespace-normal leading-tight text-sm">
          {lecture.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
          {formattedDate}
        </p>
      </div>
    </li>
  );
});

LectureItem.displayName = 'LectureItem';

export const LectureList = memo(({ lectures, onLectureSelect }: LectureListProps) => {
  // Memoize the click handler to prevent unnecessary re-renders
  const handleLectureClick = useCallback((lectureId: string) => {
    onLectureSelect(lectureId);
  }, [onLectureSelect]);

  // Memoize the rendered lecture items for better performance
  const lectureItems = useMemo(() => {
    return lectures.map((lecture) => (
      <LectureItem
        key={lecture.id}
        lecture={lecture}
        onSelect={handleLectureClick}
      />
    ));
  }, [lectures, handleLectureClick]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-12 w-12 border-cyan-500 text-cyan-500 hover:bg-cyan-50 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Library className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-1/2 max-w-none flex flex-col pt-[150px]" style={{ width: '50vw' }}>
        <SheetHeader>
          <SheetTitle>Lectures</SheetTitle>
          <SheetDescription>
            Select a lecture to view its content.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow mt-4 h-full">
          <ul className="space-y-2 pr-4 pb-4">
            {lectureItems}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

LectureList.displayName = 'LectureList';
