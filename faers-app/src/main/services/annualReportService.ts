/**
 * Annual Report Service - Phase 6
 * Case aggregation, summary tabulations for IND Annual Safety Reports
 */

import type { AnnualReportRequest, AnnualReportData, AnnualReportLineListing, SummaryTabulation, SOCSummaryEntry, CausalitySummaryEntry, OutcomeSummaryEntry } from '../../shared/types/annualReport.types';

type DatabaseInstance = ReturnType<typeof import('better-sqlite3')>;

export class AnnualReportService {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  generate(request: AnnualReportRequest): AnnualReportData {
    const study = this.db.prepare('SELECT * FROM studies WHERE id = ?').get(request.studyId) as any;
    if (!study) throw new Error('Study not found');

    // Get all IND cases for this study in the reporting period
    const cases = this.db.prepare(`
      SELECT c.*,
        (SELECT GROUP_CONCAT(cr.reaction_term, '; ') FROM case_reactions cr WHERE cr.case_id = c.id) as reaction_terms,
        (SELECT MAX(CASE WHEN cr.serious_death = 1 OR cr.serious_life_threat = 1 OR cr.serious_hospitalization = 1 OR cr.serious_disability = 1 OR cr.serious_congenital = 1 OR cr.serious_other = 1 THEN 1 ELSE 0 END) FROM case_reactions cr WHERE cr.case_id = c.id) as is_serious_calc,
        ss.site_name
      FROM cases c
      LEFT JOIN study_sites ss ON ss.id = c.site_id
      WHERE c.study_id = ? AND c.case_type = 'ind'
        AND c.created_at >= ? AND c.created_at <= ?
      ORDER BY c.created_at
    `).all(request.studyId, request.periodStart, request.periodEnd + 'T23:59:59') as any[];

    const lineListings: AnnualReportLineListing[] = [];
    let seriousUnexpected = 0;
    let seriousExpected = 0;
    let nonSerious = 0;

    for (const c of cases) {
      const isSerious = c.is_serious_calc === 1;
      const isExpected = c.is_expected === 1;
      let category: AnnualReportLineListing['category'];

      if (isSerious && !isExpected) { category = 'serious_unexpected'; seriousUnexpected++; }
      else if (isSerious && isExpected) { category = 'serious_expected'; seriousExpected++; }
      else { category = 'non_serious'; nonSerious++; }

      // Get causality for this case
      const causality = this.db.prepare(
        "SELECT relationship FROM case_causality WHERE case_id = ? AND assessor_type = 'sponsor' LIMIT 1"
      ).get(c.id) as any;

      // Get outcome from first reaction
      const firstReaction = this.db.prepare('SELECT outcome FROM case_reactions WHERE case_id = ? LIMIT 1').get(c.id) as any;

      lineListings.push({
        caseId: c.id,
        subjectNumber: c.subject_number || undefined,
        siteName: c.site_name || undefined,
        eventTerm: c.reaction_terms || '',
        seriousness: isSerious ? 'Serious' : 'Non-serious',
        causality: causality?.relationship || 'Not assessed',
        expectedness: isExpected ? 'Expected' : 'Unexpected',
        outcome: this.mapOutcome(firstReaction?.outcome),
        onsetDate: undefined,
        reportDate: c.created_at,
        indReportType: c.ind_report_type || undefined,
        category
      });
    }

    // Summary tabulations
    const summaryTabulations: SummaryTabulation[] = [
      { category: 'Seriousness', subcategory: 'Serious - Unexpected', count: seriousUnexpected, percentage: cases.length > 0 ? (seriousUnexpected / cases.length) * 100 : 0 },
      { category: 'Seriousness', subcategory: 'Serious - Expected', count: seriousExpected, percentage: cases.length > 0 ? (seriousExpected / cases.length) * 100 : 0 },
      { category: 'Seriousness', subcategory: 'Non-serious', count: nonSerious, percentage: cases.length > 0 ? (nonSerious / cases.length) * 100 : 0 }
    ];

    // Causality summary
    const causalityCounts = this.db.prepare(`
      SELECT cc.relationship, COUNT(*) as cnt
      FROM case_causality cc
      INNER JOIN cases c ON c.id = cc.case_id
      WHERE c.study_id = ? AND cc.assessor_type = 'sponsor'
        AND c.created_at >= ? AND c.created_at <= ?
      GROUP BY cc.relationship
    `).all(request.studyId, request.periodStart, request.periodEnd + 'T23:59:59') as any[];

    const causalitySummary: CausalitySummaryEntry[] = causalityCounts.map(c => ({
      relationship: c.relationship,
      count: c.cnt,
      percentage: cases.length > 0 ? (c.cnt / cases.length) * 100 : 0
    }));

    // Outcome summary
    const outcomeCounts = this.db.prepare(`
      SELECT cr.outcome, COUNT(DISTINCT c.id) as cnt
      FROM case_reactions cr
      INNER JOIN cases c ON c.id = cr.case_id
      WHERE c.study_id = ? AND c.case_type = 'ind'
        AND c.created_at >= ? AND c.created_at <= ?
      GROUP BY cr.outcome
    `).all(request.studyId, request.periodStart, request.periodEnd + 'T23:59:59') as any[];

    const outcomeSummary: OutcomeSummaryEntry[] = outcomeCounts.map(o => ({
      outcome: this.mapOutcome(o.outcome),
      count: o.cnt,
      percentage: cases.length > 0 ? (o.cnt / cases.length) * 100 : 0
    }));

    return {
      studyId: request.studyId,
      studyTitle: study.study_title,
      protocolNumber: study.protocol_number,
      indNumber: request.indNumber,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      totalCases: cases.length,
      seriousUnexpectedCount: seriousUnexpected,
      seriousExpectedCount: seriousExpected,
      nonSeriousCount: nonSerious,
      lineListings,
      summaryTabulations,
      socSummary: [], // Would require MedDRA coding to populate
      causalitySummary,
      outcomeSummary
    };
  }

  private mapOutcome(code: number | null | undefined): string {
    switch (code) {
      case 1: return 'Recovered';
      case 2: return 'Recovering';
      case 3: return 'Not recovered';
      case 4: return 'Recovered with sequelae';
      case 5: return 'Fatal';
      default: return 'Unknown';
    }
  }
}
