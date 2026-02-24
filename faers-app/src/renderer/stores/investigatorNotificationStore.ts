/**
 * Investigator Notification Store - Phase 6
 */
import { create } from 'zustand';
import type { InvestigatorNotification, InvestigatorNotificationListItem, InvestigatorNotificationFilter, CreateInvestigatorNotificationDTO } from '../../shared/types/investigatorNotification.types';

interface InvNotificationState {
  notifications: InvestigatorNotificationListItem[];
  selectedNotification: InvestigatorNotification | null;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (filter?: InvestigatorNotificationFilter) => Promise<void>;
  fetchNotification: (id: number) => Promise<void>;
  createNotification: (data: CreateInvestigatorNotificationDTO) => Promise<{ success: boolean; error?: string }>;
  markSent: (distributionId: number) => Promise<{ success: boolean; error?: string }>;
  markAcknowledged: (distributionId: number, acknowledgedBy: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useInvNotificationStore = create<InvNotificationState>((set, get) => ({
  notifications: [], selectedNotification: null, isLoading: false, error: null,

  fetchNotifications: async (filter) => {
    set({ isLoading: true });
    const result = await window.electronAPI.getInvNotifications(filter);
    if (result.success && result.data) set({ notifications: result.data });
    set({ isLoading: false });
  },
  fetchNotification: async (id) => {
    const result = await window.electronAPI.getInvNotification(id);
    if (result.success && result.data) set({ selectedNotification: result.data });
  },
  createNotification: async (data) => {
    const result = await window.electronAPI.createInvNotification(data);
    if (result.success) { get().fetchNotifications({ studyId: data.studyId }); return { success: true }; }
    return { success: false, error: result.error };
  },
  markSent: async (distributionId) => {
    const result = await window.electronAPI.markNotificationSent(distributionId);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  },
  markAcknowledged: async (distributionId, acknowledgedBy) => {
    const result = await window.electronAPI.markNotificationAcknowledged(distributionId, acknowledgedBy);
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  },
  clearError: () => set({ error: null })
}));
