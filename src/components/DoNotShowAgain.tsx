import React from 'react';

interface DoNotShowAgainProps {
  onDisable: () => void;
}

export const DoNotShowAgain: React.FC<DoNotShowAgainProps> = ({ onDisable }) => (
  <div className="flex justify-center mt-6">
    <button
      onClick={onDisable}
      className="text-gray-400 hover:text-gray-900 text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
    >
      <div className="w-1 h-1 rounded-full bg-gray-300" />
      Don't show this again
    </button>
  </div>
);
