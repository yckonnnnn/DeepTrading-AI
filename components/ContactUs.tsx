
import React from 'react';
import { Mail, Phone, MapPin, ExternalLink, QrCode } from 'lucide-react';

interface ContactUsProps {
  onVisitWebsite?: () => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ onVisitWebsite }) => {
  return (
    <div className="max-w-5xl mx-auto pb-10 flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left: Contact Info */}
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 flex flex-col justify-between">
             <div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">联系我们</h2>
                <p className="text-gray-500 font-medium mb-10">无论是商务合作还是技术支持，我们都在这里。</p>
                
                <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-lime-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mail size={20} className="text-lime-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">电子邮件</h3>
                            <p className="text-sm text-gray-500 font-medium mb-1">一般咨询与商务合作</p>
                            <a href="mailto:contact@limefinance.ai" className="text-lime-600 font-bold hover:underline">contact@limefinance.ai</a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Phone size={20} className="text-blue-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">客户服务</h3>
                            <p className="text-sm text-gray-500 font-medium mb-1">周一至周五 9:00 - 18:00</p>
                            <a href="tel:+864001234567" className="text-gray-900 font-bold hover:text-lime-600 transition-colors">400-123-4567</a>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin size={20} className="text-gray-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">总部地址</h3>
                            <p className="text-sm text-gray-500 font-medium">
                                上海市浦东新区陆家嘴环路 1000 号<br/>
                                金融中心大厦 88 楼
                            </p>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* Right: QR Code & Social */}
          <div className="bg-black text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-gray-200 relative overflow-hidden flex flex-col items-center justify-center text-center">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500 rounded-full blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="relative z-10 mb-8 p-4 bg-white rounded-3xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                  {/* CSS Generated QR Code Placeholder */}
                  <div className="w-48 h-48 bg-white flex flex-wrap content-start p-2 relative">
                      <div className="absolute top-2 left-2 w-12 h-12 border-4 border-black rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-black rounded-sm"></div>
                      </div>
                      <div className="absolute top-2 right-2 w-12 h-12 border-4 border-black rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-black rounded-sm"></div>
                      </div>
                      <div className="absolute bottom-2 left-2 w-12 h-12 border-4 border-black rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 bg-black rounded-sm"></div>
                      </div>
                      
                      {/* Random dots pattern */}
                      <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 p-4 box-border opacity-80">
                         {Array.from({length: 36}).map((_, i) => (
                             <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`}></div>
                         ))}
                      </div>
                      
                      {/* Logo in center */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-lime-300 rounded-lg flex items-center justify-center border-4 border-white">
                         <QrCode size={20} className="text-black"/>
                      </div>
                  </div>
              </div>

              <div className="relative z-10">
                 <h3 className="text-xl font-bold mb-2">关注官方公众号</h3>
                 <p className="text-gray-400 text-sm mb-6">获取每日市场早报与独家投资策略</p>
                 <button 
                    onClick={onVisitWebsite}
                    className="px-6 py-2 bg-white/10 border border-white/20 rounded-full text-sm font-bold hover:bg-white hover:text-black transition-all flex items-center gap-2 mx-auto"
                 >
                    <ExternalLink size={16} /> 访问官方网站
                 </button>
              </div>
          </div>

      </div>
    </div>
  );
};

export default ContactUs;
