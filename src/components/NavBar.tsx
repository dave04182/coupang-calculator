'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSettingsStore, useApiKeyStore } from '@/lib/store';

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isConfigured } = useSettingsStore();
  const { getDaysLeft } = useApiKeyStore();
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const daysLeft = getDaysLeft();
  const keyWarning = daysLeft !== null && daysLeft <= 14;

  // 다크모드 초기화
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.classList.toggle('dark', next);
  };

  const links = [
    { href: '/dashboard', label: '대시보드', icon: '📦' },
    { href: '/analytics', label: '수익 분석', icon: '📊' },
    { href: '/products', label: '원가 관리', icon: '📋' },
    { href: '/settlement', label: '정산 내역', icon: '🧾' },
    { href: '/settings', label: '설정', icon: '⚙️' },
  ];

  return (
    <>
      {/* 키 만료 경고 배너 */}
      {isConfigured && keyWarning && (
        <div className="expiry-banner">
          ⚠️ API 키가 <strong>{daysLeft}일 후</strong> 만료됩니다.{' '}
          <button onClick={() => router.push('/settings')}>지금 갱신하기</button>
        </div>
      )}

      <nav className="navbar">
        <div className="nav-inner">
          {/* 로고 */}
          <button className="logo" onClick={() => router.push('/dashboard')}>
            <span className="logo-icon">📦</span>
            <span className="logo-text">쿠팡 수익 계산기</span>
          </button>

          {/* 데스크탑 링크 */}
          <div className="nav-links">
            {links.map(l => (
              <button
                key={l.href}
                className={`nav-link ${pathname === l.href ? 'active' : ''}`}
                onClick={() => router.push(l.href)}
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="nav-right">
            {/* 다크모드 토글 */}
            <button className="icon-btn" onClick={toggleDark} title="다크모드 전환">
              {dark ? '☀️' : '🌙'}
            </button>

            {/* 모바일 햄버거 */}
            <button className="hamburger icon-btn" onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {menuOpen && (
          <div className="mobile-menu">
            {links.map(l => (
              <button
                key={l.href}
                className={`mobile-link ${pathname === l.href ? 'active' : ''}`}
                onClick={() => { router.push(l.href); setMenuOpen(false); }}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <style jsx>{`
        .expiry-banner {
          background: #fff7ed; border-bottom: 1px solid #fed7aa;
          padding: 0.5rem 1.2rem; font-size: 0.85rem; color: #92400e;
          display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
        }
        .expiry-banner button {
          background: #f59e0b; color: white; border: none; border-radius: 5px;
          padding: 0.2rem 0.6rem; font-size: 0.8rem; cursor: pointer; font-weight: 600;
        }
        .navbar {
          background: var(--nav-bg, white); border-bottom: 1px solid var(--border, #e5e7eb);
          position: sticky; top: 0; z-index: 100;
        }
        .nav-inner {
          max-width: 1100px; margin: 0 auto; padding: 0 1rem;
          display: flex; align-items: center; height: 52px; gap: 1rem;
        }
        .logo {
          display: flex; align-items: center; gap: 0.5rem; border: none;
          background: none; cursor: pointer; padding: 0; flex-shrink: 0;
        }
        .logo-icon { font-size: 1.1rem; }
        .logo-text {
          font-size: 0.95rem; font-weight: 700; color: var(--text, #1a1a1a);
          white-space: nowrap;
        }
        .nav-links {
          display: flex; gap: 0.2rem; flex: 1;
        }
        .nav-link {
          padding: 0.35rem 0.75rem; border: none; background: none;
          border-radius: 7px; font-size: 0.875rem; cursor: pointer;
          color: var(--text-muted, #666); transition: all 0.15s; white-space: nowrap;
        }
        .nav-link:hover { background: var(--hover, #f3f4f6); color: var(--text, #1a1a1a); }
        .nav-link.active {
          background: var(--active-bg, #fff5f5); color: #f04141; font-weight: 700;
        }
        .nav-right { display: flex; align-items: center; gap: 0.4rem; margin-left: auto; }
        .icon-btn {
          border: none; background: none; cursor: pointer; font-size: 1.1rem;
          padding: 0.3rem; border-radius: 6px; line-height: 1;
        }
        .icon-btn:hover { background: var(--hover, #f3f4f6); }
        .hamburger { display: none; }

        /* 모바일 */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hamburger { display: flex; }
        }
        .mobile-menu {
          border-top: 1px solid var(--border, #e5e7eb);
          padding: 0.5rem;
          background: var(--nav-bg, white);
        }
        .mobile-link {
          display: flex; align-items: center; gap: 0.7rem; width: 100%;
          padding: 0.7rem 1rem; border: none; background: none;
          border-radius: 8px; font-size: 0.92rem; cursor: pointer;
          color: var(--text, #1a1a1a); text-align: left; transition: background 0.15s;
        }
        .mobile-link:hover { background: var(--hover, #f3f4f6); }
        .mobile-link.active { background: var(--active-bg, #fff5f5); color: #f04141; font-weight: 700; }
      `}</style>
    </>
  );
}
