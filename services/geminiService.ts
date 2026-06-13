import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { MemoryCircle, PatientProfile, BookNarrative } from "../types";

// Helper to get API Key from storage
const getApiKey = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('everly_api_key') || '';
    }
    return '';
};

// --- WAV HEADER HELPER ---
const writeWavHeader = (sampleRate: number, numChannels: number, bitsPerSample: number, dataLength: number) => {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    return buffer;
};

// --- MULTIMODAL UTILS ---
const fileToPart = (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64String = reader.result as string;
             // Remove data URL prefix (e.g. "data:image/jpeg;base64,")
             const base64Data = base64String.split(',')[1];
             resolve({
                 inlineData: {
                     data: base64Data,
                     mimeType: file.type
                 }
             });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const blobToPart = (blob: Blob): Promise<{inlineData: {data: string, mimeType: string}}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64String = reader.result as string;
             const base64Data = base64String.split(',')[1];
             resolve({
                 inlineData: {
                     data: base64Data,
                     mimeType: blob.type
                 }
             });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// --- TRANSCRIPTION HELPER ---
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "";

    const ai = new GoogleGenAI({ apiKey });
    // Updated to Gemini 3.5 Flash as requested
    const model = 'gemini-3.5-flash';

    try {
        const audioPart = await blobToPart(audioBlob);
        const result = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    audioPart,
                    { text: "Transcribe this audio exactly as spoken. Do not add timestamps or speaker labels. Just return the text." }
                ]
            }
        });
        return result.text || "";
    } catch (e) {
        console.error("Transcription error", e);
        return "";
    }
};

// --- TTS HELPER ---
export const generateSpeech = async (text: string): Promise<string | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.1-flash-tts-preview';

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            // Convert base64 PCM to WAV
            const binaryString = window.atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const wavHeader = writeWavHeader(24000, 1, 16, bytes.length);
            const wavBlob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
            
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(wavBlob);
            });
        }
        return null;
    } catch (e) {
        console.error("Speech generation error", e);
        return null;
    }
};

// --- CAPTION GENERATION (Gemini 3 Flash) ---

export const generateCaptionFromDetails = async (
  file: File,
  context: string,
  year: string,
  details: string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "API Key missing. Please restart and provide a key.";

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.5-flash';

    try {
        const filePart = await fileToPart(file);
        
        let prompt = `
          You are a compassionate biographer helping a caregiver create a memory book for a dementia patient named ${context}. 
          Analyze the uploaded media and the provided details to write a heartwarming, specific caption.
          
          Year: ${year}
          Details: ${details}
          
          COMMAND: Write the best possible heartwarming 2-sentence story-style caption based on the image, the year, and the details provided. Return ONLY the caption text.
        `;

        const result = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    filePart,
                    { text: prompt }
                ]
            }
        });

        return result.text || "A beautiful memory.";

    } catch (e) {
        console.error("Caption generation error", e);
        return details || "A beautiful memory.";
    }
};


// --- STORY BOOK COMPILER (Gemini 3 Pro & Flash Image) ---
export const compileBookNarrative = async (circle: MemoryCircle): Promise<BookNarrative> => {
  const apiKey = getApiKey();
  if (!apiKey) {
      return { intro: "", familySummary: "", safetyMessage: "" };
  }

  const ai = new GoogleGenAI({ apiKey });
  const proModel = 'gemini-3.1-pro-preview'; 
  const imageModel = 'gemini-2.5-flash-image';

  const familyContext = circle.familyMembers.map(m => `${m.name} (${m.relation}): ${m.note}`).join('; ');
  const memoryContext = circle.memories.map(m => `[${m.timestamp.getFullYear()}] ${m.text}`).join('; ');
  const patientName = circle.profile.preferredName || circle.profile.firstName;

  // STEP 1: Creative Direction & Scripting (Gemini 3.1 Pro)
  const proPrompt = `
    You are an expert biographer and creative director creating a compassionate "Digital Memory Book" for a dementia patient named ${patientName}.
    
    Data:
    - Profile: ${JSON.stringify(circle.profile)}
    - Family: ${familyContext}
    - Memories: ${memoryContext}

    Task: Generate a JSON object with four distinct sections.
    1. "intro": A 100-word biography written in the second person ("You are..."). It should be warm, validating, and mention their role (${circle.profile.formerRole}) and what they love.
    2. "familySummary": A 50-word introduction to their family tree, mentioning how much they are loved.
    3. "safetyMessage": A very short, calming message (15 words max) about being safe at ${circle.profile.locationDescription} with their nurse ${circle.profile.nurseName}.
    4. "illustrationPrompt": A detailed prompt for an image generator to create a beautiful, heartwarming watercolor illustration capturing the essence of ${patientName}'s life and loves (${circle.profile.loves}).

    Output JSON format: { "intro": "...", "familySummary": "...", "safetyMessage": "...", "illustrationPrompt": "..." }
  `;

  let narrativeData: any = {};
  try {
    const proResponse = await ai.models.generateContent({
      model: proModel,
      contents: proPrompt,
      config: { responseMimeType: "application/json" }
    });
    
    let text = proResponse.text || "{}";
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    narrativeData = JSON.parse(text);
  } catch (error) {
    console.error("Pro narrative compilation failed:", error);
    narrativeData = {
      intro: `You have lived a wonderful life, ${patientName}. You are loved by many.`,
      familySummary: "Your family is here with you in spirit and love.",
      safetyMessage: "You are safe here at home.",
      illustrationPrompt: `A beautiful, calming watercolor painting of ${patientName}'s favorite things.`
    };
  }

  // STEP 2: Multimodal Synthesis (Gemini 3.1 Flash Image) - Interleaved Output
  const storyParts: { type: 'text' | 'image', content: string }[] = [];
  
  try {
    const imageResponse = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          { text: `Write a beautiful, poetic 2-sentence story about ${patientName}'s life based on this: ${narrativeData.intro}. Also generate an image based on this prompt: ${narrativeData.illustrationPrompt}` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    if (imageResponse.candidates?.[0]?.content?.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64EncodeString = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${base64EncodeString}`;
                storyParts.push({ type: 'image', content: imageUrl });
            } else if (part.text) {
                storyParts.push({ type: 'text', content: part.text });
            }
        }
    }
  } catch (e) {
    console.error("Image generation failed", e);
  }

  return {
    intro: narrativeData.intro || "",
    familySummary: narrativeData.familySummary || "",
    safetyMessage: narrativeData.safetyMessage || "",
    interleavedStory: storyParts.length > 0 ? storyParts : undefined
  };
};

// --- CAREGIVER ASSISTANT CHAT (Gemini 3 Pro) ---
// Uses Gemini 3 Pro for advanced reasoning and compassionate advice
export const createCaregiverChat = (circle: MemoryCircle) => {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.5-flash';

    const patientName = circle.profile.preferredName || circle.profile.firstName;

    const systemInstruction = `
        You are Everly's Caregiver Assistant, a highly intelligent and compassionate AI expert in dementia care.
        You have context about the patient, ${patientName}.
        
        Patient Profile:
        ${JSON.stringify(circle.profile)}
        
        Family Members:
        ${JSON.stringify(circle.familyMembers.map(m => ({name: m.name, relation: m.relation})))}
        
        Your goal is to support the caregiver. 
        - Answer questions about the patient's potential behavior based on their profile.
        - Suggest activities based on their "loves" (${circle.profile.loves}).
        - Help draft messages or updates to the family.
        - Provide emotional support to the caregiver.
        
        Keep answers concise, warm, and practical.
    `;

    return ai.chats.create({
        model,
        config: { systemInstruction }
    });
};

// --- VOICE GUIDANCE GENERATOR (TTS) ---
// UPDATED: Consistently use 'Aoede' for all TTS to ensure voice match with Live
export const generateSimpleTTS = async (text: string): Promise<string | null> => {
    if (!text || text.trim().length === 0) return null;
    const apiKey = getApiKey();
    if (!apiKey) return null;
    
    // Sanitize text: Remove markdown chars that might confuse TTS
    const cleanText = text.replace(/[*#_\[\]`]/g, '').trim();
    
    const ai = new GoogleGenAI({ apiKey });
    // Note: TTS currently uses gemini-2.5-flash-preview-tts as per guidelines
    const modelId = 'gemini-3.1-flash-tts-preview';

    const makeRequest = async (attempt: number = 1): Promise<string | null> => {
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: [{ parts: [{ text: cleanText }] }],
                config: {
                    responseModalities: [Modality.AUDIO], 
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                    }
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                if (attempt < 3) {
                     // Retry if empty
                     await new Promise(r => setTimeout(r, 500));
                     return makeRequest(attempt + 1);
                }
                console.error("TTS: No audio data received");
                return null;
            }

            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const wavHeader = writeWavHeader(24000, 1, 16, bytes.length);
            const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
            return URL.createObjectURL(blob);

        } catch (error: any) {
             const msg = error.toString();
             // Check for 429 Resource Exhausted or 500/503/Internal errors
             if (attempt < 5 && (msg.includes('429') || msg.includes('500') || msg.includes('503') || msg.includes('INTERNAL'))) {
                const delay = 2000 * Math.pow(2, attempt); // 4s, 8s, 16s, 32s
                console.warn(`TTS attempt ${attempt} failed (Rate Limit/Error). Retrying in ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                return makeRequest(attempt + 1);
             }
             console.error("TTS Generation Error:", error);
             return null;
        }
    };

    return makeRequest();
};

// --- LIVE API (Real-time Voice) ---
export const connectToLiveSession = async (
  circle: MemoryCircle,
  onMessage: (text: string, isUser: boolean) => void,
  customSystemInstruction?: string
) => {
  const apiKey = getApiKey();
  if (!apiKey) return { close: () => {} };

  const ai = new GoogleGenAI({ apiKey });
  // Note: Live API currently uses gemini-2.5-flash-native-audio-preview-12-2025 as per guidelines
  const model = 'gemini-3.1-flash-live-preview';

  const patientName = circle.profile.preferredName || circle.profile.firstName;

  const defaultInstruction = `
    You are Everly, a calm and gentle memory companion for ${patientName}.
    Your goal is to help them feel safe and connected.
    
    RULES:
    - Speak slowly and calmly.
    - Use short sentences.
    - Always reassure before instructing.
    - Never use technical language like "app" or "button".
    - Current Location: ${circle.profile.locationDescription}.
    - Nurse on duty: ${circle.profile.nurseName}.
  `;

  const systemInstruction = customSystemInstruction || defaultInstruction;

  const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const inputSource = inputAudioContext.createMediaStreamSource(stream);
  const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
  
  inputSource.connect(processor);
  processor.connect(inputAudioContext.destination);

  let nextStartTime = 0;
  const sources = new Set<AudioBufferSourceNode>();
  let sessionPromise: Promise<any>;
  
  try {
      sessionPromise = ai.live.connect({
        model,
        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => console.log("Live session opened"),
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.modelTurn?.parts?.[0]?.text) {
                 onMessage(msg.serverContent.modelTurn.parts[0].text, false);
            }
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              try {
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBuffer = await decodeAudioData(decodeAudio(audioData), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
                sources.add(source);
                source.onended = () => sources.delete(source);
              } catch (e) { console.error(e); }
            }
            if (msg.serverContent?.interrupted) {
                sources.forEach(s => s.stop());
                sources.clear();
                nextStartTime = 0;
            }
            if (msg.serverContent?.outputTranscription?.text) onMessage(msg.serverContent.outputTranscription.text, false);
            if (msg.serverContent?.inputTranscription?.text) onMessage(msg.serverContent.inputTranscription.text, true);
          },
          onclose: () => console.log("Live session closed"),
          onerror: (e) => console.error("Live session error", e)
        }
      });
  } catch (err) {
      console.error("Setup Error:", err);
      return { close: () => {} };
  }

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const blob = createPcmBlob(inputData);
    if (sessionPromise) {
        sessionPromise.then(session => session.sendRealtimeInput({ media: blob })).catch(() => {});
    }
  };

  return {
    close: () => {
      processor.disconnect();
      inputSource.disconnect();
      stream.getTracks().forEach(t => t.stop());
      inputAudioContext.close();
      outputAudioContext.close();
      if (sessionPromise) sessionPromise.then(s => s.close()).catch(() => {});
    }
  };
};

function createPcmBlob(data: Float32Array) {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
  const uint8 = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
  return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
}

function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}