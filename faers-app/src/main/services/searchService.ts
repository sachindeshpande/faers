/**
 * Search Service
 * Business logic for advanced case search
 */

import { SearchRepository } from '../database/repositories/search.repository';
import type {
  SearchQuery,
  SavedSearch,
  SearchResults,
  SearchableField
} from '../../shared/types/search.types';
import { SEARCHABLE_FIELDS } from '../../shared/types/search.types';

export class SearchService {
  private repository: SearchRepository;

  constructor(repository: SearchRepository) {
    this.repository = repository;
  }

  // ============ Search Execution ============

  /**
   * Execute fulltext search
   */
  searchFulltext(query: string, page = 1, pageSize = 25): SearchResults {
    if (!query || query.length < 2) {
      return {
        cases: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
    return this.repository.searchFulltext(query, page, pageSize);
  }

  /**
   * Execute advanced search
   */
  searchAdvanced(query: SearchQuery, page = 1, pageSize = 25): SearchResults {
    return this.repository.searchAdvanced(query, page, pageSize);
  }

  // ============ Saved Searches ============

  /**
   * Get saved searches
   */
  getSavedSearches(userId?: string, includeShared = true): SavedSearch[] {
    return this.repository.getSavedSearches(userId, includeShared);
  }

  /**
   * Get a saved search by ID
   */
  getSavedSearchById(id: number): SavedSearch | null {
    return this.repository.getSavedSearchById(id);
  }

  /**
   * Save a search
   */
  saveSearch(
    name: string,
    description: string | undefined,
    query: SearchQuery,
    isShared: boolean,
    createdBy?: string
  ): SavedSearch {
    return this.repository.createSavedSearch(name, description, query, isShared, createdBy);
  }

  /**
   * Update a saved search
   */
  updateSavedSearch(id: number, updates: Partial<SavedSearch>): SavedSearch | null {
    return this.repository.updateSavedSearch(id, updates);
  }

  /**
   * Delete a saved search
   */
  deleteSavedSearch(id: number): void {
    this.repository.deleteSavedSearch(id);
  }

  /**
   * Execute a saved search
   */
  executeSavedSearch(id: number, page = 1, pageSize = 25): SearchResults {
    const savedSearch = this.repository.getSavedSearchById(id);
    if (!savedSearch) {
      throw new Error(`Saved search ${id} not found`);
    }

    // Increment execution count
    this.repository.incrementExecutionCount(id);

    return this.repository.searchAdvanced(savedSearch.query, page, pageSize);
  }

  // ============ Searchable Fields ============

  /**
   * Get list of searchable fields
   */
  getSearchableFields(): SearchableField[] {
    return SEARCHABLE_FIELDS;
  }
}
