
export enum AppMode {
  LOGIN = 'LOGIN',
  ENTRY = 'ENTRY',
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER'
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  note: string; 
  imageUrl?: string;
  status: 'completed' | 'in_progress' | 'pending'; // Replaces hasJoined
}

export interface PatientProfile {
  firstName: string;
  lastName: string;
  preferredName: string;
  age: number;
  locationDescription: string;
  nurseName: string;
  formerRole: string;
  proudMoments: string;
  loves: string;
  lifeStory?: string;
  imageUrl?: string; // Added for the cover photo
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
}

export interface Memory {
  id: string;
  title?: string;
  text: string;
  author: 'Caregiver' | 'Patient'; 
  timestamp: Date;
  mediaType: 'image' | 'video' | 'audio' | 'text';
  imageUrl?: string; // URL for image, video, or audio
  comments?: Comment[];
}

export type ReminderType = 'medication' | 'appointment' | 'hydration' | 'general';

export interface Reminder {
  id: string;
  title: string;
  time: string; 
  type: ReminderType;
  completed: boolean;
  addedBy: string; // NEW: Tracks who created the reminder
}

export interface StoryPart {
  type: 'text' | 'image';
  content: string;
}

// The compiled narrative from Gemini
export interface BookNarrative {
  intro: string; // The "My Story" chapter
  familySummary: string; // Intro to the family tree
  safetyMessage: string; // Reassuring message for the cover
  interleavedStory?: StoryPart[]; // The generated interleaved story
}

export interface MemoryCircle {
  profile: PatientProfile;
  familyMembers: FamilyMember[];
  memories: Memory[];
  reminders: Reminder[];
  narrative?: BookNarrative; // The generated book content
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}