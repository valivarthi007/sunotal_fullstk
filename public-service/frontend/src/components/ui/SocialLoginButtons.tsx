import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Loader2, Settings, ShieldCheck, Key, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  className?: string;
}

export function SocialLoginButtons({ onSuccess, className = "" }: SocialLoginButtonsProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeConfigProvider, setActiveConfigProvider] = useState<"google" | "facebook" | "apple" | null>(null);

  // Saved Client IDs from localStorage or env
  const [googleClientId, setGoogleClientId] = useState(
    () => localStorage.getItem("VITE_GOOGLE_CLIENT_ID") || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || ""
  );
  const [facebookAppId, setFacebookAppId] = useState(
    () => localStorage.getItem("VITE_FACEBOOK_APP_ID") || (import.meta as any).env?.VITE_FACEBOOK_APP_ID || ""
  );
  const [appleServicesId, setAppleServicesId] = useState(
    () => localStorage.getItem("VITE_APPLE_CLIENT_ID") || (import.meta as any).env?.VITE_APPLE_CLIENT_ID || ""
  );

  const saveCredentials = () => {
    if (googleClientId) localStorage.setItem("VITE_GOOGLE_CLIENT_ID", googleClientId);
    if (facebookAppId) localStorage.setItem("VITE_FACEBOOK_APP_ID", facebookAppId);
    if (appleServicesId) localStorage.setItem("VITE_APPLE_CLIENT_ID", appleServicesId);

    toast.success("OAuth Credentials Saved", {
      description: "You can now use real Google, Facebook, and Apple sign-in.",
    });
    setShowConfigModal(false);
  };

  const handleSocialAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoadingProvider(provider);
    const redirectUri = window.location.origin;

    let clientId = "";
    if (provider === "google") clientId = googleClientId;
    else if (provider === "facebook") clientId = facebookAppId;
    else if (provider === "apple") clientId = appleServicesId;

    if (!clientId) {
      setActiveConfigProvider(provider);
      setShowConfigModal(true);
      setLoadingProvider(null);
      toast.error(`Missing ${provider.toUpperCase()} Credentials`, {
        description: `Please enter your ${provider.toUpperCase()} Client ID to initiate OAuth login.`,
      });
      return;
    }

    try {
      let authUrl = "";
      if (provider === "google") {
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=token%20id_token&scope=openid%20profile%20email&prompt=consent`;
      } else if (provider === "facebook") {
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=email,public_profile&response_type=token`;
      } else if (provider === "apple") {
        authUrl = `https://appleid.apple.com/auth/authorize?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code%20id_token&response_mode=fragment&scope=name%20email`;
      }

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        `${provider}_oauth`,
        `width=${width},height=${height},top=${top},left=${left}`
      );

      toast.info(`Opening ${provider.toUpperCase()} Consent Screen...`, {
        description: "Complete login in the popup window.",
      });

      // Poll for popup closing or message response
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setLoadingProvider(null);
        }
      }, 1000);
    } catch (err: any) {
      toast.error("Social Sign-in Error", {
        description: err.message || "Failed to open OAuth popup window.",
      });
      setLoadingProvider(null);
    }
  };

  // Listen for OAuth postMessage or Hash Token redirects
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "OAUTH_RESPONSE") {
        const { provider, socialId, email, name, avatarUrl } = event.data;
        if (email && provider) {
          try {
            const res = await fetch("/api/auth/social-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider, socialId, email, name, avatarUrl }),
            });
            const data = await res.json();
            if (data.token) {
              localStorage.setItem("sunotal_token", data.token);
              queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
              toast.success(`Signed in via ${provider.toUpperCase()}`);
              if (onSuccess) onSuccess();
              else setLocation("/");
            }
          } catch (err: any) {
            toast.error("Authentication failed: " + err.message);
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, setLocation, queryClient]);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-slate-500 font-medium tracking-wider">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {/* Google Button */}
        <button
          type="button"
          disabled={!!loadingProvider}
          onClick={() => handleSocialAuth("google")}
          className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>Google</span>
        </button>

        {/* Facebook Button */}
        <button
          type="button"
          disabled={!!loadingProvider}
          onClick={() => handleSocialAuth("facebook")}
          className="flex items-center justify-center gap-2 py-2.5 px-3 border border-blue-600/30 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
        >
          {loadingProvider === "facebook" ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span>Facebook</span>
        </button>

        {/* Apple Button */}
        <button
          type="button"
          disabled={!!loadingProvider}
          onClick={() => handleSocialAuth("apple")}
          className="flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-800 rounded-xl text-xs font-semibold text-white bg-slate-950 hover:bg-slate-900 transition-all shadow-sm disabled:opacity-50"
        >
          {loadingProvider === "apple" ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-.99 2.96 1.07.08 2.16-.56 2.81-1.36z" />
            </svg>
          )}
          <span>Apple</span>
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <button
          type="button"
          onClick={() => {
            setActiveConfigProvider(null);
            setShowConfigModal(true);
          }}
          className="hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium underline underline-offset-2 transition-colors"
        >
          <Settings className="w-3 h-3" />
          Configure OAuth API Keys (Google / FB / Apple)
        </button>

        <span className="text-[10px] text-slate-400 font-mono">OAuth 2.0</span>
      </div>

      {/* OAuth Configuration Dialog */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[550px] bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Key className="w-5 h-5 text-emerald-600" />
              Production OAuth 2.0 Credentials
            </DialogTitle>
            <DialogDescription>
              Enter your domain OAuth Client IDs below. Once configured, clicking Google, Facebook, or Apple will launch real sign-in popup windows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Google Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Google Client ID (<code className="text-emerald-600">VITE_GOOGLE_CLIENT_ID</code>)</span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  Google Console <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                placeholder="1234567890-xyz.apps.googleusercontent.com"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            {/* Facebook Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Facebook App ID (<code className="text-blue-600">VITE_FACEBOOK_APP_ID</code>)</span>
                <a
                  href="https://developers.facebook.com/apps/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  Meta for Developers <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                placeholder="1092837465019283"
                value={facebookAppId}
                onChange={(e) => setFacebookAppId(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            {/* Apple Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Apple Service ID (<code className="text-slate-800 dark:text-slate-200">VITE_APPLE_CLIENT_ID</code>)</span>
                <a
                  href="https://developer.apple.com/account/resources/identifiers/list/serviceId"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  Apple Developer Portal <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </Label>
              <Input
                placeholder="com.sunotal.grocery.signin"
                value={appleServicesId}
                onChange={(e) => setAppleServicesId(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfigModal(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={saveCredentials}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 rounded-xl px-4"
            >
              <ShieldCheck className="w-4 h-4" /> Save OAuth Keys
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
