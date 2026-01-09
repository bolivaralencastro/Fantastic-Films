import React from 'react';
import { Layers } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-md">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            FrameFinal
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer">Como funciona</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacidade</span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-colors"
            >
              GitHub
            </a>
        </nav>
      </div>
    </header>
  );
};