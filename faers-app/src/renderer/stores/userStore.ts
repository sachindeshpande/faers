/**
 * User Store - Zustand state management for user administration
 * Phase 3: Multi-User & Workflow Management
 */

import { create } from 'zustand';
import type {
  User,
  UserListItem,
  Role,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilter
} from '../../shared/types/auth.types';

interface UserState {
  // User list state
  users: UserListItem[];
  totalUsers: number;
  selectedUser: User | null;
  isLoading: boolean;
  error: string | null;

  // Roles
  roles: Role[];
  rolesLoaded: boolean;

  // Filter state
  filter: UserFilter;

  // Modal state
  isFormModalOpen: boolean;
  editingUserId: string | null;

  // Actions
  fetchUsers: (filter?: UserFilter) => Promise<void>;
  fetchUser: (id: string) => Promise<User | null>;
  createUser: (data: CreateUserDTO) => Promise<{ success: boolean; error?: string; user?: User }>;
  updateUser: (id: string, data: UpdateUserDTO) => Promise<{ success: boolean; error?: string }>;
  deactivateUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  reactivateUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (id: string) => Promise<{ success: boolean; temporaryPassword?: string; error?: string }>;
  fetchRoles: () => Promise<void>;
  setFilter: (filter: Partial<UserFilter>) => void;
  clearFilter: () => void;
  openFormModal: (userId?: string) => void;
  closeFormModal: () => void;
  clearError: () => void;
  clearSelectedUser: () => void;
}

const defaultFilter: UserFilter = {
  search: undefined,
  isActive: undefined,
  roleId: undefined,
  limit: 50,
  offset: 0
};

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  users: [],
  totalUsers: 0,
  selectedUser: null,
  isLoading: false,
  error: null,
  roles: [],
  rolesLoaded: false,
  filter: { ...defaultFilter },
  isFormModalOpen: false,
  editingUserId: null,

  // Actions
  fetchUsers: async (filter?: UserFilter) => {
    set({ isLoading: true, error: null });

    try {
      const activeFilter = filter || get().filter;
      const response = await window.electronAPI.getUsers(activeFilter);

      if (response.success && response.data) {
        set({
          users: response.data.users,
          totalUsers: response.data.total,
          isLoading: false,
          filter: activeFilter
        });
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch users'
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users'
      });
    }
  },

  fetchUser: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.getUser(id);

      if (response.success && response.data) {
        set({
          selectedUser: response.data,
          isLoading: false
        });
        return response.data;
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to fetch user'
        });
        return null;
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user'
      });
      return null;
    }
  },

  createUser: async (data: CreateUserDTO) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.createUser(data);

      if (response.success && response.data) {
        // Refresh user list
        get().fetchUsers();
        set({ isLoading: false });
        return { success: true, user: response.data };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to create user'
        });
        return { success: false, error: response.error || 'Failed to create user' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  updateUser: async (id: string, data: UpdateUserDTO) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.updateUser(id, data);

      if (response.success) {
        // Refresh user list
        get().fetchUsers();
        set({ isLoading: false });
        return { success: true };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to update user'
        });
        return { success: false, error: response.error || 'Failed to update user' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  deactivateUser: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.deactivateUser(id);

      if (response.success) {
        // Refresh user list
        get().fetchUsers();
        set({ isLoading: false });
        return { success: true };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to deactivate user'
        });
        return { success: false, error: response.error || 'Failed to deactivate user' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to deactivate user';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  reactivateUser: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.reactivateUser(id);

      if (response.success) {
        // Refresh user list
        get().fetchUsers();
        set({ isLoading: false });
        return { success: true };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to reactivate user'
        });
        return { success: false, error: response.error || 'Failed to reactivate user' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reactivate user';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  resetUserPassword: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await window.electronAPI.resetUserPassword(id);

      if (response.success && response.data) {
        set({ isLoading: false });
        return { success: true, temporaryPassword: response.data.temporaryPassword };
      } else {
        set({
          isLoading: false,
          error: response.error || 'Failed to reset password'
        });
        return { success: false, error: response.error || 'Failed to reset password' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      set({ isLoading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  fetchRoles: async () => {
    try {
      const response = await window.electronAPI.getRoles();

      if (response.success && response.data) {
        set({
          roles: response.data,
          rolesLoaded: true
        });
      }
    } catch {
      // Silent failure - roles will be empty
    }
  },

  setFilter: (filter: Partial<UserFilter>) => {
    const currentFilter = get().filter;
    const newFilter = { ...currentFilter, ...filter };
    set({ filter: newFilter });
    get().fetchUsers(newFilter);
  },

  clearFilter: () => {
    set({ filter: { ...defaultFilter } });
    get().fetchUsers(defaultFilter);
  },

  openFormModal: (userId?: string) => {
    set({
      isFormModalOpen: true,
      editingUserId: userId || null
    });

    if (userId) {
      get().fetchUser(userId);
    } else {
      set({ selectedUser: null });
    }
  },

  closeFormModal: () => {
    set({
      isFormModalOpen: false,
      editingUserId: null,
      selectedUser: null
    });
  },

  clearError: () => {
    set({ error: null });
  },

  clearSelectedUser: () => {
    set({ selectedUser: null });
  }
}));

// Selector hooks for cleaner component access
export const useUsers = () => useUserStore((state) => state.users);
export const useSelectedUser = () => useUserStore((state) => state.selectedUser);
export const useRoles = () => useUserStore((state) => state.roles);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);

export const useUserActions = () =>
  useUserStore((state) => ({
    fetchUsers: state.fetchUsers,
    fetchUser: state.fetchUser,
    createUser: state.createUser,
    updateUser: state.updateUser,
    deactivateUser: state.deactivateUser,
    reactivateUser: state.reactivateUser,
    resetUserPassword: state.resetUserPassword,
    fetchRoles: state.fetchRoles,
    setFilter: state.setFilter,
    clearFilter: state.clearFilter,
    openFormModal: state.openFormModal,
    closeFormModal: state.closeFormModal,
    clearError: state.clearError
  }));

export const useUserModalState = () =>
  useUserStore((state) => ({
    isFormModalOpen: state.isFormModalOpen,
    editingUserId: state.editingUserId,
    openFormModal: state.openFormModal,
    closeFormModal: state.closeFormModal
  }));
