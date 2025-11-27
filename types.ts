
export interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  read: boolean;
  labels: string[];
  timestamp: Date;
  isDraft?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  attendees: string[];
  description?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  groundingUrls?: string[];
  // To track tool executions in chat history
  functionCalls?: any[]; 
  functionResponse?: any;
}

export interface Recording {
    id: string;
    timestamp: Date;
    duration: number; // in seconds
    audioBlob: Blob;
    summary: string;
    transcript: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleToken?: string; // If logged in via Google
}

export enum AssistantMode {
  VOICE = 'VOICE',
  CHAT = 'CHAT'
}

// GenAI Tool Definitions
export const TOOLS_SCHEMA = {
  listEmails: {
    name: 'listEmails',
    description: 'List recent emails from the user\'s inbox.',
    parameters: { type: 'OBJECT', properties: {}, required: [] }
  },
  sendEmail: {
    name: 'sendEmail',
    description: 'Send an email to a recipient.',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING' },
        subject: { type: 'STRING' },
        body: { type: 'STRING' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  createDraft: {
    name: 'createDraft',
    description: 'Create an email draft.',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING' },
        subject: { type: 'STRING' },
        body: { type: 'STRING' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  getCalendarEvents: {
    name: 'getCalendarEvents',
    description: 'Get calendar events for a specific date or range.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dateInfo: { type: 'STRING', description: 'Natural language date description (e.g., "today", "next week")' }
      },
      required: ['dateInfo']
    }
  },
  bookAppointment: {
    name: 'bookAppointment',
    description: 'Book a new appointment or event on the calendar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        time: { type: 'STRING', description: 'Time of the event' },
        durationMinutes: { type: 'NUMBER' }
      },
      required: ['title', 'time']
    }
  },
  makePhoneCall: {
    name: 'makePhoneCall',
    description: 'Place a phone call using an external AI agent (Retell AI). You MUST ask the user for the phone number if it is not provided. The phoneNumber parameter MUST be a valid E.164 format string (e.g., +1234567890). Do NOT attempt to use a name (like "Alex") as a phone number.',
    parameters: {
      type: 'OBJECT',
      properties: {
        phoneNumber: { type: 'STRING', description: 'The phone number to call in E.164 format (e.g. +15551234567). REQUIRED.' },
        context: { type: 'STRING', description: 'Detailed instructions for the AI agent making the call about what to address/say.' },
        companyName: { type: 'STRING', description: 'Name of the company being called, if applicable.' },
        emailAddress: { type: 'STRING', description: 'Relevant email address for the call context, if any.' }
      },
      required: ['phoneNumber', 'context']
    }
  }
};