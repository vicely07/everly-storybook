import React, { useState } from 'react';
import PatientMode from './components/PatientMode';
import CaregiverMode from './components/CaregiverMode';
import { LoginScreen } from './components/LoginScreen';
import { AppMode, MemoryCircle, Memory, FamilyMember } from './types';
import { Sparkles, PlayCircle, LogIn, UserPlus } from 'lucide-react';
import { EverlyBird } from './components/EverlyBird';

// Updated Vintage Paper Note Image for all memories (Replaces the camera image)
const OLD_TAPE_IMAGE = "https://images.unsplash.com/photo-1532153955177-f59af40d6472?q=80&w=800&auto=format&fit=crop";

const IMAGES = {
    // All memories now use the vintage paper note image
    BEACH_FAMILY: OLD_TAPE_IMAGE,
    BARN_WEDDING: OLD_TAPE_IMAGE,
    BABY_STRIPED: OLD_TAPE_IMAGE,
    VINTAGE_FATHER: OLD_TAPE_IMAGE,
    VINTAGE_GROUP: OLD_TAPE_IMAGE,
    // Profile Portrait also changed to paper note image
    PROFILE_JANE: OLD_TAPE_IMAGE
};

const INITIAL_STATE: MemoryCircle = {
  profile: {
    firstName: 'Jane',
    lastName: 'Williams',
    preferredName: 'Jane', 
    age: 65,
    locationDescription: 'Sunnybrook Home',
    nurseName: 'Sarah',
    formerRole: 'Community Librarian',
    proudMoments: 'Helping many people find books they loved.',
    loves: 'Quiet mornings, gardening roses, old movies, and hot tea.',
    lifeStory: 'Jane worked as a community librarian and helped many people find books they loved. She built a close and caring family.',
    imageUrl: IMAGES.PROFILE_JANE
  },
  familyMembers: [
      // Changed to Realistic Pseudo Portraits (Pravatar)
      { id: '1', name: 'Tom', relation: 'Husband', note: 'He loves you very much.', imageUrl: 'https://i.pravatar.cc/150?img=11', status: 'completed' }, 
      { id: '2', name: 'Emily', relation: 'Daughter', note: 'She calls you often.', imageUrl: 'https://i.pravatar.cc/150?img=5', status: 'completed' },
      { id: '3', name: 'David', relation: 'Son', note: 'He visits every Sunday.', imageUrl: 'https://i.pravatar.cc/150?img=3', status: 'completed' }, 
      { id: 'fam1', name: 'Sandra', relation: 'Granddaughter', note: 'She loves your stories.', imageUrl: 'https://i.pravatar.cc/150?img=9', status: 'pending' }
  ],
  memories: [
      {
        id: 'm1',
        text: "This is an example memory of Jane (the memory can be photos, videos or voice).",
        author: 'Caregiver',
        mediaType: 'image', 
        timestamp: new Date('2024-03-15'), 
        imageUrl: OLD_TAPE_IMAGE,
        comments: [
            { id: 'c1_1', authorId: '1', text: "I remember this day well. The lighting was perfect." },
            { id: 'c1_2', authorId: '2', text: "Such a beautiful moment captured here." }
        ]
      },
      { 
        id: 'm2', 
        text: "This is an example memory of Jane (the memory can be photos, videos or voice).", 
        author: 'Caregiver', 
        mediaType: 'image',
        timestamp: new Date('2024-02-15'), 
        imageUrl: OLD_TAPE_IMAGE,
        comments: [
            { id: 'c2_1', authorId: '3', text: "We should do this again soon!" },
            { id: 'c2_2', authorId: 'fam1', text: "Grandma looks so happy in this one." },
            { id: 'c2_3', authorId: '1', text: "One of my favorites." }
        ]
      },
      { 
        id: 'm3', 
        text: "This is an example memory of Jane (the memory can be photos, videos or voice).", 
        author: 'Caregiver', 
        mediaType: 'image',
        timestamp: new Date('2024-01-20'), 
        imageUrl: OLD_TAPE_IMAGE,
        comments: [
            { id: 'c3_1', authorId: '2', text: "I love this story." },
            { id: 'c3_2', authorId: '1', text: "It brings back such warm memories." }
        ]
      }
  ],
  reminders: [
      { id: 'r1', title: 'Physical Therapy', time: '2:00 PM', type: 'appointment', completed: false, addedBy: 'Nurse Sarah' },
      { id: 'r2', title: 'Medication Check', time: 'Ask Nurse Sarah', type: 'medication', completed: false, addedBy: 'Nurse Sarah' },
      // UPDATED Hydration reminder author to Emily (Daughter)
      { id: 'r3', title: 'Hydration', time: 'Every 2 hours', type: 'hydration', completed: false, addedBy: 'Emily (Daughter)' },
      { id: 'r4', title: 'My Glasses', time: 'On Nightstand', type: 'general', completed: false, addedBy: 'Emily (Daughter)' }
  ]
};

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      // Simulate checking a token AND an API Key
      if (typeof window !== 'undefined') {
          return !!localStorage.getItem('everly_auth_token') && !!localStorage.getItem('everly_api_key');
      }
      return false;
  });

  // Track if user has an account (simulated DB check)
  const [hasAccount, setHasAccount] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('everly_has_account') === 'true';
    }
    return false;
  });

  // Track if user clicked "Sign Up" or "Sign In"
  const [authIntent, setAuthIntent] = useState<'signin' | 'signup'>('signin');
  // Track which button is currently showing the glare effect
  const [clickedButton, setClickedButton] = useState<'signin' | 'signup' | null>(null);

  const [mode, setMode] = useState<AppMode>(() => {
      // Deep linking support: Check both Path (if supported) and Hash (for static servers)
      if (typeof window !== 'undefined') {
          const isInvite = window.location.pathname.includes('/family/') || window.location.hash.includes('/family/');
          if (isInvite) return AppMode.CAREGIVER;
      }
      return AppMode.ENTRY;
  });
  
  // Lazy initialize from localStorage to persist progress
  const [memoryCircle, setMemoryCircle] = useState<MemoryCircle>(() => {
    try {
        const saved = localStorage.getItem('everly_memory_circle');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Revive Date objects
            if (parsed.memories) {
                // MIGRATION: Force all memories to use the new Paper Note Image
                // Also force mediaType to 'image' so videos don't break the aesthetic
                parsed.memories = parsed.memories.map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                    imageUrl: OLD_TAPE_IMAGE,
                    mediaType: 'image'
                }));
            }
            // Filter out 'John' if specifically requested by user preference
            if (parsed.familyMembers) {
                parsed.familyMembers = parsed.familyMembers.filter((m: any) => m.name.toLowerCase() !== 'john');
            }
            
            // Fix profile image as well
            if (parsed.profile) {
                parsed.profile.imageUrl = OLD_TAPE_IMAGE;
                
                // MIGRATION: Handle name split
                if (parsed.profile.name && !parsed.profile.firstName) {
                    const parts = parsed.profile.name.split(' ');
                    parsed.profile.firstName = parts[0] || '';
                    parsed.profile.lastName = parts.slice(1).join(' ') || '';
                    delete parsed.profile.name;
                }
                
                // Ensure fields exist
                if (!parsed.profile.firstName) parsed.profile.firstName = 'Jane';
                if (!parsed.profile.lastName) parsed.profile.lastName = 'Williams';
                // If preferredName is missing, default to firstName or 'Jane'
                if (!parsed.profile.preferredName) parsed.profile.preferredName = parsed.profile.firstName || 'Jane';
            }

            // Populate reminders if missing (migration)
            if (!parsed.reminders) {
                parsed.reminders = INITIAL_STATE.reminders;
            } else {
                // Migration for addedBy if missing
                parsed.reminders = parsed.reminders.map((r: any) => ({
                    ...r,
                    addedBy: r.addedBy || 'Caregiver'
                }));
            }
            
            // MIGRATION: Ensure 'status' exists on family members (Replacing hasJoined)
            if (parsed.familyMembers) {
                 parsed.familyMembers = parsed.familyMembers.map((m: any) => ({
                     ...m,
                     status: m.status || (m.hasJoined ? 'completed' : 'pending')
                 }));
            }

            return parsed;
        }
    } catch (e) {
        console.error("Failed to load saved state", e);
    }
    return INITIAL_STATE;
  });

  const [introAudioUrl, setIntroAudioUrl] = useState<string | null>(null);

  // Transition Handler
  const handleAuthNavigation = (intent: 'signin' | 'signup') => {
      // Trigger glare animation
      setClickedButton(intent);
      
      // Wait for glare animation (600ms) before navigating
      setTimeout(() => {
          setAuthIntent(intent);
          setMode(AppMode.LOGIN);
          setClickedButton(null);
      }, 600);
  };

  const handleLogin = (details?: { name: string; relation: string; imageUrl?: string }) => {
      try {
          localStorage.setItem('everly_auth_token', 'mock_token_123');
          localStorage.setItem('everly_has_account', 'true');
          setIsAuthenticated(true);
          setHasAccount(true);

          if (details) {
              // Create the family member profile immediately
              const newMember: FamilyMember = {
                  id: Date.now().toString(),
                  name: details.name,
                  relation: details.relation,
                  note: 'Joined via App',
                  // Use provided image or fallback to a deterministic pseudo-avatar based on name length/chars
                  imageUrl: details.imageUrl || `https://i.pravatar.cc/150?u=${details.name.replace(/\s/g, '')}`,
                  status: 'in_progress' // Set new user to 'In Progress' for demo
              };

              setMemoryCircle(prev => {
                  const updated = {
                      ...prev,
                      familyMembers: [...prev.familyMembers, newMember]
                  };
                  // Wrap localStorage in try/catch to prevent app crash if quota exceeded
                  try {
                      localStorage.setItem('everly_memory_circle', JSON.stringify(updated));
                  } catch (e) {
                      console.error("Storage limit reached, could not save to local storage", e);
                      // Fallback: We can try to clear old data or just warn, but at least app won't crash
                  }
                  return updated;
              });
          }

          // After login, default to Caregiver unless we were in patient mode
          setMode(AppMode.CAREGIVER); 
      } catch (e) {
          console.error("Login Error", e);
      }
  };

  const addPatientMemory = (text: string, mediaUrl?: string, mediaType: 'text' | 'audio' = 'text') => {
      const newMemory: Memory = {
          id: Date.now().toString(),
          text,
          author: 'Patient',
          mediaType: mediaType as any,
          timestamp: new Date(),
          imageUrl: mediaUrl
      };
      
      setMemoryCircle(prev => {
          const updated = {
              ...prev,
              memories: [...prev.memories, newMemory]
          };
          try {
             localStorage.setItem('everly_memory_circle', JSON.stringify(updated));
          } catch(e) { console.error("Storage Error", e); }
          return updated;
      });
  };

  const toggleReminder = (id: string) => {
      setMemoryCircle(prev => {
          const updated = {
              ...prev,
              reminders: prev.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r)
          };
          try {
            localStorage.setItem('everly_memory_circle', JSON.stringify(updated));
          } catch(e) { console.error("Storage Error", e); }
          return updated;
      });
  }

  // --- ROUTING LOGIC ---

  // 1. If explicit Login Mode OR (Caregiver Mode AND Not Authenticated), show Login Screen
  if (mode === AppMode.LOGIN || (!isAuthenticated && mode === AppMode.CAREGIVER)) {
      return <LoginScreen onLogin={handleLogin} authMode={authIntent} userHasAccount={hasAccount} />;
  }

  // 2. Landing Page (Public)
  if (mode === AppMode.ENTRY) {
      return (
          <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
               <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200 rounded-full blur-3xl opacity-20 translate-x-1/3 translate-y-1/3" />
               
               {/* CONTENT */}
               <div className="text-center mb-12 z-10 flex flex-col items-center max-w-lg w-full transition-all duration-500">
                   <div className="mb-6 animate-pulse-slow"><EverlyBird size={200} /></div>
                   {/* Solid Dark Green, Thick Bold Font (font-black) */}
                   <h1 className="text-6xl font-black text-teal-900 mb-4 tracking-tighter drop-shadow-sm pb-2">Everly Storybook</h1>
                   <p className="text-2xl text-slate-500 font-light mb-10">An AI Memory StoryTeller for Dementia Care</p>
                   
                   <div className="flex flex-col gap-4 w-full max-w-xs">
                       <button 
                            onClick={() => handleAuthNavigation('signup')}
                            className="relative overflow-hidden w-full bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-xl transition-all hover:scale-105 active:scale-95 group"
                       >
                           <div className="relative z-10 flex items-center justify-center gap-3">
                               <UserPlus className="w-5 h-5" /> Sign Up
                           </div>
                           {/* Sun Glare Overlay - Brighter, Warm Tint, Blend Mode */}
                           {clickedButton === 'signup' && (
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-teal-100/90 to-transparent skew-x-[-20deg] w-[200%] h-full animate-glare z-50 pointer-events-none mix-blend-overlay" />
                           )}
                       </button>

                       <button 
                            onClick={() => handleAuthNavigation('signin')}
                            className="relative overflow-hidden w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl text-lg font-bold shadow-sm transition-all hover:scale-105 active:scale-95 group"
                       >
                           <div className="relative z-10 flex items-center justify-center gap-3">
                               <LogIn className="w-5 h-5" /> Sign In
                           </div>
                           {/* Metallic Glare Overlay - Bright White/Silver */}
                           {clickedButton === 'signin' && (
                               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent skew-x-[-20deg] w-[200%] h-full animate-glare z-50 pointer-events-none" />
                           )}
                       </button>
                   </div>
               </div>
          </div>
      );
  }

  // 3. Protected Routes
  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      {mode === AppMode.PATIENT ? (
        <PatientMode 
            memoryCircle={memoryCircle} 
            addPatientMemory={addPatientMemory}
            onExit={() => setMode(AppMode.ENTRY)}
            toggleMedication={toggleReminder}
            introAudioUrl={introAudioUrl}
            setIntroAudioUrl={setIntroAudioUrl}
        />
      ) : (
        <CaregiverMode 
            memoryCircle={memoryCircle}
            updateMemoryCircle={setMemoryCircle}
            onExit={() => setMode(AppMode.ENTRY)}
            onSetupComplete={() => setMode(AppMode.PATIENT)}
        />
      )}
    </div>
  );
}