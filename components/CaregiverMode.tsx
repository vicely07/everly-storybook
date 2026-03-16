import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MemoryCircle, PatientProfile, Memory, Comment, FamilyMember, ReminderType } from '../types';
import { compileBookNarrative, processCaptionTurn, transcribeAudio, QAPair, createCaregiverChat } from '../services/geminiService';
import { ArrowRight, Sparkles, Loader2, CheckCircle, Users, BookOpen, Plus, MessageCircle, Film, Mic, Music, Send, Wand2, Edit3, Trash2, Grid, ChevronLeft, User, ArrowDown, HelpCircle, Copy, RefreshCw, Cloud, PlayCircle, QrCode, X, Clock, MessageSquare, List, Calendar, Pill, GlassWater, Activity, Search, Bell, Save, ExternalLink } from 'lucide-react';
import { EverlyBird } from './EverlyBird';
import ReactMarkdown from 'react-markdown';

interface CaregiverModeProps {
  memoryCircle: MemoryCircle;
  updateMemoryCircle: React.Dispatch<React.SetStateAction<MemoryCircle>>;
  onExit: () => void;
  onSetupComplete: () => void;
}

// Vintage Paper/Note Image for memory placeholders (still used for memories)
const PAPER_NOTE_IMAGE = "https://images.unsplash.com/photo-1532153955177-f59af40d6472?q=80&w=800&auto=format&fit=crop";

// Use the Paper Note for all memory placeholders
const OLD_TAPE_IMAGE = PAPER_NOTE_IMAGE;

// Track interaction state for each memory card
interface InteractionState {
    status: 'analyzing' | 'questioning' | 'generating';
    file: File;
    history: QAPair[];
    currentQuestion?: string;
}

export default function CaregiverMode({ memoryCircle, updateMemoryCircle, onSetupComplete, onExit }: CaregiverModeProps): React.ReactElement {
  // NEW STEP 'TEAM' added between PROFILE and CONTENT
  // Detect if user is joining via invite link (Supports Hash Routing for Static Host Compatibility)
  const isInvite = typeof window !== 'undefined' && (
      window.location.pathname.includes('/family/') || 
      window.location.hash.includes('/family/')
  );

  // UPDATED STEPPER STRUCTURE: MEMORIES and REMINDERS are now top-level steps
  const [step, setStep] = useState<'PROFILE' | 'TEAM' | 'MEMORIES' | 'REMINDERS' | 'PUBLISH'>(() => {
      return isInvite ? 'TEAM' : 'PROFILE';
  });

  const [isCompiling, setIsCompiling] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null); // Ref for date picker
  
  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check sync status on mount
  useEffect(() => {
      if (localStorage.getItem('everly_memory_circle')) {
          setLastSaved(new Date());
      }
  }, []);

  // Share State
  const [linkCopied, setLinkCopied] = useState(false);
  const stableInviteLink = useMemo(() => {
     // USING HASH ROUTING (/#/family/...) to avoid 404s on static servers
     const safeName = (memoryCircle.profile.preferredName || memoryCircle.profile.firstName).toLowerCase().replace(/\s/g,'');
     return `https://everly-669259889472.us-west1.run.app/#/family/${safeName}-${Math.floor(Math.random()*10000)}`;
  }, [memoryCircle.profile.preferredName, memoryCircle.profile.firstName]); 

  // Join Modal State
  const [showJoinModal, setShowJoinModal] = useState(isInvite);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("");

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(!isInvite);
  
  // Comment State
  const [tempComment, setTempComment] = useState("");
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('caregiver');
  
  // Spotlight / Selection for Grid View
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);

  // New state for handling the Gemini Q&A flow
  const [pendingInteractions, setPendingInteractions] = useState<Record<string, InteractionState>>({});
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  
  // Audio Recording State for Answers
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false);
  const answerRecorderRef = useRef<MediaRecorder | null>(null);
  const answerChunksRef = useRef<Blob[]>([]);

  // Reminder State
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");
  const [newReminderType, setNewReminderType] = useState<ReminderType>('general');
  const [newReminderAddedBy, setNewReminderAddedBy] = useState<string>('Caregiver');
  
  // Sent Reminder Button State
  const [sentReminders, setSentReminders] = useState<Set<string>>(new Set());

  // --- CAREGIVER ASSISTANT CHAT STATE ---
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const assistantSession = useRef<any>(null);
  const assistantScrollRef = useRef<HTMLDivElement>(null);

  // Helper to get display name (Fallback logic)
  const getDisplayName = () => memoryCircle.profile.preferredName || memoryCircle.profile.firstName;

  // --- NAVIGATION & SAVING LOGIC ---
  const handleSaveProgress = () => {
      return new Promise<void>((resolve) => {
          setIsSaving(true);
          // Simulate Cloud Save & Persist to LocalStorage
          setTimeout(() => {
              localStorage.setItem('everly_memory_circle', JSON.stringify(memoryCircle));
              setLastSaved(new Date());
              setIsSaving(false);
              resolve();
          }, 800);
      });
  };

  const changeStep = async (targetStep: typeof step) => {
      if (targetStep === step) return;
      await handleSaveProgress(); // Auto-save on navigation
      setStep(targetStep);
  };

  useEffect(() => {
      if (showAssistant && !assistantSession.current) {
          assistantSession.current = createCaregiverChat(memoryCircle);
          // Add initial greeting
          setAssistantMessages([{ role: 'model', text: `Hi! I'm Everly's assistant. I know all about ${getDisplayName()}. How can I help you today?` }]);
      }
  }, [showAssistant, memoryCircle]);

  useEffect(() => {
      if (assistantScrollRef.current) {
          assistantScrollRef.current.scrollTop = assistantScrollRef.current.scrollHeight;
      }
  }, [assistantMessages]);

  const handleSendAssistantMessage = async () => {
      if (!assistantInput.trim()) return;
      const msg = assistantInput;
      setAssistantInput("");
      setAssistantMessages(prev => [...prev, {role: 'user', text: msg}]);
      setIsAssistantThinking(true);
      
      try {
          const result = await assistantSession.current.sendMessage({ message: msg });
          const responseText = result.text;
          setAssistantMessages(prev => [...prev, {role: 'model', text: responseText}]);
      } catch (e) {
          console.error(e);
          setAssistantMessages(prev => [...prev, {role: 'model', text: "I'm having trouble connecting right now. Please try again."}]);
      } finally {
          setIsAssistantThinking(false);
      }
  };


  const handleProfileChange = (field: keyof PatientProfile, value: string) => {
    // Dismiss tutorial on first interaction
    if (showTutorial) setShowTutorial(false);
    
    updateMemoryCircle(prev => ({
      ...prev,
      profile: { ...prev.profile, [field]: value }
    }));
  };

  const handleCopyLink = async () => {
      // Always save before sharing to ensure "synced" status
      await handleSaveProgress();
      try {
          await navigator.clipboard.writeText(stableInviteLink);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
      } catch (e) {
          console.error("Clipboard failed", e);
      }
  };
  
  const handleSendReminder = (id: string) => {
      setSentReminders(prev => new Set(prev).add(id));
  };

  const handleAddMember = () => {
      if (!newMemberName || !newMemberRelation) return;
      
      const newMember: FamilyMember = {
          id: Date.now().toString(),
          name: newMemberName,
          relation: newMemberRelation,
          note: `Joined via invite link`,
          imageUrl: `https://i.pravatar.cc/150?u=${Date.now()}`, // Random pseudo picture
          status: 'completed' // Immediately set to completed as they "joined" via the modal
      };

      updateMemoryCircle(prev => ({
          ...prev,
          familyMembers: [...prev.familyMembers, newMember]
      }));

      setNewMemberName("");
      setNewMemberRelation("");
      setShowJoinModal(false);
      
      // If they joined via invite, maybe select them as current user for comments?
      setSelectedAuthorId(newMember.id);
  };

  const handleAddReminder = () => {
      if (!newReminderTitle || !newReminderTime) return;
      updateMemoryCircle(prev => ({
          ...prev,
          reminders: [...prev.reminders, {
              id: Date.now().toString(),
              title: newReminderTitle,
              time: newReminderTime,
              type: newReminderType,
              completed: false,
              addedBy: newReminderAddedBy
          }]
      }));
      setNewReminderTitle("");
      setNewReminderTime("");
  };

  const handleDeleteReminder = (id: string) => {
      updateMemoryCircle(prev => ({
          ...prev,
          reminders: prev.reminders.filter(r => r.id !== id)
      }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showTutorial) setShowTutorial(false);
    const file = e.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file); 
        
        let type: 'image' | 'video' | 'audio' = 'image';
        if (file.type.startsWith('video')) type = 'video';
        if (file.type.startsWith('audio')) type = 'audio';

        const memoryId = Date.now().toString();

        const newMemory: Memory = {
            id: memoryId,
            text: "", // Empty text while processing
            author: 'Caregiver',
            timestamp: new Date('2005-01-01'), // Default to 2005 as requested
            mediaType: type, 
            imageUrl: url,
            comments: []
        };
        
        // Optimistic update
        updateMemoryCircle(prev => ({
            ...prev,
            memories: [newMemory, ...prev.memories]
        }));
        
        // Auto-select the new memory
        setSelectedMemoryId(memoryId);

        // Start interaction flow - AI still gets the REAL file
        setPendingInteractions(prev => ({
            ...prev,
            [memoryId]: { status: 'analyzing', file, history: [] }
        }));

        try {
            // Initial call - History is empty
            const result = await processCaptionTurn(file, getDisplayName(), []);
            
            if (result.type === 'caption') {
                 finalizeCaption(memoryId, result.text);
            } else {
                 setPendingInteractions(prev => ({
                    ...prev,
                    [memoryId]: { 
                        status: 'questioning', 
                        file, 
                        history: [], 
                        currentQuestion: result.text 
                    }
                }));
            }
        } catch (err) {
            console.error(err);
             setPendingInteractions(prev => {
                const next = { ...prev };
                delete next[memoryId];
                return next;
             });
        }
    }
  };

  const handleReplaceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedMemoryId) {
          const url = URL.createObjectURL(file);
          let type: 'image' | 'video' | 'audio' = 'image';
          if (file.type.startsWith('video')) type = 'video';
          if (file.type.startsWith('audio')) type = 'audio';

          // Update the memory with new media, BUT KEEP THE TEXT
          updateMemoryCircle(prev => ({
              ...prev,
              memories: prev.memories.map(m => m.id === selectedMemoryId ? { 
                  ...m, 
                  imageUrl: url, 
                  mediaType: type 
              } : m)
          }));

          // Stop any active AI interaction so we just show the manual editor with old text
          setPendingInteractions(prev => {
              const next = { ...prev };
              delete next[selectedMemoryId];
              return next;
          });

          // Reset the input so the same file can be selected again if needed
          if (replaceFileInputRef.current) {
              replaceFileInputRef.current.value = '';
          }
      }
  };

  const startRecordingAnswer = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          answerRecorderRef.current = recorder;
          answerChunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) answerChunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
              const audioBlob = new Blob(answerChunksRef.current, { type: 'audio/webm' });
              const transcribedText = await transcribeAudio(audioBlob);
              if (selectedMemoryId) {
                  setAnswerInputs(prev => ({ ...prev, [selectedMemoryId]: transcribedText }));
              }
              setIsRecordingAnswer(false);
              
              // Cleanup tracks
              stream.getTracks().forEach(t => t.stop());
          };

          recorder.start();
          setIsRecordingAnswer(true);
      } catch (e) {
          console.error("Mic error", e);
      }
  };

  const stopRecordingAnswer = () => {
      if (answerRecorderRef.current && isRecordingAnswer) {
          answerRecorderRef.current.stop();
      }
  };

  const submitAnswer = async (memoryId: string, forceFinal: boolean = false) => {
      const interaction = pendingInteractions[memoryId];
      if (!interaction) return;

      const answer = answerInputs[memoryId] || "";
      if (!answer && !forceFinal) return; 

      setPendingInteractions(prev => ({
          ...prev,
          [memoryId]: { ...interaction, status: forceFinal ? 'generating' : 'analyzing' }
      }));

      const newHistory = [...interaction.history];
      if (interaction.currentQuestion && answer) {
          newHistory.push({ q: interaction.currentQuestion, a: answer });
      }

      try {
        const result = await processCaptionTurn(
            interaction.file, 
            getDisplayName(), 
            newHistory,
            forceFinal
        );
        
        if (result.type === 'caption') {
            finalizeCaption(memoryId, result.text);
        } else {
            setPendingInteractions(prev => ({
                ...prev,
                [memoryId]: { 
                    status: 'questioning', 
                    file: interaction.file, 
                    history: newHistory,
                    currentQuestion: result.text
                }
            }));
            setAnswerInputs(prev => ({ ...prev, [memoryId]: "" }));
        }
      } catch (e) {
        console.error(e);
        setPendingInteractions(prev => ({
            ...prev,
            [memoryId]: { 
                ...interaction, 
                status: 'questioning' 
            }
        }));
      }
  };

  const finalizeCaption = (memoryId: string, text: string) => {
      updateMemoryCircle(prev => ({
          ...prev,
          memories: prev.memories.map(m => 
              m.id === memoryId ? { ...m, text } : m
          )
      }));
      setPendingInteractions(prev => {
          const next = { ...prev };
          delete next[memoryId];
          return next;
      });
      setAnswerInputs(prev => {
          const next = { ...prev };
          delete next[memoryId];
          return next;
      });
  };

  const updateMemoryText = (id: string, text: string) => {
      updateMemoryCircle(prev => ({ 
          ...prev, 
          memories: prev.memories.map(m => m.id === id ? { ...m, text } : m)
      }));
  };

  const updateMemoryDate = (id: string, date: Date) => {
      updateMemoryCircle(prev => ({ 
          ...prev, 
          memories: prev.memories.map(m => m.id === id ? { ...m, timestamp: date } : m)
      }));
  };

  const deleteMemory = (id: string) => {
      updateMemoryCircle(prev => ({ 
          ...prev, 
          memories: prev.memories.filter(m => m.id !== id)
      }));
      if (selectedMemoryId === id) setSelectedMemoryId(null);
  };

  const saveComment = (memoryId: string) => {
      if (!tempComment.trim()) return;
      updateMemoryCircle(prev => ({
          ...prev,
          memories: prev.memories.map(m => {
            if (m.id === memoryId) {
                const newComment: Comment = {
                    id: Date.now().toString(),
                    authorId: selectedAuthorId,
                    text: tempComment
                };
                return { ...m, comments: [...(m.comments || []), newComment] };
            }
            return m;
          })
      }));
      setTempComment("");
  };

  const handlePublish = async () => {
      if (showTutorial) setShowTutorial(false);
      setIsCompiling(true);
      try {
          const narrative = await compileBookNarrative(memoryCircle);
          
          const updatedCircle = {
              ...memoryCircle,
              narrative
          };

          updateMemoryCircle(updatedCircle);
          
          // Explicit Save before publishing
          localStorage.setItem('everly_memory_circle', JSON.stringify(updatedCircle));
          setLastSaved(new Date());

          setIsCompiling(false);
          setIsPublished(true);
          
          // Show "Separate Window" Success Modal
          setShowSuccessModal(true);
      } catch (e) {
          console.error("Publishing failed:", e);
          setIsCompiling(false);
      }
  };

  // Helper to get media preview for grid
  const renderMediaPreview = (m: Memory, className: string = "w-full h-full object-cover") => {
      if (m.mediaType === 'image') return <img src={m.imageUrl} className={className} />;
      if (m.mediaType === 'video') return (
          <div className="w-full h-full bg-slate-900 relative">
             <video src={m.imageUrl} className={`w-full h-full object-cover opacity-70`} />
             <div className="absolute inset-0 flex items-center justify-center">
                 <Film className="text-white/80" size={32} />
             </div>
          </div>
      );
      if (m.mediaType === 'audio') return (
          <div className="w-full h-full bg-amber-100 flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-amber-200/50 pattern-grid-lg opacity-30"></div>
               <Music className="text-amber-600 relative z-10" size={40} />
          </div>
      );
      return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">?</div>;
  };

  const renderEditor = () => {
      const m = memoryCircle.memories.find(mem => mem.id === selectedMemoryId);
      if (!m) return null;
      const interaction = pendingInteractions[m.id];

      // Format date for input (Local Time) to prevent timezone shifts
      const toInputDate = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
      };
      const dateString = toInputDate(m.timestamp);

      return (
          <div className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-10 animate-in fade-in zoom-in-95 duration-300">
              
              {/* --- INSTRUCTION BANNER (Top of Editor) --- */}
              {interaction && (
                 <div className="bg-teal-50 border-b border-teal-100 p-4 flex items-start gap-3">
                     <div className="bg-white p-2 rounded-full shadow-sm text-teal-600">
                         <HelpCircle size={20} />
                     </div>
                     <div>
                         <h3 className="font-bold text-teal-900 text-sm">Tell the Story of this Memory</h3>
                         <p className="text-teal-700 text-xs">
                             Everly will ask you a few questions to help write the perfect caption. 
                             You can <strong>type your answer</strong> or <strong>tap the microphone to speak</strong>.
                         </p>
                     </div>
                 </div>
              )}

              <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                   <button onClick={() => setSelectedMemoryId(null)} className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold text-sm transition-colors">
                       <ChevronLeft size={16} /> Back to Library
                   </button>
                   <div className="flex gap-2">
                       <button onClick={() => replaceFileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                            <RefreshCw size={14} /> Replace Photo
                       </button>
                       <button onClick={() => deleteMemory(m.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                   </div>
              </div>
              
              <div className="flex flex-col md:flex-row h-auto md:min-h-[500px]">
                  {/* Media Side */}
                  <div className="w-full md:w-1/2 bg-slate-900 flex items-center justify-center relative p-8">
                       {m.mediaType === 'image' && <img src={m.imageUrl} className="max-w-full max-h-[500px] object-contain shadow-2xl rounded-lg" />}
                       {m.mediaType === 'video' && <video src={m.imageUrl} controls className="max-w-full max-h-[500px] rounded-lg shadow-2xl" />}
                       {m.mediaType === 'audio' && (
                           <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50 rounded-xl p-8">
                               <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                   <Music size={48} className="text-amber-600" />
                               </div>
                               <audio src={m.imageUrl} controls className="w-full max-w-sm shadow-sm" />
                           </div>
                       )}
                       {interaction && (
                           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                               <Sparkles size={12} className="text-teal-400" /> AI Assistant Active
                           </div>
                       )}
                  </div>

                  {/* Interaction Side */}
                  <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col bg-white">
                       {interaction ? (
                          <div className="flex-1 flex flex-col gap-4">
                              <div className="flex items-center gap-3 text-teal-600 mb-2">
                                   <EverlyBird size={40} talking={true} />
                                   <div>
                                       <h3 className="font-bold">Let's tell the story</h3>
                                       <p className="text-xs text-slate-400">I'll help you write a beautiful caption.</p>
                                   </div>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-4 max-h-[300px]">
                                   {interaction.history.map((h, i) => (
                                       <div key={i} className="space-y-2">
                                           <div className="bg-teal-100/50 text-teal-900 p-3 rounded-xl rounded-tl-none text-sm self-start">
                                               {h.q}
                                           </div>
                                           <div className="bg-white border border-slate-200 text-slate-700 p-3 rounded-xl rounded-tr-none text-sm self-end text-right shadow-sm">
                                               {h.a}
                                           </div>
                                       </div>
                                   ))}
                                   {interaction.currentQuestion && (
                                       <div className="bg-teal-100/50 text-teal-900 p-3 rounded-xl rounded-tl-none text-sm font-medium animate-in fade-in slide-in-from-left-2">
                                           {interaction.currentQuestion}
                                       </div>
                                   )}
                                   {interaction.status === 'analyzing' && <div className="flex items-center gap-2 text-xs text-slate-400 pl-2"><Loader2 className="animate-spin" size={12} /> Analyzing media...</div>}
                                   {interaction.status === 'generating' && <div className="flex items-center gap-2 text-teal-500 pl-2"><Wand2 className="animate-spin" size={12} /> Writing perfect story...</div>}
                              </div>

                              {interaction.status === 'questioning' && (
                                  <div className="flex gap-2 mt-auto items-end">
                                      {/* MIC BUTTON */}
                                      <button 
                                        onMouseDown={startRecordingAnswer}
                                        onMouseUp={stopRecordingAnswer}
                                        onTouchStart={startRecordingAnswer}
                                        onTouchEnd={stopRecordingAnswer}
                                        className={`p-3 rounded-xl transition-all shadow-sm ${isRecordingAnswer ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        title="Hold to speak"
                                      >
                                          <Mic size={20} />
                                      </button>

                                      <input 
                                          className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                          placeholder={isRecordingAnswer ? "Listening..." : "Type or speak your answer..."}
                                          value={answerInputs[m.id] || ""}
                                          onChange={(e) => setAnswerInputs(prev => ({ ...prev, [m.id]: e.target.value }))}
                                          onKeyDown={(e) => e.key === 'Enter' && submitAnswer(m.id)}
                                          autoFocus
                                      />
                                      <button onClick={() => submitAnswer(m.id)} className="bg-teal-600 text-white p-3 rounded-xl hover:bg-teal-700 transition-colors"><Send size={18} /></button>
                                  </div>
                              )}
                              
                              {interaction.status === 'questioning' && (
                                  <button 
                                    onClick={() => submitAnswer(m.id, true)} 
                                    className="w-full mt-6 py-4 bg-teal-50 border-2 border-teal-100 text-teal-700 rounded-xl font-bold hover:bg-teal-100 hover:border-teal-200 transition-all flex items-center justify-center gap-2 group"
                                  >
                                      <Wand2 size={18} className="group-hover:rotate-12 transition-transform"/> 
                                      Auto-Generate Caption <span className="text-teal-400 font-normal text-xs">(Skip Interview)</span>
                                  </button>
                              )}
                          </div>
                       ) : (
                          <div className="flex-1 flex flex-col h-full overflow-hidden">
                              <div className="mb-4">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Date of Memory</label>
                                <div className="relative">
                                    <input 
                                        ref={dateInputRef}
                                        type="date"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none text-slate-700 font-bold pr-10"
                                        value={dateString}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const parts = e.target.value.split('-');
                                                // Construct date safely using local year/month/day
                                                const fixedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                                updateMemoryDate(m.id, fixedDate);
                                            }
                                        }}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Safely attempt to open picker
                                            try { dateInputRef.current?.showPicker(); } catch(e) { dateInputRef.current?.focus(); }
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 cursor-pointer transition-colors p-1"
                                    >
                                        <Calendar size={18} />
                                    </button>
                                </div>
                              </div>

                              <label className="text-xs font-bold text-slate-400 uppercase mb-2">The Memory Story</label>
                              <textarea 
                                  className="w-full h-32 p-4 rounded-xl border-2 border-slate-100 focus:border-teal-500 focus:ring-0 outline-none text-slate-700 font-serif text-lg leading-relaxed resize-none bg-slate-50 focus:bg-white transition-colors mb-4"
                                  placeholder="Write a beautiful memory..."
                                  value={m.text}
                                  onChange={(e) => updateMemoryText(m.id, e.target.value)}
                              />
                              
                              {/* --- FAMILY COLLABORATION SECTION --- */}
                              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col min-h-0">
                                  <div className="flex justify-between items-center mb-4">
                                      <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                          <Users size={14} /> Family Conversation
                                      </label>
                                      <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">
                                          {m.comments?.length || 0} Comments
                                      </span>
                                  </div>

                                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4 pr-2">
                                      {(!m.comments || m.comments.length === 0) && (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                                <MessageCircle size={32} className="mb-2" />
                                                <p className="text-xs">No comments yet.</p>
                                                <p className="text-[10px]">Start a conversation about this memory.</p>
                                            </div>
                                      )}
                                      {m.comments?.map(c => {
                                          const author = memoryCircle.familyMembers.find(f => f.id === c.authorId);
                                          const isMe = c.authorId === 'caregiver';
                                          
                                          return (
                                              <div key={c.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                  <div className="flex-shrink-0">
                                                      {isMe ? (
                                                          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">You</div>
                                                      ) : (
                                                          <img 
                                                            src={author?.imageUrl || `https://ui-avatars.com/api/?name=${author?.name || 'Unknown'}`} 
                                                            className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                                                          />
                                                      )}
                                                  </div>
                                                  <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                      <span className="text-[10px] text-slate-400 font-bold mb-1 ml-1">{isMe ? 'You' : author?.name || 'Unknown'}</span>
                                                      <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                                                          isMe 
                                                          ? 'bg-teal-500 text-white rounded-tr-none' 
                                                          : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                                                      }`}>
                                                          {c.text}
                                                      </div>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>

                                  <div className="border-t border-slate-200 pt-3">
                                      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                                            {/* Author Selector simulating different users */}
                                            <button 
                                                onClick={() => setSelectedAuthorId('caregiver')}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                                                    selectedAuthorId === 'caregiver' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            >
                                                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"><User size={10} /></div>
                                                Caregiver (You)
                                            </button>
                                            {memoryCircle.familyMembers.map(fm => (
                                                <button 
                                                    key={fm.id}
                                                    onClick={() => setSelectedAuthorId(fm.id)}
                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                                                        selectedAuthorId === fm.id ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-200 text-slate-500 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    <img src={fm.imageUrl || `https://ui-avatars.com/api/?name=${fm.name}`} className="w-4 h-4 rounded-full object-cover" />
                                                    {fm.name}
                                                </button>
                                            ))}
                                      </div>
                                      <div className="flex gap-2">
                                          <input 
                                              className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                              value={tempComment} 
                                              onChange={(e) => setTempComment(e.target.value)}
                                              placeholder={`Comment as ${selectedAuthorId === 'caregiver' ? 'Caregiver' : memoryCircle.familyMembers.find(f => f.id === selectedAuthorId)?.name}...`}
                                              onKeyDown={(e) => e.key === 'Enter' && saveComment(m.id)}
                                          />
                                          <button onClick={() => saveComment(m.id)} className="text-white bg-teal-600 p-2 rounded-xl hover:bg-teal-700 transition-colors shadow-sm">
                                              <Send size={18} />
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              <button onClick={() => setSelectedMemoryId(null)} className="mt-4 w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                                  <CheckCircle size={18} /> Done Editing
                              </button>
                          </div>
                       )}
                  </div>
              </div>
          </div>
      );
      };

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8 flex flex-col font-sans relative">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto w-full mb-8 relative z-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
              <button onClick={onExit} className="p-3 bg-white hover:bg-stone-100 rounded-full transition-all shadow-sm border border-stone-200 text-stone-600 hover:scale-105 active:scale-95">
                  <ArrowRight className="rotate-180" size={22} />
              </button>
              <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Story Studio</h1>
          </div>
          
          {/* MANUAL SAVE BUTTON */}
          <button 
             onClick={() => handleSaveProgress()}
             disabled={isSaving}
             className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl text-stone-600 font-bold text-sm shadow-sm transition-all"
          >
              {isSaving ? <Loader2 size={16} className="animate-spin text-teal-600"/> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Progress"}
          </button>
      </div>

      {/* CENTERED PROGRESS BAR - UPDATED STEPS */}
      <div className="w-full mb-12 flex justify-center">
          <div className="flex items-center justify-center gap-3 bg-white p-3 rounded-full shadow-xl border border-stone-100/50 ring-1 ring-stone-900/5 mx-auto max-w-fit animate-in fade-in slide-in-from-top-4 duration-700">
              {(['PROFILE', 'TEAM', 'MEMORIES', 'REMINDERS', 'PUBLISH'] as const).map((s, i) => (
                  <div 
                    key={s}
                    onClick={() => changeStep(s)} // Use changeStep wrapper
                    className={`
                        px-8 py-4 rounded-full transition-all duration-500 flex items-center gap-3 cursor-pointer
                        ${step === s 
                            ? 'bg-teal-600 text-white shadow-lg scale-105 font-bold ring-2 ring-teal-200 ring-offset-2' 
                            : 'text-stone-400 font-medium hover:bg-stone-50'
                        }
                    `}
                  >
                      <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-black
                          ${step === s ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'}
                      `}>
                          {i + 1}
                      </div>
                      <span className={`text-base tracking-wide ${step === s ? 'block' : 'hidden md:block'}`}>
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                      </span>
                  </div>
              ))}
          </div>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
          
          {/* STEP 1: PROFILE */}
          {step === 'PROFILE' && (
              <div className="max-w-2xl mx-auto w-full bg-white p-8 rounded-3xl shadow-xl border border-stone-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="text-center mb-8">
                       <h2 className="text-2xl font-bold text-slate-800">Who is this book for?</h2>
                       <p className="text-slate-500">Let's set up the profile for the patient.</p>
                   </div>
                   
                   <div className="space-y-4 mb-6">
                       {/* UPDATED NAME FIELDS */}
                       <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">First Name <span className="text-red-500">*</span></label>
                               <input 
                                   value={memoryCircle.profile.firstName}
                                   onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                   placeholder="e.g. Jane"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Last Name <span className="text-red-500">*</span></label>
                               <input 
                                   value={memoryCircle.profile.lastName}
                                   onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                   placeholder="e.g. Williams"
                               />
                           </div>
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Preferred Name <span className="text-slate-400 font-normal">(Optional)</span></label>
                           <input 
                               value={memoryCircle.profile.preferredName}
                               onChange={(e) => handleProfileChange('preferredName', e.target.value)}
                               className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                               placeholder={`Defaults to ${memoryCircle.profile.firstName}`}
                           />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nurse/Carer Name <span className="text-red-500">*</span></label>
                               <input 
                                   value={memoryCircle.profile.nurseName}
                                   onChange={(e) => handleProfileChange('nurseName', e.target.value)}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Current Location <span className="text-red-500">*</span></label>
                               <input 
                                   value={memoryCircle.profile.locationDescription}
                                   onChange={(e) => handleProfileChange('locationDescription', e.target.value)}
                                   className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                               />
                            </div>
                       </div>
                       
                       <div>
                           <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Life Story Summary <span className="text-red-500">*</span></label>
                           <textarea 
                               value={memoryCircle.profile.lifeStory}
                               onChange={(e) => handleProfileChange('lifeStory', e.target.value)}
                               className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 h-32 resize-none"
                           />
                       </div>
                   </div>

                   {/* MOVED NAV BUTTON - TO BOTTOM */}
                   <button 
                       onClick={() => changeStep('TEAM')} 
                       disabled={!memoryCircle.profile.firstName || !memoryCircle.profile.lastName || !memoryCircle.profile.nurseName || !memoryCircle.profile.locationDescription || !memoryCircle.profile.lifeStory}
                       className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                       Continue
                   </button>
              </div>
          )}

          {/* STEP 2: TEAM */}
          {step === 'TEAM' && (
              <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
                  {/* Two Column Layout */}
                  <div className="grid md:grid-cols-2 gap-6">
                      
                      {/* Left: Share Card */}
                      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 flex flex-col items-center text-center h-full">
                           <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-6">
                               <QrCode size={32} />
                           </div>
                           <h2 className="text-2xl font-bold text-slate-800 mb-2">Invite Family</h2>
                           <p className="text-slate-500 mb-6 text-sm">Scan to join the circle.</p>
                           
                           {/* QR Code Display */}
                           <div className="p-3 bg-white rounded-xl shadow-lg border border-slate-100 mb-6">
                               <img 
                                   src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(stableInviteLink)}`} 
                                   alt="Invite QR Code" 
                                   className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-lg"
                               />
                           </div>

                           <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between w-full mb-2">
                               <code className="text-slate-600 text-xs truncate mr-2">{stableInviteLink}</code>
                               <button onClick={handleCopyLink} className="flex-shrink-0 flex items-center gap-2 text-teal-600 font-bold hover:text-teal-700 text-xs">
                                   {linkCopied ? <CheckCircle size={14}/> : <Copy size={14} />}
                                   {linkCopied ? 'Copied' : 'Copy'}
                               </button>
                           </div>
                      </div>

                      {/* Right: Family Status List */}
                      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 flex flex-col h-full">
                           <div className="flex justify-between items-center mb-6">
                               <div>
                                   <h2 className="text-xl font-bold text-slate-800">Family Circle</h2>
                                   <p className="text-slate-500 text-sm">{memoryCircle.familyMembers.length} listed</p>
                               </div>
                               <button 
                                  onClick={() => setShowJoinModal(true)}
                                  className="w-10 h-10 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-full flex items-center justify-center transition-colors shadow-sm"
                                  title="Add Family Member (Simulate Join)"
                               >
                                   <Plus size={20} />
                               </button>
                           </div>

                           <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[400px]">
                                {/* 1. COMPLETED Members */}
                                {memoryCircle.familyMembers.filter(m => m.status === 'completed' || (!m.status && (m as any).hasJoined)).map((fm) => (
                                    <div key={fm.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-green-200 transition-colors">
                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                                         <img src={fm.imageUrl || `https://ui-avatars.com/api/?name=${fm.name}`} className="w-10 h-10 rounded-full bg-slate-100 object-cover border border-slate-200" />
                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-bold text-slate-800 text-sm truncate">{fm.name}</h4>
                                             <p className="text-xs text-slate-500 truncate">{fm.relation}</p>
                                         </div>
                                         <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold">
                                             <CheckCircle size={10} /> Completed
                                         </div>
                                    </div>
                                ))}

                                {/* 2. IN PROGRESS Members (Current User) */}
                                {memoryCircle.familyMembers.filter(m => m.status === 'in_progress').map((fm) => (
                                    <div key={fm.id} className="flex items-center gap-3 p-3 bg-orange-50/50 rounded-xl border border-orange-200 shadow-sm relative overflow-hidden">
                                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                                         
                                         {/* UPDATED: Check for imageUrl and render it if available */}
                                         {fm.imageUrl && !fm.imageUrl.includes("ui-avatars") ? (
                                             <img src={fm.imageUrl} className="w-10 h-10 rounded-full bg-orange-100 object-cover border border-orange-200" alt={fm.name} />
                                         ) : (
                                             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200">
                                                 <User size={20} />
                                             </div>
                                         )}

                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-bold text-slate-800 text-sm truncate">{fm.name} (You)</h4>
                                             <p className="text-xs text-slate-500 truncate">{fm.relation}</p>
                                         </div>
                                         <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold">
                                             <Loader2 size={10} className="animate-spin" /> In Progress
                                         </div>
                                    </div>
                                ))}

                                {/* 3. PENDING Members (Invited) */}
                                {memoryCircle.familyMembers.filter(m => m.status === 'pending' || (!m.status && !(m as any).hasJoined)).map((fm) => (
                                    <div key={fm.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm border-dashed">
                                         {/* Avatar & Info */}
                                         <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 border border-slate-300">
                                             <User size={20} />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-bold text-slate-500 text-sm truncate">{fm.name}</h4>
                                             <p className="text-xs text-slate-400 truncate">{fm.relation}</p>
                                         </div>
                                         
                                         {/* Right Side: Status + Action */}
                                         <div className="flex flex-col items-end gap-1">
                                             <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">
                                                 Pending
                                             </div>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleSendReminder(fm.id); }}
                                                disabled={sentReminders.has(fm.id)}
                                                className={`text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                                    sentReminders.has(fm.id) ? 'text-slate-400 cursor-default' : 'text-blue-600 hover:text-blue-700 underline'
                                                }`}
                                             >
                                                 {sentReminders.has(fm.id) ? (
                                                     <>Sent <CheckCircle size={8} /></>
                                                 ) : (
                                                     'Send Reminder'
                                                 )}
                                             </button>
                                         </div>
                                    </div>
                                ))}

                                {memoryCircle.familyMembers.length === 0 && (
                                    <div className="text-center py-10 text-slate-400">
                                        <Users size={32} className="mx-auto mb-2 opacity-50"/>
                                        <p className="text-sm">No one has joined yet.</p>
                                    </div>
                                )}
                           </div>
                      </div>
                  </div>
                   
                   {/* NAV BUTTONS - MOVED TO BOTTOM */}
                   <div className="flex gap-4 mt-6 max-w-2xl mx-auto">
                       <button onClick={() => changeStep('PROFILE')} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">Back</button>
                       <button onClick={() => changeStep('MEMORIES')} className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Start Adding Memories</button>
                   </div>
                   
                   {/* JOIN MODAL SIMULATION */}
                   {showJoinModal && (
                       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-200">
                           <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
                               <button onClick={() => setShowJoinModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                   <X size={20} />
                               </button>
                               
                               <div className="text-center mb-6">
                                   <EverlyBird size={80} className="mb-4" />
                                   <h3 className="text-2xl font-bold text-slate-800">Welcome to the Family</h3>
                                   <p className="text-slate-500">To join the circle, please tell us about yourself.</p>
                               </div>
                               
                               <div className="space-y-4 mb-6">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Your Name</label>
                                       <input 
                                           value={newMemberName}
                                           onChange={(e) => setNewMemberName(e.target.value)}
                                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                           placeholder="e.g., Sarah"
                                           autoFocus
                                       />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">What is your role in the family?</label>
                                       <input 
                                           value={newMemberRelation}
                                           onChange={(e) => setNewMemberRelation(e.target.value)}
                                           className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500"
                                           placeholder="e.g., Daughter, Grandson"
                                       />
                                   </div>
                               </div>
                               
                               <button 
                                   onClick={handleAddMember}
                                   disabled={!newMemberName || !newMemberRelation}
                                   className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                               >
                                   Join Circle <ArrowRight size={18} />
                               </button>
                           </div>
                       </div>
                   )}
              </div>
          )}

          {/* STEP 3: MEMORIES (Renamed from CONTENT, removed tab) */}
          {step === 'MEMORIES' && (
              <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* --- MEMORY EDITOR (Only visible when a memory is selected) --- */}
                  {selectedMemoryId && renderEditor()}
                  
                  {/* --- MEMORY GRID (Default View) --- */}
                  {!selectedMemoryId && (
                      <>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                              {/* Upload Button - CLEAN */}
                              <div 
                                  onClick={() => fileInputRef.current?.click()}
                                  className="aspect-square bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-teal-400 group relative overflow-hidden shadow-sm hover:shadow-md"
                              >
                                  <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  
                                  <div className="flex flex-col items-center gap-3 relative z-10">
                                      <div className="bg-teal-50 text-teal-600 p-4 rounded-full group-hover:scale-110 transition-transform duration-300 shadow-sm border border-teal-100">
                                          <Plus size={32} strokeWidth={2.5} />
                                      </div>
                                      <span className="font-bold text-slate-500 text-sm group-hover:text-teal-700 transition-colors">Add Memory</span>
                                  </div>
                              </div>
                              
                              {/* Memory Cards */}
                              {memoryCircle.memories.map((m) => (
                                  <div 
                                      key={m.id} 
                                      onClick={() => setSelectedMemoryId(m.id)}
                                      className="aspect-square bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative cursor-pointer group hover:shadow-md transition-all hover:scale-[1.02]"
                                  >
                                      {renderMediaPreview(m)}
                                      
                                      {/* Added Year Badge */}
                                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm z-10">
                                          {m.timestamp.getFullYear()}
                                      </div>

                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                          <p className="text-white font-bold text-sm line-clamp-2">{m.text || "Untitled Memory"}</p>
                                          <div className="flex items-center gap-2 mt-2">
                                              <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                  {m.comments?.length || 0} comments
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          
                          {/* NAV BUTTONS - MOVED TO BOTTOM */}
                          <div className="flex gap-4 mb-20 max-w-2xl mx-auto">
                               <button onClick={() => changeStep('TEAM')} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">Back</button>
                               <button onClick={() => changeStep('REMINDERS')} className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Next: Daily Reminders</button>
                          </div>
                      </>
                  )}
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileUpload} 
                  />
                  <input 
                      type="file" 
                      ref={replaceFileInputRef} 
                      className="hidden" 
                      accept="image/*,video/*,audio/*"
                      onChange={handleReplaceFileUpload} 
                  />
              </div>
          )}

          {/* STEP 4: REMINDERS (NEW STEP) */}
          {/* NOTE: BUTTONS REMAIN AT TOP FOR REMINDERS AS REQUESTED */}
          {step === 'REMINDERS' && (
              <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
                   {/* NAV BUTTONS AT TOP */}
                   <div className="flex gap-4 mb-6">
                       <button onClick={() => changeStep('MEMORIES')} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">Back</button>
                       <button onClick={() => changeStep('PUBLISH')} className="flex-[2] py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">Next: Review & Publish</button>
                   </div>

                   {/* Add Reminder Form */}
                   <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 mb-8">
                       <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                           <Clock size={20} className="text-teal-600" /> Add New Reminder
                       </h3>
                       
                       <div className="flex flex-col md:flex-row gap-4 mb-4">
                           <div className="flex-1">
                               <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Title / Instruction</label>
                               <input 
                                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                   placeholder="e.g. Take Blood Pressure Meds"
                                   value={newReminderTitle}
                                   onChange={(e) => setNewReminderTitle(e.target.value)}
                               />
                           </div>
                           <div className="w-full md:w-1/3">
                               <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Time</label>
                               <input 
                                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                   placeholder="e.g. 8:00 AM"
                                   value={newReminderTime}
                                   onChange={(e) => setNewReminderTime(e.target.value)}
                               />
                           </div>
                       </div>

                       <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Reminder Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { type: 'medication', label: 'Medication', icon: <Pill size={14}/>, color: 'text-rose-600 bg-rose-50 border-rose-200' },
                                        { type: 'appointment', label: 'Appointment', icon: <Calendar size={14}/>, color: 'text-amber-600 bg-amber-50 border-amber-200' },
                                        { type: 'hydration', label: 'Hydration', icon: <GlassWater size={14}/>, color: 'text-sky-600 bg-sky-50 border-sky-200' },
                                        { type: 'general', label: 'General', icon: <Activity size={14}/>, color: 'text-violet-600 bg-violet-50 border-violet-200' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.type}
                                            onClick={() => setNewReminderType(opt.type as ReminderType)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                newReminderType === opt.type 
                                                ? `${opt.color} shadow-sm ring-1` 
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full md:w-1/3">
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Added By</label>
                                <select 
                                    value={newReminderAddedBy}
                                    onChange={(e) => setNewReminderAddedBy(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <option value="Caregiver">Caregiver</option>
                                    <option value={`Nurse ${memoryCircle.profile.nurseName}`}>Nurse {memoryCircle.profile.nurseName}</option>
                                    {memoryCircle.familyMembers.map(m => (
                                        <option key={m.id} value={`${m.name} (${m.relation})`}>{m.name} ({m.relation})</option>
                                    ))}
                                </select>
                            </div>
                       </div>

                       <button 
                           onClick={handleAddReminder}
                           disabled={!newReminderTitle || !newReminderTime}
                           className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                       >
                           <Plus size={18} /> Add Reminder
                       </button>
                   </div>

                   {/* Reminder List */}
                   <div className="space-y-3 mb-8">
                       {memoryCircle.reminders.length === 0 && (
                           <div className="text-center py-12 text-slate-400">
                               <Bell size={48} className="mx-auto mb-3 opacity-20" />
                               <p>No daily reminders set.</p>
                           </div>
                       )}
                       {memoryCircle.reminders.map((r) => {
                           let colorClass = "bg-violet-50 border-violet-200 text-violet-700";
                           let icon = <Activity size={18} />;
                           if (r.type === 'medication') { colorClass = "bg-rose-50 border-rose-200 text-rose-700"; icon = <Pill size={18} />; }
                           if (r.type === 'appointment') { colorClass = "bg-amber-50 border-amber-200 text-amber-700"; icon = <Calendar size={18} />; }
                           if (r.type === 'hydration') { colorClass = "bg-sky-50 border-sky-200 text-sky-700"; icon = <GlassWater size={18} />; }

                           return (
                               <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${colorClass}`}>
                                            {icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm">{r.title}</h4>
                                            <p className="text-xs text-slate-500">{r.time}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">Added by {r.addedBy || 'Caregiver'}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteReminder(r.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                               </div>
                           );
                       })}
                   </div>
              </div>
          )}

          {/* STEP 5: PUBLISH - FIXED VISIBILITY */}
          {step === 'PUBLISH' && (
               <div className="max-w-2xl mx-auto w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="bg-white p-10 rounded-3xl shadow-xl border border-stone-100 mb-8">
                       <EverlyBird size={100} className="mx-auto mb-6" />
                       <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to Publish?</h2>
                       <p className="text-slate-500 mb-8 text-lg">
                           We will compile the profile, family tree, reminders, and {memoryCircle.memories.length} memories into a beautiful interactive book for {getDisplayName()}.
                       </p>
                       
                       <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                           <div className="p-4 bg-slate-50 rounded-2xl">
                               <span className="block text-2xl font-bold text-teal-600">{memoryCircle.memories?.length || 0}</span>
                               <span className="text-xs text-slate-500 font-bold uppercase">Memories</span>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl">
                               <span className="block text-2xl font-bold text-teal-600">{memoryCircle.familyMembers?.length || 0}</span>
                               <span className="text-xs text-slate-500 font-bold uppercase">Family</span>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl">
                               <span className="block text-2xl font-bold text-teal-600">{memoryCircle.reminders?.length || 0}</span>
                               <span className="text-xs text-slate-500 font-bold uppercase">Reminders</span>
                           </div>
                       </div>
                   </div>

                   {/* NAV BUTTONS - MOVED TO BOTTOM */}
                   <div className="flex gap-4 mb-8">
                       <button onClick={() => changeStep('REMINDERS')} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200">
                           Back
                       </button>
                       <button 
                           onClick={handlePublish}
                           disabled={isCompiling}
                           className="flex-[2] py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                       >
                           {isCompiling ? (
                               <><Loader2 className="animate-spin" /> Compiling Story...</>
                           ) : (
                               <><Sparkles /> Compile & Launch Patient Mode</>
                           )}
                       </button>
                   </div>
               </div>
          )}

      </div>

      {/* SUCCESS MODAL - REDESIGNED: WHITE CARD ONLY */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="relative w-full max-w-[480px] bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 p-10 text-center ring-1 ring-black/5">
                  
                  <button 
                      onClick={() => setShowSuccessModal(false)}
                      className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                  >
                      <X size={20} />
                  </button>

                  <div className="mb-8">
                       <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold tracking-widest uppercase mb-6 border border-teal-100">
                          <CheckCircle size={12} /> Compilation Complete
                       </div>
                       
                       <h2 className="text-4xl font-serif text-slate-900 leading-tight mb-4 tracking-tight">
                           {getDisplayName()}'s View is <br/>
                           <span className="text-teal-600 italic">Ready to Launch.</span>
                       </h2>
                       
                       <p className="text-slate-500 text-lg leading-relaxed">
                           We've compiled the memories, reminders, and family tree into a simplified interface designed specifically for {getDisplayName()}.
                       </p>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={onSetupComplete}
                          className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold rounded-xl shadow-xl shadow-teal-100 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-95 group"
                      >
                          <span>Launch Patient Mode</span>
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>

                      <button 
                          onClick={() => setShowSuccessModal(false)}
                          className="w-full py-4 bg-white hover:bg-slate-50 text-slate-500 font-bold rounded-xl transition-colors border border-slate-100"
                      >
                          Keep Editing
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Footer Info */}
      {!selectedMemoryId && (
          <div className="text-center py-6 text-slate-400 text-xs mt-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                   {isSaving ? <span className="flex items-center gap-1 text-teal-500 animate-pulse"><Cloud size={12}/> Auto-saving...</span> : <span className="flex items-center gap-1"><Cloud size={12}/> Saved {lastSaved?.toLocaleTimeString()}</span>}
              </div>
              <p>Everly Caregiver Studio v1.2</p>
          </div>
      )}

      {/* CHAT ASSISTANT TOGGLE (Floating) */}
      <button 
          onClick={() => setShowAssistant(!showAssistant)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-white text-teal-600 rounded-full shadow-2xl border border-teal-100 flex items-center justify-center hover:scale-110 transition-transform z-50 group"
      >
           <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></div>
           <Sparkles size={24} className={isAssistantThinking ? "animate-spin" : ""} />
      </button>

      {/* CHAT ASSISTANT WINDOW */}
      {showAssistant && (
          <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-bottom-10 fade-in flex flex-col max-h-[500px]">
               <div className="bg-teal-600 p-4 text-white flex justify-between items-center">
                   <div className="flex items-center gap-2">
                       <EverlyBird size={24} className="bg-white/20 rounded-full p-1" />
                       <span className="font-bold text-sm">Care Assistant</span>
                   </div>
                   <button onClick={() => setShowAssistant(false)}><X size={18} /></button>
               </div>
               
               <div className="flex-1 bg-slate-50 p-4 overflow-y-auto custom-scrollbar space-y-3" ref={assistantScrollRef}>
                   {assistantMessages.map((msg, i) => (
                       <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                               msg.role === 'user' 
                               ? 'bg-teal-600 text-white rounded-tr-none' 
                               : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                           }`}>
                               <ReactMarkdown>{msg.text}</ReactMarkdown>
                           </div>
                       </div>
                   ))}
                   {isAssistantThinking && (
                       <div className="flex justify-start">
                           <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                               <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                           </div>
                       </div>
                   )}
               </div>

               <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                   <input 
                       className="flex-1 bg-slate-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-teal-500"
                       placeholder="Ask about care tips..."
                       value={assistantInput}
                       onChange={(e) => setAssistantInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendAssistantMessage()}
                   />
                   <button onClick={handleSendAssistantMessage} className="bg-teal-600 text-white p-2 rounded-xl hover:bg-teal-700">
                       <ArrowRight size={16} />
                   </button>
               </div>
          </div>
      )}

    </div>
  );
}