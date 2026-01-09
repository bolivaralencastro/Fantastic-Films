import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-slate-600 text-xs">
        <p className="mb-1">
          Desenvolvido com React, TypeScript e Tailwind.
        </p>
        <p>
          &copy; {new Date().getFullYear()} FrameFinal. Processamento local seguro.
        </p>
      </div>
    </footer>
  );
};