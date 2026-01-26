/**
 * Main Application Component
 *
 * Implements the layout from REQ-UI-001:
 * - Menu Bar (handled by Electron)
 * - Toolbar
 * - Navigation Panel (sidebar)
 * - Main Content Area
 * - Status Bar
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Layout, Menu, Button, Space, Tooltip, message, Form, Spin } from 'antd';
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
  CloseCircleFilled,
  DashboardOutlined,
  SettingOutlined,
  BugOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useCaseStore, useCurrentCase, useCaseActions } from './stores/caseStore';
import CaseList from './components/case-list/CaseList';
import {
  ReportInfoSection,
  ReporterSection,
  SenderSection,
  PatientSection,
  ReactionsSection,
  DrugsSection,
  NarrativeSection
} from './components/case-form';
import type { Case, CaseDrug, CaseReaction, CaseReporter, ValidationResult, CaseStatus } from '../shared/types/case.types';
import ValidationPanel from './components/validation/ValidationPanel';
import {
  SubmissionDashboard,
  RecordSubmissionDialog,
  RecordAcknowledgmentDialog,
  SettingsDialog
} from './components/submission';
import { useSubmissionStore, useDashboard } from './stores/submissionStore';
import { useSettingsStore } from './stores/settingsStore';

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

  // Load dashboard stats on mount
  useEffect(() => {
    fetchDashboardStats();
    settingsStore.loadSettings();
  }, []);

  // Load cases on mount
  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

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
    setActiveSection(e.key);
  };

  // Check if a section has validation errors
  const getSectionErrors = (sectionKey: string): boolean => {
    if (!validationResult) return false;

    const sectionFieldMap: Record<string, string[]> = {
      report: ['reportType', 'initialOrFollowup', 'receiptDate', 'receiveDate', 'nullification'],
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

  // Generate nav items with indicators
  const getNavItems = (): MenuItem[] => [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'cases',
      icon: <UnorderedListOutlined />,
      label: 'Case List'
    },
    {
      type: 'divider'
    },
    {
      key: 'report',
      icon: <FileTextOutlined />,
      label: createNavLabel('Report Info', getSectionHasData('report'), getSectionErrors('report'))
    },
    {
      key: 'reporter',
      icon: <UserOutlined />,
      label: createNavLabel('Reporter', getSectionHasData('reporter'), getSectionErrors('reporter'))
    },
    {
      key: 'sender',
      icon: <SendOutlined />,
      label: createNavLabel('Sender', getSectionHasData('sender'), getSectionErrors('sender'))
    },
    {
      key: 'patient',
      icon: <MedicineBoxOutlined />,
      label: createNavLabel('Patient', getSectionHasData('patient'), getSectionErrors('patient'))
    },
    {
      key: 'reactions',
      icon: <WarningOutlined />,
      label: createNavLabel('Reactions', getSectionHasData('reactions'), getSectionErrors('reactions'))
    },
    {
      key: 'drugs',
      icon: <ExperimentOutlined />,
      label: createNavLabel('Drugs', getSectionHasData('drugs'), getSectionErrors('drugs'))
    },
    {
      key: 'narrative',
      icon: <EditOutlined />,
      label: createNavLabel('Narrative', getSectionHasData('narrative'), getSectionErrors('narrative'))
    }
  ];

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
      <Form layout="vertical" className="case-form">
        {renderFormSection()}
      </Form>
    );
  };

  return (
    <Layout className="app-layout">
      {contextHolder}

      {/* Test Mode Banner */}
      {settingsStore.settings.submissionEnvironment === 'Test' && (
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
          TEST MODE - Exports will include _TEST in filename. Upload to FDA ESG NextGen USP and select "Test Submission"
        </div>
      )}

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

            <Tooltip title="Export XML (Ctrl+E)">
              <Button
                icon={<ExportOutlined />}
                onClick={handleExportXML}
                disabled={!currentCase}
              >
                Export XML
              </Button>
            </Tooltip>

            <span className="toolbar-divider" />

            <Tooltip title="Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={settingsStore.openSettingsDialog}
              >
                Settings
              </Button>
            </Tooltip>
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
    </Layout>
  );
};

export default App;
