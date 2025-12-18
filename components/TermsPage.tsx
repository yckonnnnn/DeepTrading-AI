import React from 'react';
import termsRaw from '../server_terms.md?raw';

interface TermsPageProps {
  onBack: () => void;
}

const isSectionTitle = (line: string) => /^[一二三四五六七八九十]+、/.test(line);
const isSubTitle = (line: string) => /^\d+(?:\.\d+)*\s+/.test(line) || /^\d+(?:\.\d+)*\./.test(line);

const TermsPage: React.FC<TermsPageProps> = ({ onBack }) => {
  const lines = termsRaw.split(/\r?\n/);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-900 selection:bg-lime-200 selection:text-lime-900">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
              服务条款与免责声明
            </h1>
            <p className="mt-2 text-gray-500 font-medium">
              请在注册前仔细阅读以下内容。
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            返回
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 sm:px-10 py-8">
            <div className="prose prose-slate max-w-none">
              {lines.map((rawLine, idx) => {
                const line = rawLine.trim();
                if (!line) {
                  return <div key={idx} className="h-3" />;
                }

                if (isSectionTitle(line)) {
                  return (
                    <h2 key={idx} className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-8 mb-3">
                      {line}
                    </h2>
                  );
                }

                if (isSubTitle(line)) {
                  return (
                    <h3 key={idx} className="text-base sm:text-lg font-bold text-gray-900 mt-5 mb-2">
                      {line}
                    </h3>
                  );
                }

                return (
                  <p key={idx} className="text-gray-700 leading-relaxed font-medium">
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 font-medium leading-relaxed">
          注册即表示您已充分了解并接受我们的服务条款和免责声明。
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
