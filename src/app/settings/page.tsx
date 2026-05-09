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

  // API 키 입력 (state에만 존재, localStorage 저장 안 함)
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [keyError, setKeyError] = useState('');

  const [form, setForm] = useState<SafeSettings>(settings);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // 페이지 진입 시 현재 연동 상태 확인
  useEffect(() => {
    fetch('/api/auth')
      .then(r => r.json())
      .then(d => {
        setConfigured(d.configured);
        if (d.vendorId) setVendorId(d.vendorId); // vendorId는 식별용으로만 표시
      });
  }, [setConfigured]);

  // API 키 저장 (서버로 POST → httpOnly 쿠키 저장)
  const handleSaveKeys = async () => {
    if (!accessKey || !secretKey || !vendorId) {
      setKeyError('세 항목을 모두 입력하세요.');
      return;
    }
    setKeyStatus('saving');
    setKeyError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey, secretKey, vendorId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeyStatus('ok');
      setConfigured(true);
      setSavedAt(data.savedAt ?? new Date().toISOString());
      setAccessKey('');
      setSecretKey('');
      setTimeout(() => setKeyStatus('idle'), 3000);
    } catch (e) {
      setKeyStatus('error');
      setKeyError(e instanceof Error ? e.message : '저장 실패');
    }
  };

  // 연동 해제
  const handleDisconnect = async () => {
    if (!confirm('API 연동을 해제하시겠습니까?')) return;
    await fetch('/api/auth', { method: 'DELETE' });
    setConfigured(false);
    setVendorId('');
    setKeyStatus('idle');
  };

  // 일반 설정 저장
  const handleSaveSettings = () => {
    updateSettings(form);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      router.push('/dashboard');
    }, 900);
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="field">
      <label>{label}</label>
      {node}
    </div>
  );

  return (
    <div className="settings-page">
      <header>
        <button className="back-btn" onClick={() => router.push('/dashboard')}>← 대시보드</button>
        <div>
          <h1>⚙️ 설정</h1>
          <p>API 키는 서버에만 저장되며 브라우저에 노출되지 않습니다.</p>
        </div>
      </header>

      {/* ── API 키 섹션 ── */}
      <section className="card">
        <div className="card-header">
          <h2>🔑 쿠팡 API 키 연동</h2>
          {isConfigured && (
            <span className="badge connected">● 연동됨{vendorId ? ` (${vendorId})` : ''}</span>
          )}
        </div>

        <div className="guide-box">
          <strong>API 키 발급 방법</strong>
          <ol>
            <li>쿠팡 Wing(<a href="https://wing.coupang.com" target="_blank" rel="noreferrer">wing.coupang.com</a>) 로그인</li>
            <li>우측 상단 아이디 클릭 → <strong>추가판매정보</strong></li>
            <li>하단 <strong>OPEN API 키 발급</strong> → 자체개발 선택 → 발급</li>
            <li>업체코드 / Access Key / Secret Key 복사 후 아래에 입력</li>
          </ol>
          <p className="warn">⚠️ API 키 유효기간은 <strong>180일</strong>입니다. 만료 전 재발급이 필요합니다.</p>
        </div>

        {isConfigured ? (
          <div className="connected-state">
            <p>✅ API 키가 정상 연동되어 있습니다.</p>
            <p className="sub">키를 변경하려면 아래에 새 키를 입력하고 저장하세요.</p>
          </div>
        ) : null}

        <div className="key-inputs">
          {field('Vendor ID (업체코드)', (
            <input type="text" placeholder="A00012345"
              value={vendorId} onChange={e => setVendorId(e.target.value)} />
          ))}
          {field('Access Key', (
            <input type="text" placeholder="발급받은 Access Key"
              value={accessKey} onChange={e => setAccessKey(e.target.value)}
              autoComplete="off" />
          ))}
          {field('Secret Key', (
            <input type="password" placeholder="발급받은 Secret Key"
              value={secretKey} onChange={e => setSecretKey(e.target.value)}
              autoComplete="new-password" />
          ))}
        </div>

        {keyError && <p className="error-msg">❌ {keyError}</p>}

        <div className="key-actions">
          <button
            className={`save-key-btn ${keyStatus}`}
            onClick={handleSaveKeys}
            disabled={keyStatus === 'saving'}
          >
            {keyStatus === 'saving' && '검증 중...'}
            {keyStatus === 'ok' && '✅ 연동 완료'}
            {keyStatus === 'error' && '다시 시도'}
            {keyStatus === 'idle' && (isConfigured ? '키 업데이트' : '연동하기')}
          </button>
          {isConfigured && (
            <button className="disconnect-btn" onClick={handleDisconnect}>연동 해제</button>
          )}
        </div>
      </section>

      {/* ── 배송 방식 ── */}
      <section className="card">
        <h2>🚚 배송 방식</h2>
        <div className="radio-group">
          {(['SELLER', 'ROCKET_GROWTH', 'ROCKET'] as const).map(type => (
            <label key={type} className={`radio-card ${form.shippingType === type ? 'active' : ''}`}>
              <input type="radio" checked={form.shippingType === type}
                onChange={() => setForm({ ...form, shippingType: type })} />
              {type === 'SELLER' && '📦 판매자 배송'}
              {type === 'ROCKET_GROWTH' && '🚀 로켓그로스'}
              {type === 'ROCKET' && '⚡ 로켓배송 (위탁)'}
            </label>
          ))}
        </div>
        {form.shippingType === 'SELLER' && field('건당 배송비 (원)', (
          <input type="number" value={form.sellerShippingCost}
            onChange={e => setForm({ ...form, sellerShippingCost: Number(e.target.value) })} />
        ))}
        {form.shippingType === 'ROCKET_GROWTH' && field('상품 평균 무게 (kg)', (
          <input type="number" step="0.1" value={form.rocketGrowthWeight}
            onChange={e => setForm({ ...form, rocketGrowthWeight: Number(e.target.value) })} />
        ))}
      </section>

      {/* ── 광고비 ── */}
      <section className="card">
        <h2>📢 광고비</h2>
        <div className="radio-group">
          {(['ROAS', 'FIXED'] as const).map(type => (
            <label key={type} className={`radio-card ${form.adCostType === type ? 'active' : ''}`}>
              <input type="radio" checked={form.adCostType === type}
                onChange={() => setForm({ ...form, adCostType: type })} />
              {type === 'ROAS' ? 'ROAS 입력' : '건당 광고비 직접 입력'}
            </label>
          ))}
        </div>
        {form.adCostType === 'ROAS'
          ? field('ROAS', <input type="number" value={form.adRoas}
              onChange={e => setForm({ ...form, adRoas: Number(e.target.value) })} />)
          : field('건당 광고비 (원)', <input type="number" value={form.adFixedCost}
              onChange={e => setForm({ ...form, adFixedCost: Number(e.target.value) })} />)
        }
      </section>

      {/* ── 세금 ── */}
      <section className="card">
        <h2>🧾 세금</h2>
        <div className="radio-group">
          {(['GENERAL', 'SIMPLIFIED'] as const).map(type => (
            <label key={type} className={`radio-card ${form.taxType === type ? 'active' : ''}`}>
              <input type="radio" checked={form.taxType === type}
                onChange={() => setForm({ ...form, taxType: type })} />
              {type === 'GENERAL' ? '일반과세자' : '간이과세자'}
            </label>
          ))}
        </div>
      </section>

      {/* ── 환불 폴링 ── */}
      <section className="card">
        <h2>🔄 환불 자동 갱신 주기</h2>
        {field('분마다 자동 갱신', (
          <input type="number" min={1} max={60} value={form.pollIntervalMinutes}
            onChange={e => setForm({ ...form, pollIntervalMinutes: Number(e.target.value) })} />
        ))}
      </section>

      <button className={`save-btn ${settingsSaved ? 'saved' : ''}`} onClick={handleSaveSettings}>
        {settingsSaved ? '✅ 저장됨' : '설정 저장하기'}
      </button>

      <style jsx>{`
        .settings-page { max-width: 640px; margin: 0 auto; padding: 1.5rem 1rem;
          font-family: 'Pretendard', 'Apple SD Gothic Neo', sans-serif; }
        header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .back-btn { border: 1px solid #e5e7eb; background: white; border-radius: 8px;
          padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.88rem; white-space: nowrap; }
        h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.2rem; }
        header p { color: #888; font-size: 0.82rem; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px;
          padding: 1.4rem; margin-bottom: 1rem; }
        .card-header { display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1rem; }
        .card-header h2 { margin-bottom: 0; }
        h2 { font-size: 0.98rem; font-weight: 700; margin-bottom: 1rem; }
        .badge.connected { font-size: 0.78rem; background: #dcfce7; color: #16a34a;
          padding: 0.25rem 0.6rem; border-radius: 20px; font-weight: 600; }
        .guide-box { background: #f8f9fb; border-radius: 8px; padding: 1rem;
          margin-bottom: 1rem; font-size: 0.85rem; line-height: 1.7; }
        .guide-box strong { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; }
        .guide-box ol { padding-left: 1.2rem; }
        .guide-box a { color: #f04141; }
        .warn { margin-top: 0.6rem; color: #d97706; font-size: 0.82rem; }
        .connected-state { background: #f0fdf4; border-radius: 8px; padding: 0.8rem 1rem;
          margin-bottom: 1rem; font-size: 0.88rem; color: #166534; }
        .connected-state .sub { color: #888; margin-top: 0.2rem; font-size: 0.82rem; }
        .key-inputs { display: flex; flex-direction: column; gap: 0.7rem; margin-bottom: 0.8rem; }
        .field { display: flex; flex-direction: column; gap: 0.3rem; }
        .field label { font-size: 0.82rem; color: #555; font-weight: 500; }
        .field input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
          border-radius: 8px; font-size: 0.92rem; outline: none; }
        .field input:focus { border-color: #f04141; box-shadow: 0 0 0 2px rgba(240,65,65,0.12); }
        .error-msg { color: #dc2626; font-size: 0.85rem; margin-bottom: 0.6rem; }
        .key-actions { display: flex; gap: 0.6rem; }
        .save-key-btn { flex: 1; padding: 0.65rem; border: none; border-radius: 8px;
          font-size: 0.92rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .save-key-btn.idle, .save-key-btn.error { background: #f04141; color: white; }
        .save-key-btn.saving { background: #9ca3af; color: white; cursor: not-allowed; }
        .save-key-btn.ok { background: #22c55e; color: white; }
        .disconnect-btn { padding: 0.65rem 1rem; border: 1px solid #e5e7eb; background: white;
          border-radius: 8px; font-size: 0.88rem; color: #666; cursor: pointer; }
        .radio-group { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
        .radio-card { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.9rem;
          border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 0.88rem;
          transition: all 0.15s; }
        .radio-card.active { border-color: #f04141; background: #fff5f5;
          color: #f04141; font-weight: 600; }
        .radio-card input { display: none; }
        .save-btn { width: 100%; padding: 0.9rem; background: #1a1a1a; color: white;
          border: none; border-radius: 10px; font-size: 1rem; font-weight: 600;
          cursor: pointer; margin-top: 0.5rem; transition: background 0.2s; }
        .save-btn:hover { background: #333; }
        .save-btn.saved { background: #22c55e; }
      `}</style>
    </div>
  );
}
