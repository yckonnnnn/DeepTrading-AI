import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Megaphone, Plus, ShieldAlert, Sparkles, Wrench } from 'lucide-react';
import type { TabId } from '../types';
import { useSession } from '../app/session';
import { apiFetch, apiPostJson } from '../services/api';
import { SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Overlay';
import { EmptyState, ErrorState, SkeletonBox } from '../components/ui/Feedback';
import { useToast } from '../hooks/useToast';

interface AnnouncementItem {
  id: number;
  title: string;
  date: string;
  category: string;
  content: string;
}

const CATEGORY_META: Record<string, { label: string; chip: string; icon: React.ElementType }> = {
  new: { label: '新功能', chip: 'chip--green', icon: Sparkles },
  maintenance: { label: '系统维护', chip: 'chip--amber', icon: Wrench },
  security: { label: '安全提醒', chip: 'chip--up', icon: ShieldAlert },
  update: { label: '产品更新', chip: 'chip--blue', icon: Megaphone },
};

interface AnnouncementsPageProps {
  onNavigateTab?: (tab: TabId) => void;
}

const AnnouncementsPage: React.FC<AnnouncementsPageProps> = () => {
  const { isAdmin } = useSession();
  const { showToast } = useToast();
  const [items, setItems] = useState<AnnouncementItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createCategory, setCreateCategory] = useState('new');
  const [createContent, setCreateContent] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: any = await apiFetch('/api/announcements?limit=50');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || '公告加载失败');
    } finally {
      setLoading(false);
    }
  }, [nonce]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleCreate = async () => {
    const title = createTitle.trim();
    const content = createContent.trim();
    if (!title || !content) {
      showToast('请填写标题和内容', 'error');
      return;
    }
    setCreating(true);
    try {
      await apiPostJson('/api/announcements', { title, category: createCategory, content });
      showToast('公告已发布', 'success');
      setShowCreate(false);
      setCreateTitle('');
      setCreateCategory('new');
      setCreateContent('');
      setNonce((v) => v + 1);
    } catch (err: any) {
      showToast(err?.message || '发布失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="anim-page" style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1>系统公告</h1>
          <p className="page-head__sub">了解 DeepTrading AI 的最新动态与维护计划。</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> 新增公告
          </Button>
        )}
      </div>

      <SurfaceCard xl pad>
        {items === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <SkeletonBox h={72} r={16} />
            <SkeletonBox h={72} r={16} />
            <SkeletonBox h={72} r={16} />
          </div>
        ) : error ? (
          <ErrorState title="公告加载失败" desc={error} onRetry={() => setNonce((v) => v + 1)} />
        ) : items.length === 0 ? (
          <EmptyState title="暂无公告" desc="有新动态时会第一时间在这里发布。" />
        ) : (
          <div className="timeline">
            {items.map((item) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.update;
              const Icon = meta.icon;
              return (
                <div key={item.id} className="timeline__item">
                  <span className="timeline__dot" aria-hidden="true" />
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span className={`chip ${meta.chip}`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                      <Calendar size={11} />
                      {item.date}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{item.title}</h3>
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--divider-soft)',
                      borderRadius: 'var(--r-md)',
                      padding: '13px 15px',
                      fontSize: 13.5,
                      color: '#3f4c5e',
                      lineHeight: 1.8,
                    }}
                  >
                    {item.content}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      {/* 新增公告（管理员） */}
      <Modal
        open={showCreate}
        onClose={() => !creating && setShowCreate(false)}
        title="新增公告"
        subtitle="发布后所有用户可见"
        footer={
          <>
            <Button variant="secondary" disabled={creating} onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button loading={creating} onClick={handleCreate}>
              发布
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="标题">
            <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="请输入公告标题" />
          </Field>
          <Field label="类型">
            <Select value={createCategory} onChange={(e) => setCreateCategory(e.target.value)}>
              <option value="new">新功能</option>
              <option value="maintenance">系统维护</option>
              <option value="security">安全提醒</option>
              <option value="update">产品更新</option>
            </Select>
          </Field>
          <Field label="内容">
            <Textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} placeholder="请输入公告内容" rows={5} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default AnnouncementsPage;
