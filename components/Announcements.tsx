
import React from 'react';
import { Megaphone, Wrench, Sparkles, ShieldAlert, Calendar } from 'lucide-react';

const announcements = [
  { 
    id: 1, 
    title: '新模型上线: Gemini 2.5 Pro Turbo', 
    date: '2023-10-24', 
    category: 'new',
    content: '我们很高兴地宣布，分析引擎已全面升级至 Gemini 2.5 Pro Turbo。新模型在处理复杂金融逻辑时，响应速度提升了 30%，准确率提升了 15%。现在您可以尝试上传更复杂的 K 线图进行测试。' 
  },
  { 
    id: 2, 
    title: '美股实时数据源维护通知', 
    date: '2023-10-22', 
    category: 'maintenance',
    content: '为了提供更稳定的服务，我们将于今晚 02:00 - 04:00 对美股数据源进行例行维护。维护期间，实时行情可能会有短暂延迟，历史分析功能不受影响。'
  },
  { 
    id: 3, 
    title: '趋势跟踪策略算法优化完成', 
    date: '2023-10-20', 
    category: 'update',
    content: '针对近期震荡市行情，我们优化了「趋势跟踪策略」的入场判定逻辑，减少了假突破信号的干扰。建议您重新运行之前的分析以获取最新建议。'
  },
  { 
    id: 4, 
    title: '用户中心界面升级', 
    date: '2023-10-18', 
    category: 'new',
    content: '用户中心 UI 已焕新升级，新增了订阅管理和发票下载功能。现在您可以更方便地查看您的会员权益和历史账单。'
  },
  { 
    id: 5, 
    title: '关于防范金融诈骗的提醒', 
    date: '2023-10-15', 
    category: 'security',
    content: '近期发现有不法分子冒充官方客服进行诈骗。请注意，我们不会以任何理由要求您私下转账。所有订阅请务必在官网完成。'
  }
];

const Announcements = () => {
  const getIcon = (category: string) => {
    switch (category) {
      case 'new': return <Sparkles size={20} className="text-lime-600" />;
      case 'maintenance': return <Wrench size={20} className="text-orange-600" />;
      case 'security': return <ShieldAlert size={20} className="text-red-600" />;
      default: return <Megaphone size={20} className="text-blue-600" />;
    }
  };

  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'new': return 'bg-lime-50 text-lime-700 border-lime-200';
      case 'maintenance': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'security': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getLabel = (category: string) => {
    switch (category) {
      case 'new': return '新功能';
      case 'maintenance': return '系统维护';
      case 'security': return '安全提醒';
      default: return '产品更新';
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex items-center gap-4 mb-10">
           <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10">
              <Megaphone className="text-lime-300" size={28} />
           </div>
           <div>
              <h2 className="text-2xl font-extrabold text-gray-900">系统公告板</h2>
              <p className="text-gray-500 font-medium">了解 LimeFinance 的最新动态与维护计划</p>
           </div>
        </div>

        <div className="relative border-l-2 border-gray-100 ml-6 space-y-12">
           {announcements.map((item) => (
             <div key={item.id} className="relative pl-10 group">
                {/* Timeline Dot */}
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-gray-200 group-hover:border-lime-400 transition-colors shadow-sm"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                   <span className={`px-3 py-1 rounded-lg text-xs font-bold border w-fit flex items-center gap-1.5 ${getBadgeStyle(item.category)}`}>
                      {getIcon(item.category)}
                      {getLabel(item.category)}
                   </span>
                   <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                      <Calendar size={12} />
                      {item.date}
                   </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-lime-700 transition-colors">
                  {item.title}
                </h3>
                
                <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-600 leading-relaxed font-medium border border-gray-100 group-hover:bg-white group-hover:shadow-md group-hover:border-gray-200 transition-all">
                   {item.content}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
