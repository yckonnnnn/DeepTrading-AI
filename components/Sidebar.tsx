
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  BrainCircuit, 
  History, 
  CreditCard, 
  Megaphone, 
  BookOpenCheck, 
  MessageSquare, 
  QrCode
} from 'lucide-react';
import Logo from './Logo';
import { TabId } from '../types';

interface SidebarProps {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
}

const menuItems: { id: TabId; icon: React.ElementType; label: string; highlight?: boolean }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '首页' },
  { id: 'analysis', icon: BrainCircuit, label: '分析', highlight: true },
  { id: 'history', icon: History, label: '历史' },
  { id: 'featured', icon: BookOpenCheck, label: '发现' }, 
  { id: 'announcements', icon: Megaphone, label: '公告' },
  { id: 'subscription', icon: CreditCard, label: '订阅' },
  { id: 'feedback', icon: MessageSquare, label: '反馈' },
  { id: 'contact', icon: QrCode, label: '联系' },
  { id: 'settings', icon: Settings, label: '设置' },
];

export const MobileNav: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-[60] shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between overflow-x-auto scrollbar-hide px-2 py-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center min-w-[4.5rem] py-2 rounded-xl transition-all gap-1 ${
              activeTab === item.id 
                ? 'text-black font-bold' 
                : 'text-gray-400 font-medium hover:text-gray-600'
            }`}
          >
            <div className={`relative p-1.5 rounded-lg transition-colors ${activeTab === item.id ? 'bg-lime-300' : 'bg-transparent'}`}>
              <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              {item.highlight && activeTab !== item.id && (
                 <div className="absolute top-0 right-0 w-2 h-2 bg-lime-500 rounded-full border border-white"></div>
              )}
            </div>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [hoveredTop, setHoveredTop] = useState<number>(0);

  return (
    <div className="hidden md:flex w-20 bg-white h-screen flex-col items-center py-8 border-r border-gray-100 fixed left-0 top-0 z-[60] shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Updated DeepTrading Logo */}
      <div className="mb-12 shadow-lg shadow-black/20 rounded-xl">
         <Logo size={44} />
      </div>
      
      <div className="flex flex-col gap-6 w-full items-center overflow-y-auto scrollbar-hide pb-4 relative">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredTop(rect.top + rect.height / 2);
              setHoveredLabel(item.label);
            }}
            onMouseLeave={() => setHoveredLabel(null)}
            className={`relative group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 flex-shrink-0 ${
              activeTab === item.id 
                ? 'bg-gray-100 text-black shadow-inner' 
                : 'text-gray-400 hover:text-black hover:bg-gray-50'
            }`}
          >
            <item.icon size={22} strokeWidth={2} />
            {activeTab === item.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-8 bg-lime-300 rounded-l-full" />
            )}
            {item.highlight && activeTab !== item.id && (
               <div className="absolute top-2 right-2 w-2 h-2 bg-lime-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(163,230,53,0.8)]" />
            )}
          </button>
        ))}
      </div>

      {/* Fixed Tooltip Overlay */}
      {hoveredLabel && (
        <div 
          className="fixed left-20 ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg shadow-xl animate-in fade-in slide-in-from-left-2 duration-150 pointer-events-none z-[100] flex items-center"
          style={{ top: hoveredTop, transform: 'translateY(-50%)' }}
        >
           {/* Triangle Arrow */}
           <div className="absolute -left-1 w-2 h-2 bg-gray-900 rotate-45"></div>
           <span className="relative z-10">{hoveredLabel}</span>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
