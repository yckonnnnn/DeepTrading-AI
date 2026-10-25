import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useRouter } from '../app/router';
import { SurfaceCard } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';

/** 装饰性二维码图案（确定性伪随机，避免每次渲染变化） */
const QrPattern: React.FC = () => {
  const cells: boolean[] = [];
  let seed = 20260930;
  for (let i = 0; i < 64; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    cells.push((seed >> 8) % 3 !== 0);
  }
  // 三个定位角留空
  const reserved = (r: number, c: number) =>
    (r < 3 && c < 3) || (r < 3 && c > 4) || (r > 4 && c < 3);

  return (
    <div className="qr-art" aria-hidden="true">
      {cells.map((on, i) => {
        const r = Math.floor(i / 8);
        const c = i % 8;
        const corner = r === 1 && c === 1;
        return (
          <span
            key={i}
            style={{
              background: reserved(r, c) ? 'transparent' : corner ? 'var(--ink)' : on ? 'var(--ink)' : 'transparent',
            }}
          />
        );
      })}
    </div>
  );
};

const ContactPage: React.FC = () => {
  const { navigate } = useRouter();

  return (
    <div className="anim-page" style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="page-head">
        <h1>联系我们</h1>
        <p className="page-head__sub">无论是商务合作还是技术支持，我们都在这里。</p>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <SurfaceCard xl pad>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              {
                icon: <Mail size={18} />,
                tint: { background: 'var(--blue-pale)', color: 'var(--blue-deep)' },
                title: '电子邮件',
                desc: '一般咨询与商务合作',
                value: 'zackyckon@gmail.com',
                href: 'mailto:zackyckon@gmail.com',
              },
              {
                icon: <Phone size={18} />,
                tint: { background: 'var(--green-pale)', color: 'var(--green-deep)' },
                title: '客户服务',
                desc: '周一至周五 9:00 – 18:00',
                value: '400-123-4567',
                href: 'tel:4001234567',
              },
              {
                icon: <MapPin size={18} />,
                tint: { background: 'var(--surface-3)', color: 'var(--text-2)' },
                title: '总部地址',
                desc: '上海市浦东新区陆家嘴环路 1000 号 金融中心大厦 88 楼',
                value: '',
                href: '',
              },
            ].map((row, i) => (
              <div key={i} className="row-item" style={{ alignItems: 'flex-start', padding: '14px 8px' }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    ...row.tint,
                  }}
                >
                  {row.icon}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{row.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.65 }}>{row.desc}</div>
                  {row.href && (
                    <a
                      href={row.href}
                      style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', marginTop: 3, display: 'inline-block' }}
                    >
                      {row.value}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          xl
          pad
          style={{
            background: 'linear-gradient(150deg, #1b2530, var(--ink) 65%)',
            border: 0,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 14,
          }}
        >
          <div style={{ background: '#fff', borderRadius: 'var(--r-lg)', padding: 10, boxShadow: 'var(--shadow-md)' }}>
            <QrPattern />
          </div>
          <div>
            <strong style={{ fontSize: 16 }}>关注官方公众号</strong>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.66)', marginTop: 4 }}>
              获取每日市场早报与产品动态（二维码为占位示意）
            </p>
          </div>
          <Button variant="secondary" pill onClick={() => navigate('/')}>
            访问官方网站
          </Button>
        </SurfaceCard>
      </div>
    </div>
  );
};

export default ContactPage;
