'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore, useApiKeyStore } from '@/lib/store';

type SafeSettings = {
  shippingType: 'SELLER' | 'ROCKET_GROWTH' | 'ROCKET';
  taxType: 'GENERAL' | 'SIMPLIFIED';
  sellerShippingCost: number;
  rocketGrowthWeight: number;
  adCostType: 'ROAS' | 'FIXED';
  adRoas: number;
  adFixedCost: number;
  pollIntervalMinutes: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, isConfigured, setConfigured } = useSettingsStore();
  const { setSavedAt } = useApiKeyStore();

  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [keyError, setKeyError] = useState('');
  const [form, setForm] = useState<SafeSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    fetch('/api/auth').then(r => r.json()).then(d => {
      setConfigured(d.configured);
      if (d.vendorId) setVendorId(d.vendorId);
    });
  }, [setConfigured]);

  const handleSaveKeys = async () => {
    if (!accessKey || !secretKey || !vendorId) { setKeyError('세 항목을 모두 입력하세요.'); return; }
    setKeyStatus('saving'); setKeyError('');
    try {
      const res = await fetch('/api/auth', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, secretKey, vendorId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeyStatus('ok'); setConfigured(true);
      setSavedAt(data.savedAt ?? new Date().toISOString());
      setAccessKey(''); setSecretKey('');
      setTimeout(() => setKeyStatus('idle'), 3000);
    } catch (e) {
      setKeyStatus('error');
      setKeyError(e instanceof Error ? e.message : '저장 실패');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('API 연동을 해제하시겠습니까?')) return;
    await fetch('/api/auth', { method: 'DELETE' });
    setConfigured(false); setVendorId(''); setKeyStatus('idle');
  };

  const handleSaveSettings = () => {
    updateSettings(form); setSettingsSaved(true);
    setTimeout(() => { setSettingsSaved(false); router.push('/dashboard'); }, 900);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="page-title">설정</div>
        <div className="page-sub">API 키는 서버에만 저장되며 브라우저에 노출되지 않습니다</div>
      </div>

      <Section title="쿠팡 API 키 연동">
        <div className="guide">
          <div className="guide-steps">
            <div className="step"><span className="step-num">1</span><span>쿠팡 Wing(<a href="https://wing.coupang.com" target="_blank" rel="noreferrer">wing.coupang.com</a>) 로그인</span></div>
            <div className="step"><span className="step-num">2</span><span>우측 상단 아이디 → <strong>추가판매정보</strong></span></div>
            <div className="step"><span className="step-num">3</span><span>하단 <strong>OPEN API 키 발급</strong> → 자체개발 → 발급</span></div>
            <div className="step"><span className="step-num">4</span><span>업체코드 / Access Key / Secret Key 복사 후 아래 입력</span></div>
          </div>
          <div className="guide-warn">⚠ API 키 유효기간 <strong>180일</strong> — 만료 전 재발급 필요</div>
        </div>

        {isConfigured && (
          <div className="connected-badge">
            <span className="badge-dot" />
            <span>연동됨{vendorId ? ` · ${vendorId}` : ''}</span>
          </div>
        )}

        <div className="key-fields">
          <div className="field-row">
            <label>Vendor ID</label>
            <input type="text" placeholder="A00012345" value={vendorId}
              onChange={e => setVendorId(e.target.value)} />
          </div>
          <div className="field-row">
            <label>Access Key</label>
            <input type="text" placeholder="발급받은 Access Key" value={accessKey}
              onChange={e => setAccessKey(e.target.value)} autoComplete="off" />
          </div>
          <div className="field-row">
            <label>Secret Key</label>
            <input type="password" placeholder="발급받은 Secret Key" value={secretKey}
              onChange={e => setSecretKey(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        {keyError && <div className="error-msg">❌ {keyError}</div>}
        <div className="key-actions">
          <button className={`connect-btn ${keyStatus}`} onClick={handleSaveKeys} disabled={keyStatus === 'saving'}>
            {keyStatus === 'saving' ? '검증 중...' : keyStatus === 'ok' ? '✅ 연동 완료' : isConfigured ? '키 업데이트' : '연동하기'}
          </button>
          {isConfigured && <button className="disconnect-btn" onClick={handleDisconnect}>연동 해제</button>}
        </div>
      </Section>

      <Section title="배송 방식">
        <div className="chip-group">
          {(['SELLER', 'ROCKET_GROWTH', 'ROCKET'] as const).map((v) => (
            <button key={v} className={`chip ${form.shippingType === v ? 'active' : ''}`}
              onClick={() => setForm({...form, shippingType: v})}>
              {v === 'SELLER' ? '판매자 배송' : v === 'ROCKET_GROWTH' ? '로켓그로스' : '로켓배송 (위탁)'}
            </button>
          ))}
        </div>
        {form.shippingType === 'SELLER' && (
          <div className="field-row mt">
            <label>건당 배송비</label>
            <div className="input-unit">
              <input type="number" value={form.sellerShippingCost}
                onChange={e => setForm({...form, sellerShippingCost: Number(e.target.value)})} />
              <span>원</span>
            </div>
          </div>
        )}
        {form.shippingType === 'ROCKET_GROWTH' && (
          <div className="field-row mt">
            <label>평균 무게</label>
            <div className="input-unit">
              <input type="number" step="0.1" value={form.rocketGrowthWeight}
                onChange={e => setForm({...form, rocketGrowthWeight: Number(e.target.value)})} />
              <span>kg</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="광고비">
        <div className="chip-group">
          {(['ROAS', 'FIXED'] as const).map((v) => (
            <button key={v} className={`chip ${form.adCostType === v ? 'active' : ''}`}
              onClick={() => setForm({...form, adCostType: v})}>
              {v === 'ROAS' ? 'ROAS 입력' : '건당 직접 입력'}
            </button>
          ))}
        </div>
        <div className="field-row mt">
          {form.adCostType === 'ROAS' ? (
            <><label>ROAS</label>
            <input type="number" value={form.adRoas}
              onChange={e => setForm({...form, adRoas: Number(e.target.value)})} /></>
          ) : (
            <><label>건당 광고비</label>
            <div className="input-unit">
              <input type="number" value={form.adFixedCost}
                onChange={e => setForm({...form, adFixedCost: Number(e.target.value)})} />
              <span>원</span>
            </div></>
          )}
        </div>
      </Section>

      <Section title="세금">
        <div className="chip-group">
          {(['GENERAL', 'SIMPLIFIED'] as const).map((v) => (
            <button key={v} className={`chip ${form.taxType === v ? 'active' : ''}`}
              onClick={() => setForm({...form, taxType: v})}>
              {v === 'GENERAL' ? '일반과세자' : '간이과세자'}
            </button>
          ))}
        </div>
      </Section>

      <Section title="환불 자동 갱신 주기">
        <div className="field-row">
          <label>갱신 주기</label>
          <div className="input-unit">
            <input type="number" min={1} max={60} value={form.pollIntervalMinutes}
              onChange={e => setForm({...form, pollIntervalMinutes: Number(e.target.value)})} />
            <span>분</span>
          </div>
        </div>
      </Section>

      <button className={`save-btn ${settingsSaved ? 'saved' : ''}`} onClick={handleSaveSettings}>
        {settingsSaved ? '✓ 저장됨' : '설정 저장'}
      </button>

      <style jsx>{`
        .settings-page { max-width: 680px; margin: 0 auto; padding: 1.5rem 1.5rem; }
        .page-header { margin-bottom: 2rem; }
        .page-title { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.3rem; }
        .page-sub { font-size: 0.82rem; color: var(--text-muted); }

        .section { background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 1.4rem; margin-bottom: 1rem; }
        .section-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--text-faint); margin-bottom: 1.1rem; }

        .guide { background: var(--bg2); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
        .guide-steps { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.8rem; }
        .step { display: flex; align-items: baseline; gap: 0.6rem; font-size: 0.84rem; color: var(--text-muted); }
        .step-num { width: 18px; height: 18px; border-radius: 50%; background: var(--border2);
          color: var(--text-faint); font-size: 0.7rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step a { color: var(--accent); }
        .step strong { color: var(--text); }
        .guide-warn { font-size: 0.78rem; color: var(--yellow); }

        .connected-badge { display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 0.8rem; background: rgba(0,229,160,0.07);
          border: 1px solid rgba(0,229,160,0.15); border-radius: 8px;
          font-size: 0.82rem; color: var(--accent); margin-bottom: 1rem; font-weight: 600; }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
          box-shadow: 0 0 6px var(--accent); }

        .key-fields { display: flex; flex-direction: column; gap: 0.7rem; margin-bottom: 1rem; }
        .field-row { display: flex; align-items: center; gap: 1rem; }
        .field-row label { font-size: 0.8rem; color: var(--text-muted); font-weight: 600;
          min-width: 90px; flex-shrink: 0; }
        .field-row input { flex: 1; padding: 0.55rem 0.8rem; border-radius: 8px; font-size: 0.9rem; }
        .field-row.mt { margin-top: 0.8rem; }
        .input-unit { display: flex; align-items: center; gap: 0.4rem; flex: 1; }
        .input-unit input { flex: 1; padding: 0.55rem 0.8rem; border-radius: 8px; font-size: 0.9rem; }
        .input-unit span { font-size: 0.8rem; color: var(--text-faint); white-space: nowrap; }

        .error-msg { color: var(--red); font-size: 0.82rem; margin-bottom: 0.8rem; }

        .key-actions { display: flex; gap: 0.6rem; }
        .connect-btn { flex: 1; padding: 0.65rem; border: none; border-radius: 9px;
          font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .connect-btn.idle, .connect-btn.error { background: var(--accent); color: #000; }
        .connect-btn.saving { background: var(--border2); color: var(--text-muted); cursor: not-allowed; }
        .connect-btn.ok { background: rgba(0,229,160,0.15); color: var(--accent);
          border: 1px solid rgba(0,229,160,0.3); }
        .disconnect-btn { padding: 0.65rem 1rem; border: 1px solid var(--border2);
          background: transparent; border-radius: 9px; font-size: 0.85rem;
          color: var(--text-muted); cursor: pointer; }
        .disconnect-btn:hover { border-color: var(--red); color: var(--red); }

        .chip-group { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .chip { padding: 0.4rem 0.9rem; border: 1px solid var(--border2); border-radius: 20px;
          background: transparent; font-size: 0.84rem; cursor: pointer;
          color: var(--text-muted); transition: all 0.15s; }
        .chip:hover { border-color: var(--accent); color: var(--accent); }
        .chip.active { background: var(--active-bg); border-color: var(--accent);
          color: var(--accent); font-weight: 700; }

        .save-btn { width: 100%; padding: 0.9rem; background: var(--accent); color: #000;
          border: none; border-radius: 10px; font-size: 0.95rem; font-weight: 800;
          cursor: pointer; margin-top: 0.5rem; letter-spacing: 0.02em; transition: all 0.2s; }
        .save-btn:hover { opacity: 0.9; }
        .save-btn.saved { background: var(--surface2); color: var(--accent);
          border: 1px solid rgba(0,229,160,0.3); }
      `}</style>
    </div>
  );
}