import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = '선택',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const normalOptions = useMemo(() => options.filter((o) => !o.special), [options])

  const specialOptions = useMemo(() => options.filter((o) => o.special), [options])

  const filteredNormal = useMemo(() => {
    if (!keyword.trim()) return normalOptions
    const lower = keyword.toLowerCase()
    return normalOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }, [normalOptions, keyword])

  const filteredSpecial = useMemo(() => {
    if (!keyword.trim()) return specialOptions
    const lower = keyword.toLowerCase()
    return specialOptions.filter((o) => o.label.toLowerCase().includes(lower))
  }, [specialOptions, keyword])

  const selectedOption = options.find((o) => o.value === value)
  const selectedLabel = selectedOption?.label
  const isSpecialSelected = selectedOption?.special

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setKeyword('')
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const hasResults = filteredSpecial.length > 0 || filteredNormal.length > 0

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen)
          setKeyword('')
        }}
        style={{ backgroundColor: '#ffffff', borderRadius: '.25rem' }}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-[10px] border border-[#ddd] text-[11px] hover:border-[#bbb] transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${isOpen ? 'border-[#1a8bc5] ring-1 ring-[#1a8bc5]' : ''}`}
      >
        <span className={selectedLabel ? (isSpecialSelected ? 'text-[#d97706]' : 'text-[#333]') : 'text-[#aaa]'}>
          {selectedLabel || placeholder}
        </span>

        <div className="flex items-center gap-0.5">
          {value && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              style={{ borderRadius: '.25rem' }}
              className="p-0.5 hover:bg-gray-100"
            >
              <X className="w-3 h-3 text-[#999]" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-[#999] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div
          style={{ backgroundColor: '#ffffff' }}
          className="absolute top-full left-0 mt-1 w-full border border-[#ddd] rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Search input */}
          <div className="p-1.5 border-b border-[#eee]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#bbb]" />
              <input
                ref={inputRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="검색..."
                style={{ borderRadius: '.25rem', backgroundColor: '#fafafa' }}
                className="w-full pl-6 pr-2 py-[5px] text-[11px] border border-[#eee] focus:outline-none focus:border-[#1a8bc5]"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[180px] overflow-y-auto">
            {!hasResults ? (
              <div className="px-3 py-3 text-[11px] text-[#999] text-center">일치하는 항목이 없습니다</div>
            ) : (
              <>
                {/* Special options */}
                {filteredSpecial.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                      setKeyword('')
                    }}
                    className={`w-full text-left px-3 py-[7px] text-[11px] hover:bg-[#fffbeb] transition-colors flex items-center gap-1.5 ${
                      option.value === value ? 'bg-[#fffbeb] text-[#d97706]' : 'text-[#b45309]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />
                    {option.label}
                  </button>
                ))}

                {filteredSpecial.length > 0 && filteredNormal.length > 0 && (
                  <div className="border-t border-[#eee] my-0.5" />
                )}

                {/* Normal options */}
                {filteredNormal.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value)
                      setIsOpen(false)
                      setKeyword('')
                    }}
                    className={`w-full text-left px-3 py-[7px] text-[11px] hover:bg-[#f0f8ff] transition-colors ${
                      option.value === value ? 'bg-[#e8f4fd] text-[#1a8bc5]' : 'text-[#444]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
