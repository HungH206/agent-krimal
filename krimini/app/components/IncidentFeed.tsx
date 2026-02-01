import React from 'react';
import { Incident, Severity } from '../types';

interface IncidentFeedProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

const getSeverityClass = (sev: Severity) => {
  switch (sev) {
    case Severity.CRITICAL: return 'border-red-500/50 bg-red-500/10 text-red-400';
    case Severity.HIGH: return 'border-orange-500/50 bg-orange-500/10 text-orange-400';
    case Severity.MEDIUM: return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
    case Severity.LOW: return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
    default: return 'border-slate-500/50 bg-slate-500/10 text-slate-400';
  }
};

const IncidentFeed: React.FC<IncidentFeedProps> = ({ incidents, onSelectIncident }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-l border-slate-800">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2">
          <i className="fa-solid fa-bolt text-yellow-400"></i>
          Live Incident Feed
        </h2>
        <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
          {incidents.length} events
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {incidents.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <i className="fa-solid fa-radar fa-spin mb-3 text-2xl"></i>
            <p className="text-sm">Scanning campus channels...</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div 
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${getSeverityClass(incident.severity)}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm uppercase tracking-wider">{incident.type}</span>
                <span className="text-[10px] opacity-70">{incident.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-xs mb-2 font-medium">{incident.locationName}</p>
              <p className="text-[11px] opacity-80 line-clamp-2 leading-relaxed italic">
                &quot;{incident.description}&quot;
              </p>
              
              {incident.analysis && (
                <div className="mt-2 pt-2 border-t border-current/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <i className="fa-solid fa-brain text-[10px]"></i>
                    <span className="text-[9px] uppercase font-bold opacity-60">Gemini Reasoning</span>
                  </div>
                  <p className="text-[10px] opacity-90 leading-tight">
                    {incident.analysis}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IncidentFeed;