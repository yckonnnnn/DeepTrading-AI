import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * 轻量路由（零依赖）：
 * - pushState/popstate，浏览器前进后退可用
 * - Nginx try_files 兜底，刷新/直链可用
 */

interface RouteState {
  path: string;
  search: string;
}

interface RouterContextValue extends RouteState {
  navigate: (to: string, options?: { replace?: boolean }) => void;
  back: () => void;
}

const RouterContext = createContext<RouterContextValue>({
  path: '/',
  search: '',
  navigate: () => {},
  back: () => {},
});

export function useRouter() {
  return useContext(RouterContext);
}

export function useNavigate() {
  return useContext(RouterContext).navigate;
}

function readLocation(): RouteState {
  return {
    path: window.location.pathname.replace(/\/+$/, '') || '/',
    search: window.location.search,
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<RouteState>(readLocation);

  useEffect(() => {
    const onPop = () => setRoute(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const [path, search = ''] = to.split('?');
    const normalized = { path: path.replace(/\/+$/, '') || '/', search: search ? `?${search}` : '' };
    setRoute(normalized);
    if (options?.replace) {
      window.history.replaceState(null, '', `${normalized.path}${normalized.search}`);
    } else {
      window.history.pushState(null, '', `${normalized.path}${normalized.search}`);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const back = useCallback(() => {
    window.history.back();
  }, []);

  const value = useMemo(() => ({ ...route, navigate, back }), [route, navigate, back]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, replace, onClick, children, ...rest }) => {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to, { replace });
      }}
      {...rest}
    >
      {children}
    </a>
  );
};
