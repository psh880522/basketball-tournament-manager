"use client";

import { useEffect, useRef, useState } from "react";
import type { KakaoLocalPlace } from "@/lib/types/kakao";

interface LocationAutocompleteProps {
  value: string;
  onChange: (text: string) => void;
  onSelect: (place: KakaoLocalPlace) => void;
  onCoordsResolve?: (lat: number, lng: number) => void;
  hasCoords?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  onCoordsResolve,
  hasCoords = false,
  placeholder,
  disabled,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<KakaoLocalPlace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleInputChange = (text: string) => {
    onChange(text);
    setFocusedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`/api/kakao-place-search?q=${encodeURIComponent(text.trim())}`);
        const data = await res.json();
        if (!res.ok) {
          setApiError("검색에 실패했습니다. 직접 입력해 주세요.");
          setSuggestions([]);
        } else {
          setSuggestions(data.documents ?? []);
          setApiError(null);
        }
        setIsOpen(true);
      } catch {
        setApiError("검색에 실패했습니다. 직접 입력해 주세요.");
        setSuggestions([]);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleBlur = async () => {
    if (hasCoords || !onCoordsResolve) return;
    const match = value.match(/\(([^)]+)\)$/);
    if (!match) return;
    const address = match[1].trim();
    if (address.length < 2) return;
    try {
      const res = await fetch(`/api/kakao-place-search?q=${encodeURIComponent(address)}`);
      const data = await res.json();
      const first = data.documents?.[0] as KakaoLocalPlace | undefined;
      if (first) onCoordsResolve(parseFloat(first.y), parseFloat(first.x));
    } catch {
      // 조용히 실패 — 사용자가 수동 입력했으므로 좌표 없어도 저장 가능
    }
  };

  const handleSelect = (place: KakaoLocalPlace) => {
    onSelect(place);
    setIsOpen(false);
    setSuggestions([]);
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && focusedIndex >= 0 && suggestions[focusedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[focusedIndex]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen && (isLoading || !!apiError || suggestions.length === 0 || suggestions.length > 0);

  return (
    <div className="relative" ref={containerRef}>
      <input
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        autoComplete="off"
      />

      {showDropdown && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
          role="listbox"
        >
          {isLoading && (
            <p className="px-3 py-2 text-xs text-slate-400">검색 중...</p>
          )}
          {!isLoading && apiError && (
            <p className="px-3 py-2 text-xs text-slate-400">{apiError}</p>
          )}
          {!isLoading && !apiError && suggestions.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">검색 결과가 없습니다.</p>
          )}
          {!isLoading && !apiError && suggestions.map((place, index) => (
            <div
              key={`${place.place_name}-${place.x}-${place.y}`}
              role="option"
              aria-selected={focusedIndex === index}
              onClick={() => handleSelect(place)}
              className={`cursor-pointer px-3 py-2 ${focusedIndex === index ? "bg-slate-100" : "hover:bg-slate-50"}`}
            >
              <p className="text-sm font-medium text-slate-800">{place.place_name}</p>
              <p className="text-xs text-slate-400">
                {place.road_address_name || place.address_name}
              </p>
            </div>
          ))}
        </div>
      )}

      {value && (
        hasCoords
          ? <p className="mt-1 text-xs text-emerald-600">✓ 위치가 선택되었습니다</p>
          : <p className="mt-1 text-xs text-slate-400">목록에서 선택하면 지도 링크가 생성됩니다</p>
      )}
    </div>
  );
}
