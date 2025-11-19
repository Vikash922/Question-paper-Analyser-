import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { AnalysisView } from './components/AnalysisView';
import { UploadedFile, AnalysisGroup, AnalysisSummary, ExtractionResult } from './types';
import { extractQuestionsFromFile, analyzeRepeatedQuestions } from './services/geminiService';
import { APP_TITLE, APP_SUBTITLE } from './constants';

export default function App() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisGroup[] | null>(null);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // Handle Dark Mode Class on Body/HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleReset = () => {
    setFiles([]);
    setAnalysisResults(null);
    setSummary(null);
    setError(null);
    setIsProcessing(false);
    setCurrentStatus('');
    setProgress(0);
  };

  const processFiles = async () => {
    if (files.length === 0) {
      setError("Please upload at least one paper.");
      return;
    }
    if (!process.env.API_KEY) {
      setError("API Key is missing.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setAnalysisResults(null);
    
    setCurrentStatus(`Extracting from ${files.length} papers concurrently...`);

    try {
      let processedCount = 0;
      
      // Helper to update progress
      const updateProgress = () => {
        processedCount++;
        const percentage = Math.min(90, Math.round((processedCount / files.length) * 90));
        setProgress(percentage);
      };

      // 1. Parallel Extraction
      const extractionPromises = files.map(async (fileObj) => {
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing' } : f));
        
        try {
          const extraction = await extractQuestionsFromFile(fileObj.file);
          
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { 
            ...f, 
            status: 'completed',
            detectedYear: extraction.year,
            extractedQuestionsCount: extraction.questions.length
          } : f));

          updateProgress();
          return extraction;
        } catch (err) {
          console.error(`Error processing ${fileObj.file.name}:`, err);
          setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error' } : f));
          updateProgress(); 
          return null;
        }
      });

      // Wait for all extractions to finish
      const results = await Promise.all(extractionPromises);
      const successfulExtractions = results.filter((r): r is ExtractionResult => r !== null);

      if (successfulExtractions.length === 0) {
        throw new Error("No questions could be extracted. Please check your files.");
      }

      const totalQ = successfulExtractions.reduce((acc, val) => acc + val.questions.length, 0);

      // 2. Analysis & Grouping
      setCurrentStatus("Analyzing patterns, merging duplicates, and solving questions...");
      setProgress(92);
      
      const groups = await analyzeRepeatedQuestions(successfulExtractions);
      
      setProgress(100);
      setAnalysisResults(groups);
      setSummary({
        totalPapers: files.length,
        totalQuestionsExtracted: totalQ,
        totalRepeatedGroups: groups.length
      });

    } catch (err: any) {
      console.error("Full Process Error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
      setCurrentStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
      
      {/* Minimal Header */}
      <header className="border-b border-gray-100 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center transition-colors duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-black dark:text-white transition-colors duration-300">{APP_TITLE}</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="text-gray-400 hover:text-black dark:text-gray-500 dark:hover:text-white transition-colors focus:outline-none"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              ) : (
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              )}
            </button>

            {analysisResults && (
               <button 
               onClick={handleReset}
               className="text-sm font-medium text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
             >
               New Analysis
             </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Landing / Upload State */}
        {!analysisResults && !isProcessing && (
          <div className="animate-fade-in space-y-10">
            <div className="text-center space-y-4 mt-8">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-black dark:text-white transition-colors duration-300">
                Exam patterns,<br/>decoded instantly.
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto leading-relaxed transition-colors duration-300">{APP_SUBTITLE}</p>
            </div>

            <FileUploader 
              files={files} 
              setFiles={setFiles} 
              disabled={isProcessing} 
            />

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30 flex items-center justify-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 {error}
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button 
                onClick={processFiles}
                disabled={files.length === 0}
                className={`px-10 py-4 rounded-full font-semibold text-base transition-all transform hover:scale-105 active:scale-95
                  ${files.length > 0 
                    ? 'bg-black text-white hover:bg-gray-800 shadow-xl shadow-gray-200 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:shadow-none' 
                    : 'bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed'}`}
              >
                {files.length > 0 ? `Analyze ${files.length} Papers` : 'Upload Papers to Start'}
              </button>
            </div>
          </div>
        )}

        {/* Processing State with Progress Bar */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
            <div className="w-full max-w-md space-y-6">
              <div className="flex flex-col items-center space-y-2">
                 <h3 className="text-xl font-medium text-black dark:text-white">Processing Intelligence</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400">{currentStatus}</p>
              </div>
              
              <div className="w-full bg-gray-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-black dark:bg-white h-1.5 rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 font-mono">
                <span>Start</span>
                <span>{progress}%</span>
                <span>Complete</span>
              </div>
            </div>
          </div>
        )}

        {/* Results State */}
        {analysisResults && summary && (
          <AnalysisView results={analysisResults} summary={summary} />
        )}

      </main>
    </div>
  );
}