import React from 'react';

export function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="px-4 py-2 bg-[#40916C] text-white rounded text-sm font-medium hover:bg-[#2D6A4F] transition-colors"
      {...props}
    >
      {children}
    </button>
  );
}
