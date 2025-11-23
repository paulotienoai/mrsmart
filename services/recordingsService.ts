
import { Recording } from '../types';

class RecordingsService {
  private recordings: Recording[] = [];
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

  getRecordings() {
    return [...this.recordings].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  addRecording(recording: Recording) {
    this.recordings.push(recording);
    this.notify();
  }

  getRecording(id: string) {
    return this.recordings.find(r => r.id === id);
  }
}

export const recordingsService = new RecordingsService();
