'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Clock, FileText, Plane, ChevronRight } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'booking' | 'customer' | 'invoice';
  title: string;
  subtitle: string;
  metadata?: string;
  onClick: () => void;
}

interface QuickSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  placeholder?: string;
}

export function QuickSearchModal({
  open,
  onClose,
  onSearch,
  placeholder = '검색어 입력... (PNR, 승객명, 대리점)',
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await onSearch(query);
        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].onClick();
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  if (!open) return null;

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'booking':
        return <Plane className="w-4 h-4" />;
      case 'customer':
        return <FileText className="w-4 h-4" />;
      case 'invoice':
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg outline-none placeholder-gray-400"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={result.id}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  result.onClick();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={`p-2 rounded-lg ${
                  result.type === 'booking' ? 'bg-blue-100 text-blue-600' :
                  result.type === 'customer' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {getIcon(result.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{result.title}</p>
                  <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  {result.metadata && (
                    <p className="text-xs text-gray-400 mt-0.5">{result.metadata}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        ) : query.trim() && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>검색 결과가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어를 입력해 보세요.</p>
          </div>
        ) : (
          <div className="p-4 text-sm text-gray-500">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium">검색 팁</span>
            </div>
            <ul className="space-y-1 text-gray-400">
              <li>• PNR 번호로 검색 (예: ABC123)</li>
              <li>• 승객 이름으로 검색</li>
              <li>• 대리점/단체명으로 검색</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">↑↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">Enter</kbd>
            선택
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-gray-600">Esc</kbd>
            닫기
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuickSearchModal;
