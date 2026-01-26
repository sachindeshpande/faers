/**
 * Settings Store - Zustand state management for app settings (Phase 2)
 */

import { create } from 'zustand';
import type { AppSettings } from '../../shared/types/case.types';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  showSettingsDialog: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSetting: (key: keyof AppSettings, value: string | boolean) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;
}

const defaultSettings: AppSettings = {
  senderId: '',
  senderOrganization: '',
  defaultExportPath: '',
  autoValidateOnExport: true,
  warnOnExportWithWarnings: true,
  // Default to Test mode for safety
  submissionEnvironment: 'Test',
  submissionReportType: 'Postmarket',
  targetCenter: 'CDER',
  productionModeConfirmed: false
};

export const useSettingsStore = create<SettingsState>((set) => ({
  // Initial state
  settings: { ...defaultSettings },
  isLoading: false,
  showSettingsDialog: false,

  // Actions
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const [
        senderIdRes,
        senderOrgRes,
        exportPathRes,
        autoValidateRes,
        warnRes,
        envRes,
        reportTypeRes,
        targetCenterRes,
        prodConfirmedRes
      ] = await Promise.all([
        window.electronAPI.getSetting('senderId'),
        window.electronAPI.getSetting('senderOrganization'),
        window.electronAPI.getSetting('defaultExportPath'),
        window.electronAPI.getSetting('autoValidateOnExport'),
        window.electronAPI.getSetting('warnOnExportWithWarnings'),
        window.electronAPI.getSetting('submissionEnvironment'),
        window.electronAPI.getSetting('submissionReportType'),
        window.electronAPI.getSetting('targetCenter'),
        window.electronAPI.getSetting('productionModeConfirmed')
      ]);

      set({
        settings: {
          senderId: senderIdRes.data || '',
          senderOrganization: senderOrgRes.data || '',
          defaultExportPath: exportPathRes.data || '',
          autoValidateOnExport: autoValidateRes.data !== 'false',
          warnOnExportWithWarnings: warnRes.data !== 'false',
          // Default to Test mode for safety
          submissionEnvironment: (envRes.data as 'Test' | 'Production') || 'Test',
          submissionReportType: (reportTypeRes.data as 'Postmarket' | 'Premarket') || 'Postmarket',
          targetCenter: (targetCenterRes.data as 'CDER' | 'CBER') || 'CDER',
          productionModeConfirmed: prodConfirmedRes.data === 'true'
        },
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      set({ isLoading: false });
    }
  },

  updateSetting: async (key: keyof AppSettings, value: string | boolean) => {
    const stringValue = typeof value === 'boolean' ? String(value) : value;
    try {
      await window.electronAPI.setSetting(key, stringValue);
      set((state) => ({
        settings: { ...state.settings, [key]: value }
      }));
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  },

  updateSettings: async (settings: Partial<AppSettings>) => {
    try {
      const updates: Promise<void>[] = [];

      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          const stringValue = typeof value === 'boolean' ? String(value) : value;
          updates.push(
            window.electronAPI.setSetting(key, stringValue).then(() => {})
          );
        }
      }

      await Promise.all(updates);

      set((state) => ({
        settings: { ...state.settings, ...settings }
      }));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  openSettingsDialog: () => {
    set({ showSettingsDialog: true });
  },

  closeSettingsDialog: () => {
    set({ showSettingsDialog: false });
  }
}));

// Selector hooks
export const useSettings = () =>
  useSettingsStore((state) => ({
    settings: state.settings,
    loading: state.isLoading,
    load: state.loadSettings
  }));

export const useSettingsDialog = () =>
  useSettingsStore((state) => ({
    visible: state.showSettingsDialog,
    open: state.openSettingsDialog,
    close: state.closeSettingsDialog
  }));
