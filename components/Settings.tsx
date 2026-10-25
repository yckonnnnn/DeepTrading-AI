
import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Smartphone, 
  Moon, 
  Globe, 
  Save, 
  Eye, 
  EyeOff,
  CreditCard,
  LogOut,
  Mail,
  Camera
} from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [showPassword, setShowPassword] = useState(false);

  const renderContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
                <div className="relative group cursor-pointer">
                   <div className="w-32 h-32 rounded-full border-4 border-gray-50 overflow-hidden shadow-inner">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="avatar" className="w-full h-full" />
                   </div>
                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <Camera className="text-white" />
                   </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <h3 className="text-2xl font-bold text-gray-900 mb-1">Alex Chen</h3>
                   <p className="text-gray-500 font-medium mb-4">Pro Member • Member since 2023</p>
                   <div className="flex gap-3 justify-center md:justify-start">
                      <button className="px-5 py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
                         更换头像
                      </button>
                      <button className="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors">
                         删除头像
                      </button>
                   </div>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <User size={20} className="text-lime-600" /> 基本信息
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">用户名</label>
                      <input type="text" defaultValue="AlexTrader" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">电子邮箱</label>
                      <div className="relative">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                         <input type="email" defaultValue="alex.trader@limefinance.com" className="w-full p-4 pl-12 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">手机号码</label>
                      <div className="relative">
                         <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                         <input type="tel" defaultValue="+86 138 **** 8888" className="w-full p-4 pl-12 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">职业/身份</label>
                      <input type="text" defaultValue="独立投资人" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                   </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                   <button className="flex items-center gap-2 px-8 py-3 bg-lime-400 text-black rounded-xl font-bold hover:bg-lime-500 transition-colors shadow-lg shadow-lime-200">
                      <Save size={18} /> 保存修改
                   </button>
                </div>
             </div>
          </div>
        );
      
      case 'security':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <Lock size={20} className="text-lime-600" /> 修改密码
                </h4>
                <div className="space-y-6 max-w-lg">
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">当前密码</label>
                      <input type="password" placeholder="••••••••" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">新密码</label>
                      <div className="relative">
                        <input 
                           type={showPassword ? "text" : "password"} 
                           className="w-full p-4 pr-12 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" 
                        />
                        <button 
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                           {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 ml-1">确认新密码</label>
                      <input type="password" className="w-full p-4 bg-gray-50 rounded-xl font-bold text-gray-800 border-none focus:ring-2 focus:ring-lime-300 transition-all" />
                   </div>
                   <button className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
                      更新密码
                   </button>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <Shield size={20} className="text-lime-600" /> 登录设备管理
                </h4>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-600 shadow-sm">
                            <Smartphone size={20} />
                         </div>
                         <div>
                            <div className="font-bold text-gray-900">iPhone 14 Pro</div>
                            <div className="text-xs text-gray-400 font-medium">上海 • 刚刚</div>
                         </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">当前设备</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 opacity-60">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                            <Globe size={20} />
                         </div>
                         <div>
                            <div className="font-bold text-gray-900">Chrome on MacBook</div>
                            <div className="text-xs text-gray-400 font-medium">北京 • 3天前</div>
                         </div>
                      </div>
                      <button className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1 rounded-full transition-colors">下线</button>
                   </div>
                </div>
             </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <Bell size={20} className="text-lime-600" /> 通知偏好
                </h4>
                <div className="space-y-6">
                   {[
                     { title: 'AI 分析完成提醒', desc: '当您提交的股票分析报告生成完毕时' },
                     { title: '市场异动预警', desc: '关注列表中的股票发生大幅波动时' },
                     { title: '系统公告与更新', desc: '关于平台维护、新功能上线的通知' },
                     { title: '每周投资周报', desc: '每周一发送上周市场总结与下周展望' }
                   ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                         <div>
                            <div className="font-bold text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-500 font-medium">{item.desc}</div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked={i < 3} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-400"></div>
                         </label>
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <Moon size={20} className="text-lime-600" /> 界面设置
                </h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl border-2 border-black bg-gray-50 cursor-pointer">
                      <div className="w-full h-20 bg-white rounded-lg mb-3 shadow-sm border border-gray-100"></div>
                      <div className="font-bold text-center text-gray-900">浅色模式</div>
                   </div>
                   <div className="p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                      <div className="w-full h-20 bg-gray-800 rounded-lg mb-3 shadow-sm"></div>
                      <div className="font-bold text-center text-gray-500">深色模式</div>
                   </div>
                </div>
             </div>
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 pb-10">
       {/* Settings Sidebar */}
       <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-[2rem] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 sticky top-4">
             <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <User size={18} /> 个人资料
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'security' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <Shield size={18} /> 账号安全
                </button>
                <button 
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'preferences' ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                   <Bell size={18} /> 偏好设置
                </button>
             </div>
             
             <div className="mt-8 pt-6 border-t border-gray-100">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors">
                   <LogOut size={18} /> 退出登录
                </button>
             </div>
          </div>
       </div>

       {/* Content Area */}
       <div className="flex-1 min-w-0">
          {renderContent()}
       </div>
    </div>
  );
};

export default Settings;
