import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api';

interface SummarySettings {
  createMindmap: boolean;
  createDefinitions: boolean;
  createQA: boolean;
  createStepbystep: boolean;
}

interface MCQSettings {
  type: 'practical' | 'theoretical';
}

interface Question {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string;
  type: 'text' | 'mcq' | 'cw' | 'tf';
  authorId: string;
  authorName: string;
}

interface FileUploadState {
  uploadedFile: File | null;
  isGenerating: boolean;
  questionsGenerated: boolean;
  uploadSuccess: boolean;
  uploadFailed: boolean;
  showUploadModal: boolean;
}

interface FileUploadActions {
  setUploadedFile: (file: File | null) => void;
  setIsGenerating: (generating: boolean) => void;
  setQuestionsGenerated: (generated: boolean) => void;
  setUploadSuccess: (success: boolean) => void;
  setUploadFailed: (failed: boolean) => void;
  setShowUploadModal: (show: boolean) => void;
  handleFileUploadAndGenerate: (file: File, type: 'summary' | 'mcq', summarySettings?: SummarySettings, mcqSettings?: MCQSettings) => void;
  handleRemoveFile: () => void;
}

export const useFileUpload = (
  roomCode: string,
  user: any,
  addQuestion: (question: Question) => void
): FileUploadState & FileUploadActions => {
  const { toast } = useToast();
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionsGenerated, setQuestionsGenerated] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleFileUploadAndGenerate = useCallback(async (file: File, type: 'summary' | 'mcq', summarySettings?: SummarySettings, mcqSettings?: MCQSettings) => {
    setUploadedFile(file);
    setIsGenerating(true);
    setUploadSuccess(false);
    setUploadFailed(false);
    setQuestionsGenerated(false);
    
    console.log("File upload settings:", { type, summarySettings, mcqSettings });

    const formData = new FormData();
    formData.append("file", file);
    const filename = file.name;

    try {
      // Upload file
      const response = await fetch(getApiUrl("api/v1/rooms/gemini/upload"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const data = await response.json();
      const { mimeType, uri } = data.file || {};
      
      // Show upload success toast
      toast({
        title: "File Uploaded Successfully",
        description: `Now generating ${type === 'summary' ? 'study materials' : 'MCQ questions'} from your PDF...`,
      });
      
      setUploadSuccess(true);
      
      // Generate content based on type
      if (type === 'summary') {
        await generateSummaryContent(mimeType, uri, summarySettings || {
          createMindmap: true,
          createDefinitions: true,
          createQA: true,
          createStepbystep: true
        }, filename);
      } else {
        await generateMCQContent(mimeType, uri, mcqSettings || {
          type: 'practical'
        }, filename);
      }
    } catch (error) {
      console.error("Error in file upload or generation:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the file. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
      setUploadSuccess(false);
      setUploadFailed(true);
    }

    // Helper function to generate summary content
    async function generateSummaryContent(mimeType: string, uri: string, settings: SummarySettings, filename: string) {
      console.log("mimeType:", mimeType);
      console.log("uri:", uri);
      console.log("Summary settings:", settings);

      const summaryResponse = await fetch(getApiUrl("api/v1/rooms/gemini/study/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          fileUri: uri,
          title: filename,
          createMindmap: settings.createMindmap,
          createDefinitions: settings.createDefinitions,
          createQA: settings.createQA,
          createStepbystep: settings.createStepbystep,
          roomJoinCode: roomCode
        }),
      });

      if (!summaryResponse.ok) {
        throw new Error('Summary generation failed');
      }

      const summaryData = await summaryResponse.json();
      setIsGenerating(false);
      setQuestionsGenerated(true);
      
      toast({
        title: "Study Materials Generated",
        description: "Your study materials have been generated successfully!",
      });
      
      // Process and add questions/materials to context
      if (summaryData.questions) {
        summaryData.questions.forEach((question: Question) => {
          addQuestion(question);
        });
      }
    }

    // Helper function to generate MCQ content
    async function generateMCQContent(mimeType: string, uri: string, settings: MCQSettings, filename: string) {
      console.log("mimeType:", mimeType);
      console.log("uri:", uri);
      console.log("MCQ settings:", settings);

      const mcqResponse = await fetch(getApiUrl("api/v1/rooms/gemini/practise/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify({
          fileUri: uri,
          title: filename,
          type: settings.type,
          roomJoinCode: roomCode
        }),
      });

      if (!mcqResponse.ok) {
        throw new Error('MCQ generation failed');
      }

      const mcqData = await mcqResponse.json();
      setIsGenerating(false);
      setQuestionsGenerated(true);
      
      toast({
        title: "MCQ Questions Generated",
        description: "Your MCQ questions have been generated successfully!",
      });
      
      // Process and add questions to context
      if (mcqData.questions) {
        mcqData.questions.forEach((question: Question) => {
          addQuestion(question);
        });
      }
    }
  }, [user, toast, roomCode, addQuestion]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    setQuestionsGenerated(false);
    setUploadSuccess(false);
    setUploadFailed(false);
  }, []);

  return {
    uploadedFile,
    isGenerating,
    questionsGenerated,
    uploadSuccess,
    uploadFailed,
    showUploadModal,
    setUploadedFile,
    setIsGenerating,
    setQuestionsGenerated,
    setUploadSuccess,
    setUploadFailed,
    setShowUploadModal,
    handleFileUploadAndGenerate,
    handleRemoveFile,
  };
};
