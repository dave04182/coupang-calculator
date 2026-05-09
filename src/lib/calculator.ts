import type { CategoryFee, ProfitResult, AppSettings } from '@/types';

// ─── 카테고리별 쿠팡 수수료율 ────────────────────────────────
export const CATEGORY_FEES: CategoryFee[] = [
  { id: 'electronics',    name: '전자제품',     rate: 11 },
  { id: 'fashion',        name: '패션/의류',    rate: 13 },
  { id: 'beauty',         name: '뷰티/화장품',  rate: 12 },
  { id: 'food',           name: '식품',         rate: 10 },
  { id: 'sports',         name: '스포츠/레저',  rate: 12 },
  { id: 'home',           name: '홈/리빙',      rate: 11 },
  { id: 'books',          name: '도서',         rate: 10 },
  { id: 'baby',           name: '유아/완구',    rate: 12 },
  { id: 'pets',           name: '반려동물',     rate: 11 },
  { id: 'automotive',     name: '자동차용품',   rate: 11 },
  { id: 'health',         name: '건강/의료',    rate: 12 },
  { id: 'furniture',      name: '가구/침구',    rate: 11 },
  { id: 'other',          name: '기타',         rate: 11 },
];

// ─── 로켓그로스 풀필먼트 요금 (무게 구간별, 원) ──────────────
export function getRocketGrowthFee(weightKg: number): number {
  if (weightKg <= 0.5)  return 800;
  if (weightKg <= 1)    return 1000;
  if (weightKg <= 2)    return 1300;
  if (weightKg <= 5)    return 1800;
  if (weightKg <= 10)   return 2500;
  if (weightKg <= 20)   return 3500;
  return 5000;
}

// ─── 핵심 순수익 계산 로직 ───────────────────────────────────
export function calculateProfit(
  sellingPrice: number,
  purchasePrice: number,
  packagingCost: number,
  commissionRate: number,     // % (숫자만, e.g. 11)
  settings: AppSettings
): ProfitResult {
  // 1. 쿠팡 수수료
  const coupangFee = sellingPrice * (commissionRate / 100);

  // 2. 배송비
  let shippingCost = 0;
  let fulfillmentCost = 0;
  if (settings.shippingType === 'SELLER') {
    shippingCost = settings.sellerShippingCost;
  } else if (settings.shippingType === 'ROCKET_GROWTH') {
    fulfillmentCost = getRocketGrowthFee(settings.rocketGrowthWeight);
  }
  // ROCKET(위탁)은 쿠팡이 처리 → 판매자 배송비 0

  // 3. 광고비
  let adCost = 0;
  if (settings.adCostType === 'ROAS' && settings.adRoas > 0) {
    // ROAS = 매출 / 광고비 → 광고비 = 매출 / ROAS
    adCost = sellingPrice / settings.adRoas;
  } else if (settings.adCostType === 'FIXED') {
    adCost = settings.adFixedCost;
  }

  // 4. 부가세 환급 (일반과세자만)
  // 매입 부가세 환급분 = 원가의 10% / 1.1
  let vatRefund = 0;
  if (settings.taxType === 'GENERAL') {
    vatRefund = (purchasePrice / 11); // 원가에 포함된 부가세 환급
  }

  // 5. 상품 원가
  const productCost = purchasePrice + packagingCost;

  // 6. 순수익
  const netProfit =
    sellingPrice
    - coupangFee
    - shippingCost
    - fulfillmentCost
    - adCost
    + vatRefund
    - productCost;

  // 7. 마진율
  const marginRate = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  // 8. ROI
  const roi = productCost > 0 ? (netProfit / productCost) * 100 : 0;

  // 9. 손익분기 판매가
  // netProfit = 0 이 되는 sellingPrice 역산
  // sellingPrice - sellingPrice*(rate/100) - shipping - fulfillment - sellingPrice/ROAS + vatRefund - cost = 0
  const feeRatio = commissionRate / 100;
  const roasRatio = (settings.adCostType === 'ROAS' && settings.adRoas > 0)
    ? 1 / settings.adRoas
    : 0;
  const fixedCosts = shippingCost + fulfillmentCost + (settings.adCostType === 'FIXED' ? adCost : 0) + productCost;
  const variableRatio = feeRatio + roasRatio;
  // breakEven * (1 - variableRatio) = fixedCosts - vatRefundAtBreakEven
  // vatRefund at breakEven ≈ vatRefund (원가 기반이므로 고정)
  const breakEvenPrice = variableRatio < 1
    ? (fixedCosts - vatRefund) / (1 - variableRatio)
    : 0;

  return {
    sellingPrice,
    coupangFee: Math.round(coupangFee),
    shippingCost: Math.round(shippingCost),
    fulfillmentCost: Math.round(fulfillmentCost),
    adCost: Math.round(adCost),
    vatRefund: Math.round(vatRefund),
    productCost: Math.round(productCost),
    netProfit: Math.round(netProfit),
    marginRate: Math.round(marginRate * 10) / 10,
    breakEvenPrice: Math.round(breakEvenPrice),
    roi: Math.round(roi * 10) / 10,
  };
}

// ─── 숫자 포맷 유틸 ──────────────────────────────────────────
export const formatWon = (n: number) =>
  new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat('ko-KR').format(n);
