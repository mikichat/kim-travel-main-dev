// @TASK T6.1 - 검색/필터 컴포넌트 (뼈대)

interface SearchFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchFilter({ value, onChange, placeholder = '검색...' }: SearchFilterProps) {
  return (
    <div className="search-filter" role="search">
      <label htmlFor="search-input" className="sr-only">
        검색
      </label>
      <input
        id="search-input"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="멤버 검색"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="검색어 지우기"
          className="clear-btn"
        >
          ✕
        </button>
      )}
    </div>
  )
}
