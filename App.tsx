
import React, { useState } from 'react';
import VoiceInterface from './components/VoiceInterface';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import SettingsModal from './components/SettingsModal';
import RecordingsMenu from './components/RecordingsMenu';
import { AssistantMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AssistantMode>(AssistantMode.VOICE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordingsOpen, setIsRecordingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden flex flex-col">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <RecordingsMenu isOpen={isRecordingsOpen} onClose={() => setIsRecordingsOpen(false)} />

      {/* Top Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur flex items-center justify-between px-4 md:px-6 z-50 sticky top-0">
        <div className="flex items-center gap-3">
            {/* Burger Menu Button for Recordings */}
            <button 
                onClick={() => setIsRecordingsOpen(true)}
                className="mr-2 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                title="Call Recordings"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Mr. Smart <span className="text-slate-500 font-normal">AI</span></h1>
        </div>
        
        {/* Desktop Navigation - Centered in Header */}
        <div className="hidden md:flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button 
                onClick={() => setMode(AssistantMode.VOICE)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AssistantMode.VOICE ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Voice Mode
            </button>
            <button 
                onClick={() => setMode(AssistantMode.CHAT)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AssistantMode.CHAT ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Text Chat
            </button>
        </div>

        <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Settings & Integrations"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <div className="text-xs text-right hidden lg:block">
                <p className="text-white font-medium">Executive Account</p>
                <p className="text-slate-500">admin@mrsmart.ai</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                <div className="w-full h-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                    MS
                </div>
            </div>
        </div>
      </header>

      {/* Mobile Navigation Row - Dedicated row for Mobile Portrait */}
      <div className="md:hidden px-4 py-3 bg-slate-950 border-b border-slate-800 z-40 sticky top-16">
        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-md">
            <button 
                onClick={() => setMode(AssistantMode.VOICE)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === AssistantMode.VOICE ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Voice Mode
            </button>
            <button 
                onClick={() => setMode(AssistantMode.CHAT)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === AssistantMode.CHAT ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
            >
                Text Chat
            </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 overflow-hidden max-w-7xl mx-auto w-full">
        
        {/* Left Column: AI Interaction (Voice or Chat) */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900/30 rounded-2xl border border-slate-800/50 relative overflow-hidden h-full">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-accent-500/5 blur-[100px]"></div>
            </div>

            <div className="flex-1 relative z-10 h-full">
                {mode === AssistantMode.VOICE ? <VoiceInterface /> : <ChatInterface />}
            </div>
        </div>

        {/* Right Column: Dashboard (Mock Data Visualizer) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col h-full overflow-hidden">
            <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Live Data Access</h2>
                <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs text-green-500">Connected</span>
                </div>
            </div>
            <Dashboard />
        </div>

      </main>
    </div>
  );
};

export default App;
