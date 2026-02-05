
export interface CylinderRecord {
  cylinderId: string;
  serialNumber: string;
  gasType: string;
  gasCategory: string;
  manufacturer: string;
  capacity: string;
  workingPressure: string;
  testPressure: string;
  testDate: string;
  standardCode: string;
  expiryDate: string;
  inspectionDate: string;
  locationType: string;
  rustLevel: string;
  hazardType: string;
  capPresent: string;
  labelCondition: string;
  remarks: string;
  isUnregistered?: boolean;
}

export enum Page {
  Dashboard = 'dashboard',
  VisionScanner = 'scanner',
  InventoryRegistry = 'registry'
}

export interface AppState {
  scannedCount: number;
  fitForUseCount: number;
  hazardDetectedCount: number;
  registryEntries: CylinderRecord[];
  currentScan: CylinderRecord | null;
  history: CylinderRecord[];
}

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ko', name: 'Korean' },
  { code: 'nl', name: 'Dutch' },
  { code: 'tr', name: 'Turkish' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'pl', name: 'Polish' }
];
