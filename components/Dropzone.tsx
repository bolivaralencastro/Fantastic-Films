/// <reference lib="dom" />
import React, { useCallback, useState } from 'react';
import { UploadCloud, FileVideo } from 'lucide-react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file: File) => file.type.startsWith('video/'));
    
    if (videoFile) {
      onFileSelect(videoFile);
    } else {
      alert("Por favor, envie um arquivo de vídeo válido.");
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative w-full max-w-xl h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group overflow-hidden
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' 
          : 'border-slate-700 bg-slate-900/30 hover:border-slate-500 hover:bg-slate-800/50'
        }
      `}
    >
      <input
        type="file"
        accept="video/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      
      <div className={`
        bg-indigo-500/20 p-3 rounded-full mb-3 transition-transform duration-300
        ${isDragging ? 'scale-110' : 'group-hover:scale-110'}
      `}>
        {isDragging ? (
          <FileVideo className="w-6 h-6 text-indigo-400" />
        ) : (
          <UploadCloud className="w-6 h-6 text-indigo-400" />
        )}
      </div>

      <h3 className="text-lg font-medium text-slate-200 mb-1">
        {isDragging ? 'Solte o vídeo aqui' : 'Arraste seu vídeo'}
      </h3>
      <p className="text-slate-500 text-xs">
        Ou clique para selecionar
      </p>
      
      <div className="mt-4 flex gap-2">
        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase rounded border border-slate-700">mp4</span>
        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase rounded border border-slate-700">mov</span>
        <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase rounded border border-slate-700">webm</span>
      </div>
    </div>
  );
};