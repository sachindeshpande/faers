/**
 * Main Application Component
 *
 * Implements the layout from REQ-UI-001:
 * - Menu Bar (handled by Electron)
 * - Toolbar
 * - Navigation Panel (sidebar)
 * - Main Content Area
 * - Status Bar
 *
 * Phase 3: Added authentication flow with multi-user support
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Layout, Menu, Button, Space, Tooltip, message, Form, Spin, Dropdown, Modal, Input, Select } from 'antd';
import {
  PlusOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  CheckSquareOutlined,
  ExportOutlined,
  ImportOutlined,
  FileTextOutlined,
  UserOutlined,
  SendOutlined,
  MedicineBoxOutlined,
  WarningOutlined,
  ExperimentOutlined,
  EditOutlined,
  UnorderedListOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  CloseCircleFilled,
  DashboardOutlined,
  SettingOutlined,
  BugOutlined,
  LogoutOutlined,
  LockOutlined,
  DownOutlined,
  SafetyCertificateOutlined,
  AppstoreOutlined,
  MoreOutlined,
  FileAddOutlined,
  StopOutlined,
  HistoryOutlined,
  InboxOutlined,
  ScheduleOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useCaseStore, useCurrentCase, useCaseActions } from './stores/caseStore';
import { useAuthActions, useUser, useIsAuthenticated, useAuthLoading, useMustChangePassword } from './stores/authStore';
import { LoginPage, ChangePasswordDialog, SessionTimeoutDialog } from './components/auth';
import CaseList from './components/case-list/CaseList';
import UserListPage from './components/users/UserListPage';
import { ProductList } from './components/products';
import { BatchList, CreateBatchWizard, BatchDetail } from './components/batch';
import { PSRList, PSRDashboard, PSRDetail, CreatePSRWizard } from './components/psr';
import { CreateFollowupDialog, NullifyDialog, CaseVersionTimeline } from './components/followup';
import NotificationCenter from './components/notifications/NotificationCenter';
import { usePermissions } from './components/common/PermissionGate';
import {
  ReportInfoSection,
  ReporterSection,
  SenderSection,
  PatientSection,
  ReactionsSection,
  DrugsSection,
  NarrativeSection,
  ReportClassificationSection
} from './components/case-form';
import type { Case, CaseDrug, CaseReaction, CaseReporter, ValidationResult, CaseStatus, WorkflowStatus } from '../shared/types/case.types';
import type { AvailableActionsResponse } from '../shared/types/ipc.types';
import ValidationPanel from './components/validation/ValidationPanel';
import {
  SubmissionDashboard,
  RecordSubmissionDialog,
  RecordAcknowledgmentDialog,
  SettingsDialog,
  DemoModeBanner,
  SubmitToFdaDialog,
  SubmissionProgressDialog
} from './components/submission';
import { useSubmissionStore, useDashboard } from './stores/submissionStore';
import { useSettingsStore } from './stores/settingsStore';
import { useEsgApiStore } from './stores/esgApiStore';

const { Header, Sider, Content, Footer } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

// Section indicator component
const SectionIndicator: React.FC<{ hasData: boolean; hasError: boolean }> = ({ hasData, hasError }) => {
  if (hasError) {
    return <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 10, marginLeft: 8 }} />;
  }
  if (hasData) {
    return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 10, marginLeft: 8 }} />;
  }
  return null;
};

// Helper to create nav label with indicator
const createNavLabel = (label: string, hasData: boolean, hasError: boolean) => (
  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
    {label}
    <SectionIndicator hasData={hasData} hasError={hasError} />
  </span>
);

const App: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  // Phase 3: Authentication state
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();
  const isAuthLoading = useAuthLoading();
  const mustChangePassword = useMustChangePassword();
  const { validateSession, logout, updateActivity } = useAuthActions();
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  const { case: currentCase, isDirty, isSaving, isLoading: isCaseLoading } = useCurrentCase();
  const { createCase, updateCase, fetchCases, updateCurrentCaseField } = useCaseActions();
  const activeSection = useCaseStore((s) => s.activeSection);
  const setActiveSection = useCaseStore((s) => s.setActiveSection);

  // Related entities state
  const [drugs, setDrugs] = useState<CaseDrug[]>([]);
  const [reactions, setReactions] = useState<CaseReaction[]>([]);
  const [reporters, setReporters] = useState<CaseReporter[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  // Phase 2: Submission and settings state
  const { stats: dashboardStats, loading: loadingDashboard, fetch: fetchDashboardStats } = useDashboard();
  const submissionStore = useSubmissionStore();
  const settingsStore = useSettingsStore();

  // Phase 2B: ESG API / Demo mode state
  const [esgApiEnvironment, setEsgApiEnvironment] = useState<'Test' | 'Production' | 'Demo'>('Test');

  // Phase 4: Follow-up and Nullification dialogs
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showNullifyDialog, setShowNullifyDialog] = useState(false);
  const [showVersionTimeline, setShowVersionTimeline] = useState(false);

  // Phase 4: Batch management state
  const [showCreateBatchWizard, setShowCreateBatchWizard] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Phase 4: PSR management state
  const [psrView, setPsrView] = useState<'dashboard' | 'list'>('dashboard');
  const [selectedPsrId, setSelectedPsrId] = useState<number | null>(null);
  const [showCreatePsrWizard, setShowCreatePsrWizard] = useState(false);

  // Phase 3: Workflow actions state
  const [availableWorkflowActions, setAvailableWorkflowActions] = useState<AvailableActionsResponse['actions']>([]);
  const [workflowActionModalVisible, setWorkflowActionModalVisible] = useState(false);
  const [pendingWorkflowAction, setPendingWorkflowAction] = useState<{
    toStatus: WorkflowStatus;
    label: string;
    requiresComment?: boolean;
    requiresSignature?: boolean;
    requiresAssignment?: boolean;
  } | null>(null);
  const [workflowComment, setWorkflowComment] = useState('');
  const [workflowAssignee, setWorkflowAssignee] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<Array<{ id: string; username: string; firstName: string; lastName: string }>>([]);
  const [signaturePassword, setSignaturePassword] = useState('');

  // Phase 3: Validate session on mount
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Phase 3: Track user activity for session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      updateActivity();
    };

    // Track mouse and keyboard activity
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [isAuthenticated, updateActivity]);

  // Load dashboard stats on mount (only when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardStats();
      settingsStore.loadSettings();
    }
  }, [isAuthenticated]);

  // Phase 2B: Load ESG API settings to check for Demo mode
  useEffect(() => {
    if (isAuthenticated) {
      window.electronAPI.esgGetSettings().then((result) => {
        if (result.success && result.data) {
          setEsgApiEnvironment(result.data.environment || 'Test');
        }
      }).catch(console.error);
    }
  }, [isAuthenticated]);

  // Load cases on mount (only when authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      fetchCases();
    }
  }, [fetchCases, isAuthenticated]);

  // Load related entities when current case changes
  useEffect(() => {
    if (currentCase?.id) {
      loadRelatedEntities(currentCase.id);
    } else {
      setDrugs([]);
      setReactions([]);
      setReporters([]);
    }
  }, [currentCase?.id]);

  // Load available workflow actions when case changes
  useEffect(() => {
    const fetchWorkflowActions = async () => {
      if (currentCase?.id && isAuthenticated) {
        try {
          const result = await window.electronAPI.getAvailableActions(currentCase.id);
          if (result.success && result.data) {
            setAvailableWorkflowActions(result.data.actions || []);
          } else {
            setAvailableWorkflowActions([]);
          }
        } catch (error) {
          console.error('Error fetching workflow actions:', error);
          setAvailableWorkflowActions([]);
        }
      } else {
        setAvailableWorkflowActions([]);
      }
    };

    fetchWorkflowActions();
  }, [currentCase?.id, currentCase?.workflowStatus, isAuthenticated]);

  // Close validation panel when navigating away from case form
  useEffect(() => {
    if (activeSection === 'dashboard' || activeSection === 'cases') {
      setShowValidationPanel(false);
    }
  }, [activeSection]);

  const loadRelatedEntities = async (caseId: string) => {
    setLoadingRelated(true);
    try {
      const [drugsRes, reactionsRes, reportersRes] = await Promise.all([
        window.electronAPI.getDrugs(caseId),
        window.electronAPI.getReactions(caseId),
        window.electronAPI.getReporters(caseId)
      ]);

      if (drugsRes.success) setDrugs(drugsRes.data || []);
      if (reactionsRes.success) setReactions(reactionsRes.data || []);
      if (reportersRes.success) setReporters(reportersRes.data || []);
    } catch (error) {
      console.error('Error loading related entities:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Handle field changes for case data
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    if (currentCase) {
      updateCurrentCaseField(field as keyof Case, value as Case[keyof Case]);
    }
  }, [currentCase, updateCurrentCaseField]);

  // Drug handlers
  const handleAddDrug = async (drug: Partial<CaseDrug>) => {
    if (!currentCase) return;
    const drugToSave = { ...drug, caseId: currentCase.id } as CaseDrug;
    const response = await window.electronAPI.saveDrug(drugToSave);
    if (response.success && response.data) {
      setDrugs([...drugs, response.data]);
      messageApi.success('Drug added');
    }
  };

  const handleUpdateDrug = async (id: number, drug: Partial<CaseDrug>) => {
    if (!currentCase) return;
    const drugToSave = { ...drug, id, caseId: currentCase.id } as CaseDrug;
    const response = await window.electronAPI.saveDrug(drugToSave);
    if (response.success && response.data) {
      setDrugs(drugs.map(d => d.id === id ? response.data! : d));
      messageApi.success('Drug updated');
    }
  };

  const handleDeleteDrug = async (id: number) => {
    const response = await window.electronAPI.deleteDrug(id);
    if (response.success) {
      setDrugs(drugs.filter(d => d.id !== id));
      messageApi.success('Drug deleted');
    }
  };

  // Reaction handlers
  const handleAddReaction = async (reaction: Partial<CaseReaction>) => {
    if (!currentCase) return;
    const reactionToSave = { ...reaction, caseId: currentCase.id } as CaseReaction;
    const response = await window.electronAPI.saveReaction(reactionToSave);
    if (response.success && response.data) {
      setReactions([...reactions, response.data]);
      messageApi.success('Reaction added');
    }
  };

  const handleUpdateReaction = async (id: number, reaction: Partial<CaseReaction>) => {
    if (!currentCase) return;
    const reactionToSave = { ...reaction, id, caseId: currentCase.id } as CaseReaction;
    const response = await window.electronAPI.saveReaction(reactionToSave);
    if (response.success && response.data) {
      setReactions(reactions.map(r => r.id === id ? response.data! : r));
      messageApi.success('Reaction updated');
    }
  };

  const handleDeleteReaction = async (id: number) => {
    const response = await window.electronAPI.deleteReaction(id);
    if (response.success) {
      setReactions(reactions.filter(r => r.id !== id));
      messageApi.success('Reaction deleted');
    }
  };

  // Reporter handlers
  const handleAddReporter = async (reporter: Partial<CaseReporter>) => {
    if (!currentCase) return;
    const reporterToSave = { ...reporter, caseId: currentCase.id } as CaseReporter;
    const response = await window.electronAPI.saveReporter(reporterToSave);
    if (response.success && response.data) {
      setReporters([...reporters, response.data]);
      messageApi.success('Reporter added');
    }
  };

  const handleUpdateReporter = async (id: number, reporter: Partial<CaseReporter>) => {
    if (!currentCase) return;
    const reporterToSave = { ...reporter, id, caseId: currentCase.id } as CaseReporter;
    const response = await window.electronAPI.saveReporter(reporterToSave);
    if (response.success && response.data) {
      setReporters(reporters.map(r => r.id === id ? response.data! : r));
      messageApi.success('Reporter updated');
    }
  };

  const handleDeleteReporter = async (id: number) => {
    const response = await window.electronAPI.deleteReporter(id);
    if (response.success) {
      setReporters(reporters.filter(r => r.id !== id));
      messageApi.success('Reporter deleted');
    }
  };

  // Handle new case
  const handleNewCase = async () => {
    const newCase = await createCase();
    if (newCase) {
      messageApi.success(`Created new case: ${newCase.id}`);
      setActiveSection('report');
    } else {
      messageApi.error('Failed to create new case');
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!currentCase || !isDirty) return;

    await updateCase({
      status: currentCase.status,
      safetyReportId: currentCase.safetyReportId,
      reportType: currentCase.reportType,
      initialOrFollowup: currentCase.initialOrFollowup,
      receiptDate: currentCase.receiptDate,
      receiveDate: currentCase.receiveDate,
      patientInitials: currentCase.patientInitials,
      patientSex: currentCase.patientSex,
      caseNarrative: currentCase.caseNarrative
      // Add more fields as needed
    });

    messageApi.success('Case saved successfully');
  };

  // Handle validate
  const handleValidate = async () => {
    if (!currentCase) {
      messageApi.warning('No case selected');
      return;
    }

    setIsValidating(true);
    try {
      const result = await window.electronAPI.validateCase(currentCase.id);
      if (result.success && result.data) {
        setValidationResult(result.data);
        setShowValidationPanel(true);

        // Show summary message
        const errors = result.data.errors.filter(e => e.severity === 'error');
        const warnings = result.data.errors.filter(e => e.severity === 'warning');

        if (result.data.valid) {
          messageApi.success('Validation passed! Case is ready for export.');
        } else {
          messageApi.error(`Validation found ${errors.length} error(s) and ${warnings.length} warning(s)`);
        }
      } else {
        messageApi.error(`Validation failed: ${result.error}`);
      }
    } catch (error) {
      messageApi.error(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle navigation from validation panel
  const handleNavigateToField = (field: string) => {
    // Map field to section
    if (field.startsWith('report') || field === 'receiptDate' || field === 'receiveDate' ||
        field === 'initialOrFollowup' || field.includes('nullification')) {
      setActiveSection('report');
    } else if (field.includes('classification') || field === 'isSerious' || field === 'expectedness' ||
               field.includes('seriousness') || field.includes('expedited')) {
      setActiveSection('classification');
    } else if (field.startsWith('reporter') || field === 'reporters') {
      setActiveSection('reporter');
    } else if (field.startsWith('sender')) {
      setActiveSection('sender');
    } else if (field.startsWith('patient') || field === 'deathDate' || field === 'patientDeath') {
      setActiveSection('patient');
    } else if (field.startsWith('reaction') || field === 'reactions') {
      setActiveSection('reactions');
    } else if (field.startsWith('drug') || field === 'drugs') {
      setActiveSection('drugs');
    } else if (field.startsWith('narrative') || field === 'caseNarrative') {
      setActiveSection('narrative');
    }
  };

  // Handle export XML
  const handleExportXML = async () => {
    if (!currentCase) {
      messageApi.warning('No case selected');
      return;
    }

    try {
      // Show save dialog
      const dialogResult = await window.electronAPI.showSaveDialog({
        title: 'Export E2B(R3) XML',
        defaultPath: `${currentCase.id}.xml`,
        filters: [
          { name: 'XML Files', extensions: ['xml'] }
        ]
      });

      if (!dialogResult.success || !dialogResult.data) {
        return; // User cancelled
      }

      const filePath = dialogResult.data;

      // Export XML
      const result = await window.electronAPI.exportXML(currentCase.id, filePath);

      if (result.success) {
        messageApi.success(`Case exported to ${filePath}`);
        // Refresh case to update status
        useCaseStore.getState().fetchCase(currentCase.id);
      } else {
        messageApi.error(`Export failed: ${result.error}`);
      }
    } catch (error) {
      messageApi.error(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle import Form 3500
  const [isImporting, setIsImporting] = useState(false);

  const handleImportForm3500 = async () => {
    try {
      // Show file picker
      const dialogResult = await window.electronAPI.showOpenDialog({
        title: 'Select Form 3500A PDF',
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ],
        properties: ['openFile']
      });

      if (!dialogResult.success || !dialogResult.data || dialogResult.data.length === 0) {
        return; // User cancelled
      }

      const filePath = dialogResult.data[0];
      setIsImporting(true);

      // Import the form
      const result = await window.electronAPI.importForm3500(filePath);

      if (result.success && result.data?.success && result.data.caseId) {
        messageApi.success(`Form 3500A imported successfully. Case ID: ${result.data.caseId}`);

        // Show warnings if any
        if (result.data.warnings && result.data.warnings.length > 0) {
          result.data.warnings.forEach(warning => {
            messageApi.warning(warning);
          });
        }

        // Navigate to the new case
        useCaseStore.getState().fetchCase(result.data.caseId);
        setActiveSection('report');
      } else {
        const errorMsg = result.data?.errors?.join('; ') || result.error || 'Import failed';
        messageApi.error(`Import failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      messageApi.error('An error occurred during import');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle navigation
  const handleNavClick: MenuProps['onClick'] = (e) => {
    // When navigating to cases via sidebar, clear any status filters
    // This prevents the issue where filters set by dashboard persist unexpectedly
    if (e.key === 'cases') {
      useCaseStore.getState().setFilters({ status: undefined, search: undefined });
      fetchCases({ status: undefined, search: undefined, offset: 0 });
    }
    setActiveSection(e.key);
  };

  // Check if a section has validation errors
  const getSectionErrors = (sectionKey: string): boolean => {
    if (!validationResult) return false;

    const sectionFieldMap: Record<string, string[]> = {
      report: ['reportType', 'initialOrFollowup', 'receiptDate', 'receiveDate', 'nullification'],
      classification: ['reportTypeClassification', 'isSerious', 'expectedness', 'seriousness'],
      reporter: ['reporters', 'qualification'],
      sender: ['senderType', 'senderOrganization', 'senderGivenName', 'senderFamilyName', 'senderEmail'],
      patient: ['patientSex', 'patientAge', 'patientWeight', 'patientHeight', 'patientDeath', 'deathDate'],
      reactions: ['reactions', 'reactionTerm', 'seriousness'],
      drugs: ['drugs', 'characterization', 'productName'],
      narrative: ['caseNarrative', 'narrative']
    };

    const fields = sectionFieldMap[sectionKey] || [];
    return validationResult.errors.some(e =>
      e.severity === 'error' &&
      fields.some(f => e.field.toLowerCase().includes(f.toLowerCase()))
    );
  };

  // Check if a section has data
  const getSectionHasData = (sectionKey: string): boolean => {
    if (!currentCase) return false;

    switch (sectionKey) {
      case 'report':
        return !!(currentCase.reportType || currentCase.receiptDate || currentCase.receiveDate);
      case 'classification':
        return !!(currentCase.reportTypeClassification || currentCase.isSerious !== undefined || currentCase.expectedness);
      case 'reporter':
        return reporters.length > 0;
      case 'sender':
        return !!(currentCase.senderOrganization || currentCase.senderGivenName || currentCase.senderFamilyName);
      case 'patient':
        return !!(currentCase.patientSex !== undefined || currentCase.patientAge || currentCase.patientBirthdate);
      case 'reactions':
        return reactions.length > 0;
      case 'drugs':
        return drugs.length > 0;
      case 'narrative':
        return !!(currentCase.caseNarrative && currentCase.caseNarrative.trim().length > 0);
      default:
        return false;
    }
  };

  // Phase 3: Permission check for admin functions
  const { canViewUsers } = usePermissions();

  // Generate nav items with indicators
  const getNavItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      {
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: <span data-testid="nav-dashboard">Dashboard</span>
      },
      {
        key: 'cases',
        icon: <UnorderedListOutlined />,
        label: <span data-testid="nav-cases">Case List</span>
      }
    ];

    // Add User Management for admins
    if (canViewUsers) {
      items.push({
        key: 'users',
        icon: <UserOutlined />,
        label: <span data-testid="nav-users">User Management</span>
      });
    }

    // Products Management
    items.push({
      key: 'products',
      icon: <AppstoreOutlined />,
      label: <span data-testid="nav-products">Products</span>
    });

    // Batches (Phase 4)
    items.push({
      key: 'batches',
      icon: <InboxOutlined />,
      label: <span data-testid="nav-batches">Batches</span>
    });

    // PSR Management (Phase 4)
    items.push({
      key: 'psr',
      icon: <ScheduleOutlined />,
      label: <span data-testid="nav-psr">PSR</span>
    });

    items.push({ type: 'divider' });

    return [
      ...items,
      {
        key: 'report',
        icon: <FileTextOutlined />,
        label: <span data-testid="nav-report">{createNavLabel('Report Info', getSectionHasData('report'), getSectionErrors('report'))}</span>
      },
      {
        key: 'classification',
        icon: <SafetyCertificateOutlined />,
        label: <span data-testid="nav-classification">{createNavLabel('Classification', getSectionHasData('classification'), getSectionErrors('classification'))}</span>
      },
      {
        key: 'reporter',
        icon: <UserOutlined />,
        label: <span data-testid="nav-reporter">{createNavLabel('Reporter', getSectionHasData('reporter'), getSectionErrors('reporter'))}</span>
      },
      {
        key: 'sender',
        icon: <SendOutlined />,
        label: <span data-testid="nav-sender">{createNavLabel('Sender', getSectionHasData('sender'), getSectionErrors('sender'))}</span>
      },
      {
        key: 'patient',
        icon: <MedicineBoxOutlined />,
        label: <span data-testid="nav-patient">{createNavLabel('Patient', getSectionHasData('patient'), getSectionErrors('patient'))}</span>
      },
      {
        key: 'reactions',
        icon: <WarningOutlined />,
        label: <span data-testid="nav-reactions">{createNavLabel('Reactions', getSectionHasData('reactions'), getSectionErrors('reactions'))}</span>
      },
      {
        key: 'drugs',
        icon: <ExperimentOutlined />,
        label: <span data-testid="nav-drugs">{createNavLabel('Drugs', getSectionHasData('drugs'), getSectionErrors('drugs'))}</span>
      },
      {
        key: 'narrative',
        icon: <EditOutlined />,
        label: <span data-testid="nav-narrative">{createNavLabel('Narrative', getSectionHasData('narrative'), getSectionErrors('narrative'))}</span>
      }
    ];
  };

  // Get status badge class (Phase 2: Extended statuses)
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Draft':
        return 'status-badge draft';
      case 'Ready for Export':
        return 'status-badge ready';
      case 'Exported':
        return 'status-badge exported';
      case 'Submitted':
        return 'status-badge submitted';
      case 'Acknowledged':
        return 'status-badge acknowledged';
      case 'Rejected':
        return 'status-badge rejected';
      default:
        return 'status-badge';
    }
  };

  // Handle dashboard status click
  const handleDashboardStatusClick = (status: CaseStatus) => {
    useCaseStore.getState().setFilters({ status });
    fetchCases({ status });
    setActiveSection('cases');
  };

  // Handle dashboard case click
  const handleDashboardCaseClick = (caseId: string) => {
    useCaseStore.getState().fetchCase(caseId);
    setActiveSection('report');
  };

  // Phase 3: User menu items
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.firstName} ${user?.lastName}`,
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'change-password',
      icon: <LockOutlined />,
      label: <span data-testid="change-password-button">Change Password</span>,
      onClick: () => setShowChangePasswordDialog(true)
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span data-testid="logout-button">Logout</span>,
      onClick: () => {
        logout();
        messageApi.info('You have been logged out');
      }
    }
  ];

  // Handle Mark Ready for Export
  const handleMarkReady = async () => {
    if (!currentCase) return;

    console.log('[App] handleMarkReady called for case:', currentCase.id, 'current status:', currentCase.status);
    try {
      const result = await window.electronAPI.markCaseReady(currentCase.id);
      console.log('[App] markCaseReady IPC result:', JSON.stringify(result));
      if (result.success) {
        messageApi.success('Case marked as Ready for Export');
        // Refresh case data
        console.log('[App] Refreshing case and list...');
        await useCaseStore.getState().fetchCase(currentCase.id);
        await useCaseStore.getState().fetchCases();
        fetchDashboardStats();
        console.log('[App] Refreshes complete');
      } else {
        // Show validation errors if available
        const validationResult = result.data?.validationResult;
        if (validationResult && validationResult.errors && validationResult.errors.length > 0) {
          const errorMessages = validationResult.errors
            .filter((e: { severity: string }) => e.severity === 'error')
            .slice(0, 3) // Show first 3 errors
            .map((e: { message: string }) => e.message)
            .join('; ');
          const errorCount = validationResult.errors.filter((e: { severity: string }) => e.severity === 'error').length;
          const moreText = errorCount > 3 ? ` (+${errorCount - 3} more)` : '';
          messageApi.error(`Validation failed: ${errorMessages}${moreText}. Fix errors and try again.`);
        } else {
          messageApi.error(`Failed to mark ready: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Mark ready error:', error);
      messageApi.error('Failed to mark case as ready for export');
    }
  };

  // Phase 4: Actions menu items (context-sensitive based on case status)
  // Memoized to prevent excessive re-rendering
  const actionsMenuItems = useMemo((): MenuProps['items'] => {
    if (!currentCase) return [];

    const status = currentCase.status;
    const workflowStatus = currentCase.workflowStatus;
    // Submit to FDA available when:
    // 1. Status is Ready for Export or Exported (already validated/marked ready)
    // 2. OR Status is Draft AND workflowStatus is 'Approved' (completed internal review)
    // Cases in Draft without approval must go through internal workflow first
    const canSubmitToFda = (
      status === 'Ready for Export' ||
      status === 'Exported' ||
      (status === 'Draft' && workflowStatus === 'Approved')
    );
    const canCreateFollowup = status === 'Submitted' || status === 'Acknowledged';
    const canNullify = status === 'Submitted' || status === 'Acknowledged';

    // Log only once when dependencies change
    console.log(`[App] actionsMenuItems computed: case=${currentCase.id}, status='${status}', workflowStatus='${workflowStatus}', canSubmitToFda=${canSubmitToFda}, workflowActionsCount=${availableWorkflowActions.length}`);

    // Build workflow action items
    // Filter out "Submit to FDA" workflow action since we have a dedicated submission option
    const filteredWorkflowActions = availableWorkflowActions.filter(
      action => action.toStatus !== 'Submitted' || action.label !== 'Submit to FDA'
    );
    const workflowItems: MenuProps['items'] = filteredWorkflowActions.map((action) => ({
      key: `workflow-${action.toStatus}`,
      icon: action.toStatus === 'Rejected' ? <CloseCircleFilled style={{ color: '#ff4d4f' }} /> :
            action.toStatus === 'Approved' ? <CheckCircleFilled style={{ color: '#52c41a' }} /> :
            <CheckSquareOutlined />,
      label: action.label,
      onClick: () => {
        console.log(`[App] Workflow action clicked: ${action.label} (toStatus: ${action.toStatus})`);
        handleWorkflowActionClick({
          toStatus: action.toStatus as WorkflowStatus,
          label: action.label,
          requiresComment: action.requiresComment,
          requiresSignature: action.requiresSignature,
          requiresAssignment: action.requiresAssignment
        });
      }
    }));

    const items: MenuProps['items'] = [];

    // Submission options available when case is approved
    if (canSubmitToFda) {
      items.push({
        key: 'submit-to-fda',
        icon: <SendOutlined style={{ color: '#2f54eb' }} />,
        label: 'Submit to FDA',
        onClick: () => {
          console.log('[App] Submit to FDA menu item clicked for case:', currentCase.id);
          useEsgApiStore.getState().openSubmitDialog(currentCase.id);
        }
      });
      items.push({
        key: 'export-xml',
        icon: <ExportOutlined />,
        label: 'Export XML (for manual SRP upload)',
        onClick: () => {
          console.log('[App] Export XML menu item clicked for case:', currentCase.id);
          handleExportXML();
        }
      });
      items.push({ type: 'divider' });
    }

    // Add workflow actions if any
    if (workflowItems.length > 0) {
      items.push(...workflowItems);
      items.push({ type: 'divider' });
    }

    // Follow-up and Nullification
    items.push(
      {
        key: 'create-followup',
        icon: <FileAddOutlined />,
        label: canCreateFollowup
          ? 'Create Follow-Up'
          : `Create Follow-Up (requires Submitted status, current: ${status})`,
        disabled: !canCreateFollowup,
        onClick: canCreateFollowup ? () => setShowFollowupDialog(true) : undefined
      },
      {
        key: 'nullify',
        icon: <StopOutlined />,
        label: canNullify
          ? 'Nullify Case'
          : `Nullify Case (requires Submitted status, current: ${status})`,
        disabled: !canNullify,
        onClick: canNullify ? () => setShowNullifyDialog(true) : undefined
      },
      { type: 'divider' },
      {
        key: 'version-history',
        icon: <HistoryOutlined />,
        label: 'Version History',
        onClick: () => setShowVersionTimeline(true)
      }
    );

    return items;
  }, [currentCase?.id, currentCase?.status, currentCase?.workflowStatus, availableWorkflowActions]);

  // Handle follow-up creation success
  const handleFollowupSuccess = (newCaseId: string) => {
    messageApi.success('Follow-up case created. Navigating to new case...');
    useCaseStore.getState().fetchCase(newCaseId);
    setActiveSection('report');
  };

  // Handle nullification success
  const handleNullifySuccess = (nullificationCaseId: string) => {
    messageApi.success('Nullification case created. Navigating to new case...');
    useCaseStore.getState().fetchCase(nullificationCaseId);
    setActiveSection('report');
  };

  // Handle workflow action click
  const handleWorkflowActionClick = async (action: { toStatus: WorkflowStatus; label: string; requiresComment?: boolean; requiresSignature?: boolean; requiresAssignment?: boolean }) => {
    if (action.requiresComment || action.requiresSignature || action.requiresAssignment) {
      setPendingWorkflowAction(action);
      setWorkflowComment('');
      setWorkflowAssignee(null);
      setSignaturePassword('');

      // Load users if assignment is required
      if (action.requiresAssignment) {
        try {
          const usersResult = await window.electronAPI.getUsers({ isActive: true });
          if (usersResult.success && usersResult.data) {
            setAssignableUsers(usersResult.data.users.map(u => ({
              id: u.id,
              username: u.username,
              firstName: u.firstName || '',
              lastName: u.lastName || ''
            })));
          }
        } catch (error) {
          console.error('Error loading users for assignment:', error);
          setAssignableUsers([]);
        }
      }

      setWorkflowActionModalVisible(true);
    } else {
      executeWorkflowTransition(action.toStatus, action.label);
    }
  };

  // Execute workflow transition
  const executeWorkflowTransition = async (
    toStatus: WorkflowStatus,
    label: string,
    comment?: string,
    assignTo?: string,
    signature?: { password: string; meaning: string }
  ) => {
    if (!currentCase) return;

    console.log(`[App] executeWorkflowTransition: case=${currentCase.id}, toStatus='${toStatus}', label='${label}'`);

    try {
      const result = await window.electronAPI.transitionWorkflow({
        caseId: currentCase.id,
        toStatus,
        comment,
        assignTo,
        signature
      });

      console.log(`[App] transitionWorkflow IPC result:`, JSON.stringify(result));

      if (result.success) {
        messageApi.success(`${label} completed successfully`);
        console.log(`[App] Refreshing case data after successful transition...`);
        // Refresh case data
        await useCaseStore.getState().fetchCase(currentCase.id);
        console.log(`[App] Refreshing workflow actions...`);
        // Refresh workflow actions
        const actionsResult = await window.electronAPI.getAvailableActions(currentCase.id);
        if (actionsResult.success && actionsResult.data) {
          console.log(`[App] New available actions:`, actionsResult.data.actions?.map(a => a.label).join(', '));
          setAvailableWorkflowActions(actionsResult.data.actions || []);
        }
        // Refresh dashboard stats to reflect status changes
        fetchDashboardStats();
        // Also refresh case list
        await useCaseStore.getState().fetchCases();
        console.log(`[App] All refreshes complete after workflow transition`);
      } else {
        console.log(`[App] Workflow transition failed:`, result.error);
        messageApi.error(`Failed to ${label.toLowerCase()}: ${result.error}`);
      }
    } catch (error) {
      console.error('[App] Workflow transition exception:', error);
      messageApi.error(`Failed to ${label.toLowerCase()}`);
    }
  };

  // Handle workflow modal OK
  const handleWorkflowModalOk = () => {
    if (pendingWorkflowAction) {
      if (pendingWorkflowAction.requiresComment && !workflowComment.trim()) {
        messageApi.warning('Please provide a comment for this action');
        return;
      }
      if (pendingWorkflowAction.requiresAssignment && !workflowAssignee) {
        messageApi.warning('Please select a user to assign the case to');
        return;
      }
      if (pendingWorkflowAction.requiresSignature && !signaturePassword.trim()) {
        messageApi.warning('Please enter your password to sign this action');
        return;
      }

      // Build signature object if required
      const signature = pendingWorkflowAction.requiresSignature
        ? {
            password: signaturePassword,
            meaning: `I approve this case for ${pendingWorkflowAction.label.toLowerCase()}`
          }
        : undefined;

      executeWorkflowTransition(
        pendingWorkflowAction.toStatus,
        pendingWorkflowAction.label,
        workflowComment || undefined,
        workflowAssignee || undefined,
        signature
      );
      setWorkflowActionModalVisible(false);
      setPendingWorkflowAction(null);
      setWorkflowComment('');
      setWorkflowAssignee(null);
      setSignaturePassword('');
    }
  };

  // Phase 3: Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div
        data-testid="loading-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f0f2f5'
        }}
      >
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#666' }}>Loading...</div>
      </div>
    );
  }

  // Phase 3: Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Phase 3: Show force change password if required
  if (mustChangePassword) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <ChangePasswordDialog
          visible={true}
          forced={true}
          onSuccess={() => {
            messageApi.success('Password changed successfully');
          }}
        />
      </div>
    );
  }

  // Render main content based on active section
  const renderContent = () => {
    // Dashboard view (Phase 2)
    if (activeSection === 'dashboard') {
      return (
        <SubmissionDashboard
          stats={dashboardStats}
          loading={loadingDashboard}
          onStatusClick={handleDashboardStatusClick}
          onCaseClick={handleDashboardCaseClick}
        />
      );
    }

    // Phase 3: User Management (admin only)
    if (activeSection === 'users') {
      return <UserListPage />;
    }

    // Phase 4: Products Management
    if (activeSection === 'products') {
      return <ProductList />;
    }

    // Phase 4: Batches Management
    if (activeSection === 'batches') {
      // Show detail view if a batch is selected
      if (selectedBatchId !== null) {
        return (
          <BatchDetail
            batchId={selectedBatchId}
            onBack={() => setSelectedBatchId(null)}
          />
        );
      }
      // Show batch list
      return (
        <BatchList
          onCreateBatch={() => setShowCreateBatchWizard(true)}
          onSelectBatch={(batchId) => setSelectedBatchId(batchId)}
        />
      );
    }

    // Phase 4: PSR Management
    if (activeSection === 'psr') {
      // Show detail view if a PSR is selected
      if (selectedPsrId !== null) {
        return (
          <PSRDetail
            psrId={selectedPsrId}
            onBack={() => setSelectedPsrId(null)}
          />
        );
      }
      // Show dashboard or list based on view mode
      if (psrView === 'dashboard') {
        return (
          <PSRDashboard
            onViewPSR={(psrId) => setSelectedPsrId(psrId)}
            onCreatePSR={() => setShowCreatePsrWizard(true)}
            onViewAllPSRs={() => setPsrView('list')}
          />
        );
      }
      // Show PSR list
      return (
        <PSRList
          onViewPSR={(psrId) => setSelectedPsrId(psrId)}
          onCreatePSR={() => setShowCreatePsrWizard(true)}
        />
      );
    }

    if (activeSection === 'cases' || !currentCase) {
      return <CaseList onSelectCase={(id) => {
        useCaseStore.getState().fetchCase(id);
        setActiveSection('report');
      }} />;
    }

    if (isCaseLoading || loadingRelated) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" tip="Loading case data..." />
        </div>
      );
    }

    // Render the appropriate form section
    const renderFormSection = () => {
      switch (activeSection) {
        case 'report':
          return (
            <ReportInfoSection
              caseData={currentCase}
              onChange={handleFieldChange}
            />
          );
        case 'classification':
          return (
            <ReportClassificationSection
              caseId={currentCase.id}
              disabled={currentCase.status !== 'Draft'}
              onChange={() => {
                // Refresh case data after classification changes
                useCaseStore.getState().fetchCase(currentCase.id);
              }}
            />
          );
        case 'reporter':
          return (
            <ReporterSection
              reporters={reporters}
              onAdd={handleAddReporter}
              onUpdate={handleUpdateReporter}
              onDelete={handleDeleteReporter}
            />
          );
        case 'sender':
          return (
            <SenderSection
              caseData={currentCase}
              onChange={handleFieldChange}
            />
          );
        case 'patient':
          return (
            <PatientSection
              caseData={currentCase}
              onChange={handleFieldChange}
            />
          );
        case 'reactions':
          return (
            <ReactionsSection
              reactions={reactions}
              onAdd={handleAddReaction}
              onUpdate={handleUpdateReaction}
              onDelete={handleDeleteReaction}
            />
          );
        case 'drugs':
          return (
            <DrugsSection
              drugs={drugs}
              onAdd={handleAddDrug}
              onUpdate={handleUpdateDrug}
              onDelete={handleDeleteDrug}
            />
          );
        case 'narrative':
          return (
            <NarrativeSection
              caseData={currentCase}
              onChange={handleFieldChange}
            />
          );
        default:
          return (
            <div className="empty-state">
              <div className="empty-state-title">
                Unknown section: {activeSection}
              </div>
            </div>
          );
      }
    };

    return (
      <Form layout="vertical" className="case-form" data-testid="case-form">
        <span data-testid="case-id" data-value={currentCase?.id} style={{ display: 'none' }} />
        {renderFormSection()}
      </Form>
    );
  };

  return (
    <Layout className="app-layout" data-testid="main-layout">
      {contextHolder}

      {/* Test Mode Banner */}
      {settingsStore.settings.submissionEnvironment === 'Test' && esgApiEnvironment !== 'Demo' && (
        <div style={{
          background: '#fa8c16',
          color: '#fff',
          textAlign: 'center',
          padding: '4px 16px',
          fontSize: '12px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}>
          <BugOutlined />
          TEST MODE - Exports will include _TEST in filename. Upload to FDA ESG NextGen USP and select &quot;Test Submission&quot;
        </div>
      )}

      {/* Demo Mode Banner */}
      <DemoModeBanner
        environment={esgApiEnvironment}
        onConfigureClick={settingsStore.openSettingsDialog}
      />

      {/* Header with Toolbar */}
      <Header className="app-header">
        <div className="logo">FAERS App</div>
        <div className="app-toolbar">
          <Space>
            <Tooltip title="New Case (Ctrl+N)">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleNewCase}
                data-testid="new-case-button"
              >
                New
              </Button>
            </Tooltip>

            <Tooltip title="Open Case List">
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => setActiveSection('cases')}
              >
                Open
              </Button>
            </Tooltip>

            <Tooltip title="Import Form 3500A PDF">
              <Button
                icon={<ImportOutlined />}
                onClick={handleImportForm3500}
                loading={isImporting}
              >
                Import 3500
              </Button>
            </Tooltip>

            <span className="toolbar-divider" />

            <Tooltip title="Save (Ctrl+S)">
              <Button
                icon={<SaveOutlined />}
                onClick={handleSave}
                disabled={!currentCase || !isDirty}
                loading={isSaving}
              >
                Save
              </Button>
            </Tooltip>

            <span className="toolbar-divider" />

            <Tooltip title="Validate (Ctrl+Shift+V)">
              <Button
                icon={<CheckSquareOutlined />}
                onClick={handleValidate}
                disabled={!currentCase}
                loading={isValidating}
              >
                Validate
              </Button>
            </Tooltip>

            {/* Phase 4: Actions Menu */}
            <Dropdown
              menu={{ items: actionsMenuItems }}
              trigger={['click']}
              disabled={!currentCase}
            >
              <Button
                icon={<MoreOutlined />}
                disabled={!currentCase}
                data-testid="actions-menu"
              >
                Actions <DownOutlined />
              </Button>
            </Dropdown>

            <span className="toolbar-divider" />

            <Tooltip title="Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={settingsStore.openSettingsDialog}
              >
                Settings
              </Button>
            </Tooltip>

            <span className="toolbar-divider" />

            {/* Phase 3: Notifications */}
            <NotificationCenter
              onNotificationClick={(notification) => {
                // Navigate to case if notification is case-related
                if (notification.entityType === 'case' && notification.entityId) {
                  useCaseStore.getState().fetchCase(notification.entityId);
                  setActiveSection('report');
                }
              }}
            />

            {/* Phase 3: User Menu */}
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Button icon={<UserOutlined />} data-testid="user-menu">
                {user?.username} <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Header>

      <Layout className="app-content">
        {/* Sidebar Navigation */}
        <Sider className="app-sidebar" width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            items={getNavItems()}
            onClick={handleNavClick}
          />
        </Sider>

        {/* Main Content */}
        <Content className="app-main">
          {renderContent()}

          {/* Validation Panel */}
          {showValidationPanel && (
            <ValidationPanel
              result={validationResult}
              onClose={() => setShowValidationPanel(false)}
              onNavigateToField={handleNavigateToField}
            />
          )}
        </Content>
      </Layout>

      {/* Status Bar */}
      <Footer className="app-statusbar">
        <div className="statusbar-left">
          <span className="status-item">
            {currentCase ? (
              <>
                <strong>Case:</strong> {currentCase.id}
              </>
            ) : (
              'No case selected'
            )}
          </span>
          {currentCase && (
            <span className={getStatusBadgeClass(currentCase.status)}>
              {currentCase.status}
            </span>
          )}
          {isDirty && (
            <span style={{ color: '#faad14' }}>● Unsaved changes</span>
          )}
        </div>
        <div className="statusbar-right">
          <span className="status-item">
            <strong>Environment:</strong>{' '}
            <span style={{
              color: settingsStore.settings.submissionEnvironment === 'Test' ? '#fa8c16' : '#52c41a',
              fontWeight: 500
            }}>
              {settingsStore.settings.submissionEnvironment || 'Test'}
            </span>
          </span>
          <span className="status-item">
            <strong>Last Saved:</strong>{' '}
            {currentCase?.updatedAt
              ? new Date(currentCase.updatedAt).toLocaleString()
              : '-'}
          </span>
        </div>
      </Footer>

      {/* Phase 2: Submission Dialogs */}
      <RecordSubmissionDialog
        visible={submissionStore.showRecordSubmissionDialog}
        caseId={submissionStore.dialogCaseId}
        onSubmit={submissionStore.recordSubmission}
        onCancel={submissionStore.closeDialogs}
      />

      <RecordAcknowledgmentDialog
        visible={submissionStore.showRecordAcknowledgmentDialog}
        caseId={submissionStore.dialogCaseId}
        onSubmit={submissionStore.recordAcknowledgment}
        onCancel={submissionStore.closeDialogs}
      />

      <SettingsDialog
        visible={settingsStore.showSettingsDialog}
        settings={settingsStore.settings}
        onSave={settingsStore.updateSettings}
        onCancel={settingsStore.closeSettingsDialog}
      />

      {/* Phase 2B: ESG API Submission Dialogs */}
      <SubmitToFdaDialog />
      <SubmissionProgressDialog />

      {/* Phase 3: Auth Dialogs */}
      <ChangePasswordDialog
        visible={showChangePasswordDialog}
        forced={false}
        onClose={() => setShowChangePasswordDialog(false)}
        onSuccess={() => {
          setShowChangePasswordDialog(false);
          messageApi.success('Password changed successfully');
        }}
      />

      <SessionTimeoutDialog
        onLogout={() => {
          messageApi.info('Session expired. Please log in again.');
        }}
      />

      {/* Phase 4: Batch Creation Wizard */}
      <CreateBatchWizard
        open={showCreateBatchWizard}
        onClose={() => setShowCreateBatchWizard(false)}
        onSuccess={(batchId) => {
          setShowCreateBatchWizard(false);
          setSelectedBatchId(batchId);
          messageApi.success('Batch created successfully');
        }}
      />

      {/* Phase 4: PSR Creation Wizard */}
      <CreatePSRWizard
        visible={showCreatePsrWizard}
        onClose={() => setShowCreatePsrWizard(false)}
        onSuccess={(psrId) => {
          setShowCreatePsrWizard(false);
          setSelectedPsrId(psrId);
          messageApi.success('PSR created successfully');
        }}
      />

      {/* Phase 4: Follow-up and Nullification Dialogs */}
      {currentCase && (
        <>
          <CreateFollowupDialog
            caseId={currentCase.id}
            visible={showFollowupDialog}
            onClose={() => setShowFollowupDialog(false)}
            onSuccess={handleFollowupSuccess}
          />

          <NullifyDialog
            caseId={currentCase.id}
            visible={showNullifyDialog}
            onClose={() => setShowNullifyDialog(false)}
            onSuccess={handleNullifySuccess}
          />

          <Modal
            title="Case Version History"
            open={showVersionTimeline}
            onCancel={() => setShowVersionTimeline(false)}
            footer={null}
            width={700}
          >
            <CaseVersionTimeline
              caseId={currentCase.id}
              onVersionSelect={(versionCaseId) => {
                setShowVersionTimeline(false);
                useCaseStore.getState().fetchCase(versionCaseId);
                setActiveSection('report');
              }}
            />
          </Modal>
        </>
      )}

      {/* Workflow Action Modal */}
      <Modal
        title={pendingWorkflowAction?.label || 'Workflow Action'}
        open={workflowActionModalVisible}
        onOk={handleWorkflowModalOk}
        onCancel={() => {
          setWorkflowActionModalVisible(false);
          setPendingWorkflowAction(null);
          setWorkflowComment('');
          setWorkflowAssignee(null);
          setSignaturePassword('');
        }}
        okText={pendingWorkflowAction?.requiresSignature ? 'Sign & Confirm' : 'Confirm'}
        cancelText="Cancel"
      >
        {pendingWorkflowAction?.requiresAssignment && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Assign to (Required):
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a user to assign"
              value={workflowAssignee}
              onChange={(value) => setWorkflowAssignee(value)}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {assignableUsers.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName} (${user.username})`
                    : user.username}
                </Select.Option>
              ))}
            </Select>
          </div>
        )}
        {pendingWorkflowAction?.requiresComment && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              {pendingWorkflowAction.toStatus === 'Rejected' ? 'Rejection Reason (Required):' : 'Comment (Required):'}
            </label>
            <Input.TextArea
              rows={4}
              value={workflowComment}
              onChange={(e) => setWorkflowComment(e.target.value)}
              placeholder={pendingWorkflowAction.toStatus === 'Rejected'
                ? 'Please provide a reason for rejection...'
                : 'Please provide a comment for this action...'
              }
            />
          </div>
        )}
        {pendingWorkflowAction?.requiresSignature && (
          <div style={{ marginTop: 16 }}>
            <div style={{ padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#d46b08' }}>
                <strong>Electronic Signature Required</strong><br />
                By signing, you certify: "I approve this case for {pendingWorkflowAction.label.toLowerCase()}"
              </p>
            </div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Enter your password to sign:
            </label>
            <Input.Password
              value={signaturePassword}
              onChange={(e) => setSignaturePassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default App;
