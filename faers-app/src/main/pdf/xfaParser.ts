/**
 * XFA Form Parser
 *
 * Extracts form data from XFA-based PDFs by parsing the embedded XML datasets.
 */

import { PDFDocument, PDFName, PDFDict, PDFArray } from 'pdf-lib';
import * as zlib from 'zlib';
import type { Form3500AData, Form3500AProduct } from '../../shared/types/form3500.types';

/**
 * Check if a PDF contains XFA form data
 */
export function hasXFAData(pdfDoc: PDFDocument): boolean {
  try {
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (acroForm instanceof PDFDict) {
      const xfa = acroForm.get(PDFName.of('XFA'));
      return xfa instanceof PDFArray;
    }
  } catch {
    // Ignore errors
  }
  return false;
}

/**
 * Extract XFA datasets XML from PDF
 */
export function extractXFAXml(pdfDoc: PDFDocument): string | null {
  try {
    const acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (!(acroForm instanceof PDFDict)) return null;

    const xfa = acroForm.get(PDFName.of('XFA'));
    if (!(xfa instanceof PDFArray)) return null;

    // Find datasets element (usually at index 6/7)
    for (let i = 0; i < xfa.size(); i += 2) {
      const nameObj = xfa.get(i);
      const name = nameObj?.toString() || '';

      if (name.includes('datasets')) {
        const streamRef = xfa.get(i + 1);
        const stream = pdfDoc.context.lookup(streamRef);

        if (stream && 'getContents' in stream) {
          const contents = (stream as { getContents(): Uint8Array }).getContents();
          // Decompress if needed (check for zlib header)
          if (contents[0] === 0x78) {
            return zlib.inflateSync(Buffer.from(contents)).toString('utf-8');
          }
          return Buffer.from(contents).toString('utf-8');
        }
      }
    }
  } catch (error) {
    console.error('XFA extraction error:', error);
  }
  return null;
}

/**
 * Get XML element value by tag name
 */
function getXmlValue(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match?.[1]?.trim() || undefined;
}

/**
 * Check if XML checkbox element is checked (value is "1")
 */
function isXmlChecked(xml: string, tag: string): boolean {
  return getXmlValue(xml, tag) === '1';
}

/**
 * Parse XFA XML to Form3500AData
 */
export function parseXFAData(xml: string): Form3500AData {
  console.log('Parsing XFA data...');

  return {
    patient: extractPatientFromXFA(xml),
    event: extractEventFromXFA(xml),
    products: extractProductsFromXFA(xml),
    reporter: extractReporterFromXFA(xml),
    manufacturer: {}
  };
}

function extractPatientFromXFA(xml: string): Form3500AData['patient'] {
  const patient: Form3500AData['patient'] = {};

  patient.identifier = getXmlValue(xml, 'PatientIdentifier');

  const ageValue = getXmlValue(xml, 'AgeValue');
  if (ageValue) {
    patient.age = parseInt(ageValue, 10) || undefined;
  }

  if (isXmlChecked(xml, 'AgeYears')) patient.ageUnit = 'Year';
  else if (isXmlChecked(xml, 'AgeMonths')) patient.ageUnit = 'Month';
  else if (isXmlChecked(xml, 'AgeWeeks')) patient.ageUnit = 'Week';
  else if (isXmlChecked(xml, 'AgeDays')) patient.ageUnit = 'Day';

  patient.dateOfBirth = getXmlValue(xml, 'DateBirth');

  if (isXmlChecked(xml, 'SexM')) patient.sex = 'Male';
  else if (isXmlChecked(xml, 'SexF')) patient.sex = 'Female';

  const weightValue = getXmlValue(xml, 'WeightValue');
  if (weightValue) {
    patient.weight = parseFloat(weightValue) || undefined;
  }

  if (isXmlChecked(xml, 'WeightLB')) patient.weightUnit = 'lb';
  else if (isXmlChecked(xml, 'WeightKG')) patient.weightUnit = 'kg';

  // Ethnicity
  const ethnicities: string[] = [];
  if (isXmlChecked(xml, 'RaceAmInd')) ethnicities.push('American Indian or Alaska Native');
  if (isXmlChecked(xml, 'RaceAsian')) ethnicities.push('Asian');
  if (isXmlChecked(xml, 'RaceBlack')) ethnicities.push('Black or African American');
  if (isXmlChecked(xml, 'EthnicLatino')) ethnicities.push('Hispanic');
  if (isXmlChecked(xml, 'RacePacific')) ethnicities.push('Native Hawaiian or Other Pacific Islander');
  if (isXmlChecked(xml, 'RaceWhite')) ethnicities.push('White');
  if (ethnicities.length > 0) patient.ethnicity = ethnicities;

  return patient;
}

function extractEventFromXFA(xml: string): Form3500AData['event'] {
  const isAdverse = isXmlChecked(xml, 'RepAdverse');
  const isError = isXmlChecked(xml, 'RepError');

  let eventType: 'adverse_event' | 'product_problem' | 'both' = 'adverse_event';
  if (isAdverse && isError) eventType = 'both';
  else if (isError && !isAdverse) eventType = 'product_problem';

  // Extract lab data from TestDataTable
  const labDataParts: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const testData = getXmlValue(xml, `TestData${i}`);
    const testDate = getXmlValue(xml, `TDate${i}`);
    const lowRange = getXmlValue(xml, `TLowRange${i}`);
    const highRange = getXmlValue(xml, `THighRange${i}`);

    if (testData) {
      let labEntry = testData;
      if (lowRange && highRange) {
        labEntry += ` (normal: ${lowRange}-${highRange})`;
      }
      if (testDate) {
        labEntry += ` [${testDate}]`;
      }
      labDataParts.push(labEntry);
    }
  }

  return {
    type: eventType,
    dateOfEvent: getXmlValue(xml, 'EventDate'),
    dateOfReport: getXmlValue(xml, 'ReportDate'),
    description: getXmlValue(xml, 'DescEvent'),
    labData: labDataParts.length > 0 ? labDataParts.join('; ') : undefined,
    labDataComments: getXmlValue(xml, 'AdditionalComments'),
    medicalHistory: getXmlValue(xml, 'OtherHistory'),
    outcomes: {
      death: isXmlChecked(xml, 'Death'),
      deathDate: getXmlValue(xml, 'DeathDate'),
      lifeThreatening: isXmlChecked(xml, 'LifeThreaten'),
      hospitalization: isXmlChecked(xml, 'Hospital'),
      disability: isXmlChecked(xml, 'Disability'),
      congenitalAnomaly: isXmlChecked(xml, 'Congenital'),
      otherSerious: isXmlChecked(xml, 'OtherEvents'),
      requiredIntervention: isXmlChecked(xml, 'ReqdInter')
    }
  };
}

function extractProductsFromXFA(xml: string): Form3500AProduct[] {
  const products: Form3500AProduct[] = [];

  // Product 1 (Suspect Product)
  const prod1Name = getXmlValue(xml, 'Prod1Name');
  if (prod1Name) {
    products.push({
      productName: prod1Name,
      strength: getXmlValue(xml, 'Prod1Strength'),
      strengthUnit: getXmlValue(xml, 'Prod1StrengthUnit'),
      ndcNumber: getXmlValue(xml, 'Prod1NDC_ID'),
      manufacturerName: getXmlValue(xml, 'Prod1ManuComp'),
      lotNumber: getXmlValue(xml, 'Prod1LotNum'),
      dose: getXmlValue(xml, 'Prod1Dose'),
      doseUnit: getXmlValue(xml, 'Prod1DoseUnit'),
      frequency: getXmlValue(xml, 'Prod1Freq'),
      route: getXmlValue(xml, 'Prod1Route'),
      therapyStartDate: getXmlValue(xml, 'Prod1TherapyStartDate'),
      therapyEndDate: getXmlValue(xml, 'Prod1TherapyStopDate'),
      indication: getXmlValue(xml, 'Prod1Diagnosis'),
      expirationDate: getXmlValue(xml, 'Prod1ExpDate'),
      eventAbatedOnStop: isXmlChecked(xml, 'Prod1AbatedYes') ? 'Yes' :
                         isXmlChecked(xml, 'Prod1AbatedNo') ? 'No' :
                         isXmlChecked(xml, 'Prod1AbatedNA') ? 'DoesntApply' : undefined,
      eventReappearedOnReintro: isXmlChecked(xml, 'Prod1ReappearYes') ? 'Yes' :
                                isXmlChecked(xml, 'Prod1ReappearNo') ? 'No' :
                                isXmlChecked(xml, 'Prod1ReappearNA') ? 'DoesntApply' : undefined
    });
  }

  // Product 2 (Suspect Product)
  const prod2Name = getXmlValue(xml, 'Prod2Name');
  if (prod2Name) {
    products.push({
      productName: prod2Name,
      strength: getXmlValue(xml, 'Prod2Strength'),
      strengthUnit: getXmlValue(xml, 'Prod2StrengthUnit'),
      ndcNumber: getXmlValue(xml, 'Prod2NDC_ID'),
      manufacturerName: getXmlValue(xml, 'Prod2ManuComp'),
      lotNumber: getXmlValue(xml, 'Prod2LotNum'),
      dose: getXmlValue(xml, 'Prod2Dose'),
      doseUnit: getXmlValue(xml, 'Prod2DoseUnit'),
      frequency: getXmlValue(xml, 'Prod2Freq'),
      route: getXmlValue(xml, 'Prod2Route'),
      therapyStartDate: getXmlValue(xml, 'Prod2TherapyStartDate'),
      therapyEndDate: getXmlValue(xml, 'Prod2TherapyStopDate'),
      indication: getXmlValue(xml, 'Prod2Diagnosis'),
      expirationDate: getXmlValue(xml, 'Prod2ExpDate'),
      eventAbatedOnStop: isXmlChecked(xml, 'Prod2AbatedYes') ? 'Yes' :
                         isXmlChecked(xml, 'Prod2AbatedNo') ? 'No' :
                         isXmlChecked(xml, 'Prod2AbatedNA') ? 'DoesntApply' : undefined,
      eventReappearedOnReintro: isXmlChecked(xml, 'Prod2ReappearYes') ? 'Yes' :
                                isXmlChecked(xml, 'Prod2ReappearNo') ? 'No' :
                                isXmlChecked(xml, 'Prod2ReappearNA') ? 'DoesntApply' : undefined
    });
  }

  // Concomitant Medications from SecF_Other table (up to 10 rows)
  for (let i = 1; i <= 10; i++) {
    // Handle the Row1/Row2 structure where tag names differ
    let concomName: string | undefined;
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (i <= 2) {
      // Row1 uses <Prod1>, Row2 uses <Prod2> inside SecF_Other
      const rowMatch = xml.match(new RegExp(`<Row${i}>[\\s\\S]*?<Prod${i}>([^<]*)</Prod${i}>[\\s\\S]*?</Row${i}>`));
      startDate = getXmlValue(xml, `Start${i}`);
      endDate = getXmlValue(xml, `End${i}`);
      if (rowMatch && rowMatch[1]?.trim()) {
        concomName = rowMatch[1].trim();
      }
    }

    if (concomName) {
      products.push({
        productName: concomName,
        therapyStartDate: startDate,
        therapyEndDate: endDate,
        isConcomitant: true
      });
    }
  }

  return products;
}

function extractReporterFromXFA(xml: string): Form3500AData['reporter'] {
  return {
    lastName: getXmlValue(xml, 'LastName'),
    firstName: getXmlValue(xml, 'FirstName'),
    address: getXmlValue(xml, 'Address'),
    city: getXmlValue(xml, 'City'),
    state: getXmlValue(xml, 'State'),
    zipCode: getXmlValue(xml, 'ZipCode'),
    country: getXmlValue(xml, 'Country'),
    phone: getXmlValue(xml, 'PhoneNum'),
    email: getXmlValue(xml, 'Email'),
    healthProfessional: isXmlChecked(xml, 'ProYes'),
    occupation: getXmlValue(xml, 'Occupation')
  };
}
