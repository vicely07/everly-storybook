import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MemoryCircle, Memory, FamilyMember, PatientProfile, BookNarrative, Reminder } from '../types';
import { generateSimpleTTS } from '../services/geminiService';
import { EverlyBird } from './EverlyBird';
import { ShieldCheck, Heart, Mic, Video, Sparkles, Disc, PauseCircle, PlayCircle, Loader2, RefreshCw, MapPin, User, Calendar, Clock, Activity, Pill, GlassWater, Search, Bell, Volume2, ArrowLeft, Phone, AlertCircle, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PatientModeProps {
  memoryCircle: MemoryCircle;
  addPatientMemory: (text: string, mediaUrl?: string, mediaType?: 'text' | 'audio') => void;
  onExit: () => void;
  toggleMedication: (id: string) => void;
  introAudioUrl: string | null;
  setIntroAudioUrl: (url: string) => void;
}

// Soft Piano / Ambient Track
const BACKGROUND_MUSIC_URL = "https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3";

// --- SUB-COMPONENTS FOR BOOK PAGES ---

const PaperTexture = () => (
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-60 pointer-events-none mix-blend-multiply rounded-r-lg" />
);

const CalmBackground = () => (
    <div className="absolute inset-0 bg-[#020617] overflow-hidden">
        {/* Deep Orange/Space Gradient Base */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#431407] via-[#020617] to-[#000000] opacity-100 animate-glow-pulse" />
        
        {/* Glowing Orbs - Deep Emerald & Teal */}
        <div className="absolute top-[-20%] left-[-10%] w-[90vw] h-[90vw] bg-emerald-900/40 rounded-full blur-[100px] animate-float-slow pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[90vw] h-[90vw] bg-teal-900/40 rounded-full blur-[100px] animate-float-slower-reverse pointer-events-none mix-blend-screen" />
        
        {/* Central Glow - Soft Green */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-teal-500/10 rounded-full blur-[80px] animate-pulse-slow pointer-events-none mix-blend-screen" />

        {/* Stars/Dust - Significantly increased opacity for clarity */}
        <div className="absolute inset-0 opacity-80 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen pointer-events-none" />
    </div>
);

const PageNumber = ({ num }: { num: number }) => (
    <div className="absolute bottom-4 w-full text-center text-slate-400 font-serif text-[10px] pointer-events-none z-10">
        - {num} -
    </div>
);

// Updated Cover Page to be generic
const CoverPage = ({ profile }: { profile: PatientProfile }) => (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#fdfbf7] relative overflow-hidden">
        <PaperTexture />
        
        {/* Removed Profile Image - Just the Logo */}
        <div className="mb-8 relative">
            <EverlyBird size={120} className="mx-auto opacity-90 drop-shadow-xl" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 font-serif tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 leading-tight">
            The Life of <br/>
            <span className="text-teal-700">{profile.preferredName || profile.firstName}</span>
        </h1>
        
        <div className="w-16 h-1 bg-teal-600 mb-6 rounded-full opacity-50" />
        
        <p className="text-xl text-slate-600 italic font-serif max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
            "A collection of your beautiful moments."
        </p>
    </div>
);

// Updated types to be precise
const IntroPage = ({ narrative, profile }: { narrative?: BookNarrative, profile: PatientProfile }) => (
    <div className="h-full p-10 md:p-14 bg-[#fdfbf7] relative text-left overflow-y-auto custom-scrollbar">
        <PaperTexture />
        <h2 className="font-serif text-2xl text-slate-800 border-b-2 border-teal-100 pb-3 mb-6 text-center">
            A Note for You
        </h2>
        <div className="prose prose-lg prose-slate font-serif leading-loose text-slate-700 animate-in fade-in duration-1000 text-base flex flex-col gap-6">
             {narrative?.interleavedStory && narrative.interleavedStory.length > 0 ? (
                 narrative.interleavedStory.map((part, idx) => (
                     part.type === 'text' ? (
                         <div key={idx}><ReactMarkdown>{part.content}</ReactMarkdown></div>
                     ) : (
                         <img key={idx} src={part.content} alt="Story illustration" className="w-full rounded-xl shadow-md border-4 border-white" referrerPolicy="no-referrer" />
                     )
                 ))
             ) : narrative?.intro ? (
                 <ReactMarkdown>{narrative.intro}</ReactMarkdown>
             ) : (
                 <p>{profile.lifeStory}</p>
             )}
        </div>
        <div className="mt-8 flex justify-center">
            <Sparkles className="text-teal-500 animate-pulse w-5 h-5" />
        </div>
    </div>
);

const FamilyPage = ({ family }: { family: FamilyMember[] }) => (
    <div className="h-full p-8 bg-[#fdfbf7] relative overflow-y-auto custom-scrollbar flex flex-col items-center pb-20">
        <PaperTexture />
        <h2 className="font-serif text-2xl text-slate-800 border-b-2 border-teal-100 pb-3 mb-6 text-center w-full">
            Your Family
        </h2>
        
        <div className="flex flex-col items-center gap-5 w-full max-w-lg">
             {family.map((member, index) => (
                 <div key={member.id} className="relative flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-stone-200 w-full transition-transform animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${index * 200}ms` }}>
                      {index !== family.length - 1 && (
                          <div className="absolute left-[2.75rem] top-16 h-8 w-0.5 bg-stone-300 -z-10" />
                      )}
                      
                      <div className="relative flex-shrink-0">
                        <img 
                            src={member.imageUrl || `https://ui-avatars.com/api/?name=${member.name}`} 
                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md bg-stone-100" 
                            alt={member.name}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-slate-800 font-serif truncate">{member.name}</h3>
                          <span className="inline-block px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold rounded-full mb-1 uppercase tracking-wide">{member.relation}</span>
                          <p className="text-slate-500 text-xs italic leading-relaxed line-clamp-2">"{member.note}"</p>
                      </div>
                 </div>
             ))}
        </div>
    </div>
);

const MemoryPage = ({ memory, family }: { memory: Memory, family: FamilyMember[] }) => {
    const renderContent = () => {
        if (memory.mediaType === 'video') {
            return (
                <div className="w-full bg-black rounded-xl overflow-hidden shadow-lg border-4 border-white mb-6 relative aspect-video group animate-in zoom-in-95 duration-1000 max-h-[35vh]">
                     <video src={memory.imageUrl} autoPlay loop muted className="w-full h-full object-contain" />
                </div>
            );
        }
        if (memory.mediaType === 'audio') {
            return (
                <div className="w-full p-8 bg-amber-50 rounded-xl border border-amber-200 flex flex-col items-center justify-center gap-4 shadow-inner mb-6 relative overflow-hidden animate-in zoom-in-95 duration-1000">
                    <div className="absolute inset-0 bg-amber-100/30 pattern-grid-lg opacity-20"></div>
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center animate-spin-slow border-4 border-slate-700 shadow-xl relative z-10">
                         <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center border-2 border-amber-300">
                             <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest relative z-10 flex items-center gap-2"><Disc size={10}/> Audio Memory</p>
                </div>
            );
        }
        return (
            <div className="relative p-2 bg-white shadow-lg rotate-1 transition-transform hover:rotate-0 duration-1000 w-full mb-4 animate-in zoom-in-95 border-2 border-slate-100">
                <img 
                    src={memory.imageUrl} 
                    className="w-full h-auto max-h-[30vh] md:max-h-[35vh] object-contain mx-auto" 
                    alt="Memory"
                />
            </div>
        );
    };

    return (
        <div className="h-full p-6 md:p-8 bg-[#fdfbf7] relative flex flex-col overflow-y-auto custom-scrollbar pb-24">
            <PaperTexture />
            <div className="flex-1 flex flex-col items-center min-h-0 pt-2">
                {renderContent()}
                
                {/* Caption */}
                <div className="w-full text-center mt-2 mb-6">
                    <div className="inline-flex items-center gap-2 text-amber-700 font-bold text-[10px] uppercase mb-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                        {memory.mediaType === 'video' ? <Video size={8} /> : memory.mediaType === 'audio' ? <Mic size={8} /> : <Heart size={8} fill="currentColor" />} 
                        {memory.timestamp.getFullYear()}
                    </div>
                    <p className="text-base font-serif text-slate-800 leading-relaxed italic animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300 px-2">
                        "{memory.text}"
                    </p>
                </div>

                {/* Comments Section - COMPACT DESIGN */}
                {memory.comments && memory.comments.length > 0 && (
                    <div className="w-full max-w-lg bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-stone-200/60 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 mb-6">
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3 text-center flex items-center justify-center gap-2">
                            <Heart size={10} className="text-pink-400" fill="currentColor" /> Family Notes
                        </h4>
                        <div className="space-y-2">
                            {memory.comments.map((comment) => {
                                const author = family.find(f => f.id === comment.authorId);
                                const isCaregiver = comment.authorId === 'caregiver';
                                const name = isCaregiver ? 'Caregiver' : author?.name || 'Family';
                                const avatar = isCaregiver 
                                    ? null 
                                    : (author?.imageUrl || `https://ui-avatars.com/api/?name=${name}`);

                                return (
                                    <div key={comment.id} className="flex gap-2 items-start">
                                        <div className="flex-shrink-0 mt-0.5">
                                            {isCaregiver ? (
                                                <div className="w-5 h-5 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700">
                                                    <User size={10} />
                                                </div>
                                            ) : (
                                                <img src={avatar || ''} className="w-5 h-5 rounded-full object-cover border border-white shadow-sm" alt={name} />
                                            )}
                                        </div>
                                        <div className="bg-white p-2 px-3 rounded-xl rounded-tl-none shadow-sm border border-stone-100 flex-1">
                                            <p className="text-[10px] font-bold text-stone-500 mb-0">{name}</p>
                                            <p className="text-xs text-stone-800 font-serif leading-snug">{comment.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const SummaryPage = ({ profile }: { profile: PatientProfile }) => (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#fdfbf7] relative overflow-hidden">
        <PaperTexture />
        <div className="flex flex-col items-center max-w-2xl mb-12 animate-in zoom-in duration-1000">
             <Heart className="w-12 h-12 text-teal-500 mb-6 fill-current animate-pulse-slow" />
             <p className="font-serif text-xl md:text-2xl text-slate-700 leading-relaxed italic">
                You have lived a wonderful life filled with love and care, {profile.preferredName || profile.firstName}.
             </p>
        </div>
    </div>
);

// CHANGED BACKGROUND TO WHITE and removed texture
const FinalButtonsPage = ({ onReplay, onReadReminders }: { onReplay: () => void, onReadReminders: () => void }) => (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white relative overflow-hidden">
        {/* Removed PaperTexture for clean white look */}
        <div className="flex flex-col gap-6 w-full max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700">
            <button 
                onClick={onReplay}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-teal-600 text-white text-lg rounded-2xl font-bold hover:bg-teal-700 transition-all shadow-xl hover:scale-105 active:scale-95 group w-full"
            >
                <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-500" /> Play Again
            </button>
            <button 
                onClick={onReadReminders}
                className="flex items-center justify-center gap-3 px-10 py-5 bg-white text-teal-700 border-2 border-teal-100 text-lg rounded-2xl font-bold hover:bg-teal-50 transition-all shadow-xl hover:scale-105 active:scale-95 group w-full"
            >
                <Bell size={24} className="group-hover:swing transition-transform duration-500" /> Read Reminders
            </button>
        </div>
    </div>
);

// --- TYPE DEFINITIONS FOR PAGES ---
type Page = 
  | { type: 'COVER'; data: { profile: PatientProfile; narrative?: BookNarrative } }
  | { type: 'FAMILY'; data: { family: FamilyMember[] } }
  | { type: 'INTRO'; data: { profile: PatientProfile; narrative?: BookNarrative } }
  | { type: 'MEMORY'; data: { memory: Memory, family: FamilyMember[] } }
  | { type: 'SUMMARY'; data: { profile: PatientProfile } }
  | { type: 'ACTIONS'; data: { onReplay: () => void, onReadReminders: () => void } };

// --- MAIN COMPONENT ---

const PatientMode: React.FC<PatientModeProps> = ({ memoryCircle, introAudioUrl, setIntroAudioUrl, onExit, addPatientMemory, toggleMedication }) => {
  // Intro Sequence State
  const [introStep, setIntroStep] = useState<'GREETING' | 'SAFETY' | 'NOTE' | 'DONE'>('GREETING');
  const [noteProgress, setNoteProgress] = useState(0);
  const [isNoteLoading, setIsNoteLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  
  // Replay State Trigger
  const [replayTrigger, setReplayTrigger] = useState(0);
  
  const [pageIndex, setPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isReadingReminders, setIsReadingReminders] = useState(false);
  
  // Panic Mode State
  const [showPanic, setShowPanic] = useState(false);

  // Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  
  // Audio Cache for Gapless Playback - KEY is now specific Page Index
  // UPDATED: Now storing Promises to handle simultaneous requests better
  const audioCache = useRef<Map<number, Promise<string | null>>>(new Map());

  // Refs for stable access
  const isPausedRef = useRef(isPaused);
  const isPlayingRef = useRef(isPlaying);
  const pageIndexRef = useRef(pageIndex);

  // Helper to get display name
  const getDisplayName = () => memoryCircle.profile.preferredName || memoryCircle.profile.firstName;

  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { pageIndexRef.current = pageIndex; }, [pageIndex]);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // --- TIME UPDATE ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update every 10s
    return () => clearInterval(timer);
  }, []);

  // --- BACKGROUND MUSIC ---
  useEffect(() => {
    const music = new Audio(BACKGROUND_MUSIC_URL);
    music.loop = true;
    music.volume = 0; // Start silent for fade-in
    bgMusicRef.current = music;

    music.play().then(() => {
        // Soft fade in to 15% volume
        let vol = 0;
        const interval = setInterval(() => {
            vol = Math.min(vol + 0.01, 0.15);
            music.volume = vol;
            if (vol >= 0.15) clearInterval(interval);
        }, 200);
    }).catch(e => console.log("Music play prevented until interaction", e));

    return () => {
        music.pause();
        bgMusicRef.current = null;
    };
  }, []);

  // --- CONTENT PREPARATION ---
  // SORTING MEMORIES BY DATE ASCENDING
  const sortedMemories = useMemo(() => {
      return [...memoryCircle.memories].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [memoryCircle.memories]);

  const pages: Page[] = [
      { type: 'COVER', data: { profile: memoryCircle.profile, narrative: memoryCircle.narrative } },
      { type: 'FAMILY', data: { family: memoryCircle.familyMembers } },
      { type: 'INTRO', data: { profile: memoryCircle.profile, narrative: memoryCircle.narrative } },
      ...sortedMemories.map(m => ({ type: 'MEMORY' as const, data: { memory: m, family: memoryCircle.familyMembers } })),
      { type: 'SUMMARY', data: { profile: memoryCircle.profile } },
      { type: 'ACTIONS', data: { onReplay: () => handleReplay(), onReadReminders: () => handleReadReminders() } }
  ];
  const totalPages = pages.length;

  // --- INTRO SEQUENCE LOGIC ---
  useEffect(() => {
    let isCancelled = false;
    // This effect drives the cinematic intro before the book starts
    const runIntroSequence = async () => {
        const profile = memoryCircle.profile;
        const narrative = memoryCircle.narrative;
        const name = getDisplayName();
        
        // Define texts
        const greetingText = `Hi ${name}. I am Everly, your memory companion.`;
        const safetyText = `You are currently at ${profile.locationDescription}, with your nurse ${profile.nurseName}. You are safe here.`;
        const noteText = narrative?.intro || profile.lifeStory || `We have put together a memory book for you, ${name}.`;

        if (!mountedRef.current || isCancelled) return;

        // --- PIPELINE LOADING: Start B while A plays ---

        // 1. Generate Greeting
        const greetingUrlPromise = generateSimpleTTS(greetingText);
        // 2. Start Generating Safety (Buffer)
        const safetyUrlPromise = generateSimpleTTS(safetyText);

        const greetingUrl = await greetingUrlPromise;

        if (isCancelled) return;

        // Play Greeting
        if (greetingUrl && mountedRef.current) {
            await playAudioPromise(greetingUrl, undefined, () => isCancelled);
        } else {
             // Fallback delay if TTS failed
             await new Promise(r => setTimeout(r, 2000));
        }

        if (!mountedRef.current || isCancelled) return;

        // --- STEP 2: SAFETY ---
        setIntroStep('SAFETY');
        
        // 3. Start Generating Note (Buffer)
        const noteUrlPromise = generateSimpleTTS(noteText);
        const safetyUrl = await safetyUrlPromise;

        if (isCancelled) return;

        if (safetyUrl && mountedRef.current) {
             await playAudioPromise(safetyUrl, undefined, () => isCancelled);
        } else {
             await new Promise(r => setTimeout(r, 3000));
        }

        if (!mountedRef.current || isCancelled) return;

        // --- STEP 3: NOTE ---
        setIntroStep('NOTE'); 
        setIsNoteLoading(true);
        
        const noteUrl = await noteUrlPromise;
        setIsNoteLoading(false);

        if (isCancelled) return;

        if (noteUrl && mountedRef.current) {
             await playAudioPromise(noteUrl, (p) => setNoteProgress(p), () => isCancelled);
        } else {
             // Fallback typewriter effect simulation
             const duration = 5000;
             const start = Date.now();
             while (Date.now() - start < duration && mountedRef.current && !isCancelled) {
                 setNoteProgress((Date.now() - start) / duration);
                 await new Promise(r => setTimeout(r, 50));
             }
        }
        
        // Done
        if (mountedRef.current && !isCancelled) {
            await new Promise(r => setTimeout(r, 1000));
            if (!isCancelled) setIntroStep('DONE');
        }
    };

    runIntroSequence();

    return () => {
        isCancelled = true;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, [replayTrigger]); // Re-run when replayTrigger changes

  const playAudioPromise = (url: string, onProgress?: (p: number) => void, getIsCancelled?: () => boolean) => {
      return new Promise<void>((resolve) => {
          if (!mountedRef.current || (getIsCancelled && getIsCancelled())) { resolve(); return; }

          const audio = new Audio(url);
          audioRef.current = audio; // Track it so we can pause if needed
          
          if (onProgress) {
              audio.ontimeupdate = () => {
                  if (getIsCancelled && getIsCancelled()) {
                      audio.pause();
                      resolve();
                      return;
                  }
                  if (audio.duration) {
                      onProgress(audio.currentTime / audio.duration);
                  }
              };
          }

          audio.onended = () => {
              if (onProgress) onProgress(1);
              resolve();
          };

          audio.play().catch(e => {
              // Ignore abort errors which happen on cleanup/pause
              if (e.name !== 'AbortError') console.error("Intro play failed", e);
              resolve();
          });
      });
  };

  const handleReplay = () => {
    // Reset state and increment trigger to re-run intro effect
    setIntroStep('GREETING');
    setPageIndex(0);
    setNoteProgress(0);
    setIsPlaying(true);
    setIsPaused(false);
    setReplayTrigger(prev => prev + 1);
  };

  // UPDATED: Now supports reading a specific reminder immediately OR all reminders
  // Removes overlay triggering (setIsPaused) to ensure non-blocking UI
  const handleReadReminders = async (specificReminderText?: string) => {
      // 1. Stop any current audio
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // 2. Halt book progression but DO NOT show full overlay
      // Just mark as reading so the "Speaker" icon can animate
      setIsPlaying(false);
      setIsReadingReminders(true);

      let script = "";
      if (specificReminderText) {
          script = specificReminderText;
      } else {
          const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const activeReminders = memoryCircle.reminders.filter(r => !r.completed);
          
          script = `Today is ${dateStr}. `;
          
          if (activeReminders.length === 0) {
              script += "You have no reminders left for today. Relax and enjoy your day.";
          } else {
              script += `You have ${activeReminders.length} reminders. `;
              activeReminders.forEach(r => {
                  script += `At ${r.time}, ${r.title}. `;
              });
          }
      }
      
      const url = await generateSimpleTTS(script);
      if (url) {
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.play();
          audio.onended = () => {
              setIsReadingReminders(false);
              // We do NOT auto-resume the book to let them digest the reminder
          };
      } else {
          setIsReadingReminders(false);
      }
  };

  // --- BOOK AUDIO TEXT GENERATOR HELPER ---
  const getSinglePageText = (index: number) => {
      if (index >= totalPages) return null;
      const page = pages[index];
      let textToSay = "";

      if (page.type === 'COVER') {
          textToSay = `The Life of ${getDisplayName()}. A collection of your beautiful moments.`;
      } else if (page.type === 'INTRO') {
           textToSay = "Here is your story.";
      } else if (page.type === 'FAMILY') {
          textToSay = "Here is your beautiful family. " + memoryCircle.familyMembers.map(m => m.name + " is your " + m.relation).join('. ');
      } else if (page.type === 'MEMORY') {
          // ADDED: Announce Year
          const year = page.data.memory.timestamp.getFullYear();
          textToSay = `The year is ${year}. ${page.data.memory.text}`;
      } else if (page.type === 'SUMMARY') {
          textToSay = `Your family has sent you messages of love. ${getDisplayName()}, you have lived a wonderful life filled with love and care.`;
      } else if (page.type === 'ACTIONS') {
          textToSay = "Would you like to play the story again, or read your daily reminders?";
      }
      return textToSay;
  };

  // --- AUDIO FETCHING & CACHING ---
  
  // Retrieves or starts fetching audio for a page, returns a Promise
  const getPageAudio = (index: number): Promise<string | null> => {
      if (audioCache.current.has(index)) {
          return audioCache.current.get(index)!;
      }

      const text = getSinglePageText(index);
      if (!text) {
          const p = Promise.resolve(null);
          audioCache.current.set(index, p);
          return p;
      }

      const promise = generateSimpleTTS(text).then(url => url);
      audioCache.current.set(index, promise);
      return promise;
  };

  // --- SMART LOOKAHEAD PRELOADER ---
  // Replaces aggressive loop to respect 10 RPM limit
  useEffect(() => {
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      
      // Helper to schedule a safe preload
      const scheduleFetch = (offset: number, delay: number) => {
          const target = pageIndex + offset;
          if (target < totalPages) {
             const t = setTimeout(() => {
                 if (mountedRef.current && !audioCache.current.has(target)) {
                     // console.log(`Preloading page ${target} with delay ${delay}`);
                     getPageAudio(target);
                 }
             }, delay);
             timeouts.push(t);
          }
      };

      // Strategy: 
      // We have a strict ~10 requests/min limit.
      // We assume user reads a page for at least 10s.
      // Preload next page shortly after load.
      scheduleFetch(1, 2000); 
      // Preload subsequent pages with significant gaps (6s+)
      scheduleFetch(2, 8000);
      scheduleFetch(3, 15000);

      return () => timeouts.forEach(clearTimeout);
  }, [pageIndex, totalPages]);

  // --- AUTO-READER ENGINE (SEQUENTIAL) ---
  const playPageAudio = async (index: number) => {
      // STRICT CHECK: Do not play book audio if Intro is not done
      if (introStep !== 'DONE') return;

      // 1. Stop current audio
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (index >= totalPages) {
          return;
      }

      // ADDED DELAY: Wait for page turn animation (700ms) + buffer before starting audio
      await new Promise(r => setTimeout(r, 1000));

      const isActionPage = pages[index].type === 'ACTIONS' || (pages[index + 1] && pages[index + 1].type === 'ACTIONS');
      
      // PRE-STEP: Play recorded audio if exists on visible spread
      if (isPlaying && !isPaused && !isReadingReminders) {
          const pagesToPlay = [pages[index], pages[index + 1]].filter(Boolean);
          for (const p of pagesToPlay) {
              if (p.type === 'MEMORY' && p.data.memory.mediaType === 'audio' && p.data.memory.imageUrl) {
                  await new Promise<void>((resolve) => {
                      if (!mountedRef.current || !isPlayingRef.current || isPausedRef.current || isReadingReminders) { resolve(); return; }
                      const memAudio = new Audio(p.data.memory.imageUrl);
                      audioRef.current = memAudio;
                      memAudio.onended = () => resolve();
                      memAudio.onerror = () => resolve(); 
                      memAudio.play().catch(() => resolve());
                  });
              }
          }
      }

      // 2. Play LEFT Page Audio
      await playSinglePageAudio(index);
      
      // 3. Play RIGHT Page Audio (after a small pause)
      if (isPlayingRef.current && !isPausedRef.current && !isReadingReminders && index + 1 < totalPages) {
          // Increased delay to 1500ms for more relaxed reading pace
          await new Promise(r => setTimeout(r, 1500)); 
          await playSinglePageAudio(index + 1);
      }

      // 4. Turn Page
      if (!isActionPage && isPlayingRef.current && !isPausedRef.current && !isReadingReminders) {
          silenceTimerRef.current = setTimeout(() => {
               setPageIndex(prev => prev + 2);
          }, 2000); // Pause before turning
      }
  };

  const playSinglePageAudio = async (idx: number): Promise<void> => {
      if (idx >= totalPages || !mountedRef.current) return;
      if (!isPlayingRef.current || isPausedRef.current || isReadingReminders) return;

      const textToSay = getSinglePageText(idx);
      if (!textToSay) return;

      // Start fetching or get promise
      const audioPromise = getPageAudio(idx);
      
      // Check if we need to show buffering (race against a timeout)
      let isSlow = false;
      const bufferTimer = setTimeout(() => {
          isSlow = true;
          setIsBuffering(true);
      }, 500); 

      let url: string | null = null;
      try {
          // ADDED TIMEOUT to prevent hanging forever if network stalls
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
          url = await Promise.race([audioPromise, timeoutPromise]);
      } catch (e) {
          console.error("Audio fetch error", e);
      }
      
      clearTimeout(bufferTimer);
      if (isSlow) setIsBuffering(false);

      if (url && mountedRef.current && isPlayingRef.current && !isPausedRef.current && !isReadingReminders) {
          return new Promise((resolve) => {
              const audio = new Audio(url!);
              audioRef.current = audio;
              
              audio.onended = () => resolve();
              audio.onerror = () => resolve(); // continue even if error
              
              audio.play().catch(e => {
                  console.error("Playback failed", e);
                  resolve();
              });
          });
      } else {
          // Fallback delay if no audio
          const wordCount = textToSay.split(' ').length;
          const delay = Math.max(2000, wordCount * 300);
          return new Promise(r => setTimeout(r, delay));
      }
  };

  // Trigger reading when page changes
  useEffect(() => {
      if (introStep !== 'DONE') return;

      if (isPlaying && !isPaused && !isReadingReminders) {
          playPageAudio(pageIndex);
      }
      return () => {
          if (audioRef.current) audioRef.current.pause();
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      };
  }, [pageIndex, isPlaying, isPaused, introStep, isReadingReminders]);

  // --- MANUAL NAVIGATION HANDLERS ---
  const canGoBack = pageIndex > 0;
  // If totalPages is odd, last page index is totalPages - 1. We show index and index+1.
  // Next is possible if pageIndex + 2 < totalPages
  const canGoNext = pageIndex + 2 < totalPages;

  const handlePrevPage = () => {
    if (!canGoBack) return;
    if (audioRef.current) audioRef.current.pause();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setPageIndex(prev => Math.max(0, prev - 2));
  };

  const handleNextPage = () => {
    if (!canGoNext) return;
    if (audioRef.current) audioRef.current.pause();
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    setPageIndex(prev => prev + 2);
  };

  // --- PAUSE LOGIC (Manual Trigger) ---
  const handlePause = async () => {
      if (isPausedRef.current) return;
      
      console.log("Manual Pause Triggered");
      setIsPaused(true);
      setIsPlaying(false);
      setIsReadingReminders(false);
      
      if (audioRef.current) audioRef.current.pause();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  };

  const handleResume = () => {
      setIsPaused(false);
      setIsPlaying(true);
  };

  const renderPageContent = (page: Page) => {
      if (!page) return null;
      switch (page.type) {
          case 'COVER': return <CoverPage {...page.data} />;
          case 'INTRO': return <IntroPage {...page.data} />;
          case 'FAMILY': return <FamilyPage {...page.data} />;
          case 'MEMORY': return <MemoryPage {...page.data} />;
          case 'SUMMARY': return <SummaryPage profile={page.data.profile} />;
          case 'ACTIONS': return <FinalButtonsPage onReplay={page.data.onReplay} onReadReminders={page.data.onReadReminders} />;
          default: return null;
      }
  };

  // Helper to render type-writer text safely
  const renderTypewriterText = () => {
      const fullText = memoryCircle.narrative?.intro || "Your story is beautiful.";
      const words = fullText.split(' ');
      const wordCount = Math.ceil(words.length * noteProgress);
      const textToShow = words.slice(0, wordCount).join(' ');
      
      return (
          <div className="text-2xl text-slate-100 font-serif leading-loose text-glow transition-all duration-300">
               {textToShow}
          </div>
      );
  }
  
  // Helper to render reminder icon/color based on type
  const renderReminderCard = (r: Reminder) => {
      let icon = <Activity size={16} />;
      let colorClass = "bg-amber-100 text-amber-700 border-amber-400 bg-[#fffbeb]"; // Default appointment
      
      if (r.type === 'medication') {
          icon = <Pill size={16} />;
          colorClass = "bg-rose-100 text-rose-700 border-rose-400 bg-[#fff1f2]";
      } else if (r.type === 'hydration') {
          icon = <GlassWater size={16} />;
          colorClass = "bg-sky-100 text-sky-700 border-sky-400 bg-[#f0f9ff]";
      } else if (r.type === 'general') {
          icon = <Search size={16} />;
          colorClass = "bg-violet-100 text-violet-700 border-violet-400 bg-[#f5f3ff]";
      }

      // Split colors for icon container vs main bg
      const [iconBg, iconText, border, mainBg] = colorClass.split(" ");

      return (
         <div key={r.id} className="relative group cursor-pointer" onClick={() => handleReadReminders(`Reminder. ${r.title}. At ${r.time}.`)}>
             <div className={`absolute inset-0 ${border.replace('border', 'bg').replace('400', '200')}/40 translate-y-1 translate-x-1 rounded-r-lg blur-sm`}></div>
             <div className={`relative ${mainBg} text-slate-800 p-4 rounded-r-lg border-l-4 ${border} shadow-md transform transition-transform hover:translate-x-1 flex items-start gap-3`}>
                 <button 
                    onClick={(e) => { e.stopPropagation(); toggleMedication(r.id); }}
                    className={`${iconBg} p-1.5 rounded-full ${iconText} mt-0.5 shrink-0 hover:scale-110 transition-transform`}
                 >
                     {r.completed ? <CheckCircle2 size={16}/> : icon}
                 </button>
                 <div className="flex-1">
                     <p className={`font-bold text-base leading-tight font-serif text-slate-900 ${r.completed ? 'line-through opacity-50' : ''}`}>{r.title}</p>
                     <p className="text-slate-600 text-sm italic mt-0.5 font-serif">{r.time}</p>
                     {/* ADDED BY LINE */}
                     <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide font-bold flex items-center gap-1">
                         <User size={8} /> Added by {r.addedBy || 'Caregiver'}
                     </p>
                 </div>
             </div>
         </div>
      );
  };

  // --- INTRO OVERLAY RENDER ---
  if (introStep !== 'DONE') {
      return (
          <div className="h-screen w-screen relative flex flex-col items-center justify-center p-8 overflow-hidden">
              <CalmBackground />
              
              <div className={`transition-opacity duration-1000 flex flex-col items-center max-w-2xl text-center z-10 ${introStep === 'GREETING' ? 'opacity-100' : 'opacity-0 absolute'}`}>
                  <EverlyBird size={150} className="mb-8" />
                  <h1 className="text-5xl text-white font-bold mb-4 text-glow">Hi {getDisplayName()}</h1>
                  {/* UPDATED INTRO TEXT */}
                  <p className="text-xl text-teal-200 text-glow">I'm Everly, your memory companion.</p>
              </div>

              {/* RESTORED SAFETY STEP RENDER */}
              <div className={`transition-opacity duration-1000 flex flex-col items-center max-w-2xl text-center z-10 ${introStep === 'SAFETY' ? 'opacity-100' : 'opacity-0 absolute'}`}>
                  <ShieldCheck size={100} className="text-teal-400 mb-8 animate-pulse" />
                  <h2 className="text-3xl text-white font-bold mb-4 text-glow">You are Safe.</h2>
                  <p className="text-2xl text-slate-300 leading-relaxed text-glow">
                      You are currently at <span className="text-teal-300 font-bold">{memoryCircle.profile.locationDescription}</span>.
                      <br/>
                      Your nurse <span className="text-teal-300 font-bold">{memoryCircle.profile.nurseName}</span> is nearby.
                  </p>
              </div>

               <div className={`transition-opacity duration-1000 flex flex-col items-center max-w-3xl text-center z-10 ${introStep === 'NOTE' ? 'opacity-100' : 'opacity-0 absolute'}`}>
                  <Sparkles size={80} className="text-teal-400 mb-8 animate-spin-slow" />
                  <h2 className="text-3xl text-white font-serif mb-6 border-b border-slate-700 pb-4 text-glow">A Note for You</h2>
                  {isNoteLoading ? (
                       <div className="flex flex-col items-center justify-center h-32 animate-pulse mt-8">
                           <Loader2 className="animate-spin text-teal-300 mb-4" size={40} />
                           <p className="text-lg text-teal-100 font-serif italic">Composing your story...</p>
                       </div>
                  ) : (
                       renderTypewriterText()
                  )}
              </div>
          </div>
      );
  }

  // --- MAIN BOOK RENDER (Only shows when introStep === 'DONE') ---
  return (
    <div className="h-screen w-screen bg-stone-100 flex overflow-hidden relative animate-in fade-in duration-2000 gap-6">
        
        {/* --- LEFT SIDEBAR (UPDATED: Reduced width) --- */}
        <div className="w-64 bg-[#F2EFE9] border-r border-stone-300 text-stone-800 flex flex-col shadow-2xl z-20 relative flex-shrink-0 hidden lg:flex">
             {/* Header with Date/Time */}
            <div className="p-5 border-b border-stone-300/50">
                <div className="text-3xl font-light font-serif tracking-tighter opacity-90 text-stone-800">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                    <Calendar size={10} />
                    {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Location & Safety - Leaner Design with Map & Panic Button */}
            <div className="p-5 border-b border-stone-300/50 flex-1">
                <div className="flex items-center gap-2 mb-4 opacity-80">
                    <ShieldCheck size={16} className="text-teal-600" />
                    <span className="font-bold text-xs tracking-widest uppercase text-stone-500">Safety Monitor</span>
                </div>
                
                {/* Visual Map Widget - UPDATED TO GOOGLE MAP */}
                <div className="rounded-xl overflow-hidden border border-stone-200 bg-white shadow-sm mb-4 relative group">
                    <div className="h-40 bg-slate-200 relative overflow-hidden">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            src="https://maps.google.com/maps?q=21939+Cinco+Ranch+Blvd,+Katy,+TX+77450&t=&z=15&ie=UTF8&iwloc=&output=embed"
                            className="w-full h-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                        ></iframe>
                        
                        {/* Safe Zone Overlay - Visual only, pointer-events-none */}
                        <div className="absolute inset-0 pointer-events-none border-4 border-teal-500/20 rounded-xl"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
                    </div>
                    <div className="p-3 bg-white flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Status</p>
                            <p className="text-xs font-bold text-teal-700 flex items-center gap-1">
                                <ShieldCheck size={12} /> Safe at Home
                            </p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Distance</p>
                             <p className="text-xs font-bold text-stone-700">0.0 mi</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="group">
                         <div className="flex items-center gap-2 text-stone-400 mb-1">
                            <MapPin size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Current Location</span>
                         </div>
                         <div className="text-sm font-serif text-stone-700 leading-tight">
                            {memoryCircle.profile.locationDescription}
                         </div>
                    </div>

                    <div className="group">
                         <div className="flex items-center gap-2 text-stone-400 mb-1">
                            <User size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Caregiver</span>
                         </div>
                         <div className="text-sm font-serif text-stone-700 leading-tight">
                            {memoryCircle.profile.nurseName}
                         </div>
                    </div>
                </div>

                {/* Panic Button - Red, Distinct */}
                <button 
                    onClick={() => setShowPanic(true)}
                    className="w-full py-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl flex items-center justify-center gap-2 text-red-700 font-bold text-xs transition-all mb-2 group shadow-sm hover:shadow-md active:scale-95"
                >
                    <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center group-hover:animate-pulse">
                        <Phone size={12} />
                    </div>
                    EMERGENCY CALL
                </button>
            </div>

            {/* Bottom Controls */}
            <div className="p-5 bg-stone-200/50 backdrop-blur-sm">
                <div className="bg-white/50 p-3 rounded-lg border border-stone-200 mb-4 flex items-center gap-3">
                     {isPaused ? (
                         <>
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                                <PauseCircle size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-amber-600 font-bold uppercase">Status</p>
                                <p className="text-xs font-medium text-stone-700">Paused</p>
                            </div>
                         </>
                     ) : (
                         <>
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 border border-teal-200">
                                <PlayCircle size={16} />
                            </div>
                            <div>
                                <p className="text-[10px] text-teal-600 font-bold uppercase">Status</p>
                                <p className="text-xs font-medium text-stone-700">Narrating</p>
                            </div>
                         </>
                     )}
                </div>

                <button onClick={onExit} className="w-full py-3 rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-200 hover:text-stone-800 transition-all text-xs font-bold flex items-center justify-center gap-2 group">
                    Exit Patient Mode <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform opacity-50 group-hover:opacity-100" />
                </button>
            </div>
        </div>

        {/* --- MAIN CONTENT: THE BOOK --- */}
        <div className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-16 perspective-2000">

            {/* PROGRESS BAR - MOVED HERE */}
            <div className="w-full max-w-2xl mb-6 z-40 transition-opacity duration-500" style={{ opacity: isPaused ? 0 : 1 }}>
                <div className="bg-slate-900/10 backdrop-blur-md rounded-full p-1 flex items-center gap-4 w-full">
                        <div className="flex-1 h-2 bg-slate-200/50 rounded-full overflow-hidden mx-4">
                            <div 
                            className="h-full bg-teal-500 transition-all duration-1000 ease-linear" 
                            style={{ width: `${(Math.min(pageIndex + 2, totalPages) / totalPages) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-bold text-slate-500 px-2">{Math.min(pageIndex + 2, totalPages)} / {totalPages}</span>
                </div>
            </div>
            
            {/* BOOK CONTAINER */}
            <div className="relative w-full max-w-6xl aspect-[1/1.6] md:aspect-[2/1.5] flex transition-transform duration-700 preserve-3d">
                
                {/* Manual Navigation Buttons */}
                <button 
                  onClick={handlePrevPage} 
                  disabled={!canGoBack}
                  className={`absolute left-[-20px] md:left-[-60px] top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/80 hover:bg-white backdrop-blur-md shadow-lg text-teal-700 transition-all hover:scale-110 disabled:opacity-0 disabled:cursor-default group flex items-center justify-center ${isPaused ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ChevronLeft size={32} />
                </button>

                <button 
                  onClick={handleNextPage} 
                  disabled={!canGoNext}
                  className={`absolute right-[-20px] md:right-[-60px] top-1/2 -translate-y-1/2 z-50 p-4 rounded-full bg-white/80 hover:bg-white backdrop-blur-md shadow-lg text-teal-700 transition-all hover:scale-110 disabled:opacity-0 disabled:cursor-default group flex items-center justify-center ${isPaused ? 'opacity-0 pointer-events-none' : ''}`}
                >
                    <ChevronRight size={32} />
                </button>

                <div className="absolute inset-0 bg-stone-200 rounded-lg md:rounded-3xl shadow-2xl transform translate-z-[-10px] border border-stone-300" />
                
                {/* Left Page (Hidden on Mobile) */}
                <div className="hidden md:block flex-1 bg-[#fdfbf7] rounded-l-3xl shadow-inner relative overflow-hidden origin-right border-r border-stone-200">
                     {renderPageContent(pages[pageIndex])}
                     <PageNumber num={pageIndex + 1} />
                </div>

                {/* Right Page (Active on Mobile) */}
                <div className="flex-1 bg-[#fdfbf7] rounded-r-3xl md:rounded-l-none rounded-l-3xl shadow-inner relative overflow-hidden origin-left">
                     <div className="md:hidden h-full">
                        {renderPageContent(pages[pageIndex])}
                        <PageNumber num={pageIndex + 1} />
                     </div>
                     <div className="hidden md:block h-full">
                        {renderPageContent(pages[pageIndex + 1])}
                        <PageNumber num={pageIndex + 2} />
                     </div>
                </div>
                 
                 {/* Buffering Indicator */}
                 {isBuffering && (
                     <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                         <div className="bg-black/70 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 animate-in zoom-in duration-300">
                             <Loader2 size={20} className="animate-spin text-teal-400" />
                             <span className="font-bold text-sm">Preparing Voice...</span>
                         </div>
                     </div>
                 )}
            </div>

            {/* --- CONTROLS & VISUAL CUES --- */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 transition-opacity duration-500 flex flex-col items-center gap-4" style={{ opacity: isPaused ? 0 : 1 }}>
                
                {/* LARGE PAUSE BUTTON */}
                <button 
                    onClick={handlePause}
                    className="flex items-center gap-5 bg-white/95 backdrop-blur-xl px-8 py-5 rounded-3xl shadow-xl border border-teal-100 ring-4 ring-teal-500/10 transform transition-transform active:scale-95 hover:scale-105 cursor-pointer w-full max-w-md group"
                >
                   <div className="relative flex items-center justify-center">
                       <div className="bg-teal-50 p-3 rounded-full group-hover:bg-teal-100 transition-colors">
                           <PauseCircle className="text-teal-600 relative z-10" size={32} />
                       </div>
                   </div>
                   <div className="flex flex-col text-left">
                       <span className="text-slate-800 font-bold text-xl leading-none tracking-tight">Pause Story</span>
                       <span className="text-slate-500 text-sm font-medium mt-1">Take a break</span>
                   </div>
               </button>
            </div>

            {/* --- INTERRUPTION OVERLAY (PAUSE MODE ONLY) --- */}
            {isPaused && (
                <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full m-4 relative overflow-hidden z-50">
                         {/* Background Animation */}
                         <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-400 via-emerald-500 to-teal-400 animate-pulse"></div>
                         
                         {/* Existing Pause UI */}
                         <div className="flex flex-col items-center text-center">
                             <div className="mb-6 scale-125">
                                 <EverlyBird size={120} talking={false} />
                             </div>
                             
                             <h3 className="text-2xl font-bold text-slate-800 mb-2">Story Paused</h3>
                             <p className="text-slate-500 mb-8">Take all the time you need.</p>

                             <button 
                                onClick={handleResume}
                                className="mt-4 px-8 py-3 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-all shadow-lg hover:scale-105"
                             >
                                 Resume Story
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* --- PANIC MODAL --- */}
            {showPanic && (
                <div className="fixed inset-0 z-[100] bg-red-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-300">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 animate-bounce shadow-2xl">
                         <Phone size={64} className="text-red-600 fill-current" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 tracking-tight">Calling Help...</h2>
                    <p className="text-xl opacity-90 mb-12 font-medium">Contacting Nurse {memoryCircle.profile.nurseName}</p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowPanic(false)} 
                            className="px-8 py-4 bg-white text-red-600 rounded-full font-bold text-lg hover:bg-red-50 transition-all shadow-lg"
                        >
                            Cancel Call
                        </button>
                    </div>
                    
                    <div className="mt-12 text-sm opacity-70 animate-pulse">
                        <AlertCircle className="inline-block mr-2" size={16}/> 
                        Emergency Location Beacon Activated
                    </div>
                </div>
            )}

        </div>

        {/* --- RIGHT SIDEBAR: DAILY REMINDERS (Reduced Width) --- */}
        <div className="w-64 bg-[#F2EFE9] border-l border-stone-300 text-stone-800 flex flex-col shadow-2xl z-20 relative flex-shrink-0 hidden xl:flex">
             {/* Daily Reminders Header */}
            <div className="p-5 border-b border-stone-300/50 flex flex-col bg-white/40">
                <div className="flex items-center justify-between mb-4 opacity-80 text-stone-500">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-teal-600" />
                        <span className="font-bold text-xs tracking-widest uppercase">Daily Reminders</span>
                    </div>
                </div>
                
                {/* Big Read Button */}
                <button 
                    onClick={(e) => { e.stopPropagation(); handleReadReminders(); }}
                    className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-md group ${
                        isReadingReminders 
                        ? 'bg-teal-100 text-teal-800 border border-teal-200 animate-pulse' 
                        : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-lg'
                    }`}
                >
                    {isReadingReminders ? <Volume2 size={24} className="animate-bounce" /> : <Volume2 size={24} />}
                    <span className="font-bold text-lg">{isReadingReminders ? 'Reading...' : 'Read Reminders'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                 {memoryCircle.reminders.map(r => renderReminderCard(r))}
                 {memoryCircle.reminders.length === 0 && (
                     <div className="text-center text-stone-400 italic text-sm py-12 flex flex-col items-center">
                         <Bell size={32} className="opacity-20 mb-2"/>
                         No reminders set for today.
                     </div>
                 )}
            </div>
            
            <div className="p-4 text-center text-[10px] text-stone-400 border-t border-stone-300/30">
                Tap any card to hear it spoken aloud.
            </div>
        </div>

    </div>
  );
};

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

export default PatientMode;