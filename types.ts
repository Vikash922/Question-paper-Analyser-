export interface QuestionVariant {
  text: string;
  sourceFile: string;
  year: string;
}

export interface AnalysisGroup {
  id: string;
  normalizedQuestion: string;
  type: 'Long Question' | 'Short Question' | 'Very Short Question' | 'MCQ';
  years: string[];
  frequency: number;
  variants: string[];
  answer: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  extractedQuestionsCount?: number;
  detectedYear?: string;
}

export interface ExtractionResult {
  questions: string[];
  year: string;
  sourceFile: string;
}

export interface AnalysisSummary {
  totalPapers: number;
  totalQuestionsExtracted: number;
  totalRepeatedGroups: number;
}