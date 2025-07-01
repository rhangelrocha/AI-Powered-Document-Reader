
import React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { parsePdf, parseDocx } from './services/fileParser';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { PlayIcon, PauseIcon, StopIcon, UploadIcon } from './components/icons';
import { VoiceOption } from './types';

// --- Helper Components defined outside the main component ---

const Spinner = () => (
  <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
  </div>
);

interface FileUploadProps {
  onFileProcessed: (text: string) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  isProcessing: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed, setProcessing, setError, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (isProcessing) return;

    setError(null);
    setProcessing(true);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await parsePdf(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await parseDocx(file);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF or DOCX file.');
      }
      onFileProcessed(text);
    } catch (err: any) {
      console.error("File processing error:", err);
      setError(err.message || 'Failed to process the file.');
    } finally {
      setProcessing(false);
    }
  }, [onFileProcessed, setProcessing, setError, isProcessing]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };
  
  return (
    <div 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors ${dragActive ? 'border-sky-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500'}`}
    >
      <input 
        type="file" 
        id="file-upload" 
        className="absolute w-full h-full opacity-0 cursor-pointer" 
        onChange={handleChange}
        accept=".pdf,.docx"
        disabled={isProcessing}
      />
      <div className="flex flex-col items-center text-slate-400">
        <UploadIcon className="w-12 h-12 mb-4 text-slate-500" />
        <p className="font-semibold">Drag & drop a PDF or DOCX file</p>
        <p className="text-sm">or click to browse</p>
      </div>
    </div>
  );
};

interface ControlsProps {
  play: () => void;
  pause: () => void;
  stop: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  hasText: boolean;
  voices: VoiceOption[];
  selectedVoice: VoiceOption | null;
  onVoiceChange: (voice: VoiceOption) => void;
}

const Controls: React.FC<ControlsProps> = ({ play, pause, stop, isSpeaking, isPaused, hasText, voices, selectedVoice, onVoiceChange }) => {
  const handleVoiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedUri = e.target.value;
      const voice = voices.find(v => v.uri === selectedUri);
      if (voice) {
          onVoiceChange(voice);
      }
  };
    
  return (
    <div className="flex items-center justify-between w-full p-4 bg-slate-800 rounded-lg shadow-md mt-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={isSpeaking ? pause : play}
          disabled={!hasText}
          className="p-3 rounded-full bg-sky-500 text-white hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
        >
          {isSpeaking ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
        </button>
        <button
          onClick={stop}
          disabled={!isSpeaking && !isPaused}
          className="p-3 rounded-full bg-slate-600 text-white hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-slate-500"
        >
          <StopIcon className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-grow ml-4">
        <select
          value={selectedVoice?.uri || ''}
          onChange={handleVoiceSelect}
          disabled={voices.length === 0}
          className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block p-2.5"
        >
          {voices.length > 0 ? (
            voices.map(voice => (
              <option key={voice.uri} value={voice.uri}>
                {voice.name} ({voice.lang})
              </option>
            ))
          ) : (
            <option>Loading voices...</option>
          )}
        </select>
      </div>
    </div>
  );
};


interface TextDisplayProps {
    text: string;
    words: string[];
    currentWordIndex: number;
}

const TextDisplay: React.FC<TextDisplayProps> = ({ text, words, currentWordIndex }) => {
    if (!text) return null;

    return (
        <div className="w-full h-96 p-6 mt-4 bg-slate-800 rounded-lg overflow-y-auto text-slate-300 leading-relaxed shadow-inner">
            {words.map((word, index) => (
                <span
                    key={index}
                    className={index === currentWordIndex ? 'bg-sky-700 text-white rounded' : ''}
                >
                    {word}{' '}
                </span>
            ))}
        </div>
    );
};


// --- Main App Component ---

export default function App() {
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  
  const words = useMemo(() => extractedText.split(/\s+/), [extractedText]);

  const handleBoundary = useCallback((event: SpeechSynthesisEvent) => {
    let wordIndex = -1;
    const textUpToChar = extractedText.substring(0, event.charIndex);
    const wordsUpToChar = textUpToChar.split(/\s+/);
    wordIndex = wordsUpToChar.length - 1;
    setCurrentWordIndex(wordIndex);
  }, [extractedText]);
  
  const handleEnd = useCallback(() => {
      setCurrentWordIndex(-1);
  }, []);

  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    isPaused,
    play,
    pause,
    stop,
  } = useSpeechSynthesis(handleBoundary, handleEnd);


  const handleFileProcessed = (text: string) => {
    stop(); // Stop any current speech
    setExtractedText(text);
  };
  
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-sky-400">AI Document Reader</h1>
          <p className="text-slate-400 mt-2">Upload a PDF or DOCX file to have it read aloud.</p>
        </header>

        <main>
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg border-slate-600">
              <Spinner />
              <p className="mt-4 text-slate-400">Processing your document...</p>
            </div>
          ) : (
            <FileUpload
              onFileProcessed={handleFileProcessed}
              setProcessing={setProcessing}
              setError={setError}
              isProcessing={isProcessing}
            />
          )}

          {extractedText && (
            <>
              <Controls
                play={() => play(extractedText)}
                pause={pause}
                stop={stop}
                isSpeaking={isSpeaking}
                isPaused={isPaused}
                hasText={!!extractedText}
                voices={voices}
                selectedVoice={selectedVoice}
                onVoiceChange={setSelectedVoice}
              />
              <TextDisplay text={extractedText} words={words} currentWordIndex={currentWordIndex} />
            </>
          )}
        </main>

        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by modern web technologies. Designed for a seamless experience.</p>
        </footer>
      </div>
    </div>
  );
}
