import React, { useEffect, useState } from 'react';
import { mockStore } from '../services/mockDataService';
import { Email, CalendarEvent } from '../types';

const Dashboard: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const update = () => {
        setEmails(mockStore.getEmails());
        setEvents(mockStore.getEvents());
    };
    update();
    return mockStore.subscribe(update);
  }, []);

  return (
    <div className="h-full overflow-y-auto space-y-6 p-2">
      
      {/* Calendar Section */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Upcoming Events
            </h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">Live</span>
        </div>
        <div className="space-y-3">
            {events.length === 0 && <p className="text-sm text-slate-500 italic">No upcoming events.</p>}
            {events.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-accent-500/50 transition-colors">
                    <div className="flex-col items-center justify-center bg-slate-700 rounded p-2 w-14 text-center hidden sm:flex">
                        <span className="text-xs text-slate-400 uppercase">{event.start.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-lg font-bold text-white">{event.start.getDate()}</span>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-white">{event.title}</h4>
                        <p className="text-xs text-slate-400">
                            {event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                            {event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                        {event.attendees.length > 0 && (
                            <div className="flex -space-x-2 mt-2">
                                {event.attendees.map((att, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-primary-900 border border-slate-800 flex items-center justify-center text-[8px] text-primary-200" title={att}>
                                        {att[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Email Section */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Recent Emails
            </h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">{emails.filter(e => !e.read).length} unread</span>
        </div>
        <div className="space-y-3">
             {emails.length === 0 && <p className="text-sm text-slate-500 italic">Inbox empty.</p>}
             {emails.map(email => (
                 <div key={email.id} className={`p-3 rounded-lg border transition-colors cursor-pointer ${email.isDraft ? 'bg-amber-900/10 border-amber-900/30' : 'bg-slate-800/50 border-slate-700/50 hover:border-primary-500/50'}`}>
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">{email.from}</span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {email.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    <h4 className="text-sm font-medium text-white truncate mb-1">
                        {email.isDraft && <span className="text-amber-500 mr-2">[Draft]</span>}
                        {email.subject}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{email.body}</p>
                    <div className="flex gap-2 mt-2">
                        {email.labels.map(label => (
                            <span key={label} className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300">
                                {label}
                            </span>
                        ))}
                    </div>
                 </div>
             ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;