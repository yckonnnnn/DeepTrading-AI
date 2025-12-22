
import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Wrench, Sparkles, ShieldAlert, Calendar, X } from 'lucide-react';

type AnnouncementItem = {
  id: number;
  title: string;
  date: string;
  category: string;
  content: string;
};

const Announcements = ({ focusId, isAdmin }: { focusId?: number | null; isAdmin?: boolean }) => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('new');
  const [createContent, setCreateContent] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const canCreate = useMemo(() => Boolean(isAdmin), [isAdmin]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = sessionStorage.getItem('auth_token');
      if (!token) {
        setItems([]);
        return;
      }
      const resp = await fetch(`${API_BASE_URL}/api/announcements?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setItems([]);
        setError(typeof data?.message === 'string' ? data.message : '公告加载失败');
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setItems([]);
      setError('公告加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [API_BASE_URL]);
  const getIcon = (category: string) => {
    switch (category) {
      case 'new': return <Sparkles size={20} className="text-lime-600" />;
      case 'maintenance': return <Wrench size={20} className="text-orange-600" />;
      case 'security': return <ShieldAlert size={20} className="text-red-600" />;
      default: return <Megaphone size={20} className="text-blue-600" />;
    }
  };

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`announcement-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusId, items.length]);

  const handleCreate = async () => {
    if (!canCreate) return;
    const title = createTitle.trim();
    const content = createContent.trim();
    if (!title || !content) {
      setCreateError('请填写标题和内容');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const token = sessionStorage.getItem('auth_token');
      if (!token) {
        setCreateError('未登录');
        return;
      }
      const resp = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title, category: createCategory, content })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setCreateError(typeof data?.message === 'string' ? data.message : '发布失败');
        return;
      }

      setShowCreate(false);
      setCreateTitle('');
      setCreateCategory('new');
      setCreateContent('');
      await fetchAnnouncements();
    } catch {
      setCreateError('发布失败');
    } finally {
      setCreating(false);
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
    <div className="max-w-4xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 px-3 sm:px-0">
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-10">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
           <div className="w-12 h-12 sm:w-14 sm:h-14 bg-black rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 flex-shrink-0">
              <Megaphone className="text-lime-300" size={24} />
           </div>
           <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">系统公告</h2>
              <p className="text-gray-500 font-medium text-sm sm:text-base">了解 DeepTrading AI 的最新动态与维护计划</p>
           </div>
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setShowCreate(true);
              }}
              className="px-4 py-2 rounded-2xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors"
            >
              新增公告
            </button>
          )}
        </div>

        {loading && (
          <div className="py-16 text-center text-gray-400 text-sm font-bold">加载公告中...</div>
        )}

        {!loading && error && (
          <div className="py-10 text-center text-red-500 text-sm font-bold">{error}</div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm font-bold">暂无公告</div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="relative border-l-2 border-gray-100 ml-3 sm:ml-6 space-y-6 sm:space-y-12">
           {items.map((item) => (
             <div
               key={item.id}
               id={`announcement-${item.id}`}
               className="relative pl-6 sm:pl-10 group scroll-mt-24"
             >
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-4 transition-colors shadow-sm ${
                  focusId === item.id ? 'border-lime-500' : 'border-gray-200 group-hover:border-lime-400'
                }`}></div>
                
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

                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-lime-700 transition-colors">
                  {item.title}
                </h3>
                
                <div className={`rounded-2xl p-4 sm:p-5 text-sm text-gray-600 leading-relaxed font-medium border transition-all ${
                  focusId === item.id
                    ? 'bg-white shadow-md border-lime-200'
                    : 'bg-gray-50 border-gray-100 group-hover:bg-white group-hover:shadow-md group-hover:border-gray-200'
                }`}>
                   {item.content}
                </div>
             </div>
           ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !creating && setShowCreate(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-[2rem] border border-gray-100 shadow-[0_30px_80px_rgba(0,0,0,0.18)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="font-extrabold text-gray-900">新增公告</div>
              <button
                type="button"
                onClick={() => !creating && setShowCreate(false)}
                className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">标题</div>
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-300 font-semibold"
                  placeholder="请输入公告标题"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">类型</div>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-300 font-semibold"
                >
                  <option value="new">新功能</option>
                  <option value="maintenance">系统维护</option>
                  <option value="security">安全提醒</option>
                  <option value="update">产品更新</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-bold text-gray-500 mb-2">内容</div>
                <textarea
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-lime-300 font-semibold min-h-[140px]"
                  placeholder="请输入公告内容"
                />
              </div>

              {createError && (
                <div className="text-sm font-bold text-red-500">{createError}</div>
              )}
            </div>

            <div className="px-6 py-5 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-colors disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="px-5 py-2.5 rounded-2xl bg-black text-white font-extrabold hover:bg-gray-900 transition-colors disabled:opacity-60"
              >
                {creating ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
