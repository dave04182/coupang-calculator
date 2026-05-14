'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/lib/store';
import { formatWon, formatNumber } from '@/lib/calculator';

interface SettlementRow {
  orderId: string;
  orderDate: string;
  productName: string;
  sellingPrice: number;
  coupangFee: number;
  shippingFee: number;
  settlementAmount: number;
}

interface SettlementSummary {
  totalSettlement: number;
  totalCoupangFee: number;
  totalShippingFee: number;
  totalItems: number;
  rows: SettlementRow[];
}

export default function SettlementPage() {
  const router = useRouter();
  const { isConfigured } = useSettingsStore();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettlement = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/settlement?month=${month}`
      );
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const rows: SettlementRow[] = (json?.data ?? []).map((item: {
        orderId?: string;
        orderDate?: string;
        productName?: string;
        sellingPrice?: number;
        commissionFee?: number;
        shippingFee?: number;
        settlementAmount?: number;
      }) => ({
        orderId: item.orderId ?? '-',
        orderDate: item.orderDate ?? '-',
        productName: item.productName ?? '-',
        sellingPrice: item.sellingPrice ?? 0,
        coupangFee: item.commissionFee ?? 0,
        shippingFee: item.shippingFee ?? 0,
        settlementAmount: item.settlementAmount ?? 0,
      }));

      const summary: SettlementSummary = {
        totalSettlement: rows.reduce((s, r) => s + r.settlementAmount, 0),
        totalCoupangFee: rows.reduce((s, r) => s + r.coupangFee, 0),
        totalShippingFee: rows.reduce((s, r) => s + r.shippingFee, 0),
        totalItems: rows.length,
        rows,
      };
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : '정산 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [isConfigured, month]);

  return (
    <div className="settlement-page">
      <header>
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push('/dashboard')}>← 대시보드</button>
          <div>
            <h1>🧾 정산 내역</h1>
            <p>쿠팡 실제 정산 데이터를 불러와 수수료를 확인하세요.</p>
          </div>
        </div>
      </header>

      {!isConfigured && (
        <div className="alert">⚠️ API 키를 먼저 설정하세요. <a href="/settings">설정 바로가기</a></div>
      )}

      <div className="query-bar">
        <label>정산 월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <button className="fetch-btn" onClick={fetchSettlement} disabled={loading || !isConfigured}>
          {loading ? '조회 중...' : '조회하기'}
        </button>
      </div>

      {error && <div className="error-box">❌ {error}</div>}

      {data && (
        <>
          {/* 요약 카드 */}
          <div className="summary-cards">
            <div className="s-card main">
              <span className="label">실 정산액 합계</span>
              <span className="value green">{formatWon(data.totalSettlement)}</span>
            </div>
            <div className="s-card">
              <span className="label">총 건수</span>
              <span className="value">{formatNumber(data.totalItems)}건</span>
            </div>
            <div className="s-card">
              <span className="label">쿠팡 수수료 합계</span>
              <span className="value red">-{formatWon(data.totalCoupangFee)}</span>
            </div>
            <div className="s-card">
              <span className="label">배송비 합계</span>
              <span className="value red">-{formatWon(data.totalShippingFee)}</span>
            </div>
          </div>

          {/* 정산 테이블 */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>주문일</th>
                  <th>상품명</th>
                  <th>판매가</th>
                  <th>쿠팡 수수료</th>
                  <th>배송비</th>
                  <th>정산액</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr><td colSpan={7} className="empty">해당 월 정산 데이터가 없습니다.</td></tr>
                ) : (
                  data.rows.map((row, i) => (
                    <tr key={i}>
                      <td className="order-id">{row.orderId}</td>
                      <td>{row.orderDate}</td>
                      <td className="product-name">{row.productName}</td>
                      <td>{formatWon(row.sellingPrice)}</td>
                      <td className="red">-{formatWon(row.coupangFee)}</td>
                      <td className="red">-{formatWon(row.shippingFee)}</td>
                      <td className="green bold">{formatWon(row.settlementAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style jsx>{`
        .settlement-page { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem;
          font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; }
        header { display: flex; margin-bottom: 1.2rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .back-btn { border: 1px solid #e5e7eb; background: white; border-radius: 8px;
          padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.88rem; white-space: nowrap; }
        h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.2rem; }
        header p { color: #888; font-size: 0.85rem; }
        .alert { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
          padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: #92400e; }
        .alert a { color: #f04141; font-weight: 600; }
        .query-bar { display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.2rem;
          background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.2rem; }
        .query-bar label { font-size: 0.88rem; font-weight: 600; color: #555; }
        .query-bar input[type="month"] { padding: 0.45rem 0.7rem; border: 1px solid #e5e7eb;
          border-radius: 8px; font-size: 0.9rem; outline: none; }
        .fetch-btn { padding: 0.5rem 1.2rem; background: #f04141; color: white; border: none;
          border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .fetch-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-box { background: #fff5f5; border: 1px solid #fecaca; border-radius: 8px;
          padding: 0.8rem 1rem; margin-bottom: 1rem; color: #dc2626; font-size: 0.9rem; }
        .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8rem; margin-bottom: 1.2rem; }
        @media (max-width: 768px) { .summary-cards { grid-template-columns: repeat(2, 1fr); } }
        .s-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.2rem; }
        .s-card.main { background: #f0fdf4; border-color: #bbf7d0; }
        .s-card .label { display: block; font-size: 0.75rem; color: #888; margin-bottom: 0.4rem; }
        .s-card .value { display: block; font-size: 1.2rem; font-weight: 700; }
        .s-card .value.green { color: #16a34a; }
        .s-card .value.red { color: #dc2626; }
        .table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.87rem; }
        thead { background: #f9fafb; }
        th { padding: 0.7rem 1rem; text-align: left; font-weight: 600; color: #555;
          font-size: 0.8rem; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        td { padding: 0.65rem 1rem; border-bottom: 1px solid #f5f5f5; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #f9fafb; }
        .order-id { font-size: 0.8rem; color: #aaa; }
        .product-name { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .red { color: #dc2626; }
        .green { color: #16a34a; }
        .bold { font-weight: 700; }
        .empty { text-align: center; padding: 2.5rem; color: #aaa; }
      `}</style>
    </div>
  );
}
