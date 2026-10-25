
import React from 'react';
import { 
  Settings, 
  Crown, 
  Zap, 
  History, 
  Activity, 
  Server, 
  Radio, 
  BrainCircuit, 
  ArrowUpRight, 
  Megaphone, 
  LifeBuoy, 
  Key,
  TrendingUp,
  User,
  Coffee
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { UserTier } from '../types';

// --- Mock Data ---

const usageData = [
  { day: '周一', count: 12 },
  { day: '周二', count: 18 },
  { day: '周三', count: 8 },
  { day: '周四', count: 24 },
  { day: '周五', count: 16 },
  { day: '周六', count: 5 },
  { day: '周日', count: 9 },
];

const systemUpdates = [
  { id: 1, title: '新模型上线: GPT-4 Turbo', date: '2023-10-24', type: 'new' },
  { id: 2, title: '美股实时数据源维护通知', date: '2023-10-22', type: 'maintenance' },
  { id: 3, title: '趋势跟踪策略算法优化完成', date: '2023-10-20', type: 'update' },
  { id: 4, title: '用户中心界面升级', date: '2023-10-18', type: 'new' },
];

const sentimentData = [
  { name: '贪婪', value: 65, color: '#bef264' }, // lime-400
  { name: '中性', value: 25, color: '#f3f4f6' }, // gray-100
  { name: '恐慌', value: 10, color: '#fca5a5' }, // red-300
];

// --- Components ---

interface MembershipCardProps {
  tier: UserTier;
  onSubscribe: () => void;
}

const MembershipCard: React.FC<MembershipCardProps> = ({ tier, onSubscribe }) => {
  if (tier === 'pro') {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-8 text-white relative overflow-hidden h-full min-h-[300px] flex flex-col justify-between shadow-2xl shadow-gray-200 animate-in fade-in duration-500">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 flex items-center gap-2">
                <Crown size={14} className="text-lime-300" />
                <span className="text-xs font-bold text-lime-300 tracking-wider">PRO PLAN</span>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                <Settings size={20} />
              </button>
            </div>
            
            <h2 className="text-3xl font-bold mb-2">专业版会员</h2>
            <p className="text-gray-400 text-sm">有效期至 2024年12月31日</p>
        </div>

        <div className="relative z-10">
            <div className="flex justify-between text-sm mb-3">
               <span className="text-gray-300 font-medium">本月权益使用</span>
               <span className="text-lime-300 font-bold">85%</span>
            </div>
            <div className="w-full bg-gray-700 h-2.5 rounded-full overflow-hidden mb-4">
               <div className="bg-lime-300 h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(190,242,100,0.5)]"></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-black/20 w-fit px-3 py-1.5 rounded-lg border border-white/5">
               <Zap size={12} className="text-lime-300" /> 
               <span>下月自动续费，享 8 折优惠</span>
            </div>
        </div>
      </div>
    );
  }

  // Free / Guest View
  return (
    <div className="bg-white rounded-[2rem] p-8 relative overflow-hidden h-full min-h-[300px] flex flex-col justify-between border border-gray-100 shadow-sm animate-in fade-in duration-500">
      <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="bg-gray-100 px-3 py-1 rounded-lg flex items-center gap-2">
              <User size={14} className="text-gray-500" />
              <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                 {tier === 'guest' ? 'Guest Plan' : 'Free Plan'}
              </span>
            </div>
            <button className="text-gray-400 hover:text-black transition-colors bg-gray-50 p-2 rounded-full hover:bg-gray-100">
              <Settings size={20} />
            </button>
          </div>
          
          <h2 className="text-3xl font-bold mb-2 text-gray-900">
             {tier === 'guest' ? '游客访问' : '免费会员'}
          </h2>
          <p className="text-gray-400 text-sm">
             {tier === 'guest' ? '仅支持有限的预览功能' : '每日免费分析额度有限'}
          </p>
      </div>

      <div className="relative z-10">
          <div className="flex justify-between text-sm mb-3">
             <span className="text-gray-500 font-medium">今日免费额度</span>
             <span className="text-black font-bold">0/3</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-6">
             <div className="bg-gray-300 h-full w-[10%] rounded-full"></div>
          </div>
          
          <button 
             onClick={onSubscribe}
             className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
          >
             <Crown size={16} className="text-lime-300" />
             升级到 Pro 会员
          </button>
      </div>
    </div>
  );
};

const StatsGrid = () => (
  <div className="grid grid-rows-2 gap-6 h-full min-h-[300px]">
    {/* Remaining Credits */}
    <div className="bg-lime-300 rounded-[2rem] p-6 relative overflow-hidden group hover:shadow-lg hover:shadow-lime-200/50 transition-all flex flex-col justify-between">
       <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
       
       <div className="flex justify-between items-start relative z-10">
         <div className="p-2 bg-black/10 rounded-xl w-fit">
            <Zap size={20} className="text-black" />
         </div>
         <span className="text-xs font-bold bg-white/40 px-2 py-1 rounded-lg text-black/80 backdrop-blur-sm">可用</span>
       </div>
       
       <div className="relative z-10">
         <div className="flex items-baseline gap-1">
            <h3 className="text-4xl font-extrabold text-black tracking-tight">88</h3>
            <span className="text-sm font-bold text-black/60">/ 100</span>
         </div>
         <p className="text-black/70 font-bold text-xs mt-1">剩余分析次数</p>
       </div>
    </div>

    {/* Total Analyzed */}
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
       <div className="flex justify-between items-start">
         <div className="p-2 bg-gray-50 rounded-xl w-fit border border-gray-100">
            <History size={20} className="text-gray-600" />
         </div>
         <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded-lg text-gray-500">累计</span>
       </div>
       <div>
         <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">1,240</h3>
         <p className="text-gray-400 font-bold text-xs mt-1">历史分析总数</p>
       </div>
    </div>
  </div>
);

const UsageChart = () => (
  <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] h-full min-h-[300px] flex flex-col">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
          <div className="p-1.5 bg-lime-50 rounded-lg">
            <TrendingUp size={16} className="text-lime-600" />
          </div>
          <h3 className="font-bold text-gray-800">频率趋势</h3>
      </div>
      <select className="bg-gray-50 border-none text-xs font-bold text-gray-500 rounded-lg py-1.5 px-3 focus:ring-0 cursor-pointer hover:bg-gray-100 transition-colors">
        <option>近7天</option>
        <option>近30天</option>
      </select>
    </div>
    <div className="flex-1 w-full min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={usageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} 
            dy={10} 
          />
          <Tooltip 
            cursor={{fill: '#f8fafc'}}
            contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                padding: '12px 16px',
                fontWeight: 'bold'
            }}
          />
          <Bar dataKey="count" fill="#bef264" radius={[6, 6, 6, 6]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AiServiceMonitor = () => (
  <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm h-full flex flex-col min-h-[380px]">
    <div className="flex justify-between items-start mb-8">
       <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center border border-black/5">
            <Activity size={24} className="text-black" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900">AI 市场风向标</h3>
            <p className="text-sm text-gray-400 font-medium mt-1">基于全网大数据情感分析</p>
          </div>
       </div>
       <div className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold flex items-center gap-1.5 border border-emerald-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          实时更新
       </div>
    </div>

    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
       {/* Sentiment Gauge */}
       <div className="h-48 w-full relative flex items-center justify-center bg-gray-50 rounded-[2rem]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="60%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                startAngle={180}
                endAngle={0}
                stroke="none"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1 text-center">
             <div className="text-4xl font-extrabold text-gray-900 tracking-tighter">65</div>
             <div className="text-xs font-bold text-lime-700 bg-lime-100 px-3 py-1 rounded-full mt-2 inline-block">贪婪</div>
          </div>
       </div>

       {/* System Status */}
       <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-gray-100 transition-colors cursor-default border border-transparent hover:border-gray-200">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 group-hover:text-emerald-500 transition-colors">
                    <Server size={18} />
                </div>
                <span className="text-sm font-bold text-gray-600">API 延迟</span>
             </div>
             <span className="text-emerald-500 font-bold text-sm bg-emerald-50 px-2 py-1 rounded-md">24ms</span>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-gray-100 transition-colors cursor-default border border-transparent hover:border-gray-200">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 group-hover:text-blue-500 transition-colors">
                    <Radio size={18} />
                </div>
                <span className="text-sm font-bold text-gray-600">分析引擎</span>
             </div>
             <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Online
             </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between group hover:bg-gray-100 transition-colors cursor-default border border-transparent hover:border-gray-200">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 group-hover:text-purple-500 transition-colors">
                    <BrainCircuit size={18} />
                </div>
                <span className="text-sm font-bold text-gray-600">模型版本</span>
             </div>
             <span className="text-xs bg-black text-white px-3 py-1 rounded-lg font-bold">v4.5 Pro</span>
          </div>
       </div>
    </div>
  </div>
);

const SystemUpdates = () => (
  <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm h-full flex flex-col min-h-[380px]">
    <div className="flex justify-between items-center mb-8">
      <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
         <Megaphone size={20} className="text-orange-500" />
         系统公告
      </h3>
      <button className="text-gray-400 hover:text-black transition-colors bg-gray-50 p-2 rounded-xl hover:bg-gray-100">
         <ArrowUpRight size={18}/>
      </button>
    </div>
    
    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
      {systemUpdates.map((item) => (
        <div key={item.id} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group">
           <div className={`mt-1 min-w-[36px] h-9 rounded-xl flex items-center justify-center border ${
             item.type === 'new' ? 'bg-lime-50 text-lime-600 border-lime-100' :
             item.type === 'maintenance' ? 'bg-orange-50 text-orange-600 border-orange-100' :
             'bg-blue-50 text-blue-600 border-blue-100'
           }`}>
              <Megaphone size={16} />
           </div>
           <div className="flex-1">
              <h4 className="text-sm font-bold text-gray-800 mb-1 leading-snug group-hover:text-black transition-colors">{item.title}</h4>
              <p className="text-xs text-gray-400 font-medium">{item.date}</p>
           </div>
        </div>
      ))}
    </div>
  </div>
);

interface QuickActionsProps {
  onAnalyze: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAnalyze }) => (
  <div className="flex flex-col gap-6 h-full min-h-[380px]">
     {/* Analyze Banner */}
     <div 
        onClick={onAnalyze}
        className="bg-lime-100 rounded-[2rem] p-8 relative overflow-hidden group cursor-pointer flex-1 flex flex-col justify-center border border-lime-200"
     >
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-lime-300 rounded-full blur-3xl opacity-60 group-hover:scale-125 transition-transform duration-700"></div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-lime-200/50 rounded-lg">
                    <BrainCircuit size={16} className="text-lime-800" />
                </div>
                <span className="text-xs font-bold text-lime-800 uppercase tracking-wide">核心功能</span>
            </div>
            <h3 className="text-2xl font-extrabold text-lime-950 leading-tight mb-4">开启 AI 驱动的<br/>深度投研分析</h3>
            <button 
                onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
                className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-gray-800 hover:translate-x-1 transition-all w-fit flex items-center gap-2 shadow-lg shadow-lime-900/10"
            >
                立即分析 <ArrowUpRight size={14} />
            </button>
        </div>
     </div>

     {/* Quick Buttons - Split */}
     <div className="grid grid-cols-2 gap-4 h-24">
         <button className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all group">
            <LifeBuoy size={24} className="text-gray-400 group-hover:text-black transition-colors" />
            <span className="text-xs font-bold text-gray-600">帮助中心</span>
         </button>
         <button className="bg-white border border-gray-100 hover:border-gray-200 hover:shadow-md rounded-[1.5rem] flex flex-col items-center justify-center gap-2 transition-all group">
            <Key size={24} className="text-gray-400 group-hover:text-black transition-colors" />
            <span className="text-xs font-bold text-gray-600">API 管理</span>
         </button>
     </div>
  </div>
);

interface DashboardProps {
  userTier: UserTier;
  onSubscribe: () => void;
  onAnalyze: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ userTier, onSubscribe, onAnalyze }) => {
  return (
    <div className="max-w-[1600px] mx-auto flex flex-col gap-8 pb-10">
      
      {/* Top Row: Adjusted Proportions (4:3:5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[300px]">
        <div className="col-span-1 lg:col-span-12 xl:col-span-4 h-full">
          <MembershipCard tier={userTier} onSubscribe={onSubscribe} />
        </div>
        <div className="col-span-1 md:col-span-6 lg:col-span-5 xl:col-span-3 h-full">
          <StatsGrid />
        </div>
        <div className="col-span-1 md:col-span-6 lg:col-span-7 xl:col-span-5 h-full">
          <UsageChart />
        </div>
      </div>

      {/* Bottom Section: Adjusted Proportions & Height */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:min-h-[420px]">
        
        {/* Left Large Block: AI Service Monitor (5 cols) */}
        <div className="col-span-1 lg:col-span-12 xl:col-span-5 h-full">
          <AiServiceMonitor />
        </div>

        {/* Middle Block: System Updates (4 cols) */}
        <div className="col-span-1 md:col-span-7 lg:col-span-7 xl:col-span-4 h-full">
          <SystemUpdates />
        </div>

        {/* Right Column: Quick Actions & Support (3 cols) */}
        <div className="col-span-1 md:col-span-5 lg:col-span-5 xl:col-span-3 h-full">
           <QuickActions onAnalyze={onAnalyze} />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
