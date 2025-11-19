import React from 'react';
import { AnalysisGroup, AnalysisSummary } from '../types';

interface AnalysisViewProps {
  results: AnalysisGroup[];
  summary: AnalysisSummary;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ results, summary }) => {
  return (
    <div className="w-full space-y-16 animate-fade-in">
      
      {/* Minimal Summary Stats */}
      <div className="grid grid-cols-3 gap-8 border-b border-gray-100 dark:border-neutral-800 pb-12 transition-colors duration-300">
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Papers</p>
          <p className="text-3xl font-bold text-black dark:text-white">{summary.totalPapers}</p>
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Questions Extracted</p>
          <p className="text-3xl font-bold text-black dark:text-white">{summary.totalQuestionsExtracted}</p>
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Repeated Topics</p>
          <p className="text-3xl font-bold text-black dark:text-white">{results.length}</p>
        </div>
      </div>

      <div className="space-y-12">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-bold text-black dark:text-white">Most Repeated Questions</h3>
           <span className="text-sm text-gray-400 dark:text-gray-500">Sorted by Frequency</span>
        </div>

        {results.map((group, index) => (
          <div key={group.id} className="group bg-white dark:bg-neutral-900 rounded-2xl border border-gray-100 dark:border-neutral-800 p-8 hover:border-gray-200 dark:hover:border-neutral-700 hover:shadow-xl hover:shadow-gray-100/50 dark:hover:shadow-none transition-all duration-300">
            
            {/* Question Header */}
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-black text-white dark:bg-white dark:text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider transition-colors">
                    #{index + 1} Most Repeated
                  </span>
                  <span className="bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider transition-colors">
                    {group.type}
                  </span>
                </div>
                <h4 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors">
                  {group.normalizedQuestion}
                </h4>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-neutral-800 rounded-xl p-4 min-w-[80px] transition-colors">
                 <span className="text-3xl font-black text-black dark:text-white">{group.frequency}</span>
                 <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Times</span>
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 mb-8 text-sm">
              <span className="text-gray-400 font-medium">Appeared in:</span>
              {group.years.map((year, i) => (
                <span key={i} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded text-xs font-mono transition-colors">
                  {year}
                </span>
              ))}
            </div>

            {/* Split Layout: Variants & Answer */}
            <div className="grid md:grid-cols-12 gap-8 pt-8 border-t border-gray-50 dark:border-neutral-800 transition-colors">
              
              {/* Left: Variants */}
              <div className="md:col-span-4 space-y-4">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Original Variants</p>
                <ul className="space-y-3">
                  {group.variants.map((v, i) => (
                    <li key={i} className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed pl-3 border-l-2 border-gray-100 dark:border-neutral-800 italic transition-colors">
                      "{v}"
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Answer */}
              <div className="md:col-span-8">
                <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-6 md:p-8 transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-200 uppercase tracking-wider">Model Answer</p>
                  </div>
                  <div className="prose prose-sm prose-gray dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
                     <div dangerouslySetInnerHTML={{ 
                      __html: group.answer
                        .replace(/\n/g, '<br />')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 dark:text-white">$1</strong>')
                        .replace(/^\* (.*)/gm, '<span class="block pl-4 border-l-2 border-gray-300 dark:border-neutral-600 my-2">$1</span>') 
                    }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};