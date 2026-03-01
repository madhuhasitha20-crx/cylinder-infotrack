
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
  { code: 'te', name: 'Telugu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' }
];
