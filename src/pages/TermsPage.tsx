import React from 'react';
import termsRaw from '../../server_terms.md?raw';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from '../app/router';
import { SurfaceCard } from '../components/ui/Surface';

const isSectionTitle = (line: string) => /^[一二三四五六七八九十]+、/.test(line);
const isSubTitle = (line: string) => /^\d+(?:\.\d+)*\s+/.test(line) || /^\d+(?:\.\d+)*\./.test(line);

const TermsPage: React.FC = () => {
  const { navigate } = useRouter();
  const lines = termsRaw.split(/\r?\n/);

  return (
    <div className="page-pad" style={{ minHeight: '100dvh' }}>
      <div className="shell" style={{ maxWidth: 860 }}>
        <div className="anim-page">
          <button className="auth__back" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> 返回首页
          </button>

          <div style={{ margin: 'var(--s4) 0 var(--s8)' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>服务条款与免责声明</h1>
            <p style={{ marginTop: 6, color: 'var(--text-2)', fontSize: 14.5 }}>请在注册前仔细阅读以下内容。</p>
          </div>

          <SurfaceCard xl pad>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lines.map((rawLine, idx) => {
                const line = rawLine.trim();
                if (!line) return <div key={idx} style={{ height: 10 }} />;

                if (isSectionTitle(line)) {
                  return (
                    <h2 key={idx} style={{ fontSize: 19, fontWeight: 800, marginTop: 26, marginBottom: 6 }}>
                      {line}
                    </h2>
                  );
                }
                if (isSubTitle(line)) {
                  return (
                    <h3 key={idx} style={{ fontSize: 15.5, fontWeight: 800, marginTop: 16, marginBottom: 4 }}>
                      {line}
                    </h3>
                  );
                }
                return (
                  <p key={idx} style={{ color: '#3f4c5e', fontSize: 14, lineHeight: 1.85 }}>
                    {line}
                  </p>
                );
              })}
            </div>
          </SurfaceCard>

          <p style={{ marginTop: 18, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
            注册即表示您已充分了解并接受我们的服务条款和免责声明。
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
