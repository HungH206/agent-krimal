'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SafetyMap from './SafetyMap';
import IncidentFeed from './IncidentFeed';
import VoiceAgentView from './VoiceAgentView';
import { Incident, Severity, SafetyStatus, ChatMessage, ViewType } from '../types';
import { CAMPUS_CENTER, CAMPUS_LOCATIONS } from '../constants';
import { analyzeIncident, getSafetySummary, generateEmergencyDraft, chatWithAgent } from '../services/geminiService';

interface GroundingResult {
  maps?: {
    title: string;
    uri: string;
  };
}

const SafetyDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.DASHBOARD);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng]);
  const [safetyStatus, setSafetyStatus] = useState<SafetyStatus | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [emergencyDraft, setEmergencyDraft] = useState<string | null>(null);
  const [filterHours, setFilterHours] = useState<number>(24);
  const [isAgentLoading, setIsAgentLoading] = useState(false);

  useEffect(() => {
    // Initial mock historical data
    const historical = CAMPUS_LOCATIONS.map((loc, i: number) => ({
      id: `h-${i}`,
      type: "Surveillance Scan",
      description: `Perimeter check complete at ${loc.name}.`,
      timestamp: new Date(Date.now() - Math.random() * 24 * 3600000),
      location: loc.coords as [number, number],
      locationName: loc.name,
      severity: Severity.LOW,
      analysis: "Regular patrol confirmed safety."
    }));
    setIncidents(historical);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      }, (err) => console.warn("Location access denied. Using campus center defaults."), { enableHighAccuracy: true });
    }
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => i.timestamp.getTime() > Date.now() - filterHours * 3600000);
  }, [incidents, filterHours]);

  const refreshAnalysis = useCallback(async () => {
    const status = await getSafetySummary(filteredIncidents, userLocation);
    setSafetyStatus(status);
  }, [filteredIncidents, userLocation]);

  useEffect(() => { refreshAnalysis(); }, [filteredIncidents.length, refreshAnalysis]);

  const handleAgentChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: inputText, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    const query = inputText;
    setInputText('');
    setIsAgentLoading(true);

    try {
      const { text, groundingResults } = await chatWithAgent(query, userLocation);
      
      const newResources: Incident[] = groundingResults
        .filter((chunk: GroundingResult) => chunk.maps)
        .map((chunk: GroundingResult) => ({
          id: `res-${Math.random()}`,
          type: "Verified Resource",
          description: `Location found via Google Maps: ${chunk.maps!.title}`,
          timestamp: new Date(),
          locationName: chunk.maps!.title,
          location: [userLocation[0] + (Math.random()-0.5)*0.01, userLocation[1] + (Math.random()-0.5)*0.01],
          severity: Severity.LOW,
          isVerifiedResource: true,
          uri: chunk.maps!.uri
        }));

      if (newResources.length > 0) setIncidents(prev => [...newResources, ...prev]);

      const agentMsg: ChatMessage = { 
        role: 'agent', 
        content: text, 
        timestamp: new Date(),
        groundingLinks: groundingResults.filter((c: GroundingResult) => c.maps).map((c: GroundingResult) => ({ title: c.maps!.title, uri: c.maps!.uri }))
      };
      setChatMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'agent', content: "Error accessing intelligence network.", timestamp: new Date() }]);
    } finally {
      setIsAgentLoading(false);
    }
  };

  const renderNavbar = () => (
    <nav className="h-16 border-b border-slate-800 glass-morphism sticky top-0 z-[5000] flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <i className="fa-solid fa-user-shield text-white text-sm"></i>
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-indigo-200">Agent Krimini</h1>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-widest">System Live</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
        {[
          { id: ViewType.DASHBOARD, label: 'Dashboard', icon: 'fa-table-columns' },
          { id: ViewType.AGENT, label: 'Agent', icon: 'fa-brain' },
          { id: ViewType.VOICE, label: 'Voice Assistant', icon: 'fa-microphone-lines' },
          { id: ViewType.MAP, label: 'Tactical Map', icon: 'fa-map-location-dot' },
          { id: ViewType.FEED, label: 'Intelligence', icon: 'fa-rss' },
        ].map(view => (
           <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeView === view.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-200 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <i className={`fa-solid ${view.icon}`}></i>
            <span className="hidden md:inline">{view.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Campus Score</span>
          <span className={`text-sm font-black ${safetyStatus && safetyStatus.score > 70 ? 'text-emerald-400' : 'text-red-400'}`}>
            {safetyStatus?.score || '--'}
          </span>
        </div>
        <button 
          onClick={async () => setEmergencyDraft(await generateEmergencyDraft("Emergency triggered via Command Center."))}
          className="bg-red-600/10 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
        >
          SOS
        </button>
      </div>
    </nav>
  );

  const AgentChatView = () => (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-morphism rounded-2xl border border-slate-800 flex-1 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <i className="fa-solid fa-robot text-indigo-400"></i>
            </div>
            <div>
              <h2 className="text-sm  text-indigo-300 font-bold">Reasoning Module</h2>
              <p className="text-[10px] text-indigo-300">Multimodal Campus Intelligence Active</p>
            </div>
          </div>
          <div className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">GEMINI_3_PRO</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {chatMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <i className="fa-solid fa-comment-dots text-4xl"></i>
              <p className="text-sm max-w-xs">Ask Agent Krimini about safety protocols, safe routes, or real-time incident status.</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] space-y-2`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                {msg.groundingLinks && (
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingLinks.map((l, idx) => (
                      <a key={idx} href={l.uri} target="_blank" className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full text-indigo-400 border border-indigo-500/30 flex items-center gap-2 transition-all">
                        <i className="fa-solid fa-location-arrow"></i> {l.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isAgentLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800/50 p-4 rounded-2xl flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAgentChat} className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="relative">
            <input 
              type="text" value={inputText} onChange={e => setInputText(e.target.value)}
              placeholder="Message Crimini Intelligence..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3.5 px-5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all pr-12"
            />
            <button type="submit" className="absolute right-2 top-1.5 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center justify-center transition-all">
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      {renderNavbar()}

      <div className="flex-1 flex overflow-hidden relative">
        {activeView === ViewType.DASHBOARD && (
          <div className="flex flex-1 overflow-hidden animate-in fade-in duration-300">
            <aside className="w-80 flex flex-col bg-slate-900 border-r border-slate-800 z-10">
              <div className="p-4 border-b border-slate-800">
                <div className={`p-4 rounded-xl border ${
                  !safetyStatus ? 'bg-slate-800' : 
                  safetyStatus.score > 75 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Safety Analysis</div>
                  <div className="text-3xl font-black">{safetyStatus?.score || '--'}</div>
                  <p className="text-[11px] mt-2 text-slate-300 italic">&ldquo;{safetyStatus?.summary}&rdquo;</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {chatMessages.slice(-5).map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] p-3 rounded-xl text-[11px] ${
                      msg.role === 'user' ? 'bg-indigo-600/80 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAgentChat} className="p-3 border-t border-slate-800">
                <input 
                  type="text" value={inputText} onChange={e => setInputText(e.target.value)}
                  placeholder="Quick query..."
                  className="w-full bg-slate-850 border border-slate-700 rounded-lg py-2 px-3 text-[11px] focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </form>
            </aside>

            <div className="flex-1 flex flex-col relative">
              <div className="flex-1">
                <SafetyMap incidents={filteredIncidents} userLocation={userLocation} filterHours={filterHours} onFilterChange={setFilterHours} />
              </div>
              <div className="h-32 bg-slate-950 border-t border-slate-800 p-3 flex gap-3 overflow-x-auto no-scrollbar">
                {safetyStatus?.recommendations.map((rec, i) => (
                  <div key={i} className="min-w-[240px] glass-morphism p-3 rounded-lg border border-indigo-500/10 flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-indigo-400 mb-1">STRATEGY 0{i+1}</span>
                    <p className="text-[11px] text-slate-300 leading-tight font-medium">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="w-80">
              <IncidentFeed incidents={filteredIncidents} onSelectIncident={inc => setUserLocation(inc.location)} />
            </aside>
          </div>
        )}

        {activeView === ViewType.AGENT && <AgentChatView />}

        {activeView === ViewType.VOICE && (
          <VoiceAgentView incidents={filteredIncidents} userLocation={userLocation} />
        )}

        {activeView === ViewType.MAP && (
          <div className="flex-1 animate-in zoom-in-95 duration-500">
            <SafetyMap incidents={filteredIncidents} userLocation={userLocation} filterHours={filterHours} onFilterChange={setFilterHours} />
          </div>
        )}

        {activeView === ViewType.FEED && (
          <div className="flex-1 bg-slate-900/30 overflow-hidden flex flex-col animate-in slide-in-from-right-10 duration-500">
            <div className="max-w-5xl mx-auto w-full h-full p-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl h-full flex flex-col overflow-hidden shadow-2xl">
                <IncidentFeed incidents={filteredIncidents} onSelectIncident={inc => {
                  setUserLocation(inc.location);
                  setActiveView(ViewType.MAP);
                }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {emergencyDraft && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9000] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl scale-in-center">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <i className="fa-solid fa-triangle-exclamation text-2xl animate-pulse"></i>
              <h3 className="text-xl font-black uppercase tracking-tighter">Emergency Dispatch</h3>
            </div>
            <div className="bg-slate-950 p-5 rounded-xl mb-6 text-sm italic border-l-4 border-red-600 text-slate-300 leading-relaxed shadow-inner">
              &ldquo;{emergencyDraft}&rdquo;
            </div>
            <div className="flex flex-col gap-3">
              <button className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-red-600/20 transition-all uppercase tracking-widest">
                CONFIRM & SEND ALERT
              </button>
              <button onClick={() => setEmergencyDraft(null)} className="w-full text-slate-500 py-2 text-xs font-bold hover:text-slate-300">
                CANCEL REQUEST
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafetyDashboard;
