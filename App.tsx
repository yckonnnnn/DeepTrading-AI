
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  User, 
  ShieldCheck, 
  Crown, 
  LogOut, 
  Settings as SettingsIcon, 
  CreditCard, 
  Check, 
  Inbox,
  X,
  Zap,
  Megaphone, 
  AlertCircle,
  FileText,
  Globe
} from 'lucide-react';
import Sidebar, { MobileNav } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StockAnalysis from './components/StockAnalysis';
import HistoryView from './components/History';
import Subscription from './components/Subscription';
import Settings from './components/Settings'; 
import Announcements from './components/Announcements'; 
import FeaturedContent from './components/FeaturedContent'; 
import Feedback from './components/Feedback'; 
import ContactUs from './components/ContactUs'; 
import LandingPage from './components/LandingPage';
import Auth from './components/Auth'; // New Import
import { TabId, AIAnalysisReport, UserTier } from './types';

// --- Mock Data ---

interface AppNotification {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: 'new' | 'maintenance' | 'report' | 'update';
  read: boolean;
  data?: { reportId: string };
}

const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 1, title: '新模型上线: Gemini 2.5 Pro Turbo', desc: '分析引擎已升级，响应速度提升 30%', time: '10分钟前', type: 'new', read: false },
  { id: 2, title: '美股数据源维护', desc: '今晚 02:00 - 04:00 进行例行维护', time: '2小时前', type: 'maintenance', read: false },
  { id: 3, title: '周报已生成', desc: '您关注的「贵州茅台」本周走势分析已生成', time: '昨天', type: 'report', read: true },
  { id: 4, title: '系统安全更新', desc: '账户安全策略已更新，请查看', time: '3天前', type: 'update', read: true },
];

// --- Components ---

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onNotificationClick,
  onMarkAllRead
}) => {
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  
  if (!isOpen) return null;

  const filtered = activeTab === 'unread' ? notifications.filter(n => !n.read) : notifications;

  const getIcon = (type: string) => {
    switch(type) {
      case 'new': return <Zap size={16} className="text-lime-600" />;
      case 'maintenance': return <AlertCircle size={16} className="text-orange-500" />;
      case 'report': return <FileText size={16} className="text-blue-500" />;
      default: return <Megaphone size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="absolute top-14 right-0 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
       {/* Header */}
       <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
          <h3 className="font-bold text-gray-900">消息通知</h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
             <button 
               onClick={() => setActiveTab('unread')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'unread' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
             >
               未读 ({notifications.filter(n => !n.read).length})
             </button>
             <button 
               onClick={() => setActiveTab('all')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
             >
               全部
             </button>
          </div>
       </div>

       {/* List */}
       <div className="max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
               <Inbox size={32} strokeWidth={1.5} className="mb-2 opacity-50"/>
               <p className="text-xs">暂无{activeTab === 'unread' ? '未读' : ''}消息</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div 
                key={item.id} 
                className={`px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer group relative ${!item.read ? 'bg-lime-50/30' : ''}`}
                onClick={() => onNotificationClick(item)}
              >
                 <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.type === 'new' ? 'bg-lime-100' : 'bg-gray-100'}`}>
                       {getIcon(item.type)}
                    </div>
                    <div className="flex-1">
                       <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold ${!item.read ? 'text-gray-900' : 'text-gray-600'}`}>{item.title}</h4>
                          <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap ml-2">{item.time}</span>
                       </div>
                       <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{item.desc}</p>
                    </div>
                 </div>
                 {!item.read && (
                   <span className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500"></span>
                 )}
              </div>
            ))
          )}
       </div>
       
       {/* Footer */}
       <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
          <button 
            onClick={onMarkAllRead}
            className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
          >
             全部标记为已读
          </button>
       </div>
    </div>
  );
};

interface UserProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
  userTier: UserTier;
  onSubscribe: () => void;
  onSettings: () => void;
  onLogout: () => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ isOpen, onClose, userTier, onSubscribe, onSettings, onLogout }) => {
  if (!isOpen) return null;

  const getTierStyle = () => {
    switch (userTier) {
      case 'pro': return { bg: 'bg-black text-lime-300', label: 'Pro Member', icon: Crown };
      case 'free': return { bg: 'bg-lime-400 text-black', label: 'Free Plan', icon: User };
      default: return { bg: 'bg-gray-200 text-gray-500', label: 'Guest', icon: User };
    }
  };

  const style = getTierStyle();
  const TierIcon = style.icon;

  return (
    <div className="absolute top-14 right-0 w-[calc(100vw-2rem)] md:w-80 bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
      
      {/* Header Background */}
      <div className="h-24 bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-lime-400 rounded-full blur-[50px] opacity-20 translate-x-10 -translate-y-10"></div>
      </div>

      <div className="px-6 pb-6 relative">
         {/* Avatar & Badge */}
         <div className="flex justify-between items-end -mt-10 mb-4">
            <div className="relative">
               <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userTier === 'guest' ? 'Guest' : 'Alex'}`} alt="avatar" className="w-full h-full" />
               </div>
               <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white flex items-center gap-1 ${style.bg}`}>
                  <TierIcon size={10} strokeWidth={3} />
                  {style.label}
               </div>
            </div>
            {userTier !== 'pro' && (
              <button 
                onClick={() => { onSubscribe(); onClose(); }}
                className="px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg shadow-lime-200"
              >
                升级 Pro
              </button>
            )}
         </div>

         {/* Info */}
         <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900">Alex Chen</h3>
            <p className="text-xs text-gray-400 font-medium">alex.trader@limefinance.com</p>
         </div>

         {/* Usage Stats */}
         <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex justify-between text-xs mb-2 font-bold">
               <span className="text-gray-500">本月分析额度</span>
               <span className="text-black">{userTier === 'pro' ? '无限' : '12 / 30'}</span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
               <div 
                 className={`h-full rounded-full ${userTier === 'pro' ? 'bg-gradient-to-r from-lime-300 to-lime-500 w-full' : 'bg-black w-[40%]'}`}
               ></div>
            </div>
            {userTier !== 'pro' && (
               <p className="text-[10px] text-gray-400 mt-2 text-center">
                  升级即可解锁无限次分析
               </p>
            )}
         </div>

         {/* Menu */}
         <div className="space-y-1">
            <button 
               onClick={() => { onSettings(); onClose(); }}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
            >
               <User size={16} /> 个人资料
            </button>
            <button 
               onClick={() => { onSubscribe(); onClose(); }}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
            >
               <CreditCard size={16} /> 订阅管理
            </button>
            <button 
               onClick={() => { onSettings(); onClose(); }}
               className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-600 text-sm font-medium transition-colors"
            >
               <SettingsIcon size={16} /> 系统设置
            </button>
         </div>

         <div className="mt-4 pt-4 border-t border-gray-100">
            <button 
               onClick={() => { onLogout(); onClose(); }}
               className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 text-sm font-bold hover:bg-red-50 transition-colors"
            >
               <LogOut size={16} /> 退出登录
            </button>
         </div>
      </div>
    </div>
  );
};

interface HeaderProps {
  title: string;
  userTier: UserTier;
  setUserTier: (tier: UserTier) => void;
  onSubscribe: () => void;
  onSettings: () => void;
  onVisitWebsite: () => void;
  notifications: AppNotification[];
  onNotificationClick: (n: AppNotification) => void;
  onMarkAllRead: () => void;
  onLogout: () => void;
}

const Header = ({ 
  title, 
  userTier, 
  setUserTier, 
  onSubscribe, 
  onSettings,
  onVisitWebsite,
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onLogout
}: HeaderProps) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Close popovers when clicking outside
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showProfile) setShowProfile(false);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
    if (showNotifications) setShowNotifications(false);
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 px-1 md:px-2 gap-4 relative z-50" ref={headerRef}>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-gray-400 text-sm mt-1 font-medium">欢迎回来, {userTier === 'guest' ? '访客' : 'Alex'}</p>
      </div>
      <div className="flex items-center gap-2 md:gap-4 relative w-full md:w-auto justify-between md:justify-end">
        
        {/* TEST CONTROLS */}
        <div className="bg-white border border-gray-200 rounded-lg p-1 flex items-center shadow-sm">
           <span className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider hidden sm:inline">Test Mode:</span>
           {(['guest', 'free', 'pro'] as UserTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setUserTier(tier)}
                className={`px-2 md:px-3 py-1 rounded-md text-xs font-bold capitalize transition-all ${
                  userTier === tier 
                  ? 'bg-black text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tier}
              </button>
           ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Visit Website Button (Hidden on Mobile) */}
          <button 
            onClick={onVisitWebsite}
            className="hidden xl:flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-full text-sm font-bold text-gray-500 hover:text-black hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <Globe size={18} className="text-gray-400 group-hover:text-black transition-colors" />
            访问官网
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button 
              onClick={toggleNotifications}
              className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-sm relative transition-colors flex-shrink-0 ${showNotifications ? 'bg-black text-white border-black' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white text-white text-[10px] font-bold flex items-center justify-center px-1 animate-in zoom-in duration-200">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <NotificationPanel 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)}
              notifications={notifications}
              onNotificationClick={onNotificationClick}
              onMarkAllRead={onMarkAllRead}
            />
          </div>

          {/* User Profile */}
          <div className="relative">
            <div 
              onClick={toggleProfile}
              className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-md cursor-pointer transition-all flex-shrink-0 relative ${showProfile ? 'ring-2 ring-lime-300 border-lime-300' : 'border-white hover:ring-2 hover:ring-lime-100'}`}
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userTier === 'guest' ? 'Guest' : 'Alex'}`} alt="avatar" />
              {userTier === 'pro' && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-lime-400 border-2 border-white rounded-full flex items-center justify-center">
                    <Crown size={8} className="text-black" />
                </div>
              )}
            </div>
            <UserProfileCard 
              isOpen={showProfile} 
              onClose={() => setShowProfile(false)}
              userTier={userTier}
              onSubscribe={onSubscribe}
              onSettings={onSettings}
              onLogout={onLogout}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

// Route View Type
type AppView = 'landing' | 'login' | 'register' | 'app';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [userTier, setUserTier] = useState<UserTier>('free'); 
  const [history, setHistory] = useState<AIAnalysisReport[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS);
  const [targetReportId, setTargetReportId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Handlers ---
  
  const handleLoginSuccess = () => {
    setUserTier('free');
    setCurrentView('app');
  };

  const handleGuestLogin = () => {
    setUserTier('guest');
    setCurrentView('app');
  };
  
  // Handler for direct Pro access from Landing Page
  const handleDirectProAccess = () => {
    setUserTier('pro');
    setCurrentView('app');
  };

  const handleLogout = () => {
    setCurrentView('landing');
    setActiveTab('dashboard'); // Reset tab
  };

  const handleAnalysisComplete = (report: AIAnalysisReport) => {
    const newReport = { ...report, id: Date.now().toString() };
    setHistory(prev => [newReport, ...prev]);

    // Add Notification
    const newNotification: AppNotification = {
      id: Date.now(),
      title: '分析完成',
      desc: `${report.stockName} (${report.stockCode}) 的分析报告已生成`,
      time: '刚刚',
      type: 'report',
      read: false,
      data: { reportId: newReport.id }
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleNotificationClick = (notification: AppNotification) => {
     // Mark as read
     setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
     
     // Navigate logic
     if (notification.type === 'report' && notification.data?.reportId) {
        setTargetReportId(notification.data.reportId);
        setActiveTab('history');
     }
  };

  const handleMarkAllRead = () => {
     setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleSubscribe = () => {
    setActiveTab('subscription');
  };

  const handleSettings = () => {
    setActiveTab('settings');
  };

  const handleAnalyzeClick = () => {
    setActiveTab('analysis');
  };

  if (!mounted) return null;

  // --- View Routing ---

  if (currentView === 'landing') {
    return (
      <LandingPage 
        onLogin={() => setCurrentView('login')} 
        onRegister={handleDirectProAccess} 
      />
    );
  }

  if (currentView === 'login' || currentView === 'register') {
    return (
      <Auth 
        initialView={currentView} 
        onLoginSuccess={handleLoginSuccess}
        onGuestLogin={handleGuestLogin}
        onNavigateTo={(view) => setCurrentView(view)}
      />
    );
  }

  // --- Main App ---

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            userTier={userTier} 
            onSubscribe={handleSubscribe} 
            onAnalyze={handleAnalyzeClick}
          />
        );
      case 'analysis':
        return (
          <StockAnalysis 
            onAnalysisComplete={handleAnalysisComplete} 
            history={history} 
            userTier={userTier}
            onSubscribe={handleSubscribe}
          />
        );
      case 'history':
        return <HistoryView history={history} targetReportId={targetReportId} />;
      case 'subscription':
        return <Subscription />;
      case 'settings':
        return <Settings />;
      case 'announcements':
        return <Announcements />;
      case 'featured':
        return <FeaturedContent />;
      case 'feedback':
        return <Feedback />;
      case 'contact':
        return <ContactUs onVisitWebsite={() => setCurrentView('landing')} />;
      default:
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 animate-in fade-in zoom-in duration-300">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🚧</span>
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">功能建设中</h3>
                <p className="max-w-md text-center">该模块正在开发中，请稍后查看账户、市场和设置的更新。</p>
            </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'analysis': return 'AI 市场分析';
      case 'history': return '历史分析档案';
      case 'dashboard': return '我的投资组合';
      case 'subscription': return '会员订阅计划';
      case 'settings': return '系统设置';
      case 'announcements': return '系统公告';
      case 'featured': return '优选内容';
      case 'feedback': return '意见反馈';
      case 'contact': return '联系我们';
      default: return 'DeepTrading';
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-lime-200 selection:text-lime-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-20 p-4 md:p-8 h-screen overflow-y-auto pb-24 md:pb-8">
        <Header 
          title={getPageTitle()} 
          userTier={userTier} 
          setUserTier={setUserTier} 
          onSubscribe={handleSubscribe}
          onSettings={handleSettings}
          onVisitWebsite={() => setCurrentView('landing')}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={handleMarkAllRead}
          onLogout={handleLogout}
        />
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
