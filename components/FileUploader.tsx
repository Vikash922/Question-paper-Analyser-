import React from 'react';
import { UploadedFile } from '../types';

interface FileUploaderProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  disabled: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ files, setFiles, disabled }) => {
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles: UploadedFile[] = Array.from(event.target.files).map((f) => ({
        id: Math.random().toString(36).substring(7),
        file: f as File,
        status: 'pending'
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label 
        htmlFor="dropzone-file" 
        className={`group flex flex-col items-center justify-center w-full h-40 border border-dashed border-gray-300 dark:border-neutral-700 rounded-xl cursor-pointer bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-gray-400 dark:hover:border-neutral-600 transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <div className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-full mb-3 group-hover:bg-gray-100 dark:group-hover:bg-neutral-700 transition-colors">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          </div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Click to upload papers</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">PDF, Images or Text</p>
        </div>
        <input 
          id="dropzone-file" 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf,.png,.jpg,.jpeg,.txt"
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>

      {files.length > 0 && (
        <div className="mt-8 space-y-3">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-lg shadow-sm hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-none transition-all duration-200">
              <div className="flex items-center space-x-4 overflow-hidden">
                <div className="flex-shrink-0 w-6 flex justify-center">
                    {file.status === 'completed' ? (
                      <span className="text-green-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </span>
                    ) : file.status === 'processing' ? (
                      <span className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-black dark:border-neutral-600 dark:border-t-white rounded-full"></span>
                    ) : file.status === 'error' ? (
                      <span className="text-red-500">✕</span>
                    ) : (
                      <span className="w-2 h-2 bg-gray-300 dark:bg-neutral-600 rounded-full"></span>
                    )}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{file.file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {file.detectedYear ? `Year: ${file.detectedYear} • ` : ''}
                    {file.extractedQuestionsCount !== undefined ? `${file.extractedQuestionsCount} questions` : 'Ready'}
                  </p>
                </div>
              </div>
              {!disabled && (
                <button onClick={() => removeFile(file.id)} className="text-gray-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400 transition-colors p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};