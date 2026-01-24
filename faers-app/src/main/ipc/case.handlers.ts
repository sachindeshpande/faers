/**
 * IPC Handlers for Case operations
 */

import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import { getDatabase, backupDatabase, restoreDatabase } from '../database/connection';
import {
  CaseRepository,
  ReactionRepository,
  DrugRepository,
  ReporterRepository
} from '../database/repositories';
import { Form3500ImportService } from '../services/form3500ImportService';
import { XMLGeneratorService } from '../services/xmlGeneratorService';
import { ValidationService } from '../services/validationService';
import { IPC_CHANNELS } from '../../shared/types/ipc.types';
import type {
  CaseFilterOptions,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseReporter,
  CaseReaction,
  CaseDrug
} from '../../shared/types/case.types';
import type { IPCResponse, Country, SaveDialogOptions, OpenDialogOptions } from '../../shared/types/ipc.types';

// Helper to wrap handlers with error handling
function wrapHandler<T, R>(
  handler: (arg: T) => R
): (event: Electron.IpcMainInvokeEvent, arg: T) => Promise<IPCResponse<R>> {
  return async (_, arg) => {
    try {
      const data = handler(arg);
      return { success: true, data };
    } catch (error) {
      console.error('IPC Handler Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
}

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(): void {
  const db = getDatabase();
  const caseRepo = new CaseRepository(db);
  const reactionRepo = new ReactionRepository(db);
  const drugRepo = new DrugRepository(db);
  const reporterRepo = new ReporterRepository(db);

  // Case operations
  ipcMain.handle(
    IPC_CHANNELS.CASE_LIST,
    wrapHandler((filters?: CaseFilterOptions) => caseRepo.findAll(filters || {}))
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_GET,
    wrapHandler(({ id, includeRelated }: { id: string; includeRelated?: boolean }) => {
      const caseData = caseRepo.findById(id);
      if (!caseData) {
        throw new Error(`Case not found: ${id}`);
      }

      if (includeRelated) {
        caseData.reporters = reporterRepo.findByCaseId(id);
        caseData.reactions = reactionRepo.findByCaseId(id);
        caseData.drugs = drugRepo.findByCaseId(id);
      }

      return caseData;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_CREATE,
    wrapHandler((data?: CreateCaseDTO) => caseRepo.create(data))
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_UPDATE,
    wrapHandler(({ id, data }: { id: string; data: UpdateCaseDTO }) => {
      const result = caseRepo.update(id, data);
      if (!result) {
        throw new Error(`Case not found: ${id}`);
      }
      return result;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_DELETE,
    wrapHandler((id: string) => {
      const success = caseRepo.delete(id);
      if (!success) {
        throw new Error(`Cannot delete case: ${id}. Only Draft cases can be deleted.`);
      }
      return undefined;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_DUPLICATE,
    wrapHandler((id: string) => {
      const result = caseRepo.duplicate(id);
      if (!result) {
        throw new Error(`Case not found: ${id}`);
      }
      return result;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.CASE_COUNT,
    wrapHandler(() => caseRepo.count())
  );

  // Validation
  const validationService = new ValidationService(db);

  ipcMain.handle(
    IPC_CHANNELS.CASE_VALIDATE,
    wrapHandler((id: string) => validationService.validate(id))
  );

  // Reporter operations
  ipcMain.handle(
    IPC_CHANNELS.REPORTER_LIST,
    wrapHandler((caseId: string) => reporterRepo.findByCaseId(caseId))
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTER_SAVE,
    wrapHandler((reporter: CaseReporter) => reporterRepo.save(reporter))
  );

  ipcMain.handle(
    IPC_CHANNELS.REPORTER_DELETE,
    wrapHandler((id: number) => {
      const success = reporterRepo.delete(id);
      if (!success) {
        throw new Error(`Reporter not found: ${id}`);
      }
      return undefined;
    })
  );

  // Reaction operations
  ipcMain.handle(
    IPC_CHANNELS.REACTION_LIST,
    wrapHandler((caseId: string) => reactionRepo.findByCaseId(caseId))
  );

  ipcMain.handle(
    IPC_CHANNELS.REACTION_SAVE,
    wrapHandler((reaction: CaseReaction) => reactionRepo.save(reaction))
  );

  ipcMain.handle(
    IPC_CHANNELS.REACTION_DELETE,
    wrapHandler((id: number) => {
      const success = reactionRepo.delete(id);
      if (!success) {
        throw new Error(`Reaction not found: ${id}`);
      }
      return undefined;
    })
  );

  // Drug operations
  ipcMain.handle(
    IPC_CHANNELS.DRUG_LIST,
    wrapHandler((caseId: string) => drugRepo.findByCaseId(caseId))
  );

  ipcMain.handle(
    IPC_CHANNELS.DRUG_SAVE,
    wrapHandler((drug: CaseDrug) => drugRepo.save(drug))
  );

  ipcMain.handle(
    IPC_CHANNELS.DRUG_DELETE,
    wrapHandler((id: number) => {
      const success = drugRepo.delete(id);
      if (!success) {
        throw new Error(`Drug not found: ${id}`);
      }
      return undefined;
    })
  );

  // Database operations
  ipcMain.handle(
    IPC_CHANNELS.DB_BACKUP,
    wrapHandler(() => backupDatabase())
  );

  ipcMain.handle(
    IPC_CHANNELS.DB_RESTORE,
    wrapHandler((filePath: string) => {
      restoreDatabase(filePath);
      return undefined;
    })
  );

  // Settings operations
  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    wrapHandler((key: string) => {
      const row = db.prepare(
        'SELECT value FROM settings WHERE key = ?'
      ).get(key) as { value: string } | undefined;
      return row?.value ?? null;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SET,
    wrapHandler(({ key, value }: { key: string; value: string }) => {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
      `).run(key, value, now, value, now);
      return undefined;
    })
  );

  // Lookup data
  ipcMain.handle(
    IPC_CHANNELS.LOOKUP_COUNTRIES,
    wrapHandler(() => {
      const rows = db.prepare(
        'SELECT code, name FROM lookup_countries ORDER BY name'
      ).all() as Country[];
      return rows;
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.LOOKUP_MEDDRA,
    wrapHandler((query: string) => {
      if (!query || query.length < 2) {
        return [];
      }
      const rows = db.prepare(`
        SELECT code, term, pt_code, version
        FROM lookup_meddra_terms
        WHERE term LIKE ?
        ORDER BY term
        LIMIT 50
      `).all(`%${query}%`);
      return rows;
    })
  );

  // File dialogs
  ipcMain.handle(
    IPC_CHANNELS.FILE_SAVE_DIALOG,
    async (_, options: SaveDialogOptions) => {
      try {
        const result = await dialog.showSaveDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          filters: options.filters
        });

        return {
          success: true,
          data: result.canceled ? null : result.filePath
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Dialog error'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.FILE_OPEN_DIALOG,
    async (_, options: OpenDialogOptions) => {
      try {
        const result = await dialog.showOpenDialog({
          title: options.title,
          defaultPath: options.defaultPath,
          filters: options.filters,
          properties: options.properties
        });

        return {
          success: true,
          data: result.canceled ? null : result.filePaths
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Dialog error'
        };
      }
    }
  );

  // Form 3500A Import
  const importService = new Form3500ImportService(db);

  ipcMain.handle(
    IPC_CHANNELS.IMPORT_FORM3500,
    async (_, filePath: string) => {
      try {
        const result = await importService.import(filePath);
        return {
          success: result.success,
          data: result,
          error: result.errors.length > 0 ? result.errors.join('; ') : undefined
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Import error'
        };
      }
    }
  );

  // XML Generation and Export
  const xmlService = new XMLGeneratorService(db);

  ipcMain.handle(
    IPC_CHANNELS.XML_GENERATE,
    async (_, caseId: string) => {
      try {
        const result = xmlService.generate(caseId);
        if (!result.success) {
          return {
            success: false,
            error: result.errors.join('; ')
          };
        }
        return {
          success: true,
          data: result.xml
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'XML generation error'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.XML_EXPORT,
    async (_, { caseId, filePath }: { caseId: string; filePath: string }) => {
      try {
        const result = xmlService.generate(caseId);
        if (!result.success) {
          return {
            success: false,
            error: result.errors.join('; ')
          };
        }

        // Write XML to file
        fs.writeFileSync(filePath, result.xml!, 'utf-8');

        // Update case with export info
        const now = new Date().toISOString();
        caseRepo.update(caseId, {
          status: 'Exported',
          exportedAt: now,
          exportedXmlPath: filePath
        });

        return {
          success: true,
          data: undefined
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'XML export error'
        };
      }
    }
  );

  console.log('IPC handlers registered');
}
