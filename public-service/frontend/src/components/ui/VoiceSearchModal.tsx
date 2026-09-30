import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, Globe, Sparkles, Loader2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-client";

interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQueryComplete?: (query: string) => void;
}

export function VoiceSearchModal({ open, onOpenChange, onQueryComplete }: VoiceSearchModalProps) {
  const [, setLocation] = useLocation();
  const [selectedLang, setSelectedLang] = useState<"en-IN" | "te-IN" | "hi-IN">("en-IN");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processedQuery, setProcessedQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const langLabels = {
    "en-IN": { name: "English", flag: "🇮🇳", sample: "Try saying: 'Fresh Tomato' or 'Spinach'" },
    "te-IN": { name: "తెలుగు (Telugu)", flag: "🇮🇳", sample: "చెప్పండి: 'టమోటా', 'పాలకూర', 'మామిడి'" },
    "hi-IN": { name: "हिंदी (Hindi)", flag: "🇮🇳", sample: "बोलिए: 'टमाटर', 'पालक', 'ताजा आम'" },
  };

  useEffect(() => {
    if (!open) {
      cleanupAudio();
      setTranscript("");
      setProcessedQuery("");
      return;
    }

    startListening();
    return () => cleanupAudio();
  }, [open, selectedLang]);

  const cleanupAudio = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsListening(false);
  };

  const startListening = async () => {
    cleanupAudio();
    setTranscript("");
    setProcessedQuery("");
    audioChunksRef.current = [];

    // 1. Initiate HTML5 MediaRecorder Audio Stream
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (audioBlob.size > 0) {
            await sendAudioToBackend(audioBlob);
          }
        };

        mediaRecorder.start();
        setIsListening(true);
      }
    } catch (err: any) {
      console.warn("MediaRecorder mic access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      }
    }

    // 2. Initiate SpeechRecognition for real-time live preview feedback (if supported)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          let currentText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setTranscript(currentText);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition warning:", event.error);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition init warning:", err);
      }
    }

    // Auto stop after 5 seconds of recording
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 5000);
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else if (transcript.trim()) {
      handleFinalResult(transcript, "");
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setIsListening(false);
  };

  const sendAudioToBackend = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        try {
          const res = await fetch(getApiUrl("/api/voice/transcribe"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: base64Audio,
              text: transcript,
              language: selectedLang.split("-")[0],
            }),
          });

          const data = await res.json();
          const finalResult = data.query || data.rawText || transcript;
          handleFinalResult(finalResult, data.rawText);
        } catch (err) {
          handleFinalResult(transcript, transcript);
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setIsProcessing(false);
      handleFinalResult(transcript, transcript);
    }
  };

  const handleFinalResult = (queryResult: string, rawSpoken?: string) => {
    const clean = (queryResult || rawSpoken || "").trim();
    if (!clean) {
      toast.info("No speech detected. Please try speaking clearly into the mic.");
      setIsListening(false);
      setIsProcessing(false);
      return;
    }

    setProcessedQuery(clean);
    toast.success(`Voice recognized: "${clean}"`);

    setTimeout(() => {
      onOpenChange(false);
      if (onQueryComplete) {
        onQueryComplete(clean);
      } else {
        setLocation(`/products?search=${encodeURIComponent(clean)}`);
      }
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border shadow-2xl rounded-3xl p-6">
        <DialogHeader className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              Multilingual Voice Search
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Speak naturally in English, Telugu, or Hindi to find fresh farm produce.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Language Selector Pills */}
          <div className="flex items-center justify-center gap-2 bg-accent/40 p-1.5 rounded-2xl border">
            {(["en-IN", "te-IN", "hi-IN"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedLang === lang
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <span>{langLabels[lang].flag}</span>
                <span>{langLabels[lang].name.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Pulse Microphone Audio Visualizer Area */}
          <div className="flex flex-col items-center justify-center py-6 relative">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="absolute -inset-8 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${
                  isListening
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white scale-105"
                    : "bg-muted text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-9 h-9 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-9 h-9 animate-bounce" />
                ) : (
                  <MicOff className="w-9 h-9" />
                )}
              </button>
            </div>

            <div className="mt-4 text-center space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${isListening ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {isProcessing ? "Transcribing Voice..." : isListening ? `Listening in ${langLabels[selectedLang].name}...` : "Tap Mic to Speak"}
              </span>
              <p className="text-[11px] text-muted-foreground italic font-mono">
                {langLabels[selectedLang].sample}
              </p>
            </div>
          </div>

          {/* Live Transcript Display Box */}
          <div className="bg-accent/30 border rounded-2xl p-4 text-center min-h-[70px] flex items-center justify-center">
            {processedQuery ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Check className="w-4 h-4 shrink-0" />
                <span>Searching: "{processedQuery}"</span>
              </div>
            ) : transcript ? (
              <p className="text-sm font-semibold text-foreground tracking-wide">
                "{transcript}"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Say item names like <span className="font-semibold text-emerald-600">"టమోటా"</span>, <span className="font-semibold text-emerald-600">"टमाटर"</span> or <span className="font-semibold text-emerald-600">"Spinach"</span>
              </p>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t">
            <span className="flex items-center gap-1 font-mono">
              <Globe className="w-3.5 h-3.5 text-emerald-600" /> Faster-Whisper AI Engine
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

