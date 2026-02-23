/**
 * Search IPC Handlers
 * Handles IPC communication for advanced case search operations
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import { SearchService } from '../services/searchService';
import type { SearchQuery, SavedSearch } from '../../shared/types/search.types';

export function registerSearchHandlers(searchService: SearchService): void {
  // Full-text search across cases
  ipcMain.handle(IPC_CHANNELS.SEARCH_FULLTEXT, async (_event, query: string, page?: number, pageSize?: number) => {
    try {
      const results = searchService.searchFulltext(query, page, pageSize);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error in fulltext search:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Advanced search with conditions
  ipcMain.handle(IPC_CHANNELS.SEARCH_ADVANCED, async (_event, query: SearchQuery, page?: number, pageSize?: number) => {
    try {
      const results = searchService.searchAdvanced(query, page, pageSize);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error in advanced search:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Save a search
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_SAVE,
    async (
      _event,
      name: string,
      description: string | undefined,
      query: SearchQuery,
      isShared: boolean,
      createdBy?: string
    ) => {
      try {
        const savedSearch = searchService.saveSearch(name, description, query, isShared, createdBy);
        return { success: true, data: savedSearch };
      } catch (error) {
        console.error('Error saving search:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  );

  // Update a saved search
  ipcMain.handle(IPC_CHANNELS.SEARCH_UPDATE_SAVED, async (_event, id: number, updates: Partial<SavedSearch>) => {
    try {
      const savedSearch = searchService.updateSavedSearch(id, updates);
      if (!savedSearch) {
        return { success: false, error: `Saved search ${id} not found` };
      }
      return { success: true, data: savedSearch };
    } catch (error) {
      console.error('Error updating saved search:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Delete a saved search
  ipcMain.handle(IPC_CHANNELS.SEARCH_DELETE_SAVED, async (_event, id: number) => {
    try {
      searchService.deleteSavedSearch(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting saved search:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get saved searches
  ipcMain.handle(IPC_CHANNELS.SEARCH_LIST_SAVED, async (_event, userId?: string, includeShared?: boolean) => {
    try {
      const searches = searchService.getSavedSearches(userId, includeShared);
      return { success: true, data: searches };
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Execute a saved search
  ipcMain.handle(IPC_CHANNELS.SEARCH_EXECUTE_SAVED, async (_event, id: number, page?: number, pageSize?: number) => {
    try {
      const results = searchService.executeSavedSearch(id, page, pageSize);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error executing saved search:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  // Get searchable fields
  ipcMain.handle(IPC_CHANNELS.SEARCH_GET_FIELDS, async () => {
    try {
      const fields = searchService.getSearchableFields();
      return { success: true, data: fields };
    } catch (error) {
      console.error('Error getting searchable fields:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
