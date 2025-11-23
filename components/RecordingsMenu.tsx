
import React, { useEffect, useState, useRef } from 'react';
import { recordingsService } from '../services/recordingsService';
import { Recording } from '../types';

interface RecordingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const RecordingsMenu: React.FC<RecordingsMenuProps> = ({ isOpen, onClose }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const update = () => setRecordings(recordingsService.getRecordings());
    update();
    return recordingsService.subscribe(update);
  }, []);

  // Stop sidebar audio if modal opens or menu closes
  useEffect(() => {
    if ((!isOpen || selectedRecording) && audioRef.current) {
        audioRef.current.pause();
        setPlayingId(null);
    }
  }, [isOpen, selectedRecording]);

  const handleSidebarPlay = (e: React.MouseEvent, recording: Recording) => {
    e.stopPropagation(); // Prevent modal opening
    if (playingId === recording.id) {
        if (audioRef.current?.paused) {
            audioRef.current.play();
        } else {
            audioRef.current?.pause();
            setPlayingId(null);
        }
    } else {
        if (audioRef.current) audioRef.current.pause();
        const url = URL.createObjectURL(recording.audioBlob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        audio.play();
        setPlayingId(recording.id);
    }
  };

  const downloadRecording = (e: React.MouseEvent | null, recording: Recording) => {
      if (e) e.stopPropagation();
      const url = URL.createObjectURL(recording.audioBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `mr-smart-recording-${recording.timestamp.toISOString().slice(0,10)}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
      return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Menu Backdrop */}
      {isOpen && !selectedRecording && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-slate-900 border-l border-slate-800 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                Call Recordings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(100%-64px)] space-y-4">
            {recordings.length === 0 && (
                <div className="text-center text-slate-500 mt-10">
                    <p>No recordings yet.</p>
                </div>
            )}

            {recordings.map(rec => (
                <div 
                    key={rec.id} 
                    onClick={() => setSelectedRecording(rec)}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-primary-500/50 hover:bg-slate-800 transition-all cursor-pointer group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors">Conversation</p>
                            <p className="text-xs text-slate-400">{rec.timestamp.toLocaleString()}</p>
                        </div>
                        <span className="text-xs bg-slate-900 px-2 py-1 rounded text-slate-300 font-mono">
                            {formatDuration(rec.duration)}
                        </span>
                    </div>

                    <div className="mb-3">
                        <p className="text-xs text-slate-300 line-clamp-2 italic opacity-80">
                            {rec.summary}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => handleSidebarPlay(e, rec)}
                            className={`flex-1 py-1.5 rounded flex items-center justify-center gap-2 text-xs font-medium transition-colors ${playingId === rec.id ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                        >
                            {playingId === rec.id ? "Pause" : "Preview"}
                        </button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecording && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                  {/* Modal Header */}
                  <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
                      <div>
                          <h3 className="text-lg font-bold text-white">Recording Details</h3>
                          <p className="text-xs text-slate-400">{selectedRecording.timestamp.toLocaleString()} • {formatDuration(selectedRecording.duration)}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedRecording(null)}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                      >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* Audio Player */}
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-600/20 mb-1">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                          </div>
                          <audio 
                            controls 
                            src={URL.createObjectURL(selectedRecording.audioBlob)} 
                            className="w-full h-10 accent-primary-500" 
                            autoPlay 
                          />
                          <div className="flex justify-end w-full">
                              <button 
                                onClick={(e) => downloadRecording(e, selectedRecording)}
                                className="text-xs flex items-center gap-1 text-primary-400 hover:text-primary-300 hover:underline"
                              >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  Download MP3
                              </button>
                          </div>
                      </div>

                      {/* Summary Section */}
                      <div>
                          <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                              <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              Conversation Summary
                          </h4>
                          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 text-slate-300 text-sm leading-relaxed">
                              {selectedRecording.summary}
                          </div>
                      </div>

                      {/* Transcript Section (Bonus, makes it scrollable) */}
                      {selectedRecording.transcript && (
                          <div>
                              <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                  Full Transcript
                              </h4>
                              <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                                  {selectedRecording.transcript}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default RecordingsMenu;
