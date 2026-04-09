"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Ribbon from '@/components/ribbon/Ribbon';
import NotificationDrawer from '@/components/notifications/NotificationDrawer';
import { Monitor, Calculator, BellIcon } from 'lucide-react';

const navItems = [
  { name: 'Fichas', path: '/fichas', icon: Monitor },
  { name: 'Estimaciones', path: '/estimaciones', icon: Calculator },
  { name: 'Notificaciones', path: '/notificaciones', icon: BellIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar 240px */}
      <aside className="w-[240px] bg-sidebar border-r border-gray-200 flex flex-col shadow-soft z-10 shrink-0">
        <div className="h-12 flex items-center px-4 border-b border-gray-200">
          <span className="font-semibold text-primary">CEAM Auditor</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                      active ? 'bg-primary/10 text-secondary' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <Ribbon onToggleDrawer={() => setDrawerOpen(!drawerOpen)} />
        <main className="flex-1 overflow-hidden relative">
          {children}
          {/* Notification Drawer Absolute Overlay */}
          <NotificationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </main>
      </div>
    </div>
  );
}
