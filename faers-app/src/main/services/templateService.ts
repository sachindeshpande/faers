/**
 * Template Service
 * Business logic for case templates
 */

import { TemplateRepository } from '../database/repositories/template.repository';
import type {
  CaseTemplate,
  TemplateListItem,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateFilter,
  ApplyTemplateResult,
  EXCLUDED_TEMPLATE_FIELDS
} from '../../shared/types/template.types';
import type { Case } from '../../shared/types/case.types';

// Fields to exclude when creating a template from a case
const EXCLUDED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'version',
  'safetyReportId',
  'worldwideCaseId',
  'exportedAt',
  'exportedXmlPath',
  'submissionId',
  'lastSubmittedAt',
  'srpConfirmationNumber',
  'fdaCaseNumber',
  'acknowledgmentDate',
  'workflowStatus',
  'createdBy',
  'currentOwner',
  'currentAssignee',
  'dueDate',
  'rejectionCount',
  'lastRejectionReason',
  'parentCaseId',
  'caseVersion',
  'isNullified'
];

export class TemplateService {
  private repository: TemplateRepository;

  constructor(repository: TemplateRepository) {
    this.repository = repository;
  }

  // ============ Template CRUD ============

  /**
   * Get templates with filtering
   */
  getTemplates(filter?: TemplateFilter, limit?: number, offset?: number): { items: TemplateListItem[]; total: number } {
    return this.repository.getTemplates(filter, limit, offset);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: number): CaseTemplate | null {
    return this.repository.getTemplateById(id);
  }

  /**
   * Create a new template
   */
  createTemplate(request: CreateTemplateRequest, createdBy?: string): CaseTemplate {
    return this.repository.createTemplate(request, createdBy);
  }

  /**
   * Update a template
   */
  updateTemplate(request: UpdateTemplateRequest): CaseTemplate | null {
    return this.repository.updateTemplate(request);
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: number): boolean {
    return this.repository.deleteTemplate(id);
  }

  /**
   * Approve a template for global use
   */
  approveTemplate(id: number, approvedBy: string): CaseTemplate | null {
    return this.repository.approveTemplate(id, approvedBy);
  }

  // ============ Template Application ============

  /**
   * Apply a template to create a new case
   * Returns the template data to be used when creating a case
   */
  applyTemplate(templateId: number): ApplyTemplateResult {
    const template = this.repository.getTemplateById(templateId);

    if (!template) {
      return {
        success: false,
        templateId,
        templateName: 'Unknown',
        fieldsApplied: 0,
        lockedFields: [],
        error: 'Template not found'
      };
    }

    if (!template.isActive) {
      return {
        success: false,
        templateId,
        templateName: template.name,
        fieldsApplied: 0,
        lockedFields: [],
        error: 'Template is not active'
      };
    }

    const templateData = template.templateData;
    const fieldsApplied = Object.keys(templateData).filter(
      k => templateData[k] !== null && templateData[k] !== undefined
    ).length;

    return {
      success: true,
      templateId,
      templateName: template.name,
      fieldsApplied,
      lockedFields: template.lockedFields || []
    };
  }

  /**
   * Get template data for case creation
   */
  getTemplateData(templateId: number): Record<string, unknown> | null {
    const template = this.repository.getTemplateById(templateId);
    if (!template || !template.isActive) return null;
    return template.templateData;
  }

  /**
   * Record template usage
   */
  recordUsage(templateId: number, caseId: string, usedBy?: string): void {
    this.repository.recordUsage(templateId, caseId, usedBy);
  }

  // ============ Template Creation from Case ============

  /**
   * Create a template from an existing case
   */
  createTemplateFromCase(
    caseData: Case,
    name: string,
    description?: string,
    category?: string,
    createdBy?: string
  ): CaseTemplate {
    // Extract template-relevant fields from case
    const templateData: Record<string, unknown> = {};

    // Process case data, excluding non-template fields
    for (const [key, value] of Object.entries(caseData)) {
      if (!EXCLUDED_FIELDS.includes(key) && value !== null && value !== undefined) {
        // Handle special cases
        if (Array.isArray(value)) {
          // Skip arrays for now (reporters, reactions, drugs have their own handling)
          continue;
        }
        if (typeof value === 'object') {
          // Skip nested objects
          continue;
        }
        templateData[key] = value;
      }
    }

    const request: CreateTemplateRequest = {
      name,
      description,
      category: category as 'vaccine' | 'medication_error' | 'device_malfunction' | 'overdose' | 'pediatric' | 'pregnancy' | 'product_specific' | 'other' | undefined,
      templateData,
      isGlobal: false
    };

    return this.repository.createTemplate(request, createdBy);
  }

  // ============ Usage Statistics ============

  /**
   * Get usage history for a template
   */
  getUsageHistory(templateId: number, limit?: number, offset?: number) {
    return this.repository.getUsageHistory(templateId, limit, offset);
  }
}
