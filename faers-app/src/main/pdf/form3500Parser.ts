/**
 * Form 3500A PDF Parser
 *
 * Parses FDA MedWatch Form 3500A PDFs using pdf-lib.
 * Uses low-level PDF object enumeration to extract form field values,
 * as some FDA PDFs have non-standard AcroForm structures.
 * Falls back to XFA parsing for XFA-based PDFs.
 */

import { PDFDocument, PDFName, PDFDict, PDFString, PDFHexString, PDFArray } from 'pdf-lib';
import * as fs from 'fs';
import type { Form3500AData, Form3500AProduct } from '../../shared/types/form3500.types';
import { hasXFAData, extractXFAXml, parseXFAData } from './xfaParser';

/**
 * Extracted form field data
 */
interface FieldData {
  name: string;
  value: string;
  type: string;
}

/**
 * Parser for FDA Form 3500A PDFs
 */
export class Form3500AParser {
  private fields: Map<string, FieldData> = new Map();

  /**
   * Parse a Form 3500A PDF file
   * @param filePath Path to the PDF file
   * @returns Extracted form data
   */
  async parse(filePath: string): Promise<Form3500AData> {
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Extract all form fields using low-level enumeration
    this.extractAllFields(pdfDoc);

    // Check if we got meaningful data from AcroForm fields
    const hasAcroFormData = this.hasExtractedData();

    // If no AcroForm data, try XFA parsing
    if (!hasAcroFormData && hasXFAData(pdfDoc)) {
      console.log('Form 3500A - No AcroForm data found, trying XFA...');
      const xfaXml = extractXFAXml(pdfDoc);
      if (xfaXml) {
        console.log('Form 3500A - Using XFA parser');
        return parseXFAData(xfaXml);
      }
    }

    // Debug: log fields with values
    console.log('Form 3500A - Extracted fields with values:');
    this.fields.forEach((field, name) => {
      if (field.value) {
        console.log(`  ${name} = "${field.value}"`);
      }
    });

    return {
      patient: this.extractPatientInfo(),
      event: this.extractEventInfo(),
      products: this.extractProducts(),
      reporter: this.extractReporterInfo(),
      manufacturer: this.extractManufacturerInfo(),
      mfrReportNumber: this.getFieldValue('manuRepNum[0]'),
      ufImporterReportNumber: this.getFieldValue('ufNum[0]')
    };
  }

  /**
   * Check if we extracted any meaningful data from AcroForm fields
   */
  private hasExtractedData(): boolean {
    let fieldsWithValues = 0;
    this.fields.forEach((field) => {
      if (field.value && field.value.trim()) {
        fieldsWithValues++;
      }
    });
    return fieldsWithValues > 5; // Need at least a few fields with values
  }

  /**
   * Extract all form fields from PDF using low-level object enumeration
   */
  private extractAllFields(pdfDoc: PDFDocument): void {
    this.fields.clear();
    const context = pdfDoc.context;

    context.enumerateIndirectObjects().forEach(([, obj]) => {
      if (obj instanceof PDFDict) {
        const subtype = obj.get(PDFName.of('Subtype'));
        const fieldName = obj.get(PDFName.of('T'));
        const fieldValue = obj.get(PDFName.of('V'));
        const fieldType = obj.get(PDFName.of('FT'));

        // Check if this is a form field widget
        if (subtype && subtype.toString() === '/Widget' && fieldName) {
          let name = '';
          let value = '';
          const type = fieldType ? fieldType.toString() : '/Unknown';

          // Decode field name
          if (fieldName instanceof PDFHexString) {
            name = fieldName.decodeText();
          } else if (fieldName instanceof PDFString) {
            name = fieldName.decodeText();
          } else {
            name = fieldName.toString();
          }

          // Decode field value
          if (fieldValue) {
            if (fieldValue instanceof PDFHexString) {
              value = fieldValue.decodeText();
            } else if (fieldValue instanceof PDFString) {
              value = fieldValue.decodeText();
            } else if (fieldValue instanceof PDFName) {
              value = fieldValue.toString().replace('/', '');
            } else if (fieldValue instanceof PDFArray) {
              // Handle array values (multiple selections)
              const items: string[] = [];
              for (let i = 0; i < fieldValue.size(); i++) {
                const item = fieldValue.get(i);
                if (item instanceof PDFString || item instanceof PDFHexString) {
                  items.push(item.decodeText());
                }
              }
              value = items.join(', ');
            } else {
              value = fieldValue.toString();
            }
          }

          this.fields.set(name, { name, value, type });
        }
      }
    });

    console.log(`Form 3500A - Total fields extracted: ${this.fields.size}`);
  }

  /**
   * Get field value by name
   */
  private getFieldValue(fieldName: string): string | undefined {
    const field = this.fields.get(fieldName);
    return field?.value || undefined;
  }

  /**
   * Check if a checkbox/button field is checked
   */
  private isChecked(fieldName: string): boolean {
    const field = this.fields.get(fieldName);
    if (!field) return false;
    const value = field.value.toLowerCase();
    return value === '1' || value === 'yes' || value === 'on' || value === 'true';
  }

  /**
   * Extract patient information (Section A)
   */
  private extractPatientInfo(): Form3500AData['patient'] {
    const patient: Form3500AData['patient'] = {};

    // Patient identifier
    patient.identifier = this.getFieldValue('patID[0]');

    // Age
    const ageValue = this.getFieldValue('patAge[0]');
    if (ageValue) {
      patient.age = parseInt(ageValue, 10) || undefined;
    }

    // Age unit
    if (this.isChecked('ageYrs[0]')) {
      patient.ageUnit = 'Year';
    } else if (this.isChecked('ageMons[0]')) {
      patient.ageUnit = 'Month';
    } else if (this.isChecked('ageWks[0]')) {
      patient.ageUnit = 'Week';
    } else if (this.isChecked('ageDays[0]')) {
      patient.ageUnit = 'Day';
    }

    // Date of birth
    patient.dateOfBirth = this.getFieldValue('patDOB[0]');

    // Sex
    if (this.isChecked('sexM[0]')) {
      patient.sex = 'Male';
    } else if (this.isChecked('sexF[0]')) {
      patient.sex = 'Female';
    }

    // Weight
    const weightValue = this.getFieldValue('patWeight[0]');
    if (weightValue) {
      patient.weight = parseFloat(weightValue) || undefined;
    }

    // Weight unit
    if (this.isChecked('weightLB[0]')) {
      patient.weightUnit = 'lb';
    } else if (this.isChecked('weightKG[0]')) {
      patient.weightUnit = 'kg';
    }

    // Ethnicity
    const ethnicities: string[] = [];
    if (this.isChecked('AmInAlNa[0]')) ethnicities.push('American Indian or Alaska Native');
    if (this.isChecked('asian[0]')) ethnicities.push('Asian');
    if (this.isChecked('black[0]')) ethnicities.push('Black or African American');
    if (this.isChecked('hispanic[0]')) ethnicities.push('Hispanic');
    if (this.isChecked('NaHIOtherPI[0]')) ethnicities.push('Native Hawaiian or Other Pacific Islander');
    if (this.isChecked('white[0]')) ethnicities.push('White');

    if (ethnicities.length > 0) {
      patient.ethnicity = ethnicities;
    }

    return patient;
  }

  /**
   * Extract event information (Section B)
   */
  private extractEventInfo(): Form3500AData['event'] {
    const isAdverseEvent = this.isChecked('adverse[0]');
    const isProductProblem = this.isChecked('prodProblem[0]');

    let eventType: 'adverse_event' | 'product_problem' | 'both' = 'adverse_event';
    if (isAdverseEvent && isProductProblem) {
      eventType = 'both';
    } else if (isProductProblem && !isAdverseEvent) {
      eventType = 'product_problem';
    }

    return {
      type: eventType,
      dateOfEvent: this.getFieldValue('dateAdvEvent[0]'),
      dateOfReport: this.getFieldValue('dateReport[0]'),
      description: this.getFieldValue('advEvDesc[0]') || this.getFieldValue('advEvDescribe[0]'),
      labData: this.getFieldValue('testData1[0]'),
      labDataComments: this.getFieldValue('addComm[0]'),
      medicalHistory: this.getFieldValue('otherHist[0]'),
      outcomes: {
        death: this.isChecked('death[0]'),
        deathDate: this.getFieldValue('deathDate[0]'),
        lifeThreatening: this.isChecked('lifeThr[0]'),
        hospitalization: this.isChecked('hospital[0]'),
        disability: this.isChecked('disability[0]'),
        congenitalAnomaly: this.isChecked('congenital[0]'),
        otherSerious: this.isChecked('otherOutcome[0]'),
        requiredIntervention: this.isChecked('reqInterv[0]')
      }
    };
  }

  /**
   * Extract product information (Section C)
   */
  private extractProducts(): Form3500AProduct[] {
    const products: Form3500AProduct[] = [];

    // Product 1
    const product1 = this.extractProduct(1);
    if (product1.productName) {
      products.push(product1);
    }

    // Product 2
    const product2 = this.extractProduct(2);
    if (product2.productName) {
      products.push(product2);
    }

    return products;
  }

  /**
   * Extract a single product by index
   */
  private extractProduct(index: number): Form3500AProduct {
    const idx = index.toString();

    return {
      productName: this.getFieldValue(`prodName${idx}[0]`),
      strength: this.getFieldValue(`prodStr${idx}[0]`),
      strengthUnit: this.getFieldValue(`prodUnit${idx}[0]`),
      ndcNumber: this.getFieldValue(`ndc${idx}[0]`),
      manufacturerName: this.getFieldValue(`manu${idx}[0]`),
      lotNumber: this.getFieldValue(`lot${idx}[0]`),
      dose: this.getFieldValue(`dose${idx}[0]`),
      doseUnit: this.getFieldValue(`doseUnit${idx}[0]`),
      frequency: this.getFieldValue(`freq${idx}[0]`),
      route: this.getFieldValue(`route${idx}[0]`),
      therapyStartDate: this.getFieldValue(`start${idx}Date[0]`),
      therapyEndDate: this.getFieldValue(`end${idx}Date[0]`),
      indication: this.getFieldValue(`diagnosis${idx}[0]`),
      eventAbatedOnStop: this.getTriStateValue(`abate${idx}`),
      eventReappearedOnReintro: this.getTriStateValue(`reappear${idx}`)
    };
  }

  /**
   * Get tri-state value (Yes/No/DoesntApply) from checkbox fields
   */
  private getTriStateValue(prefix: string): 'Yes' | 'No' | 'DoesntApply' | undefined {
    if (this.isChecked(`${prefix}Yes[0]}`) || this.getFieldValue(`${prefix}Yes[0]`) === 'Yes') {
      return 'Yes';
    }
    if (this.isChecked(`${prefix}No[0]`) || this.getFieldValue(`${prefix}No[0]`) === 'Yes') {
      return 'No';
    }
    if (this.isChecked(`${prefix}NA[0]`) || this.getFieldValue(`${prefix}NA[0]`) === 'Yes') {
      return 'DoesntApply';
    }
    return undefined;
  }

  /**
   * Extract reporter information (Section E)
   */
  private extractReporterInfo(): Form3500AData['reporter'] {
    return {
      lastName: this.getFieldValue('reportLast[0]'),
      firstName: this.getFieldValue('reportFirst[0]'),
      address: this.getFieldValue('reportAddr[0]'),
      city: this.getFieldValue('reportCity[0]'),
      state: this.getFieldValue('reportSt[0]'),
      zipCode: this.getFieldValue('reportZip[0]'),
      country: this.getFieldValue('reportCountry[0]'),
      phone: this.getFieldValue('reportPhone[0]'),
      email: this.getFieldValue('reportEmail[0]'),
      healthProfessional: this.isChecked('repHPN[0]') || this.isChecked('repHPY[0]'),
      occupation: this.getFieldValue('repOccupation[0]'),
      reporterSentToFda: this.isChecked('reportFDAY[0]')
    };
  }

  /**
   * Extract manufacturer information (Section G)
   */
  private extractManufacturerInfo(): Form3500AData['manufacturer'] {
    return {
      contactName: this.getFieldValue('manuName[0]'),
      address: this.getFieldValue('manuAddr[0]'),
      phone: this.getFieldValue('manuPhone[0]'),
      email: this.getFieldValue('manuEmail[0]'),
      dateReceived: this.getFieldValue('dateReceived[0]'),
      ndaNumber: this.getFieldValue('numNDA[0]'),
      andaNumber: this.getFieldValue('numANDA[0]'),
      indNumber: this.getFieldValue('numIND[0]'),
      blaNumber: this.getFieldValue('numBLA[0]'),
      pmaNumber: this.getFieldValue('numPMA[0]'),
      adverseEventTerms: this.getFieldValue('advTerms[0]'),
      mfrReportNumber: this.getFieldValue('manuRepNum[0]')
    };
  }
}

export default Form3500AParser;
