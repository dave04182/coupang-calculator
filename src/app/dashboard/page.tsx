'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore, useDashboardStore, useProductProfitStore } from '@/lib/store';
import { calculateProfit, formatWon, formatNumber, CATEGORY_FEES } from '@/lib/calculator';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProfitResult } from '@/types';

// ─── 단일 상품 계산기 패널 ────────────────────────────────────
function SingleCalculator() {
  const { settings } = useSettingsStore();
  const [sellingPrice, setSellingPrice] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [categoryId, setCategoryId] = useState('other');
  const [customRate, setCustomRate] = useState<number | null>(null);

  const commissionRate = customRate ?? (CATEGORY_FEES.find(c => c.id === categoryId)?.rate ?? 11);
  const result: ProfitResult | null = sellingPrice > 0
    ? calculateProfit(sellingPrice, purchasePrice, packagingCost, commissionRate, {
      ...settings,
      credentials: { accessKey: '', secretKey: '', vendorId: '' },
    })
    : null;
  const marginColor = !result ? '#888'
    : result.marginRate >= 20 ? '#22c55e'
      : result.marginRate >= 10 ? '#f59e0b'
        : '#f04141';

  const pieData = result ? [
    { name: '원가', value: result.productCost, color: '#6366f1' },
    { name: '수수료', value: result.coupangFee, color: '#f04141' },
    { name: '배송비', value: result.shippingCost + result.fulfillmentCost, color: '#f59e0b' },
    { name: '광고비', value: result.adCost, color: '#ec4899' },
    { name: '순수익', value: Math.max(result.netProfit, 0), color: '#22c55e' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="calc-panel card">
      <h2>🧮 단일 상품 계산</h2>

      <div className="input-grid">
        <div className="field">
          <label>판매가 (원)</label>
          <input type="number" value={sellingPrice || ''} placeholder="0"
            onChange={(e) => setSellingPrice(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>매입가 (원)</label>
          <input type="number" value={purchasePrice || ''} placeholder="0"
            onChange={(e) => setPurchasePrice(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>포장재비 (원)</label>
          <input type="number" value={packagingCost || ''} placeholder="0"
            onChange={(e) => setPackagingCost(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>카테고리</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {CATEGORY_FEES.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.rate}%)</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>수수료 직접 입력 (%)</label>
          <input type="number" step="0.1" value={customRate ?? ''} placeholder={`자동: ${commissionRate}%`}
            onChange={(e) => setCustomRate(e.target.value ? Number(e.target.value) : null)} />
        </div>
      </div>

      {result && (
        <div className="result-section">
          {/* 메인 결과 카드 */}
          <div className="result-cards">
            <div className="result-card main">
              <span className="label">순수익</span>
              <span className="value" style={{ color: marginColor }}>{formatWon(result.netProfit)}</span>
            </div>
            <div className="result-card">
              <span className="label">마진율</span>
              <span className="value" style={{ color: marginColor }}>{result.marginRate}%</span>
            </div>
            <div className="result-card">
              <span className="label">ROI</span>
              <span className="value">{result.roi}%</span>
            </div>
            <div className="result-card">
              <span className="label">손익분기 판매가</span>
              <span className="value">{formatWon(result.breakEvenPrice)}</span>
            </div>
          </div>

          {/* 비용 구조 */}
          <div className="cost-breakdown">
            <h3>비용 구조</h3>
            <div className="breakdown-row"><span>판매가</span><span>{formatWon(result.sellingPrice)}</span></div>
            <div className="breakdown-row deduct"><span>쿠팡 수수료 ({commissionRate}%)</span><span>-{formatWon(result.coupangFee)}</span></div>
            <div className="breakdown-row deduct"><span>배송/풀필먼트비</span><span>-{formatWon(result.shippingCost + result.fulfillmentCost)}</span></div>
            <div className="breakdown-row deduct"><span>광고비</span><span>-{formatWon(result.adCost)}</span></div>
            {result.vatRefund > 0 && <div className="breakdown-row add"><span>부가세 환급</span><span>+{formatWon(result.vatRefund)}</span></div>}
            <div className="breakdown-row deduct"><span>원가 (매입+포장)</span><span>-{formatWon(result.productCost)}</span></div>
            <div className="breakdown-row total"><span>순수익</span><span style={{ color: marginColor }}>{formatWon(result.netProfit)}</span></div>
          </div>

          {/* 파이차트 */}
          {pieData.length > 0 && (
            <div className="pie-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatWon(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 환불 실시간 패널 ─────────────────────────────────────────
function ReturnMonitor() {
  const { settings, isConfigured } = useSettingsStore();
  const { summary, isLoading, lastPolledAt, setSummary, setLoading, setLastPolledAt } = useDashboardStore();
  const [notification, setNotification] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19);
      const to = new Date().toISOString().slice(0, 19);

      // 쿠키는 자동으로 전송됨 — URL에 API 키 노출 없음
      const [ordersRes, returnsRes] = await Promise.all([
        fetch(`/api/orders?from=${from}&to=${to}`),
        fetch(`/api/returns?from=${from}&to=${to}`),
      ]);

      // 401이면 키 만료
      if (ordersRes.status === 401) {
        setConfigured(false);
        return;
      }

      const ordersData = await ordersRes.json();
      const returnsData = await returnsRes.json();

      const orders = ordersData?.data ?? [];
      const returns = returnsData?.data ?? [];

      const totalOrders = orders.length;
      const totalReturnCount = returns.length;
      const returnRate = totalOrders > 0 ? (totalReturnCount / totalOrders) * 100 : 0;

      const totalRevenue = orders.reduce((sum: number, o: { totalPrice?: number }) => sum + (o.totalPrice ?? 0), 0);
      const totalRefunds = returns.reduce((sum: number, r: { refundPrice?: number }) => sum + (r.refundPrice ?? 0), 0);

      const prevReturnCount = summary?.totalReturnCount ?? 0;
      const newReturns = Math.max(0, totalReturnCount - prevReturnCount);

      if (newReturns > 0) {
        setNotification(`🔔 새 환불 ${newReturns}건 감지됨`);
        setTimeout(() => setNotification(null), 5000);
      }

      setSummary({
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        totalOrders,
        totalReturnCount,
        returnRate: Math.round(returnRate * 10) / 10,
        totalNetProfit: 0,
        averageMarginRate: 0,
        lastUpdated: new Date().toLocaleString('ko-KR'),
        newReturnsDetected: newReturns,
      });
      setLastPolledAt(new Date().toLocaleTimeString('ko-KR'));
    } catch (err) {
      console.error('폴링 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [isConfigured, summary, setSummary, setLoading, setLastPolledAt]);

  // 폴링 설정
  useEffect(() => {
    if (!isConfigured) return;
    poll();
    const interval = settings.pollIntervalMinutes * 60 * 1000;
    timerRef.current = setInterval(poll, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [settings.pollIntervalMinutes, isConfigured, poll]);

  if (!isConfigured) {
    return (
      <div className="card return-monitor not-configured">
        <p>⚠️ API 키를 먼저 설정하세요.</p>
        <a href="/settings">설정 바로가기 →</a>
      </div>
    );
  }

  return (
    <div className="card return-monitor">
      <div className="monitor-header">
        <h2>📡 실시간 환불 모니터</h2>
        <div className="monitor-meta">
          <span className={`status-dot ${isLoading ? 'loading' : 'live'}`} />
          <span>{isLoading ? '업데이트 중...' : `최근 갱신: ${lastPolledAt ?? '-'}`}</span>
          <button className="refresh-btn" onClick={poll} disabled={isLoading}>↻</button>
        </div>
      </div>

      {notification && <div className="notification">{notification}</div>}

      {summary && (
        <div className="monitor-grid">
          <div className="monitor-card">
            <span className="label">총 주문</span>
            <span className="value">{formatNumber(summary.totalOrders)}건</span>
          </div>
          <div className="monitor-card alert">
            <span className="label">환불 건수</span>
            <span className="value red">{formatNumber(summary.totalReturnCount)}건</span>
          </div>
          <div className="monitor-card">
            <span className="label">환불율</span>
            <span className="value" style={{ color: summary.returnRate > 5 ? '#f04141' : '#22c55e' }}>
              {summary.returnRate}%
            </span>
          </div>
          <div className="monitor-card">
            <span className="label">총 매출</span>
            <span className="value">{formatWon(summary.totalRevenue)}</span>
          </div>
          <div className="monitor-card">
            <span className="label">환불 차감</span>
            <span className="value red">-{formatWon(summary.totalRefunds)}</span>
          </div>
          <div className="monitor-card main">
            <span className="label">실 매출 (환불 후)</span>
            <span className="value green">{formatWon(summary.netRevenue)}</span>
          </div>
        </div>
      )}

      <p className="poll-info">매 {settings.pollIntervalMinutes}분마다 자동 갱신 · 7일 기준</p>
    </div>
  );
}

// ─── 대시보드 메인 ────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { isConfigured, setConfigured } = useSettingsStore();
  const { summaries } = useProductProfitStore();

  // 페이지 진입 시 쿠키 기반 인증 상태 확인
  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => setConfigured(d.configured));
  }, [setConfigured]);

  const filledSummaries = summaries.filter(s => s.profitPerUnit);
  const totalEstimatedProfit = filledSummaries.reduce(
    (sum, s) => sum + (s.profitPerUnit?.netProfit ?? 0), 0
  );
  const avgMargin = filledSummaries.length > 0
    ? filledSummaries.reduce((sum, s) => sum + (s.profitPerUnit?.marginRate ?? 0), 0) / filledSummaries.length
    : 0;

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1>실시간 수익 현황</h1>
          <p>환불 자동 반영 · {settings.pollIntervalMinutes}분마다 갱신</p>
        </div>
      </header>

      {/* 상품 수익 요약 배너 */}
      {filledSummaries.length > 0 && (
        <div className="profit-banner">
          <div className="banner-item">
            <span className="banner-label">원가 입력 상품</span>
            <span className="banner-value">{filledSummaries.length}개</span>
          </div>
          <div className="banner-item">
            <span className="banner-label">상품당 평균 순수익</span>
            <span className="banner-value green">{formatWon(Math.round(totalEstimatedProfit / filledSummaries.length))}</span>
          </div>
          <div className="banner-item">
            <span className="banner-label">평균 마진율</span>
            <span className="banner-value" style={{ color: avgMargin >= 20 ? '#16a34a' : avgMargin >= 10 ? '#d97706' : '#dc2626' }}>
              {avgMargin.toFixed(1)}%
            </span>
          </div>
          <button className="banner-btn" onClick={() => router.push('/products')}>
            원가 더 입력하기 →
          </button>
        </div>
      )}

      <div className="dash-layout">
        <ReturnMonitor />
        <SingleCalculator />
      </div>

      <style jsx>{`
        .dashboard { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem; font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; }
        .dash-header { margin-bottom: 1.2rem; }
        h1 { font-size: 1.3rem; font-weight: 700; }
        .dash-header p { color: var(--text-muted, #888); font-size: 0.85rem; margin-top: 0.2rem; }

        /* 수익 배너 */
        .profit-banner { display: flex; align-items: center; gap: 1.5rem; background: white;
          border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.5rem;
          margin-bottom: 1.2rem; flex-wrap: wrap; }
        .banner-item { display: flex; flex-direction: column; gap: 0.2rem; }
        .banner-label { font-size: 0.75rem; color: #888; }
        .banner-value { font-size: 1.1rem; font-weight: 700; }
        .banner-value.green { color: #16a34a; }
        .banner-btn { margin-left: auto; padding: 0.45rem 0.9rem; background: #fff5f5;
          color: #f04141; border: 1px solid #fecaca; border-radius: 8px;
          font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }

        .dash-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
        @media (max-width: 768px) { .dash-layout { grid-template-columns: 1fr; } }

        /* 공통 카드 */
        :global(.card) { background: white; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1.5rem; }
        :global(.card h2) { font-size: 1rem; font-weight: 700; margin-bottom: 1.2rem; }

        /* 계산기 */
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; }
        :global(.field) { display: flex; flex-direction: column; gap: 0.3rem; }
        :global(.field label) { font-size: 0.8rem; color: #666; font-weight: 500; }
        :global(.field input), :global(.field select) {
          padding: 0.5rem 0.7rem; border: 1px solid #e5e7eb; border-radius: 8px;
          font-size: 0.9rem; outline: none; width: 100%;
        }
        :global(.field input:focus), :global(.field select:focus) {
          border-color: #f04141; box-shadow: 0 0 0 2px rgba(240,65,65,0.1);
        }

        /* 결과 카드 */
        .result-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; margin-bottom: 1rem; }
        .result-card { background: #f9fafb; border-radius: 10px; padding: 0.8rem; }
        .result-card.main { grid-column: span 2; background: #fff5f5; }
        .result-card .label { display: block; font-size: 0.75rem; color: #888; margin-bottom: 0.2rem; }
        .result-card .value { display: block; font-size: 1.1rem; font-weight: 700; }
        .result-card.main .value { font-size: 1.4rem; }

        /* 비용 분해 */
        .cost-breakdown { border-top: 1px solid #f0f0f0; padding-top: 1rem; margin-bottom: 1rem; }
        .cost-breakdown h3 { font-size: 0.85rem; color: #888; margin-bottom: 0.6rem; }
        .breakdown-row { display: flex; justify-content: space-between; font-size: 0.88rem;
          padding: 0.3rem 0; border-bottom: 1px dashed #f5f5f5; }
        .breakdown-row.deduct span:last-child { color: #f04141; }
        .breakdown-row.add span:last-child { color: #22c55e; }
        .breakdown-row.total { font-weight: 700; border-top: 1px solid #e5e7eb; border-bottom: none;
          padding-top: 0.5rem; margin-top: 0.3rem; }

        /* 환불 모니터 */
        .monitor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .monitor-meta { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: #888; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.live { background: #22c55e; animation: pulse 2s infinite; }
        .status-dot.loading { background: #f59e0b; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .refresh-btn { border: 1px solid #e5e7eb; background: white; border-radius: 6px;
          padding: 0.2rem 0.5rem; cursor: pointer; font-size: 1rem; }
        .notification { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
          padding: 0.6rem 0.9rem; font-size: 0.88rem; color: #ea580c; margin-bottom: 1rem;
          animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .monitor-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
        .monitor-card { background: #f9fafb; border-radius: 10px; padding: 0.8rem; }
        .monitor-card.main { background: #f0fdf4; }
        .monitor-card.alert { background: #fff5f5; }
        .monitor-card .label { display: block; font-size: 0.72rem; color: #888; margin-bottom: 0.3rem; }
        .monitor-card .value { display: block; font-size: 1rem; font-weight: 700; }
        .monitor-card .value.red { color: #f04141; }
        .monitor-card .value.green { color: #22c55e; }
        .poll-info { font-size: 0.75rem; color: #bbb; margin-top: 1rem; text-align: right; }
        .not-configured { text-align: center; padding: 2rem; color: #888; }
        .not-configured a { color: #f04141; text-decoration: none; font-weight: 600; }
        .pie-wrap { margin-top: 1rem; }
      `}</style>
    </div>
  );
}
