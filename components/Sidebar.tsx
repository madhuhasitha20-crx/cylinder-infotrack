
import React from 'react';
import { LayoutDashboard, ScanLine, Database } from 'lucide-react';
import { Page } from '../types';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const menuItems = [
    { 
      id: Page.Dashboard, 
      label: 'Analytics', 
      icon: LayoutDashboard,
      activeClass: 'bg-[#6D5BD0] text-white shadow-[#6D5BD0]/30',
      inactiveClass: 'text-[#B0B8C1] hover:bg-[#6D5BD0]/10 hover:text-white'
    },
    { 
      id: Page.VisionScanner, 
      label: 'Vision Scanner', 
      icon: ScanLine,
      activeClass: 'bg-[#2F8F9D] text-white shadow-[#2F8F9D]/30',
      inactiveClass: 'text-[#B0B8C1] hover:bg-[#2F8F9D]/10 hover:text-white'
    },
    { 
      id: Page.InventoryRegistry, 
      label: 'Inventory Registry', 
      icon: Database,
      activeClass: 'bg-[#F2C6DE] text-[#8B3A3A] shadow-[#F2C6DE]/30',
      inactiveClass: 'text-[#B0B8C1] hover:bg-[#F2C6DE]/10 hover:text-white'
    },
  ];

  return (
    <div className="w-64 bg-[#1F2933] h-screen flex flex-col p-6 shadow-2xl border-r border-slate-800/50">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-8 h-8 bg-[#2F8F9D] rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#2F8F9D]/20">
          <ScanLine className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight truncate text-[#EAEAEA]">Asset Vision</h1>
      </div>

      <nav className="flex-1 space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm shadow-md ${
              activePage === item.id ? item.activeClass : item.inactiveClass
            }`}
          >
            <item.icon size={20} className="flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
