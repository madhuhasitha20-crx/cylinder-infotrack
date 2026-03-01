
import { CylinderRecord } from '../types';
import { REGISTRY } from '../constants';

export interface MatchResult {
  record: CylinderRecord | null;
  confidence: 'high' | 'low' | 'none';
}

/**
 * Performs a matching of OCR text against the cylinder registry following 
 * strict industrial rules for partial or damaged markings.
 */
export const matchSerialFromOCR = (ocrText: string): MatchResult => {
  if (!ocrText || ocrText.trim().length < 4) {
    return { record: null, confidence: 'none' };
  }

  const cleanedOcr = ocrText.toUpperCase().trim();
  const ocrDigits = cleanedOcr.replace(/\D/g, '');

  let bestMatch: CylinderRecord | null = null;
  let highestScore = 0;
  let matchConfidence: 'high' | 'low' | 'none' = 'none';

  for (const record of REGISTRY) {
    const regSerial = record.serialNumber.toUpperCase();
    const regDigits = regSerial.replace(/\D/g, '');
    
    let currentScore = 0;

    // 1. Exact Match Priority
    if (cleanedOcr === regSerial) {
      return { record, confidence: 'high' };
    }

    // 2. Longest Numeric Sequence Match
    if (ocrDigits.length >= 4 && regDigits.includes(ocrDigits)) {
      currentScore += 50;
    }

    // 3. Suffix Matching (e.g., .S, .T, .B)
    const ocrSuffix = cleanedOcr.split('.').pop() || '';
    const regSuffix = regSerial.split('.').pop() || '';
    if (ocrSuffix && ocrSuffix === regSuffix && ocrSuffix.length === 1) {
      currentScore += 30;
    }

    // 4. Character Overlap / Fuzzy Similarity
    if (cleanedOcr.length >= 4) {
      let overlap = 0;
      for (let i = 0; i < cleanedOcr.length; i++) {
        if (regSerial.includes(cleanedOcr[i])) overlap++;
      }
      currentScore += (overlap / regSerial.length) * 20;
    }

    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = record;
    }
  }

  // Thresholds for confidence levels
  if (highestScore >= 80) {
    matchConfidence = 'high';
  } else if (highestScore >= 40) {
    matchConfidence = 'low';
  } else {
    bestMatch = null;
    matchConfidence = 'none';
  }

  return { record: bestMatch, confidence: matchConfidence };
};
