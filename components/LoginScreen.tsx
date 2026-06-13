import React, { useState, useRef } from 'react';
import { ShieldCheck, Loader2, Check, ArrowRight, User, AlertCircle, ChevronRight, Lock, Camera, Upload, Key } from 'lucide-react';

interface LoginScreenProps {
    onLogin: (details?: { name: string; relation: string; imageUrl?: string }) => void;
    authMode: 'signin' | 'signup';
    userHasAccount: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, authMode, userHasAccount }) => {
    // Steps: 
    // 1. 'initial' (Landing)
    // 2. 'google_consent' (Simulated Google "Choose Account" screen)
    // 3. 'api_key_input' (Enter Gemini API Key)
    // 4. 'verifying' (Spinner checking account existence)
    // 5. 'details' (If SignUp or New User, ask for profile info)
    const [step, setStep] = useState<'initial' | 'google_consent' | 'api_key_input' | 'verifying' | 'details'>('initial');
    
    const [captchaState, setCaptchaState] = useState<'idle' | 'loading' | 'verified'>('idle');
    const [error, setError] = useState('');

    // Sign Up Form State
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // API Key State
    const [apiKey, setApiKey] = useState('');

    const handleCaptchaClick = () => {
        if (captchaState !== 'idle') return;
        setCaptchaState('loading');
        setTimeout(() => {
            setCaptchaState('verified');
        }, 1000);
    };

    const handleStartAuth = () => {
        if (captchaState !== 'verified') return;
        setError('');
        setStep('google_consent');
    };

    const handleGoogleAccountSelect = () => {
        // If we already have a key saved, we skip the input step unless it is empty
        const savedKey = localStorage.getItem('everly_api_key');
        if (savedKey) {
            setStep('verifying');
            simulateVerification();
        } else {
            setStep('api_key_input');
        }
    };
    
    const simulateVerification = () => {
         setTimeout(() => {
            // Force "Details" step ONLY if explicitly signing up
            // If signing in, we assume the account exists (even if not in local storage for this mock)
            if (authMode === 'signup') {
                setStep('details');
            } else {
                // Existing user signing in -> Direct entry
                onLogin();
            }
        }, 1500);
    }

    const handleApiKeySubmit = () => {
        if (!apiKey.trim()) {
            setError('Please enter a valid API key.');
            return;
        }
        
        // Basic format check
        if (!apiKey.startsWith('AIza')) {
            setError('Invalid format. Google API keys usually start with "AIza".');
            return;
        }
        
        localStorage.setItem('everly_api_key', apiKey.trim());
        setError('');
        setStep('verifying');
        simulateVerification();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                const img = new Image();
                img.onload = () => {
                    // Resize image to prevent localStorage quota exceeded errors
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300; // Sufficient for avatar
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    // Use JPEG with 0.7 quality for good compression
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setProfileImage(dataUrl);
                };
                img.src = readerEvent.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCompleteSignup = () => {
        if (!name || !relation) return;
        onLogin({ name, relation, imageUrl: profileImage || undefined });
    };

    // --- GOOGLE CONSENT SCREEN SIMULATOR ---
    if (step === 'google_consent') {
        return (
            <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-[400px] rounded-lg shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col min-h-[500px]">
                    {/* Google Header */}
                    <div className="p-8 pb-4 text-center border-b border-slate-100">
                        <div className="flex justify-center mb-4">
                            <svg className="w-10 h-10" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-medium text-slate-800">Sign in with Google</h2>
                        <div className="mt-2 text-sm text-slate-600">
                            to continue to <span className="font-bold text-teal-600">Everly</span>
                        </div>
                    </div>

                    {/* Account List */}
                    <div className="flex-1 p-6">
                        <div 
                            onClick={handleGoogleAccountSelect}
                            className="flex items-center gap-4 p-3 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all group"
                        >
                            <img src="https://ui-avatars.com/api/?name=Caregiver&background=0f766e&color=fff" className="w-10 h-10 rounded-full" alt="User" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700">sample.caregiver.john@gmail.com</p>
                                <p className="text-xs text-slate-500">Caregiver Account</p>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-slate-500" size={20} />
                        </div>
                        
                        <div className="flex items-center gap-4 p-3 mt-2 rounded-md hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all text-slate-600">
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                 <User size={20} />
                             </div>
                             <p className="text-sm font-medium">Use another account</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 text-xs text-slate-500 leading-relaxed border-t border-slate-100">
                        To continue, Google will share your name, email address, and language preference with Everly. Before using this app, you can review Everly's <span className="text-blue-600 cursor-pointer">privacy policy</span> and <span className="text-blue-600 cursor-pointer">terms of service</span>.
                    </div>
                </div>
            </div>
        );
    }
    
    // --- API KEY INPUT SCREEN ---
    if (step === 'api_key_input') {
        return (
            <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
                 <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl border border-slate-100 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mb-6 text-teal-600">
                         <Key size={28} />
                     </div>
                     
                     <h2 className="text-2xl font-bold text-slate-800 mb-2">Enter Gemini API Key</h2>
                     <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                         To enable Everly's intelligent features (Story generation, Voice mode, and Live interactions), please provide your Google Gemini API Key.
                     </p>
                     
                     <div className="mb-6">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">API Key</label>
                         <input 
                             type="password"
                             value={apiKey}
                             onChange={(e) => {
                                 setApiKey(e.target.value);
                                 setError('');
                             }}
                             className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono tracking-wide"
                             placeholder="AIzaSy..."
                             autoFocus
                         />
                         {error && <p className="text-red-600 text-xs mt-2 flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
                         <p className="text-[10px] text-slate-400 mt-2">
                             Your key is stored locally on your device and never sent to our servers.
                         </p>
                     </div>
                     
                     <button 
                         onClick={handleApiKeySubmit}
                         className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                     >
                         Continue <ArrowRight size={18} />
                     </button>
                     
                     <div className="mt-6 text-center">
                         <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-teal-600 font-bold hover:underline">
                             Get an API Key from Google AI Studio
                         </a>
                     </div>
                 </div>
            </div>
        );
    }

    // --- VERIFYING STATE ---
    if (step === 'verifying') {
        return (
            <div className="h-screen w-screen bg-white flex flex-col items-center justify-center p-6">
                 <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
                 <h2 className="text-lg font-bold text-slate-800">Verifying Account...</h2>
                 <p className="text-slate-500 text-sm mt-2">Connecting to Everly Secure Server</p>
            </div>
        );
    }

    // --- MAIN LOGIN / SIGNUP ---
    return (
        <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
             {/* Background elements */}
             <div className="absolute top-0 left-0 w-64 h-64 bg-teal-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
             <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200 rounded-full blur-3xl opacity-20 translate-x-1/3 translate-y-1/3" />

             <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
                 
                 {/* LOGO & BRAND */}
                 <div className="mb-8 flex flex-col items-center justify-center">
                     <h1 className="text-5xl font-light text-teal-900 tracking-tight drop-shadow-sm pb-2">Everly Storybook</h1>
                 </div>
                 
                 {step === 'initial' ? (
                    <>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">
                            {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-slate-500 mb-8 text-sm">
                            {authMode === 'signup' 
                                ? 'Join Everly to preserve family memories.' 
                                : 'Sign in to access your memory circle.'}
                        </p>

                        {/* Mock ReCAPTCHA Widget */}
                        <div 
                            onClick={handleCaptchaClick}
                            className={`w-full bg-[#f9f9f9] border ${captchaState === 'verified' ? 'border-teal-500' : 'border-[#d3d3d3]'} rounded-md p-3 flex items-center justify-between mb-8 cursor-pointer hover:bg-[#f0f0f0] transition-colors shadow-sm select-none text-left`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 border-2 rounded-sm flex items-center justify-center bg-white ${captchaState === 'idle' ? 'border-[#c1c1c1]' : 'border-transparent'}`}>
                                    {captchaState === 'loading' && <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />}
                                    {captchaState === 'verified' && <Check className="w-6 h-6 text-teal-600 font-bold" strokeWidth={4} />}
                                </div>
                                <span className="text-sm font-medium text-slate-700">I'm not a robot</span>
                            </div>
                            <div className="flex flex-col items-center text-[8px] text-slate-400">
                                <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" className="w-8 h-8 opacity-50 grayscale mb-0.5" alt="reCAPTCHA" />
                                <span className="leading-none">reCAPTCHA</span>
                                <span className="text-[7px] leading-none mt-0.5">Privacy - Terms</span>
                            </div>
                        </div>
                        
                        {/* MAIN ACTION BUTTON */}
                        <button 
                            onClick={handleStartAuth}
                            disabled={captchaState !== 'verified'}
                            className={`w-full flex items-center justify-center gap-3 border py-4 px-6 rounded-xl transition-all shadow-sm font-bold text-sm mb-4 relative overflow-hidden group
                                ${captchaState === 'verified' 
                                    ? 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-md active:scale-95' 
                                    : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70'}
                            `}
                        >
                            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span className="font-roboto">
                                {authMode === 'signup' ? "Sign Up with Google" : "Sign In with Google"}
                            </span>
                            {captchaState === 'verified' && (
                                <div className="absolute right-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                                    <Lock size={16} />
                                </div>
                            )}
                        </button>
                        
                        {error && (
                            <div className="flex items-center gap-3 text-xs text-red-700 font-semibold bg-red-50 p-4 rounded-xl border border-red-100 animate-in slide-in-from-top-2 text-left">
                                <AlertCircle size={20} className="flex-shrink-0" /> 
                                <span>{error}</span>
                            </div>
                        )}
                    </>
                 ) : (
                    // DETAILS FORM FOR SIGNUP
                    <div className="animate-in fade-in slide-in-from-right-8 duration-300 text-left">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">One Last Thing</h1>
                        <p className="text-slate-500 mb-6 text-sm text-center">Tell us about yourself to join the family circle.</p>
                        
                        {/* PROFILE PICTURE UPLOAD */}
                        <div className="flex flex-col items-center mb-6">
                             <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors relative overflow-hidden group shadow-inner"
                             >
                                 {profileImage ? (
                                     <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="flex flex-col items-center text-slate-400">
                                         <Camera size={24} className="mb-1" />
                                         <span className="text-[10px] uppercase font-bold">Photo</span>
                                     </div>
                                 )}
                                 
                                 {/* Hover overlay */}
                                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                     <Upload size={20} className="text-white" />
                                 </div>
                             </div>
                             <input 
                                 type="file" 
                                 ref={fileInputRef}
                                 className="hidden"
                                 accept="image/*"
                                 onChange={handleFileSelect}
                             />
                             <p className="text-xs text-slate-400 mt-2 font-medium text-center">
                                Tap to upload profile picture<br/>
                                <span className="text-[10px] text-slate-300 font-normal">(Optional but recommended)</span>
                             </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Your Name</label>
                                <div className="relative">
                                    <input 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                        placeholder="e.g. Sarah Jones"
                                        autoFocus
                                    />
                                    <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Relationship to Patient</label>
                                <input 
                                    value={relation}
                                    onChange={(e) => setRelation(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                                    placeholder="e.g. Daughter, Grandson"
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleCompleteSignup}
                            disabled={!name || !relation}
                            className="w-full py-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Complete Setup <ArrowRight size={18} />
                        </button>
                    </div>
                 )}

                 <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                     <ShieldCheck size={14} className="text-teal-500" />
                     <span>Secure End-to-End Encryption</span>
                 </div>
             </div>
        </div>
    );
};