export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ViewType {
  DASHBOARD = 'DASHBOARD',
  AGENT = 'AGENT',
  VOICE = 'VOICE',
  MAP = 'MAP',
  FEED = 'FEED'
}

export interface Incident {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  location: [number, number]; // [lat, lng]
  severity: Severity;
  analysis?: string;
  locationName: string;
  isVerifiedResource?: boolean;
  uri?: string;
}

export interface SafetyStatus {
  score: number;
  summary: string;
  recommendations: string[];
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  groundingLinks?: { title: string; uri: string }[];
}