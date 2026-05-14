'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSettingsStore, useApiKeyStore } from '@/lib/store';

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isConfigured } = useSettingsStore();
  const { getDaysLeft } = useApiKeyStore();
  const [light, setLight] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const daysLeft = getDaysLeft();
  const keyWarning = daysLeft !== null && daysLeft <= 14;

  useEffect(() => {
    const saved = localStorage.getItem('lightMode');
    if (saved === 'true') {
      document.documentElement.classList.add('light');
      setLight(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    localStorage.setItem('lightMode', String(next));
    document.documentElement.classList.toggle('light', next);
  };

  const links = [
    { href: '/dashboard', label: '대시보드' },
    { href: '/analytics', label: '수익 분석' },
    { href: '/products', label: '원가 관리' },
    { href: '/settlement', label: '정산 내역' },
    { href: '/settings', label: '설정' },
  ];

  return (
    <>
      {isConfigured && keyWarning && (
        <div className="expiry-banner">
          <span>⚠ API 키 만료 <strong>{daysLeft}일</strong> 전</span>
          <button onClick={() => router.push('/settings')}>갱신하기</button>
        </div>
      )}
      <nav className="navbar">
        <div className="nav-inner">
          <button className="logo" onClick={() => router.push('/dashboard')}>
            <span className="logo-mark">C</span>
            <span className="logo-text">쿠팡 수익</span>
          </button>
          <div className="nav-links">
            {links.map(l => (
              <button key={l.href}
                className={`nav-link ${pathname === l.href ? 'active' : ''}`}
                onClick={() => router.push(l.href)}>
                {l.label}
                {pathname === l.href && <span className="active-dot" />}
              </button>
            ))}
          </div>
          <div className="nav-right">
            <button className="theme-btn" onClick={toggleTheme}>{light ? '🌙' : '☀️'}</button>
            <button className="hamburger" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? '✕' : '☰'}</button>
          </div>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            {links.map(l => (
              <button key={l.href}
                className={`mobile-link ${pathname === l.href ? 'active' : ''}`}
                onClick={() => { router.push(l.href); setMenuOpen(false); }}>
                {l.label}
              </button>
            ))}
          </div>
        )}
      </nav>
      <style jsx>{`
        .expiry-banner { background: rgba(255,196,77,0.1); border-bottom: 1px solid rgba(255,196,77,0.2);
          padding: 0.45rem 1.2rem; font-size: 0.82rem; color: var(--yellow);
          display: flex; align-items: center; gap: 0.8rem; }
        .expiry-banner button { background: var(--yellow); color: #000; border: none;
          border-radius: 4px; padding: 0.2rem 0.6rem; font-size: 0.78rem; cursor: pointer; font-weight: 700; }
        .navbar { background: var(--nav-bg); border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); }
        .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;
          display: flex; align-items: center; height: 52px; gap: 0.5rem; }
        .logo { display: flex; align-items: center; gap: 0.6rem; border: none;
          background: none; cursor: pointer; padding: 0; margin-right: 1rem; flex-shrink: 0; }
        .logo-mark { width: 28px; height: 28px; background: var(--accent); border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 900; color: #000; }
        .logo-text { font-size: 0.92rem; font-weight: 700; color: var(--text); white-space: nowrap; }
        .nav-links { display: flex; gap: 0.1rem; flex: 1; }
        .nav-link { position: relative; padding: 0.35rem 0.8rem; border: none; background: none;
          border-radius: 7px; font-size: 0.84rem; cursor: pointer; color: var(--text-muted);
          transition: all 0.15s; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .nav-link:hover { color: var(--text); background: var(--hover); }
        .nav-link.active { color: var(--accent); font-weight: 600; }
        .active-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--accent); }
        .nav-right { display: flex; align-items: center; gap: 0.4rem; margin-left: auto; }
        .theme-btn { border: none; background: none; cursor: pointer; font-size: 1rem;
          padding: 0.3rem; border-radius: 6px; opacity: 0.7; }
        .theme-btn:hover { opacity: 1; background: var(--hover); }
        .hamburger { display: none; border: none; background: none; cursor: pointer;
          font-size: 1.1rem; color: var(--text-muted); padding: 0.3rem; }
        @media (max-width: 768px) { .nav-links { display: none; } .hamburger { display: block; } }
        .mobile-menu { border-top: 1px solid var(--border); padding: 0.5rem;
          background: var(--nav-bg); display: flex; flex-direction: column; gap: 0.2rem; }
        .mobile-link { padding: 0.7rem 1rem; border: none; background: none; border-radius: 8px;
          font-size: 0.92rem; cursor: pointer; color: var(--text); text-align: left; }
        .mobile-link:hover { background: var(--hover); }
        .mobile-link.active { color: var(--accent); font-weight: 600; }
      `}</style>
    </>
  );
}