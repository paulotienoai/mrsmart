
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { mockStore } from '../services/mockDataService';
import { makeRetellCall } from '../services/retellService';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'model', text: 'Hello. I am Mr. Smart. How can I help you organize your day?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(true); 
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await sendMessageToGemini(history, userMsg.text, useThinking, useSearch);
      
      let responseText = response.text || "";
      const groundingUrls: string[] = [];
      
      // Check for grounding
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
              if (chunk.web?.uri) groundingUrls.push(chunk.web.uri);
              if (chunk.maps?.uri) groundingUrls.push(chunk.maps.uri);
          });
      }

      // Check for Function Calls
      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
         let toolResultText = "\n\n[Processing Actions]:\n";
         for (const fc of calls) {
             toolResultText += `- Action: ${fc.name}\n`;
             
             try {
                 if (fc.name === 'sendEmail') mockStore.sendEmail(fc.args.to, fc.args.subject, fc.args.body);
                 if (fc.name === 'createDraft') mockStore.addDraft(fc.args.to, fc.args.subject, fc.args.body);
                 if (fc.name === 'bookAppointment') mockStore.addEvent(fc.args.title, fc.args.time);
                 
                 if (fc.name === 'makePhoneCall') {
                    const apiKey = localStorage.getItem('nexus_retell_key') || 'key_72ac19b70e4f8de99294e35d82c2';
                    const agentId = localStorage.getItem('nexus_retell_agent') || 'agent_11ae415bd3f53974473f013af1';
                    const fromNumber = localStorage.getItem('nexus_retell_from');
                    
                    if (apiKey && agentId && fromNumber) {
                         toolResultText += `  (Deploying Retell AI Agent...)\n`;
                         const res = await makeRetellCall(
                            fc.args.phoneNumber, 
                            fc.args.context, 
                            { apiKey, agentId, fromNumber },
                            fc.args.companyName,
                            fc.args.emailAddress
                        );
                         toolResultText += `  (Call Agent Queued. ID: ${res.call_id || res.sid})\n`;
                    } else {
                         // No Demo Fallback
                         toolResultText += `  (Error: Settings Incomplete. Please configure 'From Number' and Retell API key in Settings.)\n`;
                    }
                 }

             } catch(e: any) {
                 console.error(e);
                 toolResultText += `  (Error: ${e.message})\n`;
             }
         }
         responseText += toolResultText;
      }

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined
      };

      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error processing your request. Please check your connection.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header / Controls */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850">
         <h3 className="font-semibold text-slate-200">Chat History</h3>
         <div className="flex gap-3">
             <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white">
                 <input 
                   type="checkbox" 
                   checked={useThinking} 
                   onChange={e => {
                       setUseThinking(e.target.checked);
                       if(e.target.checked) setUseSearch(false); 
                   }}
                   className="rounded bg-slate-700 border-slate-600 text-primary-500 focus:ring-primary-500"
                 />
                 Thinking (Pro)
             </label>
             <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-white">
                 <input 
                   type="checkbox" 
                   checked={useSearch} 
                   onChange={e => {
                       setUseSearch(e.target.checked);
                       if(e.target.checked) setUseThinking(false);
                   }}
                   className="rounded bg-slate-700 border-slate-600 text-accent-500 focus:ring-accent-500"
                 />
                 Google Search
             </label>
         </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary-600 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
              
              {msg.groundingUrls && (
                  <div className="mt-2 pt-2 border-t border-slate-600/50">
                      <p className="text-xs font-semibold text-slate-400 mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                          {msg.groundingUrls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:underline truncate max-w-full block bg-slate-900/50 px-2 py-1 rounded">
                                  {new URL(url).hostname}
                              </a>
                          ))}
                      </div>
                  </div>
              )}
              <div className="mt-1 text-[10px] opacity-50 text-right">
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-slate-800 rounded-2xl rounded-bl-none p-4 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
            </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-850 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={useThinking ? "Ask a complex reasoning question..." : useSearch ? "Ask about restaurants, news, places..." : "Type a message..."}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-6 py-3 text-sm text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
