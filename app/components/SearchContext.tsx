"use client";

import { createContext, useContext, useState } from "react";

type SearchContextType = {
  query: string;
  setQuery: (q: string) => void;

  activeInk: string | null;
  setActiveInk: (ink: string | null) => void;

  activeChapter: number | null;
  setActiveChapter: (c: number | null) => void;
};

const SearchContext = createContext<SearchContextType | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState("");
  const [activeInk, setActiveInk] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        activeInk,
        setActiveInk,
        activeChapter,
        setActiveChapter,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside <SearchProvider>");
  }
  return ctx;
}
