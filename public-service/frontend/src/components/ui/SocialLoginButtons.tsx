import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  className?: string;
}

export function SocialLoginButtons({ onSuccess, className = "" }: SocialLoginButtonsProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialAuth = async (provider: "google" | "facebook" | "apple") => {
    setLoadingProvider(provider);
    try {
      // Demo Social Accounts Simulation
      let socialData = {
        provider,
        socialId: `${provider}_id_${Math.floor(100000 + Math.random() * 900000)}`,
        email: `${provider}.user@gmail.com`,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}_user`,
      };

      if (provider === "facebook") {
        socialData.email = "facebook.member@sunotal.com";
        socialData.name = "Alex Mercer (FB)";
      } else if (provider === "apple") {
        socialData.email = "privaterelay.appleid@apple.com";
        socialData.name = "Jordan Lee";
      }

      const res = await fetch("/api/auth/social-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socialData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Social authentication failed");
      }

      if (data.token) {
        localStorage.setItem("sunotal_token", data.token);
      }

      queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      toast.success(`Successfully signed in via ${provider.toUpperCase()}`, {
        description: `Welcome back, ${data.user?.name || socialData.name}!`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        setLocation("/");
      }
    } catch (err: any) {
      toast.error("Social Sign-in Failed", {
        description: err.message || "Could not complete social authentication.",
      });
    } finally {
      setLoadingProvider(null);
    }
  };

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
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
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
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.81 1.44-.61.71-1.15 1.86-.99 2.96 1.07.08 2.16-.56 2.81-1.36z" />
            </svg>
          )}
          <span>Apple</span>
        </button>
      </div>
    </div>
  );
}
