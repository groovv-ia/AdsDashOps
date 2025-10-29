import React, { useState } from 'react';
import { HelpCircle, MessageCircle, X } from 'lucide-react';
import { HelpCenter } from './HelpCenter';

export const FloatingHelpButton: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsHelpOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-110"
          title="Central de Ajuda"
        >
          <HelpCircle className="w-6 h-6 transition-transform group-hover:rotate-12" />
          
          {/* Pulse animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 animate-ping opacity-20"></div>
          
          {/* Tooltip */}
          {isHovered && (
            <div className="absolute bottom-full right-0 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 animate-in fade-in duration-200">
              Central de Ajuda
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>

        {/* Quick access indicators */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">?</span>
        </div>
      </div>

      {/* Help Center Modal */}
      <HelpCenter
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
};