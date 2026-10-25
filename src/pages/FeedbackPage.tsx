import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { Field, Input, Textarea } from '../components/ui/Field';

const FeedbackPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    // 反馈通道暂未接入后端，前端先确认提交体验
    window.setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 900);
  };

  return (
    <div className="anim-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <SurfaceCard xl pad>
        {submitted ? (
          <div className="empty">
            <div className="empty__icon" style={{ background: 'var(--green-pale)', color: 'var(--green-deep)' }}>
              <CheckCircle2 size={26} />
            </div>
            <div className="empty__title">感谢你的反馈！</div>
            <div className="empty__desc">我们会认真阅读每一条建议，并尽快评估与跟进。</div>
            <div className="empty__action">
              <Button
                variant="secondary"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                  setContent('');
                }}
              >
                再写一条
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="page-head" style={{ textAlign: 'center', margin: '0 auto var(--s8)' }}>
              <h1>意见反馈</h1>
              <p className="page-head__sub">
                无论是功能吐槽、体验优化，还是新功能许愿，我们都期待听到你的声音。
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="联系邮箱" hint="选填，方便我们回复你">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </Field>

              <Field label="反馈内容">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请描述你遇到的问题或建议…"
                  rows={6}
                  required
                />
              </Field>

              <Button type="submit" size="lg" block loading={isSubmitting} disabled={!content.trim()}>
                <Send size={16} /> 提交反馈
              </Button>
            </form>
          </>
        )}
      </SurfaceCard>
    </div>
  );
};

export default FeedbackPage;
