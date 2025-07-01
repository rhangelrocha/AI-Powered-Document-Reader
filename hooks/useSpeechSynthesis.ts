
import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceOption } from '../types';

export const useSpeechSynthesis = (onBoundary: (e: SpeechSynthesisEvent) => void, onEnd: () => void) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = window.speechSynthesis.getVoices()
        .filter(voice => voice.lang.startsWith('en') || voice.lang.startsWith('es') || voice.lang.startsWith('pt')) // Filter for common languages
        .map(v => ({ name: v.name, lang: v.lang, uri: v.voiceURI }));
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        // Try to set a default voice
        const defaultVoice = availableVoices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };

    // The 'voiceschanged' event is fired when the list of voices is ready
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    handleVoicesChanged(); // Also call it directly in case voices are already loaded

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback((text: string) => {
    if (isPaused && utteranceRef.current) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else if (text && selectedVoice) {
      window.speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      const voiceObject = window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice.uri);
      if (voiceObject) {
        utterance.voice = voiceObject;
      }
      utterance.onboundary = onBoundary;
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        onEnd();
      };
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  }, [selectedVoice, isPaused, onBoundary, onEnd]);

  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isSpeaking, isPaused]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
    onEnd(); // Reset highlighting
  }, [onEnd]);
  
  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    isPaused,
    play,
    pause,
    stop,
  };
};
