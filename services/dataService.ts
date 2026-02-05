
import { CylinderRecord } from '../types';
import { REGISTRY } from '../constants';

/**
 * Performs a global matching of OCR text against the entire cylinder registry.
 * Implements strict reconstruction rules:
 * - Minimum 4 continuous digits or characters required for a match.
 * - Prioritizes full alphanumeric strings, then digit-only sequences.
 * - Ensures that if a match exists in the PDF (REGISTRY), it is treated as a Registered Cylinder.
 */
export const matchSerialFromOCR = (ocrText: string): CylinderRecord | null => {
  if (!ocrText || ocrText.length < 4) return null;

  // Clean the input to remove noise but keep alphanumeric core
  const cleanedOcr = ocrText.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
  const ocrDigits = ocrText.replace(/\D/g, '');

  // 1. Alphanumeric Substring Match (Case-insensitive, stripped of noise)
  // We check if the OCR fragment (min 4 chars) is contained within any registry serial
  // or if the registry serial is contained within the OCR fragment.
  for (const record of REGISTRY) {
    const regSerial = record.serialNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanedOcr.length >= 4 && (regSerial.includes(cleanedOcr) || cleanedOcr.includes(regSerial))) {
      return record;
    }
  }

  // 2. Digit Sequence Match (Fallback)
  // Extract digits from OCR and try to find a match in registry digits (min 4).
  if (ocrDigits.length >= 4) {
    for (const record of REGISTRY) {
      const regDigits = record.serialNumber.replace(/\D/g, '');
      if (regDigits.includes(ocrDigits) || ocrDigits.includes(regDigits)) {
        return record;
      }
    }
  }

  // 3. Reconstruct Match exists in registry PDF? 
  // If we get here, no match was found in the 181-record PDF registry.
  return null;
};
