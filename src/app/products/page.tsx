'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore, useProductCostStore, useProductStore, useProductProfitStore } from '@/lib/store';
import { calculateProfit, formatWon, CATEGORY_FEES } from '@/lib/calculator';
import type { CoupangProduct } from '@/types';

// ─── 상품 행 컴포넌트 ─────────────────────────────────────────
function ProductRow({ product, item }: { product: CoupangProduct; item: CoupangProduct['items'][0] }) {
  const { settings } = useSettingsStore();
  const { costs, setCost } = useProductCostStore();
  const id = String(item.vendorItemId);
  const saved = costs[id];

  const [purchasePrice, setPurchasePrice] = useState(saved?.purchasePrice ?? 0);
  const [packagingCost, setPackagingCost] = useState(saved?.packagingCost ?? 0);
  const [categoryId, setCategoryId] = useState(saved ? product.categoryId : product.categoryId || 'other');
  const [dirty, setDirty] = useState(false);

  const commissionRate = CATEGORY_FEES.find(c => c.id === categoryId)?.rate ?? 11;
  const result = item.salePrice > 0 && purchasePrice > 0
    ? calculateProfit(item.salePrice, purchasePrice, packagingCost, commissionRate, {
      ...settings,
      credentials: { accessKey: '', secretKey: '', vendorId: '' },
    })
    : null;

  const marginColor = !result ? '#999'
    : result.marginRate >= 20 ? '#16a34a'
      : result.marginRate >= 10 ? '#d97706'
        : '#dc2626';

  const handleSave = () => {
    setCost(id, {
      productName: item.itemName,
      purchasePrice,
      packagingCost,
    });
    setDirty(false);
  };

  return (
    <tr className={dirty ? 'dirty' : saved ? 'saved-row' : ''}>
      <td className="product-name">
        <div className="name">{item.itemName}</div>
        <div className="sub">ID: {id} · 재고: {item.stockQuantity}개</div>
      </td>
      <td className="price">{formatWon(item.salePrice)}</td>
      <td>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setDirty(true); }}
        >
          {CATEGORY_FEES.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.rate}%)</option>
          ))}
        </select>
      </td>
      <td>
        <input
          type="number"
          value={purchasePrice || ''}
          placeholder="0"
          onChange={(e) => { setPurchasePrice(Number(e.target.value)); setDirty(true); }}
        />
      </td>
      <td>
        <input
          type="number"
          value={packagingCost || ''}
          placeholder="0"
          onChange={(e) => { setPackagingCost(Number(e.target.value)); setDirty(true); }}
        />
      </td>
      <td className="result-cell">
        {result ? (
          <div className="result-mini">
            <span className="net" style={{ color: marginColor }}>{formatWon(result.netProfit)}</span>
            <span className="margin" style={{ color: marginColor }}>{result.marginRate}%</span>
          </div>
        ) : (
          <span className="no-data">원가 입력 필요</span>
        )}
      </td>
      <td>
        {result && (
          <span className="break-even">{formatWon(result.breakEvenPrice)}</span>
        )}
      </td>
      <td>
        <button
          className={`save-btn ${dirty ? 'dirty' : saved ? 'done' : 'idle'}`}
          onClick={handleSave}
          disabled={!dirty && !!saved}
        >
          {dirty ? '저장' : saved ? '✓' : '저장'}
        </button>
      </td>
    </tr>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const { settings, isConfigured, setConfigured } = useSettingsStore();
  const { products, isFetching, lastFetchedAt, setProducts, setFetching, setLastFetchedAt } = useProductStore();
  const { costs } = useProductCostStore();
  const { setSummaries } = useProductProfitStore();
  const [search, setSearch] = useState('');
  const [filterUncost, setFilterUncost] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!isConfigured) return;
    setFetching(true);
    try {
      // 쿠키 자동 전송 — URL에 API 키 없음
      const res = await fetch('/api/products?maxPerPage=50');
      if (res.status === 401) { setConfigured(false); return; }
      const data = await res.json();
      const raw = data?.data ?? [];

      const mapped: CoupangProduct[] = raw.map((p: {
        sellerProductId: number;
        sellerProductName: string;
        displayCategoryCode?: number;
        status?: string;
        items?: Array<{
          vendorItemId: number;
          itemName: string;
          originalPrice: number;
          salePrice: number;
          stockQuantity: number;
        }>;
      }) => ({
        ...p,
        categoryId: 'other',
        categoryName: '기타',
        commissionRate: 11,
        status: p.status ?? 'APPROVED',
        items: (p.items ?? []).map((item) => ({
          vendorItemId: item.vendorItemId,
          itemName: item.itemName,
          originalPrice: item.originalPrice,
          salePrice: item.salePrice,
          stockQuantity: item.stockQuantity,
        })),
      }));

      setProducts(mapped);
      setLastFetchedAt(new Date().toLocaleString('ko-KR'));
    } catch (err) {
      console.error('상품 목록 조회 실패:', err);
    } finally {
      setFetching(false);
    }
  }, [isConfigured, setConfigured, setProducts, setFetching, setLastFetchedAt]);

  // 상품별 수익 요약 계산 (원가 저장될 때마다)
  useEffect(() => {
    const summaries = products.flatMap(p =>
      p.items.map(item => {
        const id = String(item.vendorItemId);
        const cost = costs[id];
        const commissionRate = CATEGORY_FEES.find(c => c.id === p.categoryId)?.rate ?? 11;
        const result = cost && item.salePrice > 0
          ? calculateProfit(item.salePrice, cost.purchasePrice, cost.packagingCost, commissionRate, {
            ...settings,
            credentials: { accessKey: '', secretKey: '', vendorId: '' },
          })
          : null;
        return {
          vendorItemId: id,
          productName: item.itemName,
          sellingPrice: item.salePrice,
          purchasePrice: cost?.purchasePrice ?? 0,
          packagingCost: cost?.packagingCost ?? 0,
          categoryId: p.categoryId,
          commissionRate,
          soldCount: 0,
          returnCount: 0,
          netSoldCount: 0,
          profitPerUnit: result,
          totalNetProfit: 0,
          totalRevenue: 0,
          totalRefundAmount: 0,
        };
      })
    );
    setSummaries(summaries);
  }, [products, costs, settings, setSummaries]);

  const allItems = products.flatMap(p => p.items.map(item => ({ product: p, item })));
  const filtered = allItems
    .filter(({ item }) => !search || item.itemName.includes(search))
    .filter(({ item }) => !filterUncost || !costs[String(item.vendorItemId)]);

  const costFilledCount = allItems.filter(({ item }) => costs[String(item.vendorItemId)]).length;

  return (
    <div className="products-page">
      <header>
        <div className="header-left">
          <button className="back-btn" onClick={() => router.push('/dashboard')}>← 대시보드</button>
          <div>
            <h1>📋 상품 원가 관리</h1>
            <p>상품별 매입가·포장비를 입력하면 순수익이 자동 계산됩니다.</p>
          </div>
        </div>
        <div className="header-right">
          <div className="progress-wrap">
            <span>{costFilledCount} / {allItems.length} 입력 완료</span>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${allItems.length ? (costFilledCount / allItems.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <button className="fetch-btn" onClick={fetchProducts} disabled={isFetching}>
            {isFetching ? '불러오는 중...' : '🔄 상품 목록 불러오기'}
          </button>
        </div>
      </header>

      {lastFetchedAt && <p className="fetch-time">마지막 조회: {lastFetchedAt}</p>}

      {!isConfigured && (
        <div className="alert">
          ⚠️ API 키를 먼저 설정하세요. <a href="/settings">설정 바로가기</a>
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="🔍 상품명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filterUncost}
            onChange={(e) => setFilterUncost(e.target.checked)}
          />
          원가 미입력만 보기
        </label>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>📦 상품 목록을 불러오세요.</p>
          <p>상단의 "상품 목록 불러오기" 버튼을 클릭하세요.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>상품명</th>
                <th>판매가</th>
                <th>카테고리 (수수료)</th>
                <th>매입가 (원)</th>
                <th>포장재비 (원)</th>
                <th>순수익 / 마진율</th>
                <th>손익분기가</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ product, item }) => (
                <ProductRow
                  key={item.vendorItemId}
                  product={product}
                  item={item}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="no-results">검색 결과가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .products-page { max-width: 1200px; margin: 0 auto; padding: 1.5rem 1rem;
          font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; }
        header { display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .back-btn { border: 1px solid #e5e7eb; background: white; border-radius: 8px;
          padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.88rem; white-space: nowrap; }
        h1 { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.2rem; }
        header p { color: #888; font-size: 0.85rem; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
        .progress-wrap { text-align: right; font-size: 0.82rem; color: #666; }
        .progress-bar { width: 200px; height: 6px; background: #e5e7eb; border-radius: 3px; margin-top: 4px; }
        .progress-fill { height: 100%; background: #f04141; border-radius: 3px; transition: width 0.3s; }
        .fetch-btn { padding: 0.55rem 1.1rem; background: #f04141; color: white; border: none;
          border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .fetch-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .fetch-time { font-size: 0.78rem; color: #bbb; margin-bottom: 1rem; }
        .alert { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
          padding: 0.8rem 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: #92400e; }
        .alert a { color: #f04141; font-weight: 600; }
        .toolbar { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
        .search-input { flex: 1; max-width: 300px; padding: 0.5rem 0.8rem; border: 1px solid #e5e7eb;
          border-radius: 8px; font-size: 0.9rem; outline: none; }
        .search-input:focus { border-color: #f04141; }
        .filter-check { display: flex; align-items: center; gap: 0.4rem; font-size: 0.88rem;
          color: #555; cursor: pointer; }
        .table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
        thead { background: #f9fafb; }
        th { padding: 0.75rem 0.9rem; text-align: left; font-weight: 600; color: #555;
          font-size: 0.8rem; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        td { padding: 0.65rem 0.9rem; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr.dirty td { background: #fffbeb; }
        tr.saved-row td { background: #f0fdf4; }
        .product-name .name { font-weight: 500; margin-bottom: 0.2rem; }
        .product-name .sub { font-size: 0.75rem; color: #aaa; }
        .price { font-weight: 600; white-space: nowrap; }
        select { padding: 0.35rem 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;
          font-size: 0.82rem; outline: none; width: 140px; }
        input[type="number"] { width: 90px; padding: 0.35rem 0.5rem; border: 1px solid #e5e7eb;
          border-radius: 6px; font-size: 0.88rem; outline: none; }
        input[type="number"]:focus, select:focus { border-color: #f04141; }
        .result-mini { display: flex; flex-direction: column; gap: 0.1rem; }
        .result-mini .net { font-weight: 700; font-size: 0.92rem; }
        .result-mini .margin { font-size: 0.8rem; }
        .no-data { color: #ccc; font-size: 0.8rem; }
        .break-even { font-size: 0.82rem; color: #666; }
        .save-btn { padding: 0.35rem 0.75rem; border-radius: 6px; border: none;
          font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .save-btn.dirty { background: #f04141; color: white; }
        .save-btn.done { background: #dcfce7; color: #16a34a; cursor: default; }
        .save-btn.idle { background: #f3f4f6; color: #9ca3af; }
        .empty-state { text-align: center; padding: 4rem; color: #aaa; }
        .empty-state p { margin-bottom: 0.5rem; }
        .no-results { text-align: center; padding: 2rem; color: #aaa; }
      `}</style>
    </div>
  );
}
