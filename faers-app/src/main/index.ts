/**
 * Electron Main Process Entry Point
 *
 * Initializes the application, creates the main window,
 * and sets up IPC handlers.
 */

import { app, BrowserWindow, shell, Menu, MenuItemConstructorOptions } from 'electron';
import { join } from 'path';
import { initDatabase, closeDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc/case.handlers';
import { registerSubmissionHandlers } from './ipc/submission.handlers';
import { registerAuthHandlers } from './ipc/auth.handlers';
import { registerNotificationHandlers } from './ipc/notification.handlers';
import { registerWorkflowHandlers } from './ipc/workflow.handlers';
import { registerAuditHandlers } from './ipc/audit.handlers';
// Phase 4
import { registerProductHandlers } from './ipc/product.handlers';
import { registerReportTypeHandlers } from './ipc/reportType.handlers';
import { registerFollowupHandlers } from './ipc/followup.handlers';
import { registerBatchHandlers } from './ipc/batch.handlers';
import { registerPSRHandlers } from './ipc/psr.handlers';
// Phase 5
import { registerMedDRAHandlers } from './ipc/meddra.handlers';
import { MedDRAService } from './services/meddraService';
import { MedDRARepository } from './database/repositories/meddra.repository';
import { registerWHODrugHandlers } from './ipc/whodrug.handlers';
import { WHODrugService } from './services/whodrugService';
import { WHODrugRepository } from './database/repositories/whodrug.repository';
import { registerSearchHandlers } from './ipc/search.handlers';
import { SearchService } from './services/searchService';
import { SearchRepository } from './database/repositories/search.repository';
import { registerDuplicateHandlers } from './ipc/duplicate.handlers';
import { DuplicateService } from './services/duplicateService';
import { DuplicateRepository } from './database/repositories/duplicate.repository';
import { registerTemplateHandlers } from './ipc/template.handlers';
import { TemplateService } from './services/templateService';
import { TemplateRepository } from './database/repositories/template.repository';
import { registerImportHandlers } from './ipc/import.handlers';
import { ImportService } from './services/importService';
import { ImportRepository } from './database/repositories/import.repository';
import { registerValidationHandlers } from './ipc/validation.handlers';
import { ValidationEngineService } from './services/validationEngineService';
import { ValidationRepository } from './database/repositories/validation.repository';
import { SYSTEM_VALIDATION_RULES } from '../shared/types/validation.types';
import { getDatabase } from './database/connection';
// Phase 2B - ESG API Integration
import { registerEsgApiHandlers } from './ipc/esgApi.handlers';
import { EsgSubmissionRepository } from './database/repositories/esgSubmission.repository';
import { CredentialStorageService } from './services/credentialStorageService';
import { EsgAuthService } from './services/esgAuthService';
import { EsgApiService } from './services/esgApiService';
import { EsgSubmissionService } from './services/esgSubmissionService';
import { EsgPollingService } from './services/esgPollingService';
import { StatusTransitionService } from './services/statusTransitionService';
import { XMLGeneratorService } from './services/xmlGeneratorService';
import { MockEsgApiService } from './services/mockEsgApiService';

let mainWindow: BrowserWindow | null = null;
let esgPollingService: EsgPollingService | null = null;

// Development mode check - evaluated lazily to avoid issues at module load time
const isDev = (): boolean => !app.isPackaged;

/**
 * Create the main application window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: false,
    title: 'FAERS Submission App',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load the app
  if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in development (but not during E2E tests)
  if (isDev() && process.env.NODE_ENV !== 'test') {
    mainWindow.webContents.openDevTools();
  }
}

/**
 * Create the application menu
 */
function createMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Case',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu:new-case');
          }
        },
        {
          label: 'Open Case',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu:open-case');
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu:save');
          }
        },
        { type: 'separator' },
        {
          label: 'Backup Database',
          click: () => {
            mainWindow?.webContents.send('menu:backup');
          }
        },
        {
          label: 'Restore from Backup',
          click: () => {
            mainWindow?.webContents.send('menu:restore');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Case',
      submenu: [
        {
          label: 'Validate',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow?.webContents.send('menu:validate');
          }
        },
        {
          label: 'Export XML',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu:export-xml');
          }
        },
        { type: 'separator' },
        {
          label: 'Duplicate Case',
          click: () => {
            mainWindow?.webContents.send('menu:duplicate');
          }
        },
        {
          label: 'Delete Case',
          click: () => {
            mainWindow?.webContents.send('menu:delete');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Settings',
          click: () => {
            mainWindow?.webContents.send('menu:settings');
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About FAERS App',
          click: () => {
            mainWindow?.webContents.send('menu:about');
          }
        },
        { type: 'separator' },
        {
          label: 'FDA FAERS Documentation',
          click: () => {
            shell.openExternal('https://www.fda.gov/drugs/fdas-adverse-event-reporting-system-faers/fda-adverse-event-reporting-system-faers-electronic-submissions');
          }
        },
        {
          label: 'E2B(R3) Implementation Guide',
          click: () => {
            shell.openExternal('https://www.ich.org/page/electronic-submission-individual-case-safety-reports-icsrs');
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
  // Set app user model id for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev() ? process.execPath : 'com.faers.submission-app');
  }

  // Initialize database
  console.log('Initializing database...');
  initDatabase();

  // Register IPC handlers
  console.log('Registering IPC handlers...');
  registerIpcHandlers();
  registerSubmissionHandlers();
  registerAuthHandlers();
  registerNotificationHandlers();
  registerWorkflowHandlers();
  registerAuditHandlers();
  // Phase 4
  registerProductHandlers();
  registerReportTypeHandlers();
  registerFollowupHandlers();
  registerBatchHandlers();
  registerPSRHandlers();
  // Phase 5
  const db = getDatabase();
  const meddraRepository = new MedDRARepository(db);
  const meddraService = new MedDRAService(meddraRepository);
  registerMedDRAHandlers(meddraService);
  const whodrugRepository = new WHODrugRepository(db);
  const whodrugService = new WHODrugService(whodrugRepository);
  registerWHODrugHandlers(whodrugService);
  const searchRepository = new SearchRepository(db);
  const searchService = new SearchService(searchRepository);
  registerSearchHandlers(searchService);
  const duplicateRepository = new DuplicateRepository(db);
  const duplicateService = new DuplicateService(duplicateRepository);
  registerDuplicateHandlers(duplicateService);
  const templateRepository = new TemplateRepository(db);
  const templateService = new TemplateService(templateRepository);
  registerTemplateHandlers(templateService);
  const importRepository = new ImportRepository(db);
  const importService = new ImportService(importRepository);
  registerImportHandlers(importService);
  const validationRepository = new ValidationRepository(db);
  const validationEngineService = new ValidationEngineService(validationRepository);
  validationEngineService.initializeSystemRules(SYSTEM_VALIDATION_RULES);
  registerValidationHandlers(validationEngineService, db);

  // Phase 2B - ESG API Services
  console.log('Initializing ESG API services...');
  const esgRepo = new EsgSubmissionRepository(db);
  const credentialStorage = new CredentialStorageService();
  const esgAuthService = new EsgAuthService(credentialStorage);
  const esgApiService = new EsgApiService(esgAuthService);
  const statusTransitionService = new StatusTransitionService(db);
  const xmlGeneratorService = new XMLGeneratorService(db);
  const mockApiService = new MockEsgApiService();
  const esgSubmissionService = new EsgSubmissionService(db, esgApiService, xmlGeneratorService, statusTransitionService);
  esgPollingService = new EsgPollingService(db, esgApiService, statusTransitionService);
  registerEsgApiHandlers({
    credentialStorage,
    authService: esgAuthService,
    submissionService: esgSubmissionService,
    pollingService: esgPollingService,
    esgRepo,
    mockApiService
  });

  // Create menu
  createMenu();

  // Create main window
  createWindow();

  // Start ESG acknowledgment polling after window is ready
  if (esgPollingService) {
    console.log('Starting ESG acknowledgment polling...');
    esgPollingService.startPolling();
  }

  // macOS: recreate window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  // Stop ESG polling
  if (esgPollingService) {
    console.log('Stopping ESG acknowledgment polling...');
    esgPollingService.stopPolling();
  }
  console.log('Closing database...');
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
