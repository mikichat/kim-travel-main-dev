// 일정표 업로드 — Legacy upload.html 마이그레이션

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function UploadPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<{ group_name: string; saved: number; landing_url: string } | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !file) return;

    const allowed = ['.xlsx', '.xls', '.pdf', '.doc', '.docx', '.hwp'];
    if (!allowed.some(ext => file.name.toLowerCase().endsWith(ext))) {
      alert('지원하는 파일 형식: Excel, PDF, Word, HWP');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('schedule_file', file);
      formData.append('group_name', groupName);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();

      if (res.ok) {
        const landingUrl = `${window.location.origin}/landing?group=${encodeURIComponent(result.group_name)}`;
        setSuccess({ group_name: result.group_name, saved: result.saved, landing_url: landingUrl });
      } else {
        alert(`업로드 실패: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (err: any) {
      alert(`업로드 중 오류: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📤</div>
          <h2 className="text-3xl font-bold text-gray-800">일정표 업로드</h2>
          <p className="text-gray-600 mt-2">여행 일정표 파일을 업로드하세요</p>
        </div>

        {/* 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>지원 형식:</strong> Excel (.xlsx, .xls), PDF (.pdf), Word (.doc, .docx), HWP (.hwp)
          </p>
        </div>

        {success ? (
          /* 성공 메시지 */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-green-800 font-semibold text-lg">업로드 성공!</p>
                  <p className="text-green-700 text-sm mt-1">데이터가 성공적으로 저장되었습니다.</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">그룹명</p>
              <p className="font-semibold text-gray-800 mb-3">{success.group_name}</p>
              <p className="text-sm text-gray-600 mb-1">저장된 일정</p>
              <p className="font-semibold text-gray-800">{success.saved}개</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-800 font-semibold mb-2">🌐 랜딩 페이지 URL</p>
              <div className="flex gap-2">
                <input type="text" value={success.landing_url} readOnly className="flex-1 px-3 py-2 bg-white border border-indigo-300 rounded text-sm" />
                <button onClick={() => navigator.clipboard.writeText(success.landing_url)} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">복사</button>
              </div>
              <p className="text-xs text-indigo-600 mt-2">이 링크를 고객에게 전달하세요</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => window.open(success.landing_url, '_blank')} className="flex-1 bg-indigo-600 text-white font-semibold py-2 px-4 rounded hover:bg-indigo-700">🌐 랜딩 페이지 보기</button>
              <button onClick={() => router.push('/schedules')} className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded hover:bg-gray-700">📅 일정 관리</button>
            </div>
          </div>
        ) : (
          /* 업로드 폼 */
          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">🚌 그룹명 *</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="예: 하노이 골프단, 제주 워크샵"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📄 일정표 파일 *</label>
              <input
                type="file"
                accept=".xlsx,.xls,.pdf,.doc,.docx,.hwp"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p className="text-xs text-gray-500 mt-2">PDF, Word, HWP 파일은 텍스트로 변환되어 분석됩니다</p>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50 shadow-lg hover:scale-105 transition"
              >
                {uploading ? '업로드 중...' : '☁️ 업로드 및 데이터 추출'}
              </button>
              <button type="button" onClick={() => router.push('/select-group')} className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold py-3 px-6 rounded-lg border border-purple-300 transition">
                👥 그룹별 일정 보기
              </button>
              <button type="button" onClick={() => router.push('/schedules')} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition">
                📅 일정 관리 페이지
              </button>
              <button type="button" onClick={() => router.push('/')} className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition">
                🏠 메인으로 돌아가기
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}