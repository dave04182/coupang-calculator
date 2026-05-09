import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ProductCost, DashboardSummary, CoupangProduct, ProductProfitSummary, PeriodSummary } from '@/types';

// ─── 기본 설정값 (credentials 제외 — httpOnly 쿠키로 관리) ───
type SafeSettings = Omit<AppSettings, 'credentials'>;

const DEFAULT_SETTINGS: SafeSettings = {
  shippingType: 'SELLER',
  taxType: 'GENERAL',
  sellerShippingCost: 3000,
  rocketGrowthWeight: 1,
  adCostType: 'ROAS',
  adRoas: 300,
  adFixedCost: 0,
  pollIntervalMinutes: 5,
};

// ─── 설정 스토어 (localStorage 영구 저장 — 민감 정보 제외) ──
interface SettingsStore {
  settings: SafeSettings;
  // API 연동 상태 (서버에서 확인, 쿠키 직접 접근 없음)
  isConfigured: boolean;
  setConfigured: (v: boolean) => void;
  updateSettings: (partial: Partial<SafeSettings>) => void;
  // 편의용: API 호출 시 필요한 settings 조합 반환
  getAppSettings: () => AppSettings;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isConfigured: false,
      setConfigured: (isConfigured) => set({ isConfigured }),
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
      getAppSettings: (): AppSettings => ({
        ...get().settings,
        credentials: { accessKey: '', secretKey: '', vendorId: '' }, // 실제 값은 서버 쿠키에만 존재
      }),
    }),
    {
      name: 'coupang-calculator-settings',
      // credentials는 절대 localStorage에 저장하지 않음
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// ─── 상품 원가 스토어 (localStorage 영구 저장) ───────────────
interface ProductCostStore {
  costs: Record<string, ProductCost>;
  setCost: (vendorItemId: string, cost: Omit<ProductCost, 'vendorItemId' | 'updatedAt'>) => void;
  getCost: (vendorItemId: string) => ProductCost | undefined;
}

export const useProductCostStore = create<ProductCostStore>()(
  persist(
    (set, get) => ({
      costs: {},
      setCost: (vendorItemId, cost) =>
        set((state) => ({
          costs: {
            ...state.costs,
            [vendorItemId]: {
              ...cost,
              vendorItemId,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
      getCost: (vendorItemId) => get().costs[vendorItemId],
    }),
    { name: 'coupang-calculator-costs' }
  )
);

// ─── 대시보드 스토어 (실시간, 비영구) ───────────────────────
interface DashboardStore {
  summary: DashboardSummary | null;
  isLoading: boolean;
  lastPolledAt: string | null;
  setSummary: (summary: DashboardSummary) => void;
  setLoading: (loading: boolean) => void;
  setLastPolledAt: (time: string) => void;
}

export const useDashboardStore = create<DashboardStore>()((set) => ({
  summary: null,
  isLoading: false,
  lastPolledAt: null,
  setSummary: (summary) => set({ summary }),
  setLoading: (isLoading) => set({ isLoading }),
  setLastPolledAt: (lastPolledAt) => set({ lastPolledAt }),
}));

// ─── 상품 목록 스토어 ────────────────────────────────────────
interface ProductStore {
  products: CoupangProduct[];
  isFetching: boolean;
  lastFetchedAt: string | null;
  setProducts: (products: CoupangProduct[]) => void;
  setFetching: (v: boolean) => void;
  setLastFetchedAt: (t: string) => void;
}

export const useProductStore = create<ProductStore>()((set) => ({
  products: [],
  isFetching: false,
  lastFetchedAt: null,
  setProducts: (products) => set({ products }),
  setFetching: (isFetching) => set({ isFetching }),
  setLastFetchedAt: (lastFetchedAt) => set({ lastFetchedAt }),
}));

// ─── 상품별 수익 요약 스토어 (비영구) ────────────────────────
interface ProductProfitStore {
  summaries: ProductProfitSummary[];
  setSummaries: (summaries: ProductProfitSummary[]) => void;
}

export const useProductProfitStore = create<ProductProfitStore>()((set) => ({
  summaries: [],
  setSummaries: (summaries) => set({ summaries }),
}));

// ─── API 키 만료 스토어 (localStorage 영구 저장) ─────────────
interface ApiKeyStore {
  savedAt: string | null;       // 키 저장 시각 ISO
  setSavedAt: (t: string) => void;
  getDaysLeft: () => number | null;
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set, get) => ({
      savedAt: null,
      setSavedAt: (savedAt) => set({ savedAt }),
      getDaysLeft: () => {
        const { savedAt } = get();
        if (!savedAt) return null;
        const elapsed = (Date.now() - new Date(savedAt).getTime()) / 86400000;
        return Math.max(0, Math.floor(180 - elapsed));
      },
    }),
    { name: 'coupang-api-key-meta' }
  )
);

// ─── 기간 수익 스토어 (비영구) ───────────────────────────────

interface PeriodStore {
  periodSummary: PeriodSummary | null;
  isLoadingPeriod: boolean;
  setPeriodSummary: (s: PeriodSummary) => void;
  setLoadingPeriod: (v: boolean) => void;
}

export const usePeriodStore = create<PeriodStore>()((set) => ({
  periodSummary: null,
  isLoadingPeriod: false,
  setPeriodSummary: (periodSummary) => set({ periodSummary }),
  setLoadingPeriod: (isLoadingPeriod) => set({ isLoadingPeriod }),
}));
