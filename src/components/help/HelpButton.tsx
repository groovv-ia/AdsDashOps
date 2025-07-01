import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { HelpCenter } from './HelpCenter';

export const HelpButton: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsHelpOpen(true)}
        title="Central de Ajuda"
        className="relative"
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <HelpCenter
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
};