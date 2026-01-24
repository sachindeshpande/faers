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
  UnorderedListOutlined
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
import type { Case, CaseDrug, CaseReaction, CaseReporter } from '../shared/types/case.types';

const { Header, Sider, Content, Footer } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

// Navigation menu items matching form sections
const navItems: MenuItem[] = [
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
    label: 'Report Info'
  },
  {
    key: 'reporter',
    icon: <UserOutlined />,
    label: 'Reporter'
  },
  {
    key: 'sender',
    icon: <SendOutlined />,
    label: 'Sender'
  },
  {
    key: 'patient',
    icon: <MedicineBoxOutlined />,
    label: 'Patient'
  },
  {
    key: 'reactions',
    icon: <WarningOutlined />,
    label: 'Reactions'
  },
  {
    key: 'drugs',
    icon: <ExperimentOutlined />,
    label: 'Drugs'
  },
  {
    key: 'narrative',
    icon: <EditOutlined />,
    label: 'Narrative'
  }
];

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

  // Handle validate (placeholder)
  const handleValidate = () => {
    if (!currentCase) {
      messageApi.warning('No case selected');
      return;
    }
    messageApi.info('Validation will be implemented in M3');
  };

  // Handle export XML (placeholder)
  const handleExportXML = () => {
    if (!currentCase) {
      messageApi.warning('No case selected');
      return;
    }
    messageApi.info('XML export will be implemented in M4');
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

  // Get status badge class
  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Draft':
        return 'status-badge draft';
      case 'Ready':
        return 'status-badge ready';
      case 'Exported':
        return 'status-badge exported';
      default:
        return 'status-badge';
    }
  };

  // Render main content based on active section
  const renderContent = () => {
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
          </Space>
        </div>
      </Header>

      <Layout className="app-content">
        {/* Sidebar Navigation */}
        <Sider className="app-sidebar" width={200} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            items={navItems}
            onClick={handleNavClick}
          />
        </Sider>

        {/* Main Content */}
        <Content className="app-main">
          {renderContent()}
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
            <strong>Last Saved:</strong>{' '}
            {currentCase?.updatedAt
              ? new Date(currentCase.updatedAt).toLocaleString()
              : '-'}
          </span>
        </div>
      </Footer>
    </Layout>
  );
};

export default App;
