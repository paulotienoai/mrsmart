
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from "@google/genai";
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';
import AudioVisualizer from './AudioVisualizer';
import { mockStore } from '../services/mockDataService';
import { TOOLS_SCHEMA } from '../types';
import { makeRetellCall } from '../services/retellService';
import { generateSummary } from '../services/geminiService';
import { recordingsService } from '../services/recordingsService';

const VoiceInterface: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Session Ref
  const aiRef = useRef<GoogleGenAI | null>(null);
  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef<boolean>(false); // Sync ref for audio loop

  // Recording & Transcript Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef<string>("");
  const recordingStartTimeRef = useRef<number>(0);

  // Inactivity & VAD Refs
  const lastUserInteractionRef = useRef<number>(0);
  const hasWarnedRef = useRef<boolean>(false);
  const inactivityIntervalRef = useRef<any>(null);

  // Initialize AI
  useEffect(() => {
    // Updated to use GEMINI_API_KEY per production requirements
    aiRef.current = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    return () => {
        disconnect(); // Cleanup on unmount
    };
  }, []);

  // Inactivity Monitoring Loop
  useEffect(() => {
    if (connected) {
        lastUserInteractionRef.current = Date.now();
        hasWarnedRef.current = false;

        inactivityIntervalRef.current = setInterval(() => {
            if (!sessionRef.current || !audioContextRef.current || !isConnectedRef.current) return;

            // Check if Model is currently speaking (or audio is queued)
            // If model is speaking, we reset the user interaction timer so we don't interrupt the model.
            const isModelSpeaking = audioContextRef.current.currentTime < nextStartTimeRef.current;
            if (isModelSpeaking) {
                lastUserInteractionRef.current = Date.now();
                hasWarnedRef.current = false;
                return;
            }

            const now = Date.now();
            const elapsed = now - lastUserInteractionRef.current;

            // Check-in after 15 seconds of silence (increased from 5/10)
            // We DO NOT hang up automatically. We just check in.
            if (elapsed > 15000 && !hasWarnedRef.current) {
                console.log("Inactivity: 15s triggered. Checking in.");
                hasWarnedRef.current = true;
                
                sessionRef.current.then((s: any) => {
                    if (isConnectedRef.current) {
                        try {
                            s.send({ 
                                parts: [{ text: "The user has been quiet for a while. Gently ask: 'Are you still with me?' or 'Is there anything else I can help with?' DO NOT hang up." }], 
                                turnComplete: true 
                            });
                        } catch (e) {
                            console.warn("Failed to send inactivity check", e);
                        }
                    }
                });
            }

        }, 1000);
    } else {
        if (inactivityIntervalRef.current) {
            clearInterval(inactivityIntervalRef.current);
        }
    }

    return () => {
        if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current);
    };
  }, [connected]);

  // Tool Handler
  const handleToolCall = async (fc: any) => {
    if (!isConnectedRef.current) return;
    
    console.log("Executing Tool:", fc.name, fc.args);
    setStatus(`Executing ${fc.name}...`);
    
    // Reset inactivity timer on tool usage
    lastUserInteractionRef.current = Date.now();
    hasWarnedRef.current = false;
    
    let result: any = { status: "success", message: "Action completed." };
    
    try {
      switch (fc.name) {
        case 'listEmails':
          const emails = mockStore.getEmails().slice(0, 3);
          result = { status: "success", message: `Found ${emails.length} recent emails. Top one from ${emails[0]?.from}: ${emails[0]?.subject}` };
          break;
        case 'sendEmail':
          mockStore.sendEmail(fc.args.to, fc.args.subject, fc.args.body);
          result = { status: "success", message: "Email sent successfully." };
          break;
        case 'createDraft':
          mockStore.addDraft(fc.args.to, fc.args.subject, fc.args.body);
          result = { status: "success", message: "Draft created." };
          break;
        case 'getCalendarEvents':
          const events = mockStore.getEvents();
          result = { status: "success", message: `You have ${events.length} events scheduled.` };
          break;
        case 'bookAppointment':
          mockStore.addEvent(fc.args.title, fc.args.time, fc.args.durationMinutes || 60);
          result = { status: "success", message: "Appointment booked." };
          break;
        case 'makePhoneCall':
            const apiKey = localStorage.getItem('nexus_retell_key') || 'key_72ac19b70e4f8de99294e35d82c2';
            const agentId = localStorage.getItem('nexus_retell_agent') || 'agent_11ae415bd3f53974473f013af1';
            const fromNumber = localStorage.getItem('nexus_retell_from');

            // Strict Phone Number Validation (E.164 roughly)
            const phoneRegex = /^\+?[1-9]\d{1,14}$/;
            if (!fc.args.phoneNumber || !phoneRegex.test(fc.args.phoneNumber.replace(/[-\s]/g, ''))) {
                 result = { 
                     status: "error", 
                     message: `Invalid Phone Number: '${fc.args.phoneNumber}'. You MUST ask the user for the correct phone number before calling. Do not guess.` 
                 };
                 break;
            }

            if (apiKey && agentId && fromNumber) {
                const callRes = await makeRetellCall(
                    fc.args.phoneNumber, 
                    fc.args.context, 
                    { apiKey, agentId, fromNumber },
                    fc.args.companyName,
                    fc.args.emailAddress
                );
                result = { status: "success", message: `Call agent deployed. ID: ${callRes.call_id || callRes.sid}` };
            } else {
                // NO SIMULATION - Fail if credentials missing
                result = { 
                    status: "error", 
                    message: "Configuration Error: The user has not set up the 'From Number' or Retell credentials in settings. Please instruct the user to configure the 'Phone Agent' settings in the app menu." 
                };
            }
            break;
      }
    } catch (e: any) {
        console.error("Tool execution error", e);
        result = { status: "error", message: `Failed to execute tool: ${e.message}` };
    }

    // Send response back to Live API
    if (sessionRef.current && isConnectedRef.current) {
       const session = await sessionRef.current;
       try {
           session.sendToolResponse({
              functionResponses: {
                id : fc.id,
                name: fc.name,
                response: { result },
              }
           });
       } catch (e) {
           console.warn("Failed to send tool response (session likely closed):", e);
       }
    }
    if (isConnectedRef.current) setStatus('Listening...');
  };

  const connect = async () => {
    if (!aiRef.current) return;
    
    // Ensure disconnect is complete before reconnecting
    disconnect();
    isConnectedRef.current = true;
    
    setStatus('Initializing Audio...');
    transcriptRef.current = "";
    recordedChunksRef.current = [];
    
    // Setup Audio Output
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const outputNode = audioContextRef.current.createGain();
    
    // Setup Recording Destination (Mixed Audio)
    const dest = audioContextRef.current.createMediaStreamDestination();
    
    // Connect Output to Speakers AND Recorder
    outputNode.connect(audioContextRef.current.destination);
    outputNode.connect(dest);
    
    // Setup Analyser for Visualizer
    analyserRef.current = audioContextRef.current.createAnalyser();
    outputNode.connect(analyserRef.current);

    // Setup Audio Input
    inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    try {
      // Resume AudioContext if suspended (fixes autoplay policies and connection dropouts)
      if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
      }

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Route Mic to Recorder (Cross-context hack: create source in output context for recording only)
      const micSourceForRecord = audioContextRef.current.createMediaStreamSource(streamRef.current);
      micSourceForRecord.connect(dest);

      // Start Recorder
      mediaRecorderRef.current = new MediaRecorder(dest.stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start();
      recordingStartTimeRef.current = Date.now();

      const tools = Object.values(TOOLS_SCHEMA).map(t => ({
          name: t.name,
          description: t.description,
          parameters: {
            type: Type.OBJECT,
            properties: Object.entries(t.parameters.properties).reduce((acc: any, [k, v]: [string, any]) => {
                acc[k] = { type: v.type === 'STRING' ? Type.STRING : Type.NUMBER, description: v.description };
                return acc;
            }, {}),
            required: t.parameters.required
          }
      }));
      
      const functionDeclarations: FunctionDeclaration[] = tools as any;

      setStatus('Connecting to Gemini...');

      const sessionPromise = aiRef.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: async () => {
            if (!isConnectedRef.current) return;
            
            setStatus('Listening...');
            setConnected(true);
            lastUserInteractionRef.current = Date.now();
            
            // Play Start-up Sound
            if (audioContextRef.current) {
                 const ctx = audioContextRef.current;
                 const osc = ctx.createOscillator();
                 const gain = ctx.createGain();
                 osc.connect(gain);
                 gain.connect(ctx.destination);
                 
                 // Rising pleasant tone
                 osc.type = 'sine';
                 osc.frequency.setValueAtTime(200, ctx.currentTime);
                 osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
                 
                 gain.gain.setValueAtTime(0.05, ctx.currentTime);
                 gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
                 
                 osc.start();
                 osc.stop(ctx.currentTime + 0.3);
            }

            const session = await sessionPromise;
            
            // Wait a brief moment for connection to stabilize before sending text
            setTimeout(() => {
                if (!isConnectedRef.current) return;
                try {
                    // Customized Greeting Prompt
                    session.send({ 
                        parts: [{ 
                            text: "Say 'Mr. Smart here. Ready to work.' in a professional, crisp, and energetic tone." 
                        }], 
                        turnComplete: true 
                    });
                } catch(e) {
                    // Suppress error if session closed
                }
            }, 500);
            
            // Start Input Streaming
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            // Low latency buffer
            const scriptProcessor = inputContextRef.current.createScriptProcessor(2048, 1, 1);
            processorRef.current = scriptProcessor;
            
            scriptProcessor.onaudioprocess = (e) => {
              // Critical: Check guard before sending
              if (isMuted || !isConnectedRef.current) return; 
              
              const inputData = e.inputBuffer.getChannelData(0);
              
              // --- Voice Activity Detection (VAD) ---
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                  sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              
              if (rms > 0.01) { 
                  lastUserInteractionRef.current = Date.now();
                  hasWarnedRef.current = false;
              }
              // ---------------------------------------

              try {
                  const pcmBlob = createPcmBlob(inputData);
                  session.sendRealtimeInput({ media: pcmBlob });
              } catch (err) {
                  // Ignore errors when sending to closed socket during teardown
              }
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!isConnectedRef.current) return;

            // --- Transcript Accumulation for Summary ---
            const inputTx = msg.serverContent?.inputTranscription?.text;
            const outputTx = msg.serverContent?.outputTranscription?.text;
            
            if (inputTx) {
                transcriptRef.current += `User: ${inputTx}\n`;
                // Also reset inactivity on valid transcript receipt (backup to VAD)
                lastUserInteractionRef.current = Date.now();
                hasWarnedRef.current = false;
            }
            if (outputTx) transcriptRef.current += `Mr. Smart: ${outputTx}\n`;

            // --- Audio Handling ---
            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                const ctx = audioContextRef.current;
                
                // Resume logic to prevent "cut off" if browser suspends context
                if (ctx.state === 'suspended') await ctx.resume();

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }

            // Handle Tool Calls
            if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    await handleToolCall(fc);
                }
            }
          },
          onclose: (e) => {
            console.log("Session Closed", e);
            if (isConnectedRef.current) {
                // If we didn't initiate the disconnect, it's an error/drop
                setStatus('Connection Closed');
                setConnected(false);
                finalizeRecording();
                isConnectedRef.current = false;
            }
          },
          onerror: (e: any) => {
            console.error("Session Error", e);
            if (isConnectedRef.current) {
                // Try to extract a useful message if possible
                let errorMessage = 'Connection Error';
                if (e.message?.includes('401') || e.message?.includes('403')) {
                    errorMessage = 'Invalid API Key';
                } else if (e.message?.includes('503')) {
                     errorMessage = 'Service Overloaded';
                }
                
                setStatus(errorMessage);
                setConnected(false);
                finalizeRecording();
                isConnectedRef.current = false;
            }
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {}, 
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
            },
            tools: [{ 
                functionDeclarations,
                googleSearch: {}, 
                googleMaps: {} 
            }],
            systemInstruction: "You are Mr. Smart, a highly intelligent executive AI assistant with a male voice. \n\n**Tone & Style:**\n- You are professional, capable, and human-like. Not robotic, but not overly casual.\n- **Dynamic Balance:** Adjust your responses based on context.\n  - For simple acknowledgments (e.g., confirming an email was sent), be direct and concise (e.g., 'Done.', 'I've handled that.').\n  - For complex inquiries, provide necessary details and structure, but remain efficient.\n- **Engagement:** Actively engage. Ask clarifying questions if a request is vague. Give brief feedback to show you are listening (e.g., 'I see', 'Makes sense').\n\n**Hang Up Protocol (CRITICAL):**\n- **FORBIDDEN:** Do NOT hang up without the user's explicit consent.\n- If the conversation goes silent, ask: \"Are you still there?\" or \"Is there anything else I can help with?\".\n- If you feel the task is done, ask: \"Do you have everything you need?\" before saying goodbye.\n- Only end the call if the user says \"bye\", \"exit\", \"that is all\", or confirms they are done.\n\n**Critical Listening Protocol:**\n- **Do not hallucinate.** If the user's audio is muffled, unclear, or in an unrecognizable language at the start, **DO NOT GUESS**.\n- Instead, immediately ask for clarification using natural phrases like: \"Hey, can you say that one more time?\", \"I didn't quite catch that.\", or \"Come again?\".\n- You have access to Google Search, Maps, Calendar, Email, and Phone Calling. Use these tools proactively. Narrate briefly before acting."
        }
      });
      
      sessionRef.current = sessionPromise;
      
    } catch (err) {
      console.error("Connection failed", err);
      setStatus('Failed to access microphone or API');
      isConnectedRef.current = false;
    }
  };

  const finalizeRecording = async () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
         mediaRecorderRef.current.stop();
         
         setTimeout(async () => {
             const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
             if (blob.size > 0) {
                 const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
                 const summary = await generateSummary(transcriptRef.current);
                 
                 recordingsService.addRecording({
                     id: Date.now().toString(),
                     timestamp: new Date(),
                     duration,
                     audioBlob: blob,
                     summary: summary,
                     transcript: transcriptRef.current
                 });
             }
         }, 500);
     }
  };

  const disconnect = () => {
    isConnectedRef.current = false; // Stop processing immediately

    if (processorRef.current) {
        try {
            processorRef.current.disconnect();
            processorRef.current.onaudioprocess = null;
        } catch (e) { /* ignore */ }
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (sessionRef.current) {
        // We do not await here to avoid blocking UI, just trigger close
        sessionRef.current.then((s: any) => {
            try { s.close(); } catch(e) {}
        }).catch(() => {});
    }
    if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
    }
    if (inputContextRef.current) {
        try { inputContextRef.current.close(); } catch(e) {}
    }
    setConnected(false);
  };

  return (
    <div className="flex flex-col h-full p-4 relative z-10">
      
      {/* Visualizer Area (Middle/Background) */}
      <div className={`flex-1 flex flex-col items-center justify-center w-full transition-all duration-500 ${connected ? 'opacity-100' : 'opacity-100'}`}>
          <div className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r from-primary-600 to-accent-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 ${connected ? 'animate-pulse-slow' : ''}`}></div>
            <div className="relative w-48 h-48 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700 shadow-2xl">
                {connected ? (
                    <AudioVisualizer isActive={connected} analyser={analyserRef.current} />
                ) : (
                    <svg className="w-20 h-20 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                )}
            </div>
          </div>

          <div className="text-center space-y-2 mt-8">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                {connected ? "Mr. Smart" : "Mr. Smart Voice"}
            </h2>
            <p className="text-slate-400 font-mono text-sm">{status}</p>
          </div>
      </div>

      {/* Controls Area (Bottom) */}
      <div className="w-full max-w-md mx-auto space-y-4 mt-auto z-30 relative">
          {/* Main Buttons */}
          <div className="flex justify-center gap-6">
            {!connected ? (
                <button 
                    onClick={connect}
                    className="px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white rounded-full font-semibold shadow-lg shadow-primary-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    Start Conversation
                </button>
            ) : (
                <>
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full transition-colors shadow-lg ${isMuted ? 'bg-red-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                    >
                        {isMuted ? (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><line x1="1" y1="1" x2="23" y2="23" strokeWidth={2}/></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        )}
                    </button>
                    <button 
                        onClick={disconnect}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold shadow-lg shadow-red-500/30 transition-all"
                    >
                        End Call
                    </button>
                </>
            )}
          </div>
      </div>
    </div>
  );
};

export default VoiceInterface;
