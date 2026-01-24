/**
 * Drug Repository - Database access layer for case drugs
 */

import type { DatabaseInstance } from '../types';
import type {
  CaseDrug,
  CaseDrugSubstance,
  CaseDrugDosage,
  DrugCharacterization
} from '../../../shared/types/case.types';

export class DrugRepository {
  private db: DatabaseInstance;

  constructor(db: DatabaseInstance) {
    this.db = db;
  }

  /**
   * Get all drugs for a case
   */
  findByCaseId(caseId: string): CaseDrug[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_drugs
      WHERE case_id = ?
      ORDER BY sort_order ASC
    `).all(caseId) as Record<string, unknown>[];

    return rows.map(row => {
      const drug = this.mapRowToDrug(row);
      drug.substances = this.getSubstances(drug.id!);
      drug.dosages = this.getDosages(drug.id!);
      return drug;
    });
  }

  /**
   * Get a single drug by ID
   */
  findById(id: number): CaseDrug | null {
    const row = this.db.prepare(
      'SELECT * FROM case_drugs WHERE id = ?'
    ).get(id) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const drug = this.mapRowToDrug(row);
    drug.substances = this.getSubstances(id);
    drug.dosages = this.getDosages(id);
    return drug;
  }

  /**
   * Create a new drug
   */
  create(drug: Omit<CaseDrug, 'id'>): CaseDrug {
    const stmt = this.db.prepare(`
      INSERT INTO case_drugs (
        case_id, characterization, product_name, mpid, phpid,
        cumulative_dose, cumulative_unit, cumulative_first, cumulative_first_unit,
        gestation_exposure, indication, indication_code,
        start_date, end_date, duration, duration_unit,
        time_to_onset, time_onset_unit, action_taken,
        dechallenge, rechallenge, additional_info,
        ndc_number, manufacturer_name, lot_number, expiration_date,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      drug.caseId,
      drug.characterization,
      drug.productName,
      drug.mpid ?? null,
      drug.phpid ?? null,
      drug.cumulativeDose ?? null,
      drug.cumulativeUnit ?? null,
      drug.cumulativeFirst ?? null,
      drug.cumulativeFirstUnit ?? null,
      drug.gestationExposure ?? null,
      drug.indication ?? null,
      drug.indicationCode ?? null,
      drug.startDate ?? null,
      drug.endDate ?? null,
      drug.duration ?? null,
      drug.durationUnit ?? null,
      drug.timeToOnset ?? null,
      drug.timeOnsetUnit ?? null,
      drug.actionTaken ?? null,
      drug.dechallenge ?? null,
      drug.rechallenge ?? null,
      drug.additionalInfo ?? null,
      drug.ndcNumber ?? null,
      drug.manufacturerName ?? null,
      drug.lotNumber ?? null,
      drug.expirationDate ?? null,
      drug.sortOrder
    );

    const newDrugId = Number(result.lastInsertRowid);

    // Save substances
    if (drug.substances?.length) {
      for (const substance of drug.substances) {
        this.createSubstance(newDrugId, substance);
      }
    }

    // Save dosages
    if (drug.dosages?.length) {
      for (const dosage of drug.dosages) {
        this.createDosage(newDrugId, dosage);
      }
    }

    return this.findById(newDrugId)!;
  }

  /**
   * Update an existing drug
   */
  update(id: number, drug: Partial<CaseDrug>): CaseDrug | null {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const stmt = this.db.prepare(`
      UPDATE case_drugs SET
        characterization = ?,
        product_name = ?,
        mpid = ?,
        phpid = ?,
        cumulative_dose = ?,
        cumulative_unit = ?,
        cumulative_first = ?,
        cumulative_first_unit = ?,
        gestation_exposure = ?,
        indication = ?,
        indication_code = ?,
        start_date = ?,
        end_date = ?,
        duration = ?,
        duration_unit = ?,
        time_to_onset = ?,
        time_onset_unit = ?,
        action_taken = ?,
        dechallenge = ?,
        rechallenge = ?,
        additional_info = ?,
        ndc_number = ?,
        manufacturer_name = ?,
        lot_number = ?,
        expiration_date = ?,
        sort_order = ?
      WHERE id = ?
    `);

    stmt.run(
      drug.characterization ?? existing.characterization,
      drug.productName ?? existing.productName,
      drug.mpid ?? existing.mpid ?? null,
      drug.phpid ?? existing.phpid ?? null,
      drug.cumulativeDose ?? existing.cumulativeDose ?? null,
      drug.cumulativeUnit ?? existing.cumulativeUnit ?? null,
      drug.cumulativeFirst ?? existing.cumulativeFirst ?? null,
      drug.cumulativeFirstUnit ?? existing.cumulativeFirstUnit ?? null,
      drug.gestationExposure ?? existing.gestationExposure ?? null,
      drug.indication ?? existing.indication ?? null,
      drug.indicationCode ?? existing.indicationCode ?? null,
      drug.startDate ?? existing.startDate ?? null,
      drug.endDate ?? existing.endDate ?? null,
      drug.duration ?? existing.duration ?? null,
      drug.durationUnit ?? existing.durationUnit ?? null,
      drug.timeToOnset ?? existing.timeToOnset ?? null,
      drug.timeOnsetUnit ?? existing.timeOnsetUnit ?? null,
      drug.actionTaken ?? existing.actionTaken ?? null,
      drug.dechallenge ?? existing.dechallenge ?? null,
      drug.rechallenge ?? existing.rechallenge ?? null,
      drug.additionalInfo ?? existing.additionalInfo ?? null,
      drug.ndcNumber ?? existing.ndcNumber ?? null,
      drug.manufacturerName ?? existing.manufacturerName ?? null,
      drug.lotNumber ?? existing.lotNumber ?? null,
      drug.expirationDate ?? existing.expirationDate ?? null,
      drug.sortOrder ?? existing.sortOrder,
      id
    );

    // Update substances if provided
    if (drug.substances !== undefined) {
      // Delete existing and recreate
      this.db.prepare('DELETE FROM case_drug_substances WHERE drug_id = ?').run(id);
      for (const substance of drug.substances) {
        this.createSubstance(id, substance);
      }
    }

    // Update dosages if provided
    if (drug.dosages !== undefined) {
      // Delete existing and recreate
      this.db.prepare('DELETE FROM case_drug_dosages WHERE drug_id = ?').run(id);
      for (const dosage of drug.dosages) {
        this.createDosage(id, dosage);
      }
    }

    return this.findById(id);
  }

  /**
   * Save a drug (create or update)
   */
  save(drug: CaseDrug): CaseDrug {
    if (drug.id) {
      return this.update(drug.id, drug) ?? this.create(drug);
    }
    return this.create(drug);
  }

  /**
   * Delete a drug and its related data
   */
  delete(id: number): boolean {
    const result = this.db.prepare(
      'DELETE FROM case_drugs WHERE id = ?'
    ).run(id);
    return result.changes > 0;
  }

  /**
   * Get substances for a drug
   */
  private getSubstances(drugId: number): CaseDrugSubstance[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_drug_substances
      WHERE drug_id = ?
      ORDER BY sort_order ASC
    `).all(drugId) as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as number,
      drugId: row.drug_id as number,
      substanceName: row.substance_name as string | undefined,
      substanceCode: row.substance_code as string | undefined,
      strength: row.strength as number | undefined,
      strengthUnit: row.strength_unit as string | undefined,
      sortOrder: row.sort_order as number
    }));
  }

  /**
   * Create a substance for a drug
   */
  private createSubstance(drugId: number, substance: Omit<CaseDrugSubstance, 'id' | 'drugId'>): void {
    this.db.prepare(`
      INSERT INTO case_drug_substances (
        drug_id, substance_name, substance_code, strength, strength_unit, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      drugId,
      substance.substanceName ?? null,
      substance.substanceCode ?? null,
      substance.strength ?? null,
      substance.strengthUnit ?? null,
      substance.sortOrder
    );
  }

  /**
   * Get dosages for a drug
   */
  private getDosages(drugId: number): CaseDrugDosage[] {
    const rows = this.db.prepare(`
      SELECT * FROM case_drug_dosages
      WHERE drug_id = ?
      ORDER BY sort_order ASC
    `).all(drugId) as Record<string, unknown>[];

    return rows.map(row => ({
      id: row.id as number,
      drugId: row.drug_id as number,
      dose: row.dose as number | undefined,
      doseFirst: row.dose_first as number | undefined,
      doseLast: row.dose_last as number | undefined,
      doseUnit: row.dose_unit as string | undefined,
      numUnits: row.num_units as number | undefined,
      intervalUnit: row.interval_unit as string | undefined,
      intervalDef: row.interval_def as string | undefined,
      dosageText: row.dosage_text as string | undefined,
      pharmaForm: row.pharma_form as string | undefined,
      route: row.route as string | undefined,
      parentRoute: row.parent_route as string | undefined,
      sortOrder: row.sort_order as number
    }));
  }

  /**
   * Create a dosage for a drug
   */
  private createDosage(drugId: number, dosage: Omit<CaseDrugDosage, 'id' | 'drugId'>): void {
    this.db.prepare(`
      INSERT INTO case_drug_dosages (
        drug_id, dose, dose_first, dose_last, dose_unit,
        num_units, interval_unit, interval_def, dosage_text,
        pharma_form, route, parent_route, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      drugId,
      dosage.dose ?? null,
      dosage.doseFirst ?? null,
      dosage.doseLast ?? null,
      dosage.doseUnit ?? null,
      dosage.numUnits ?? null,
      dosage.intervalUnit ?? null,
      dosage.intervalDef ?? null,
      dosage.dosageText ?? null,
      dosage.pharmaForm ?? null,
      dosage.route ?? null,
      dosage.parentRoute ?? null,
      dosage.sortOrder
    );
  }

  /**
   * Map database row to CaseDrug object
   */
  private mapRowToDrug(row: Record<string, unknown>): CaseDrug {
    return {
      id: row.id as number,
      caseId: row.case_id as string,
      characterization: row.characterization as DrugCharacterization,
      productName: row.product_name as string,
      mpid: row.mpid as string | undefined,
      phpid: row.phpid as string | undefined,
      cumulativeDose: row.cumulative_dose as number | undefined,
      cumulativeUnit: row.cumulative_unit as string | undefined,
      cumulativeFirst: row.cumulative_first as number | undefined,
      cumulativeFirstUnit: row.cumulative_first_unit as string | undefined,
      gestationExposure: row.gestation_exposure as number | undefined,
      indication: row.indication as string | undefined,
      indicationCode: row.indication_code as string | undefined,
      startDate: row.start_date as string | undefined,
      endDate: row.end_date as string | undefined,
      duration: row.duration as number | undefined,
      durationUnit: row.duration_unit as string | undefined,
      timeToOnset: row.time_to_onset as number | undefined,
      timeOnsetUnit: row.time_onset_unit as string | undefined,
      actionTaken: row.action_taken as number | undefined,
      dechallenge: row.dechallenge as number | undefined,
      rechallenge: row.rechallenge as number | undefined,
      additionalInfo: row.additional_info as string | undefined,
      ndcNumber: row.ndc_number as string | undefined,
      manufacturerName: row.manufacturer_name as string | undefined,
      lotNumber: row.lot_number as string | undefined,
      expirationDate: row.expiration_date as string | undefined,
      sortOrder: row.sort_order as number
    };
  }
}
