import { Email, CalendarEvent } from '../types';

const INITIAL_EMAILS: Email[] = [
  {
    id: '1',
    from: 'ceo@techcorp.com',
    subject: 'Q4 Strategy Meeting',
    body: 'We need to discuss the roadmap for Q4. Please find a slot.',
    read: false,
    labels: ['Work', 'Important'],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
  },
  {
    id: '2',
    from: 'newsletter@daily.ai',
    subject: 'The future of LLMs',
    body: 'Here are the top trends in AI this week...',
    read: true,
    labels: ['Newsletter'],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
  },
  {
    id: '3',
    from: 'mom@family.com',
    subject: 'Dinner on Sunday?',
    body: 'Let me know if you can make it.',
    read: false,
    labels: ['Personal'],
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) // 2 days ago
  }
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: '101',
    title: 'Team Standup',
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(10, 30, 0, 0)),
    attendees: ['team@techcorp.com']
  },
  {
    id: '102',
    title: 'Lunch with Client',
    start: new Date(new Date().setHours(12, 30, 0, 0)),
    end: new Date(new Date().setHours(13, 30, 0, 0)),
    attendees: ['client@bigbiz.com']
  }
];

// Simple in-memory store pattern
export class MockDataStore {
  private emails: Email[] = [...INITIAL_EMAILS];
  private events: CalendarEvent[] = [...INITIAL_EVENTS];
  private subscribers: (() => void)[] = [];

  subscribe(callback: () => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach(cb => cb());
  }

  getEmails() { return this.emails; }
  getEvents() { return this.events; }

  addEmail(email: Email) {
    this.emails = [email, ...this.emails];
    this.notify();
  }

  addDraft(to: string, subject: string, body: string) {
    const draft: Email = {
      id: Math.random().toString(36).substring(7),
      from: 'me@nexus.ai',
      subject,
      body,
      read: true,
      labels: ['Draft'],
      timestamp: new Date(),
      isDraft: true
    };
    this.emails = [draft, ...this.emails];
    this.notify();
    return draft;
  }

  sendEmail(to: string, subject: string, body: string) {
    // Simulate sending by adding to sent items (visualized as just an email for now)
    const sent: Email = {
      id: Math.random().toString(36).substring(7),
      from: 'me@nexus.ai',
      subject: `Sent: ${subject}`,
      body: `To: ${to}\n\n${body}`,
      read: true,
      labels: ['Sent'],
      timestamp: new Date(),
    };
    this.emails = [sent, ...this.emails];
    this.notify();
    return sent;
  }

  addEvent(title: string, timeStr: string, durationMinutes: number = 60) {
    // Very basic date parsing for demo
    let start = new Date();
    if (timeStr.toLowerCase().includes('tomorrow')) {
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
    } else if (timeStr.toLowerCase().includes('next week')) {
        start.setDate(start.getDate() + 7);
    } else {
        // default to next hour
        start.setHours(start.getHours() + 1, 0, 0, 0);
    }

    const end = new Date(start.getTime() + durationMinutes * 60000);

    const event: CalendarEvent = {
      id: Math.random().toString(36).substring(7),
      title,
      start,
      end,
      attendees: []
    };
    this.events = [...this.events, event].sort((a, b) => a.start.getTime() - b.start.getTime());
    this.notify();
    return event;
  }
}

export const mockStore = new MockDataStore();