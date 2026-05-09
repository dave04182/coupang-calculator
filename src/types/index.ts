// ─── 쿠팡 API 타입 ───────────────────────────────────────────

export interface CoupangCredentials {
  accessKey: string;
  secretKey: string;
  vendorId: string;
}

export interface CoupangOrder {
  orderId: string;
  orderDate: string;
  status: string;
  items: CoupangOrderItem[];
}

export interface CoupangOrderItem {
  vendorItemId: string;
  productName: string;
  sellingPrice: number;
  quantity: number;
  commissionRate: number;
  shippingCost: number;
}

export interface CoupangReturn {
  cancelId: string;
  orderId: string;
  cancelDate: string;
  cancelType: 'RETURN' | 'CANCEL' | 'EXCHANGE';
  items: CoupangReturnItem[];
}

export interface CoupangReturnItem {
  vendorItemId: string;
  productName: string;
  sellingPrice: number;
  quantity: number;
}

// ─── 상품 원가 (사용자 입력) ─────────────────────────────────

export interface ProductCost {
  vendorItemId: string;
  productName: string;
  purchasePrice: number;    // 매입가
  packagingCost: number;    // 포장재비
  updatedAt: string;
}

// ─── 계산 설정 ───────────────────────────────────────────────

export type ShippingType = 'SELLER' | 'ROCKET_GROWTH' | 'ROCKET';
export type TaxType = 'GENERAL' | 'SIMPLIFIED';

export interface AppSettings {
  credentials: CoupangCredentials;
  shippingType: ShippingType;
  taxType: TaxType;
  sellerShippingCost: number;       // 판매자 배송 시 건당 비용
  rocketGrowthWeight: number;       // 로켓그로스 상품 평균 무게 (kg)
  adCostType: 'ROAS' | 'FIXED';
  adRoas: number;                   // ROAS 입력 시
  adFixedCost: number;              // 건당 광고비 직접 입력 시
  pollIntervalMinutes: number;      // 환불 폴링 주기 (분)
}

// ─── 계산 결과 ───────────────────────────────────────────────

export interface ProfitResult {
  sellingPrice: number;
  coupangFee: number;           // 쿠팡 수수료
  shippingCost: number;         // 배송비
  fulfillmentCost: number;      // 로켓그로스 풀필먼트비
  adCost: number;               // 광고비
  vatRefund: number;            // 부가세 환급
  productCost: number;          // 원가 + 포장비
  netProfit: number;            // 순수익
  marginRate: number;           // 마진율 (%)
  breakEvenPrice: number;       // 손익분기 판매가
  roi: number;                  // ROI (%)
}

export interface DashboardSummary {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalOrders: number;
  totalReturnCount: number;
  returnRate: number;
  totalNetProfit: number;
  averageMarginRate: number;
  lastUpdated: string;
  newReturnsDetected: number;   // 마지막 폴링 이후 새 환불 수
}

// ─── 카테고리 수수료 ─────────────────────────────────────────

export interface CategoryFee {
  id: string;
  name: string;
  rate: number; // %
}

// ─── 쿠팡 상품 목록 ──────────────────────────────────────────

export interface CoupangProduct {
  sellerProductId: number;
  sellerProductName: string;
  displayCategoryCode: number;
  categoryId: string;        // 내부 카테고리 매핑 후
  categoryName: string;
  commissionRate: number;
  status: 'APPROVED' | 'SUSPENDED' | 'WAITING';
  items: CoupangProductItem[];
}

export interface CoupangProductItem {
  vendorItemId: number;
  itemName: string;
  originalPrice: number;   // 정가
  salePrice: number;       // 판매가
  stockQuantity: number;
}

// ─── 상품별 수익 요약 ─────────────────────────────────────────

export interface ProductProfitSummary {
  vendorItemId: string;
  productName: string;
  sellingPrice: number;
  purchasePrice: number;
  packagingCost: number;
  categoryId: string;
  commissionRate: number;
  soldCount: number;
  returnCount: number;
  netSoldCount: number;      // soldCount - returnCount
  profitPerUnit: ProfitResult | null;
  totalNetProfit: number;
  totalRevenue: number;
  totalRefundAmount: number;
}

// ─── 정산 내역 ───────────────────────────────────────────────

export interface SettlementItem {
  orderId: string;
  orderDate: string;
  productName: string;
  sellingPrice: number;
  coupangFee: number;
  shippingFee: number;
  settlementAmount: number;  // 실 정산액
}

// ─── 기간별 수익 집계 ─────────────────────────────────────────

export interface DailyProfitData {
  date: string;           // YYYY-MM-DD
  revenue: number;        // 매출
  refunds: number;        // 환불액
  netRevenue: number;     // 실매출
  orderCount: number;
  returnCount: number;
  estimatedProfit: number; // 순수익 추정 (원가 입력된 상품 기준)
}

export interface PeriodSummary {
  period: '1d' | '7d' | '30d' | 'custom';
  from: string;
  to: string;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  estimatedTotalProfit: number;
  dailyData: DailyProfitData[];
}

// ─── API 키 만료 정보 ────────────────────────────────────────

export interface ApiKeyStatus {
  configured: boolean;
  vendorId: string | null;
  expiresAt: string | null;  // ISO date
  daysLeft: number | null;
}
