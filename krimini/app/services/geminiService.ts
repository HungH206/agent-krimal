import { Incident, SafetyStatus } from '../types';

export async function analyzeIncident(incident: Incident): Promise<string> {
  // Mock implementation
  return `Analysis: ${incident.type} at ${incident.locationName} - ${incident.severity} severity incident.`;
}

export async function getSafetySummary(incidents: Incident[], userLocation: [number, number]): Promise<SafetyStatus> {
  // Mock implementation
  const score = Math.max(20, 100 - incidents.length * 5);
  return {
    score,
    summary: score > 70 ? "Campus conditions are stable" : "Elevated security monitoring active",
    recommendations: [
      "Maintain situational awareness",
      "Use well-lit pathways",
      "Report suspicious activity"
    ]
  };
}

export async function generateEmergencyDraft(message: string): Promise<string> {
  // Mock implementation
  return `EMERGENCY ALERT: ${message} - Campus security has been notified. Please remain calm and follow safety protocols.`;
}

export async function chatWithAgent(query: string, userLocation: [number, number]): Promise<{
  text: string;
  groundingResults: Array<{ maps?: { title: string; uri: string } }>;
}> {
  // Mock implementation
  return {
    text: `Based on your query "${query}", I recommend staying in well-lit areas and following established safety protocols.`,
    groundingResults: [
      {
        maps: {
          title: "Campus Safety Center",
          uri: "https://maps.google.com/campus-safety"
        }
      }
    ]
  };
}