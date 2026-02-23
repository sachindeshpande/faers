/**
 * Search Store
 * Zustand store for advanced search state management
 */

import { create } from 'zustand';
import type {
  SearchQuery,
  SavedSearch,
  SearchResults,
  SearchableField,
  SearchConditionGroup
} from '../../shared/types/search.types';
import { createEmptyConditionGroup } from '../../shared/types/search.types';

interface SearchState {
  // Search state
  searchQuery: string;
  advancedQuery: SearchQuery;
  results: SearchResults | null;
  isSearching: boolean;
  error: string | null;

  // Saved searches
  savedSearches: SavedSearch[];
  selectedSavedSearch: SavedSearch | null;
  isLoadingSavedSearches: boolean;

  // Searchable fields
  searchableFields: SearchableField[];

  // Pagination
  currentPage: number;
  pageSize: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setAdvancedQuery: (query: SearchQuery) => void;
  setConditions: (conditions: SearchConditionGroup) => void;
  clearSearch: () => void;

  // Search actions
  searchFulltext: (query: string, page?: number) => Promise<void>;
  searchAdvanced: (query?: SearchQuery, page?: number) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;

  // Saved search actions
  loadSavedSearches: (includeShared?: boolean) => Promise<void>;
  saveSearch: (name: string, description?: string, isShared?: boolean) => Promise<SavedSearch | null>;
  updateSavedSearch: (id: number, updates: Partial<SavedSearch>) => Promise<void>;
  deleteSavedSearch: (id: number) => Promise<void>;
  executeSavedSearch: (savedSearch: SavedSearch, page?: number) => Promise<void>;
  selectSavedSearch: (savedSearch: SavedSearch | null) => void;

  // Field actions
  loadSearchableFields: () => Promise<void>;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  searchQuery: '',
  advancedQuery: {
    conditions: createEmptyConditionGroup()
  },
  results: null,
  isSearching: false,
  error: null,

  savedSearches: [],
  selectedSavedSearch: null,
  isLoadingSavedSearches: false,

  searchableFields: [],

  currentPage: 1,
  pageSize: 25,

  // Query setters
  setSearchQuery: (query) => set({ searchQuery: query }),

  setAdvancedQuery: (query) => set({ advancedQuery: query }),

  setConditions: (conditions) =>
    set((state) => ({
      advancedQuery: {
        ...state.advancedQuery,
        conditions
      }
    })),

  clearSearch: () =>
    set({
      searchQuery: '',
      advancedQuery: { conditions: createEmptyConditionGroup() },
      results: null,
      error: null,
      currentPage: 1,
      selectedSavedSearch: null
    }),

  // Search execution
  searchFulltext: async (query, page) => {
    const { pageSize } = get();
    const pageNum = page ?? 1;

    set({ isSearching: true, error: null, searchQuery: query, currentPage: pageNum });

    try {
      const response = await window.electronAPI.searchCasesFulltext(query, pageNum, pageSize);

      if (response.success && response.data) {
        set({ results: response.data, isSearching: false });
      } else {
        set({ error: response.error || 'Search failed', isSearching: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false
      });
    }
  },

  searchAdvanced: async (query, page) => {
    const { advancedQuery, pageSize } = get();
    const searchQuery = query ?? advancedQuery;
    const pageNum = page ?? 1;

    set({ isSearching: true, error: null, currentPage: pageNum });

    try {
      const response = await window.electronAPI.searchCasesAdvanced(searchQuery, pageNum, pageSize);

      if (response.success && response.data) {
        set({ results: response.data, isSearching: false });
      } else {
        set({ error: response.error || 'Search failed', isSearching: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false
      });
    }
  },

  setPage: (page) => set({ currentPage: page }),

  setPageSize: (pageSize) => set({ pageSize, currentPage: 1 }),

  // Saved searches
  loadSavedSearches: async (includeShared = true) => {
    set({ isLoadingSavedSearches: true });

    try {
      const response = await window.electronAPI.getSavedSearches(includeShared);

      if (response.success && response.data) {
        set({ savedSearches: response.data, isLoadingSavedSearches: false });
      } else {
        set({ isLoadingSavedSearches: false });
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
      set({ isLoadingSavedSearches: false });
    }
  },

  saveSearch: async (name, description, isShared = false) => {
    const { advancedQuery } = get();

    try {
      const response = await window.electronAPI.saveSearch(
        name,
        description,
        advancedQuery,
        isShared
      );

      if (response.success && response.data) {
        set((state) => ({
          savedSearches: [response.data!, ...state.savedSearches]
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to save search:', error);
      return null;
    }
  },

  updateSavedSearch: async (id, updates) => {
    try {
      const response = await window.electronAPI.updateSavedSearch(id, updates);

      if (response.success && response.data) {
        set((state) => ({
          savedSearches: state.savedSearches.map((s) =>
            s.id === id ? response.data! : s
          ),
          selectedSavedSearch:
            state.selectedSavedSearch?.id === id
              ? response.data!
              : state.selectedSavedSearch
        }));
      }
    } catch (error) {
      console.error('Failed to update saved search:', error);
    }
  },

  deleteSavedSearch: async (id) => {
    try {
      const response = await window.electronAPI.deleteSavedSearch(id);

      if (response.success) {
        set((state) => ({
          savedSearches: state.savedSearches.filter((s) => s.id !== id),
          selectedSavedSearch:
            state.selectedSavedSearch?.id === id ? null : state.selectedSavedSearch
        }));
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  },

  executeSavedSearch: async (savedSearch, page) => {
    const { pageSize } = get();
    const pageNum = page ?? 1;

    set({
      isSearching: true,
      error: null,
      selectedSavedSearch: savedSearch,
      advancedQuery: savedSearch.query,
      currentPage: pageNum
    });

    try {
      const response = await window.electronAPI.executeSavedSearch(
        savedSearch.id,
        pageNum,
        pageSize
      );

      if (response.success && response.data) {
        set({ results: response.data, isSearching: false });
      } else {
        set({ error: response.error || 'Search failed', isSearching: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isSearching: false
      });
    }
  },

  selectSavedSearch: (savedSearch) =>
    set({
      selectedSavedSearch: savedSearch,
      advancedQuery: savedSearch?.query ?? { conditions: createEmptyConditionGroup() }
    }),

  // Field definitions
  loadSearchableFields: async () => {
    try {
      const response = await window.electronAPI.getSearchableFields();

      if (response.success && response.data) {
        set({ searchableFields: response.data });
      }
    } catch (error) {
      console.error('Failed to load searchable fields:', error);
    }
  }
}));
