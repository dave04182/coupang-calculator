'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore, useProductCostStore, useProductStore } from '@/lib/store';
import { calculateProfit, formatWon, formatNumber, CATEGORY_FEES } from '@/lib/calculator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import type { DailyProfitData, PeriodSummary } from '@/types';

type Period = '1d' | '7d' | '30d' | 'custom';

function getPeriodDates(period: Period, customFrom?: string, customTo?: string) {
  const to = new Date();
  to.setHours(23, 59, 59);
  let from = new Date();

  if (period === '1d') from.setDate(from.getDate() - 1);
  else if (period === '7d') from.setDate(from.getDate() - 7);
  else if (period === '30d') from.setDate(from.getDate() - 30);
  else {
    return {
      from: customFrom ?? from.toISOString().slice(0, 10),
      to: customTo ?? to.toISOString().slice(0, 10),
    };
  }

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

// 날짜 범위 → 빈 DailyProfitData 배열 생성
function buildEmptyDays(from: string, to: string): Record<string, DailyProfitData> {
  const map: Record<string, DailyProfitData> = {};
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    map[key] = { date: key, revenue: 0, refunds: 0, netRevenue: 0, orderCount: 0, returnCount: 0, estimatedProfit: 0 };
    cur.setDate(cur.getDate() + 1);
  }
  return map;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { settings, isConfigured } = useSettingsStore();
  const { costs } = useProductCostStore();
  const { products } = useProductStore();

  const [period, setPeriod] = useState<Period>('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 상품 원가 맵 (vendorItemId → 단위 순수익)
  const profitMap = useCallback((sellingPrice: number, vendorItemId: string, categoryId: string) => {
    const cost = costs[vendorItemId];
    if (!cost || sellingPrice <= 0) return null;
    const rate = CATEGORY_FEES.find(c => c.id === categoryId)?.rate ?? 11;
    return calculateProfit(sellingPrice, cost.purchasePrice, cost.packagingCost, rate, {
      ...settings,
      credentials: { accessKey: '', secretKey: '', vendorId: '' },
    });
  }, [costs, settings]);

  const fetchData = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError('');

    const { from, to } = getPeriodDates(period, customFrom, customTo);

    try {
      const [ordersRes, returnsRes] = await Promise.all([
        fetch(`/api/orders?from=${from}T00:00:00&to=${to}T23:59:59`),
        fetch(`/api/returns?from=${from}T00:00:00&to=${to}T23:59:59`),
      ]);

      if (ordersRes.status === 401) { router.push('/settings'); return; }

      const ordersData = await ordersRes.json();
      const returnsData = await returnsRes.json();

      const orders: Array<{
        orderId: string;
        orderedAt: string;
        totalPrice?: number;
        orderItems?: Array<{ vendorItemId: string; salesPrice: number; quantity: number }>;
      }> = ordersData?.data ?? [];

      const returns: Array<{
        cancelId: string;
        cancelCompletedAt: string;
        refundPrice?: number;
      }> = returnsData?.data ?? [];

      // 일별 집계
      const dayMap = buildEmptyDays(from, to);

      for (const order of orders) {
        const day = (order.orderedAt ?? '').slice(0, 10);
        if (!dayMap[day]) continue;
        const price = order.totalPrice ?? 0;
        dayMap[day].revenue += price;
        dayMap[day].orderCount += 1;

        // 상품별 순수익 추정
        for (const item of order.orderItems ?? []) {
          const productEntry = products.find(p => p.items.some(i => String(i.vendorItemId) === String(item.vendorItemId)));
          const itemData = productEntry?.items.find(i => String(i.vendorItemId) === String(item.vendorItemId));
          if (itemData) {
            const result = profitMap(item.salesPrice, String(item.vendorItemId), productEntry?.categoryId ?? 'other');
            if (result) dayMap[day].estimatedProfit += result.netProfit * item.quantity;
          }
        }
      }

      for (const ret of returns) {
        const day = (ret.cancelCompletedAt ?? '').slice(0, 10);
        if (!dayMap[day]) continue;
        dayMap[day].refunds += ret.refundPrice ?? 0;
        dayMap[day].returnCount += 1;
      }

      for (const day of Object.values(dayMap)) {
        day.netRevenue = day.revenue - day.refunds;
      }

      const dailyData = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

      const totalRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
      const totalRefunds = dailyData.reduce((s, d) => s + d.refunds, 0);
      const totalOrders = dailyData.reduce((s, d) => s + d.orderCount, 0);
      const totalReturns = dailyData.reduce((s, d) => s + d.returnCount, 0);
      const estimatedTotalProfit = dailyData.reduce((s, d) => s + d.estimatedProfit, 0);

      setSummary({
        period,
        from,
        to,
        totalRevenue,
        totalRefunds,
        netRevenue: totalRevenue - totalRefunds,
        totalOrders,
        totalReturns,
        returnRate: totalOrders > 0 ? Math.round((totalReturns / totalOrders) * 1000) / 10 : 0,
        estimatedTotalProfit,
        dailyData,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, period, customFrom, customTo, products, profitMap, router]);

  useEffect(() => {
    if (isConfigured) fetchData();
  }, [isConfigured, period]);

  const PERIOD_LABELS: Record<Period, string> = {
    '1d': '오늘',
    '7d': '최근 7일',
    '30d': '최근 30일',
    'custom': '직접 설정',
  };

  const chartData = summary?.dailyData.map(d => ({
    date: d.date.slice(5), // MM-DD
    매출: d.revenue,
    환불: d.refunds,
    순매출: d.netRevenue,
    순수익추정: d.estimatedProfit,
  })) ?? [];

  const hasCostData = summary?.estimatedTotalProfit !== 0;

  return (
    <div className="analytics-page">
      <header>
        <button className="back-btn" onClick={() => router.push('/dashboard')}>← 대시보드</button>
        <div>
          <h1>📊 수익 분석</h1>
          <p>기간별 매출·환불·순수익 추이를 확인하세요.</p>
        </div>
      </header>

      {!isConfigured && (
        <div className="alert">⚠️ API 키를 먼저 설정하세요. <a href="/settings">설정 바로가기</a></div>
      )}

      {/* 기간 선택 */}
      <div className="period-bar">
        <div className="period-tabs">
          {(['1d', '7d', '30d', 'custom'] as Period[]).map(p => (
            <button key={p} className={`tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="custom-range">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span>~</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
            <button className="fetch-btn" onClick={fetchData}>조회</button>
          </div>
        )}
      </div>

      {error && <div className="error-box">❌ {error}</div>}

      {loading && <div className="loading">데이터 불러오는 중...</div>}

      {summary && !loading && (
        <>
          {/* 요약 카드 */}
          <div className="summary-grid">
            <div className="s-card">
              <span className="label">총 주문</span>
              <span className="value">{formatNumber(summary.totalOrders)}건</span>
            </div>
            <div className="s-card alert-card">
              <span className="label">환불 건수</span>
              <span className="value red">{formatNumber(summary.totalReturns)}건</span>
              <span className="sub">{summary.returnRate}% 환불율</span>
            </div>
            <div className="s-card">
              <span className="label">총 매출</span>
              <span className="value">{formatWon(summary.totalRevenue)}</span>
            </div>
            <div className="s-card">
              <span className="label">환불 차감</span>
              <span className="value red">-{formatWon(summary.totalRefunds)}</span>
            </div>
            <div className="s-card highlight">
              <span className="label">실 매출 (환불 후)</span>
              <span className="value blue">{formatWon(summary.netRevenue)}</span>
            </div>
            <div className={`s-card ${hasCostData ? 'profit-card' : 'dim-card'}`}>
              <span className="label">추정 순수익</span>
              <span className="value green">
                {hasCostData ? formatWon(summary.estimatedTotalProfit) : '원가 입력 필요'}
              </span>
              {!hasCostData && (
                <span className="sub">
                  <a href="/products">상품 원가 관리</a>에서 입력하세요
                </span>
              )}
            </div>
          </div>

          {/* 매출 / 환불 바차트 */}
          <div className="chart-card">
            <h3>일별 매출 · 환불</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => formatWon(v)} />
                <Legend />
                <Bar dataKey="매출" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="환불" fill="#f04141" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 순매출 / 순수익 라인차트 */}
          <div className="chart-card">
            <h3>일별 순매출 · 순수익 추이</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
                <Tooltip formatter={(v: number) => formatWon(v)} />
                <Legend />
                <Line type="monotone" dataKey="순매출" stroke="#6366f1" strokeWidth={2} dot={false} />
                {hasCostData && (
                  <Line type="monotone" dataKey="순수익추정" stroke="#22c55e" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 일별 상세 테이블 */}
          <div className="table-card">
            <h3>일별 상세</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>주문</th>
                    <th>환불</th>
                    <th>매출</th>
                    <th>환불액</th>
                    <th>순매출</th>
                    {hasCostData && <th>순수익 추정</th>}
                  </tr>
                </thead>
                <tbody>
                  {summary.dailyData.map(d => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.orderCount}건</td>
                      <td className={d.returnCount > 0 ? 'red' : ''}>{d.returnCount}건</td>
                      <td>{formatWon(d.revenue)}</td>
                      <td className="red">{d.refunds > 0 ? `-${formatWon(d.refunds)}` : '-'}</td>
                      <td className="bold">{formatWon(d.netRevenue)}</td>
                      {hasCostData && <td className="green">{d.estimatedProfit > 0 ? formatWon(d.estimatedProfit) : '-'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .analytics-page { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem;
          font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; }
        header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem; }
        .back-btn { border: 1px solid #e5e7eb; background: white; border-radius: 8px;
          padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.88rem; white-space: nowrap; }
        h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.2rem; }
        header p { color: #888; font-size: 0.85rem; }
        .alert { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
          padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: #92400e; }
        .alert a { color: #f04141; font-weight: 600; }

        /* 기간 선택 */
        .period-bar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.2rem;
          flex-wrap: wrap; }
        .period-tabs { display: flex; gap: 0.4rem; background: #f3f4f6; border-radius: 10px; padding: 4px; }
        .tab { padding: 0.4rem 0.9rem; border: none; border-radius: 7px; background: transparent;
          font-size: 0.88rem; cursor: pointer; color: #666; font-weight: 500; transition: all 0.15s; }
        .tab.active { background: white; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 700; }
        .custom-range { display: flex; align-items: center; gap: 0.5rem; }
        .custom-range input[type="date"] { padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb;
          border-radius: 7px; font-size: 0.88rem; outline: none; }
        .fetch-btn { padding: 0.4rem 0.9rem; background: #f04141; color: white; border: none;
          border-radius: 7px; font-size: 0.88rem; font-weight: 600; cursor: pointer; }

        .error-box { background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px;
          padding: 0.8rem 1rem; margin-bottom: 1rem; color: #dc2626; }
        .loading { text-align: center; padding: 3rem; color: #aaa; }

        /* 요약 카드 */
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8rem; margin-bottom: 1.2rem; }
        @media (max-width: 768px) { .summary-grid { grid-template-columns: repeat(2, 1fr); } }
        .s-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.2rem; }
        .s-card.highlight { background: #eef2ff; border-color: #c7d2fe; }
        .s-card.alert-card { background: #fff5f5; border-color: #fecaca; }
        .s-card.profit-card { background: #f0fdf4; border-color: #bbf7d0; }
        .s-card.dim-card { background: #f9fafb; }
        .s-card .label { display: block; font-size: 0.75rem; color: #888; margin-bottom: 0.4rem; }
        .s-card .value { display: block; font-size: 1.15rem; font-weight: 700; }
        .s-card .value.red { color: #dc2626; }
        .s-card .value.blue { color: #4f46e5; }
        .s-card .value.green { color: #16a34a; }
        .s-card .sub { display: block; font-size: 0.75rem; color: #aaa; margin-top: 0.2rem; }
        .s-card .sub a { color: #f04141; }

        /* 차트 */
        .chart-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px;
          padding: 1.2rem; margin-bottom: 1rem; }
        .chart-card h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: #555; }

        /* 테이블 */
        .table-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.2rem; }
        .table-card h3 { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: #555; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
        th { padding: 0.6rem 0.8rem; text-align: left; font-weight: 600; color: #666;
          font-size: 0.78rem; border-bottom: 2px solid #f0f0f0; white-space: nowrap; }
        td { padding: 0.55rem 0.8rem; border-bottom: 1px solid #f5f5f5; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafafa; }
        .red { color: #dc2626; }
        .green { color: #16a34a; }
        .bold { font-weight: 600; }
      `}</style>
    </div>
  );
}
