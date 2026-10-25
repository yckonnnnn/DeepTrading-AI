
import React, { useState } from 'react';
import { Send, Mail, MessageSquare, Smile, Paperclip } from 'lucide-react';

const Feedback = () => {
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      // Reset after showing success
      setTimeout(() => {
          setSubmitted(false);
          setEmail('');
          setContent('');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100 relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-50 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

        <div className="relative z-10">
            <div className="flex flex-col items-center text-center mb-12">
               <div className="w-16 h-16 bg-lime-100 rounded-2xl flex items-center justify-center shadow-lg shadow-lime-100 mb-6">
                  <MessageSquare size={32} className="text-lime-700" />
               </div>
               <h2 className="text-3xl font-extrabold text-gray-900 mb-3">您的建议，是我们进化的动力</h2>
               <p className="text-gray-500 font-medium max-w-lg">无论是功能吐槽、体验优化，还是新功能许愿，我们都期待听到您的声音。每一条反馈我们都会认真阅读。</p>
            </div>

            {submitted ? (
               <div className="py-20 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                     <Smile size={40} className="text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">感谢您的反馈！</h3>
                  <p className="text-gray-500">我们会尽快评估您的建议。</p>
               </div>
            ) : (
                <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">联系邮箱 <span className="text-gray-400 font-normal">(选填，以便我们回复您)</span></label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lime-600 transition-colors" size={20} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent transition-all hover:bg-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">反馈内容</label>
                        <div className="relative group">
                            <textarea 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="请详细描述您遇到的问题或建议..."
                                rows={6}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-4 px-4 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:border-transparent transition-all hover:bg-white resize-none"
                            />
                            <button type="button" className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="添加附件">
                                <Paperclip size={18} />
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSubmitting || !content.trim()}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-xl transition-all ${
                            isSubmitting || !content.trim()
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            : 'bg-black text-white shadow-lime-200/50 hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {isSubmitting ? '提交中...' : (
                            <>
                                <Send size={20} />
                                提交反馈
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
