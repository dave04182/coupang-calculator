'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore, useDashboardStore, useProductProfitStore } from '@/lib/store';
import { calculateProfit, formatWon, formatNumber, CATEGORY_FEES } from '@/lib/calculator';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ProfitResult } from '@/types';

// ─── 단일 상품 계산기 ─────────────────────────────────────────
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

  const marginColor = !result ? 'var(--text-muted)'
    : result.marginRate >= 20 ? 'var(--accent)'
      : result.marginRate >= 10 ? 'var(--yellow)'
        : 'var(--red)';

  const pieData = result ? [
    { name: '원가', value: result.productCost, color: '#6366f1' },
    { name: '수수료', value: result.coupangFee, color: '#ff4d6a' },
    { name: '배송비', value: result.shippingCost + result.fulfillmentCost, color: '#ffc94d' },
    { name: '광고비', value: result.adCost, color: '#ec4899' },
    { name: '순수익', value: Math.max(result.netProfit, 0), color: '#00e5a0' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="calc-card">
      <div className="card-label">단일 상품 계산기</div>

      <div className="input-grid">
        <div className="input-group">
          <label>판매가</label>
          <div className="input-wrap">
            <input type="number" value={sellingPrice || ''} placeholder="0"
              onChange={(e) => setSellingPrice(Number(e.target.value))} />
            <span className="unit">원</span>
          </div>
        </div>
        <div className="input-group">
          <label>매입가</label>
          <div className="input-wrap">
            <input type="number" value={purchasePrice || ''} placeholder="0"
              onChange={(e) => setPurchasePrice(Number(e.target.value))} />
            <span className="unit">원</span>
          </div>
        </div>
        <div className="input-group">
          <label>포장재비</label>
          <div className="input-wrap">
            <input type="number" value={packagingCost || ''} placeholder="0"
              onChange={(e) => setPackagingCost(Number(e.target.value))} />
            <span className="unit">원</span>
          </div>
        </div>
        <div className="input-group">
          <label>카테고리</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {CATEGORY_FEES.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.rate}%)</option>
            ))}
          </select>
        </div>
        <div className="input-group span2">
          <label>수수료 직접 입력 (%)</label>
          <div className="input-wrap">
            <input type="number" step="0.1" value={customRate ?? ''} placeholder={`자동: ${commissionRate}%`}
              onChange={(e) => setCustomRate(e.target.value ? Number(e.target.value) : null)} />
            <span className="unit">%</span>
          </div>
        </div>
      </div>

      {result ? (
        <div className="result-area">
          <div className="kpi-grid">
            <div className="kpi main-kpi">
              <span className="kpi-label">순수익</span>
              <span className="kpi-value" style={{ color: marginColor }}>{formatWon(result.netProfit)}</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">마진율</span>
              <span className="kpi-value sm" style={{ color: marginColor }}>{result.marginRate}%</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">ROI</span>
              <span className="kpi-value sm">{result.roi}%</span>
            </div>
            <div className="kpi">
              <span className="kpi-label">손익분기가</span>
              <span className="kpi-value sm">{formatWon(result.breakEvenPrice)}</span>
            </div>
          </div>

          <div className="breakdown">
            <div className="breakdown-title">비용 구조</div>
            {[
              { label: '판매가', value: result.sellingPrice, type: 'base' },
              { label: `수수료 (${commissionRate}%)`, value: result.coupangFee, type: 'minus' },
              { label: '배송/풀필먼트', value: result.shippingCost + result.fulfillmentCost, type: 'minus' },
              { label: '광고비', value: result.adCost, type: 'minus' },
              ...(result.vatRefund > 0 ? [{ label: '부가세 환급', value: result.vatRefund, type: 'plus' }] : []),
              { label: '원가 (매입+포장)', value: result.productCost, type: 'minus' },
            ].map((row, i) => (
              <div className="breakdown-row" key={i}>
                <span className="row-label">{row.label}</span>
                <span className={`row-value ${row.type}`}>
                  {row.type === 'minus' ? `-${formatWon(row.value)}` :
                    row.type === 'plus' ? `+${formatWon(row.value)}` :
                      formatWon(row.value)}
                </span>
              </div>
            ))}
            <div className="breakdown-total">
              <span>순수익</span>
              <span style={{ color: marginColor }}>{formatWon(result.netProfit)}</span>
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="pie-area">
              <div className="breakdown-title">비용 비중</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} innerRadius={30}
                    dataKey="value" label={false} labelLine={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatWon(v)}
                    contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: d.color }} />
                    <span className="legend-name">{d.name}</span>
                    <span className="legend-pct">{((d.value / pieData.reduce((s, x) => s + x.value, 0)) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">판매가를 입력하면 순수익이 계산됩니다</div>
      )
      }

      <style jsx>{`
        .calc-card { background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 1.5rem; }
        .card-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-faint); margin-bottom: 1.2rem; }
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.2rem; }
        .input-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .input-group.span2 { grid-column: span 2; }
        .input-group label { font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }
        .input-wrap { position: relative; }
        .input-wrap input { width: 100%; padding: 0.5rem 2rem 0.5rem 0.75rem; border-radius: 8px; font-size: 0.92rem; }
        .input-wrap .unit { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%);
          font-size: 0.75rem; color: var(--text-faint); pointer-events: none; }
        .input-group select { padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.88rem; width: 100%; }

        .pie-legend { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-top: 0.5rem; }
        .legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .legend-name { color: var(--text-muted); }
        .legend-pct { color: var(--text); font-weight: 700; }
        
        .result-area { display: flex; flex-direction: column; gap: 1.2rem; }
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .kpi { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px;
          padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .kpi.main-kpi { grid-column: span 2; background: var(--bg2); border-color: var(--border2); }
        .kpi-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 500;
          text-transform: uppercase; letter-spacing: 0.05em; }
        .kpi-value { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
        .kpi-value.sm { font-size: 1.2rem; }
        .kpi.main-kpi .kpi-value { font-size: 2rem; }

        .breakdown { background: var(--bg2); border-radius: 10px; padding: 1rem; }
        .breakdown-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-faint); margin-bottom: 0.75rem; }
        .breakdown-row { display: flex; justify-content: space-between; align-items: center;
          padding: 0.3rem 0; border-bottom: 1px solid var(--border); }
        .breakdown-row:last-child { border-bottom: none; }
        .row-label { font-size: 0.82rem; color: var(--text-muted); }
        .row-value { font-size: 0.88rem; font-weight: 600; color: var(--text); }
        .row-value.minus { color: var(--red); }
        .row-value.plus { color: var(--accent); }
        .breakdown-total { display: flex; justify-content: space-between; align-items: center;
          padding-top: 0.6rem; margin-top: 0.4rem; border-top: 1px solid var(--border2);
          font-weight: 700; font-size: 0.95rem; }

        .empty-state { padding: 2rem; text-align: center; color: var(--text-faint); font-size: 0.85rem;
          border: 1px dashed var(--border); border-radius: 10px; }
      `}</style>
    </div >
  );
}

// ─── 환불 모니터 ──────────────────────────────────────────────
function ReturnMonitor() {
  const { settings, isConfigured, setConfigured } = useSettingsStore();
  const { summary, isLoading, lastPolledAt, setSummary, setLoading, setLastPolledAt } = useDashboardStore();
  const [notification, setNotification] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19);
      const to = new Date().toISOString().slice(0, 19);
      const [ordersRes, returnsRes] = await Promise.all([
        fetch(`/api/orders?from=${from}&to=${to}`),
        fetch(`/api/returns?from=${from}&to=${to}`),
      ]);
      if (ordersRes.status === 401) { setConfigured(false); return; }
      const ordersData = await ordersRes.json();
      const returnsData = await returnsRes.json();
      const orders = ordersData?.data ?? [];
      const returns = returnsData?.data ?? [];
      const totalOrders = orders.length;
      const totalReturnCount = returns.length;
      const returnRate = totalOrders > 0 ? (totalReturnCount / totalOrders) * 100 : 0;
      const totalRevenue = orders.reduce((s: number, o: { totalPrice?: number }) => s + (o.totalPrice ?? 0), 0);
      const totalRefunds = returns.reduce((s: number, r: { refundPrice?: number }) => s + (r.refundPrice ?? 0), 0);
      const newReturns = Math.max(0, totalReturnCount - (summary?.totalReturnCount ?? 0));
      if (newReturns > 0) {
        setNotification(`🔔 새 환불 ${newReturns}건 감지`);
        setTimeout(() => setNotification(null), 5000);
      }
      setSummary({
        totalRevenue, totalRefunds, netRevenue: totalRevenue - totalRefunds,
        totalOrders, totalReturnCount, returnRate: Math.round(returnRate * 10) / 10,
        totalNetProfit: 0, averageMarginRate: 0,
        lastUpdated: new Date().toLocaleString('ko-KR'), newReturnsDetected: newReturns
      });
      setLastPolledAt(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [isConfigured, setConfigured, summary, setSummary, setLoading, setLastPolledAt]);

  useEffect(() => {
    if (!isConfigured) return;
    poll();
    const t = setInterval(poll, settings.pollIntervalMinutes * 60000);
    timerRef.current = t;
    return () => clearInterval(t);
  }, [settings.pollIntervalMinutes, isConfigured, poll]);

  if (!isConfigured) {
    return (
      <div className="monitor-card">
        <div className="card-label">실시간 환불 모니터</div>
        <div className="not-configured">
          <span className="icon">🔑</span>
          <p>API 키를 연동하면<br />실시간 데이터가 표시됩니다</p>
          <a href="/settings">설정에서 연동하기 →</a>
        </div>
        <style jsx>{`
          .monitor-card { background: var(--surface); border: 1px solid var(--border);
            border-radius: 16px; padding: 1.5rem; }
          .card-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
            text-transform: uppercase; color: var(--text-faint); margin-bottom: 1.2rem; }
          .not-configured { display: flex; flex-direction: column; align-items: center;
            gap: 0.75rem; padding: 2.5rem 1rem; text-align: center; }
          .icon { font-size: 2rem; }
          p { color: var(--text-muted); font-size: 0.88rem; line-height: 1.6; }
          a { color: var(--accent); font-size: 0.85rem; font-weight: 600; text-decoration: none; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="monitor-card">
      <div className="monitor-top">
        <div className="card-label">실시간 환불 모니터</div>
        <div className="monitor-status">
          <span className={`dot ${isLoading ? 'pulse-yellow' : 'pulse-green'}`} />
          <span className="status-text">{isLoading ? '갱신 중' : lastPolledAt ?? '-'}</span>
          <button className="refresh" onClick={poll} disabled={isLoading}>↻</button>
        </div>
      </div>

      {notification && <div className="notif">{notification}</div>}

      {summary ? (
        <>
          <div className="big-metrics">
            <div className="big-metric">
              <span className="bm-label">실 매출</span>
              <span className="bm-value accent">{formatWon(summary.netRevenue)}</span>
              <span className="bm-sub">환불 차감 후</span>
            </div>
            <div className="divider" />
            <div className="big-metric">
              <span className="bm-label">총 매출</span>
              <span className="bm-value">{formatWon(summary.totalRevenue)}</span>
              <span className="bm-sub">{formatNumber(summary.totalOrders)}건</span>
            </div>
            <div className="divider" />
            <div className="big-metric">
              <span className="bm-label">환불액</span>
              <span className="bm-value red">-{formatWon(summary.totalRefunds)}</span>
              <span className="bm-sub">{formatNumber(summary.totalReturnCount)}건</span>
            </div>
          </div>

          <div className="return-gauge">
            <div className="gauge-header">
              <span className="gauge-label">환불율</span>
              <span className="gauge-value" style={{ color: summary.returnRate > 5 ? 'var(--red)' : 'var(--accent)' }}>
                {summary.returnRate}%
              </span>
            </div>
            <div className="gauge-bar">
              <div className="gauge-fill" style={{
                width: `${Math.min(summary.returnRate * 10, 100)}%`,
                background: summary.returnRate > 5 ? 'var(--red)' : 'var(--accent)'
              }} />
            </div>
            <div className="gauge-hint">
              {summary.returnRate > 5 ? '⚠ 환불율이 높습니다' : '✓ 환불율 정상'}
            </div>
          </div>
        </>
      ) : (
        <div className="loading-state">데이터 로딩 중...</div>
      )}

      <p className="poll-hint">매 {settings.pollIntervalMinutes}분 자동 갱신 · 최근 7일</p>

      <style jsx>{`
        .monitor-card { background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }
        .monitor-top { display: flex; justify-content: space-between; align-items: center; }
        .card-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-faint); }
        .monitor-status { display: flex; align-items: center; gap: 0.5rem; }
        .dot { width: 7px; height: 7px; border-radius: 50%; }
        .pulse-green { background: var(--accent); box-shadow: 0 0 6px var(--accent); animation: pulse 2s infinite; }
        .pulse-yellow { background: var(--yellow); }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .status-text { font-size: 0.75rem; color: var(--text-muted); }
        .refresh { border: 1px solid var(--border); background: transparent; color: var(--text-muted);
          border-radius: 6px; padding: 0.15rem 0.4rem; cursor: pointer; font-size: 0.9rem; }
        .refresh:hover { color: var(--text); border-color: var(--border2); }
        .notif { background: rgba(255,196,77,0.1); border: 1px solid rgba(255,196,77,0.2);
          border-radius: 8px; padding: 0.5rem 0.8rem; font-size: 0.82rem; color: var(--yellow); }

        .big-metrics { display: flex; align-items: stretch; background: var(--bg2);
          border-radius: 12px; overflow: hidden; }
        .big-metric { flex: 1; padding: 1.1rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .divider { width: 1px; background: var(--border); flex-shrink: 0; }
        .bm-label { font-size: 0.7rem; color: var(--text-faint); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em; }
        .bm-value { font-size: 1.15rem; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
        .bm-value.accent { color: var(--accent); }
        .bm-value.red { color: var(--red); }
        .bm-sub { font-size: 0.72rem; color: var(--text-faint); }

        .return-gauge { background: var(--bg2); border-radius: 10px; padding: 1rem; }
        .gauge-header { display: flex; justify-content: space-between; margin-bottom: 0.6rem; }
        .gauge-label { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
        .gauge-value { font-size: 1rem; font-weight: 800; }
        .gauge-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
        .gauge-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
        .gauge-hint { font-size: 0.72rem; color: var(--text-faint); margin-top: 0.4rem; }

        .loading-state { color: var(--text-faint); font-size: 0.85rem; text-align: center; padding: 1rem; }
        .poll-hint { font-size: 0.72rem; color: var(--text-faint); text-align: right; }
      `}</style>
    </div>
  );
}

// ─── 대시보드 메인 ────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { settings, isConfigured, setConfigured } = useSettingsStore();
  const { summaries } = useProductProfitStore();

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => setConfigured(d.configured));
  }, [setConfigured]);

  const filledSummaries = summaries.filter(s => s.profitPerUnit);
  const totalEstimatedProfit = filledSummaries.reduce((s, x) => s + (x.profitPerUnit?.netProfit ?? 0), 0);
  const avgMargin = filledSummaries.length > 0
    ? filledSummaries.reduce((s, x) => s + (x.profitPerUnit?.marginRate ?? 0), 0) / filledSummaries.length
    : 0;

  return (
    <div className="dashboard">
      {filledSummaries.length > 0 && (
        <div className="summary-banner">
          <div className="sb-item">
            <span className="sb-label">원가 입력 상품</span>
            <span className="sb-value">{filledSummaries.length}개</span>
          </div>
          <div className="sb-divider" />
          <div className="sb-item">
            <span className="sb-label">평균 순수익</span>
            <span className="sb-value accent">{formatWon(Math.round(totalEstimatedProfit / filledSummaries.length))}</span>
          </div>
          <div className="sb-divider" />
          <div className="sb-item">
            <span className="sb-label">평균 마진율</span>
            <span className="sb-value" style={{ color: avgMargin >= 20 ? 'var(--accent)' : avgMargin >= 10 ? 'var(--yellow)' : 'var(--red)' }}>
              {avgMargin.toFixed(1)}%
            </span>
          </div>
          <button className="sb-btn" onClick={() => router.push('/products')}>원가 관리 →</button>
        </div>
      )}

      <div className="dash-grid">
        <ReturnMonitor />
        <SingleCalculator />
      </div>

      <style jsx>{`
        .dashboard { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1.5rem; }
        .summary-banner { display: flex; align-items: center; background: var(--surface);
          border: 1px solid var(--border); border-radius: 12px; margin-bottom: 1.2rem; overflow: hidden; }
        .sb-item { padding: 0.9rem 1.5rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .sb-label { font-size: 0.7rem; color: var(--text-faint); font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em; }
        .sb-value { font-size: 1.1rem; font-weight: 800; color: var(--text); }
        .sb-value.accent { color: var(--accent); }
        .sb-divider { width: 1px; background: var(--border); align-self: stretch; }
        .sb-btn { margin-left: auto; margin-right: 1rem; padding: 0.4rem 0.9rem;
          background: var(--active-bg); color: var(--accent); border: 1px solid rgba(0,229,160,0.2);
          border-radius: 7px; font-size: 0.82rem; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; }
        @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}