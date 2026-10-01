import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, Globe, Sparkles, Loader2, Check, Square, Volume2 } from "lucide-react";
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
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

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
      setRecordingSeconds(0);
    }
    return () => cleanupAudio();
  }, [open]);

  const cleanupAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
    setRecordingSeconds(0);

    // 1. Request Microphone Stream
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
          await sendAudioToBackend(audioBlob);
        };

        // Start recording with 250ms timeslice chunks
        mediaRecorder.start(250);
        setIsListening(true);

        // Timer for recording length (Max 8s)
        let seconds = 0;
        timerRef.current = setInterval(() => {
          seconds += 1;
          setRecordingSeconds(seconds);
          if (seconds >= 8) {
            stopListening();
          }
        }, 1000);
      } else {
        toast.error("Microphone access is not supported in this browser environment.");
      }
    } catch (err: any) {
      console.warn("MediaRecorder mic access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        toast.error("Microphone permission denied. Please click the mic icon and allow access in your browser address bar.");
      } else {
        toast.error("Unable to access microphone. Please check system settings.");
      }
      setIsListening(false);
    }

    // 2. Web Speech Recognition API (as immediate text preview feedback)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = selectedLang;

        recognition.onresult = (event: any) => {
          let currentText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setTranscript(currentText);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("SpeechRecognition init warning:", err);
      }
    }
  };

  const stopListening = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
      let base64Audio = "";
      if (audioBlob && audioBlob.size > 0) {
        base64Audio = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => resolve(reader.result as string);
        });
      }

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

  const handleFinalResult = (queryResult: string, rawSpoken?: string) => {
    const clean = (queryResult || rawSpoken || "").trim();
    if (!clean) {
      toast.info("No speech detected. Please tap the mic button and speak clearly into your microphone.");
      setIsListening(false);
      setIsProcessing(false);
      return;
    }

    setProcessedQuery(clean);
    toast.success(`Voice Recognized: "${clean}"`);

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
            <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />
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
                onClick={() => {
                  setSelectedLang(lang);
                  if (isListening) stopListening();
                }}
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
          <div className="flex flex-col items-center justify-center py-4 relative">
            <div className="relative">
              {isListening && (
                <>
                  <div className="absolute -inset-4 rounded-full bg-emerald-500/30 animate-ping" />
                  <div className="absolute -inset-8 rounded-full bg-emerald-500/15 animate-pulse" />
                </>
              )}
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl ${
                  isListening
                    ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white scale-105 shadow-emerald-500/50"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:scale-105 border-2 border-emerald-500/30"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-10 h-10 animate-bounce text-white" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>
            </div>

            <div className="mt-5 text-center space-y-1">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${isListening ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing Speech...
                  </>
                ) : isListening ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Listening ({recordingSeconds}s)... Speak Now
                  </>
                ) : (
                  "Tap Microphone to Speak"
                )}
              </span>
              <p className="text-[11px] text-muted-foreground italic font-mono">
                {langLabels[selectedLang].sample}
              </p>
            </div>

            {/* Explicit Action Buttons & Quick Test Chips */}
            {isListening ? (
              <Button
                type="button"
                onClick={stopListening}
                className="mt-3 bg-rose-600 hover:bg-rose-700 text-white text-xs rounded-xl px-4 py-1.5 flex items-center gap-1.5 shadow-md"
              >
                <Square className="w-3.5 h-3.5 fill-white" /> Stop & Search
              </Button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
                <span className="text-[10px] font-bold text-muted-foreground w-full text-center">Quick Tap Samples:</span>
                {[
                  { label: "టమోటా (Tomato)", query: "టమోటా" },
                  { label: "పాలకూర (Spinach)", query: "పాలకూర" },
                  { label: "टमाटर", query: "टमाटर" },
                  { label: "palakura", query: "palakura" },
                  { label: "Fresh Mango", query: "Mango" }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFinalResult(chip.query, chip.query)}
                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-600/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    📍 {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Transcript Display Box */}
          <div className="bg-accent/30 border rounded-2xl p-4 text-center min-h-[70px] flex items-center justify-center">
            {processedQuery ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <Check className="w-4 h-4 shrink-0" />
                <span>Searching: "{processedQuery}"</span>
              </div>
            ) : transcript ? (
              <p className="text-sm font-semibold text-foreground tracking-wide flex items-center justify-center gap-1.5">
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
                "{transcript}"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Say item names in Telugu <span className="font-semibold text-emerald-600">"పాలకూర" / "టమోటా"</span>, Hindi <span className="font-semibold text-emerald-600">"टमाटर" / "पालक"</span> or English <span className="font-semibold text-emerald-600">"Fresh Spinach"</span>
              </p>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground border-t">
            <span className="flex items-center gap-1 font-mono">
              <Globe className="w-3.5 h-3.5 text-emerald-600" /> Faster-Whisper + IndicASR Engine
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


