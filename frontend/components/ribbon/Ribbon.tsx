import React from 'react';
import { BellIcon, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface RibbonProps {
  onToggleDrawer: () => void;
}

export default function Ribbon({ onToggleDrawer }: RibbonProps) {
  const handleSync = async () => {
    // Sincronizar logic here (Phase 4 api call)
    alert('Sincronización en proceso. Esto correrá en background.');
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-4">
        {/* Breadcrumb o Titulo de seccion dinámico puede ir aquí */}
        <h1 className="text-sm font-medium text-gray-700">Panel de Control</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button onClick={handleSync} className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded text-sm hover:bg-secondary transition shadow-soft">
          <RefreshCw className="w-3.5 h-3.5" />
          Sincronizar ahora
        </Button>
        
        <button 
          onClick={onToggleDrawer}
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-secondary font-medium text-sm">
          A
        </div>
      </div>
    </header>
  );
}
