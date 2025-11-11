import React, { useState, useEffect, useCallback } from 'react';
import { MicIcon, DownloadIcon, AlertTriangleIcon } from '../Icons';
import { generateVoiceOver } from '../../services/geminiService';
import { addHistoryItem } from '../../services/historyService';
import Spinner from '../common/Spinner';
import TwoColumnLayout from '../common/TwoColumnLayout';
// FIX: Import Language type.
import { type Language } from '../../types';
import { handleApiError } from '../../services/errorHandler';


const voiceActors = [
    { id: 'Kore', name: 'Adila', language: 'Bahasa Melayu', gender: 'Perempuan' },
    { id: 'Zephyr', name: 'Adrin', language: 'Bahasa Melayu', gender: 'Perempuan' },
    { id: 'Leda', name: 'Alya', language: 'Bahasa Melayu', gender: 'Perempuan' },
    { id: 'Orus', name: 'Osman', language: 'Bahasa Melayu', gender: 'Lelaki' },
    { id: 'erinome', name: 'Kore', language: 'Inggeris', gender: 'Perempuan' },
    { id: 'vindemiatrix', name: 'Zephyr', language: 'Inggeris', gender: 'Lelaki (Tenang)' },
    { id: 'puck', name: 'Puck', language: 'Inggeris', gender: 'Lelaki (Ceria)' },
    { id: 'charon', name: 'Charon', language: 'Inggeris', gender: 'Lelaki (Dalam)' },
    { id: 'Fenrir', name: 'Fenrir', language: 'Inggeris', gender: 'Lelaki (Kuat)' },
];

const moodOptions = [
    'Normal', 
    'Ceria', 
    'Semangat', 
    'Jualan', 
    'Sedih',
    'Berbisik',
    'Marah',
    'Tenang',
    'Rasmi',
    'Teruja',
    'Penceritaan',
    'Berwibawa',
    'Mesra'
];

const musicStyleOptions = [
    'Pop', 
    'Balada', 
    'Rock', 
    'Jazz', 
    'Folk', 
    'Lagu Kanak-kanak',
    'Rap',
    'Tradisional Melayu'
];

const SESSION_KEY = 'voiceStudioState';

// FIX: Add props interface for the component.
interface VoiceStudioViewProps {
    language: Language;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
    </div>
);

// FIX: Changed to named export and added missing return statement to resolve compilation errors.
export const VoiceStudioView: React.FC<VoiceStudioViewProps> = ({ language }) => {
    const [script, setScript] = useState('');
    const [actor, setActor] = useState(voiceActors[0].id);
    const [mood, setMood] = useState('Normal');
    const [generationMode, setGenerationMode] = useState<'speak' | 'sing'>('speak');
    const [musicStyle, setMusicStyle] = useState(musicStyleOptions[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem(SESSION_KEY);
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.script) setScript(state.script);
                if (state.actor) setActor(state.actor);
                if (state.mood) setMood(state.mood);
                if (state.generationMode) setGenerationMode(state.generationMode);
                if (state.musicStyle) setMusicStyle(state.musicStyle);
            }
        } catch (e) { console.error("Failed to load state from session storage", e); }
    }, []);

    useEffect(() => {
        try {
            const stateToSave = { script, actor, mood, generationMode, musicStyle };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(stateToSave));
        } catch (e) { console.error("Failed to save state to session storage", e); }
    }, [script, actor, mood, generationMode, musicStyle]);

    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) {
            setError("Sila tulis skrip untuk menjana audio.");
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);

        try {
            const selectedActor = voiceActors.find(va => va.id === actor);
            const language = selectedActor ? selectedActor.language : 'English';

            const blob = await generateVoiceOver(
                script, 
                actor, 
                language, 
                mood, 
                generationMode,
                musicStyle
            );

            if (!blob) {
                throw new Error("Penjanaan audio gagal dan tidak mengembalikan data.");
            }
            
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setAudioBlob(blob);
            await addHistoryItem({
                type: 'Audio',
                prompt: `Suara: ${actor}, Mood: ${mood}, Skrip: ${script.substring(0, 50)}...`,
                result: blob,
            });
        } catch (e) {
            const userFriendlyMessage = handleApiError(e);
            setError(userFriendlyMessage);
        } finally {
            setIsLoading(false);
        }
    }, [script, actor, audioUrl, mood, generationMode, musicStyle]);
    
    const handleReset = useCallback(() => {
        setScript('');
        setActor(voiceActors[0].id);
        setMood('Normal');
        setGenerationMode('speak');
        setMusicStyle(musicStyleOptions[0]);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioBlob(null);
        sessionStorage.removeItem(SESSION_KEY);
    }, [audioUrl]);

    const leftPanel = (
        <>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Studio Suara AI</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Tukar teks menjadi ucapan berkualiti tinggi yang berbunyi semula jadi.</p>
            </div>

            <Section title="Tulis Skrip atau Lirik Anda">
                <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Masukkan teks anda di sini..."
                    rows={8}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3"
                />
                 <p className="text-right text-xs text-neutral-500">{script.length} aksara</p>
            </Section>

            <Section title="Pilih Pelakon Suara">
                 <select value={actor} onChange={(e) => setActor(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                    {voiceActors.map(va => <option key={va.id} value={va.id}>{va.name} ({va.language} {va.gender})</option>)}
                </select>
            </Section>
            
            <Section title="Jenis Penjanaan">
                <div className="flex gap-4">
                     <button onClick={() => setGenerationMode('speak')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${generationMode === 'speak' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Cakap</button>
                     <button onClick={() => setGenerationMode('sing')} className={`px-6 py-2 rounded-full font-semibold transition-colors text-sm ${generationMode === 'sing' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Nyanyi</button>
                </div>
            </Section>

            {generationMode === 'speak' ? (
                <Section title="Pilih Mood Suara">
                    <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {moodOptions.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </Section>
            ) : (
                <Section title="Pilih Gaya Muzik">
                    <select value={musicStyle} onChange={(e) => setMusicStyle(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {musicStyleOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Section>
            )}
            
            <div className="pt-4 mt-auto">
                <div className="flex gap-4">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {isLoading ? <Spinner /> : "Jana Audio"}
                    </button>
                    <button onClick={handleReset} disabled={isLoading} className="flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-semibold py-3 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50">
                        Set Semula
                    </button>
                </div>
                {error && <p className="text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
            </div>
        </>
    );

    const rightPanel = (
        <>
           {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full gap-4">
                   <Spinner />
                   <p className="text-neutral-500 dark:text-neutral-400">Menjana audio, sila tunggu...</p>
               </div>
           ) : error ? (
                <div className="text-center p-4 text-red-500 dark:text-red-400">
                    <AlertTriangleIcon className="w-12 h-12 mx-auto mb-2"/>
                   <p className="font-semibold">Oh tidak!</p>
                   <p className="text-sm">{error}</p>
               </div>
           ) : audioUrl ? (
               <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                   <audio src={audioUrl} controls autoPlay className="w-full max-w-md rounded-lg"/>
                   {audioBlob && (
                        <a 
                           href={audioUrl} 
                           download={`monoklix-voiceover-${Date.now()}.wav`}
                           className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors mt-4"
                       >
                           <DownloadIcon className="w-4 h-4"/> Muat Turun Audio
                       </a>
                   )}
               </div>
           ) : (
               <div className="text-center text-neutral-500 dark:text-neutral-600">
                   <MicIcon className="w-16 h-16 mx-auto" />
                   <p>Audio yang anda jana akan muncul di sini.</p>
               </div>
           )}
       </>
   );

    return <TwoColumnLayout leftPanel={leftPanel} rightPanel={rightPanel} language={language} />;
};
