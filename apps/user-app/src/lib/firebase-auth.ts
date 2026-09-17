import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDHdzv85TjjDDRqK3do4LaBpeLdq4fR6E4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sunotal-grocery.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sunotal-grocery",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sunotal-grocery.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "300250905313",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:300250905313:web:2977dfc120c482e35155a0",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Initialize RecaptchaVerifier and send Phone SMS OTP (10,000 Free SMS/mo)
 */
export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  containerId: string = "recaptcha-container"
): Promise<ConfirmationResult> {
  try {
    if (!recaptchaVerifier) {
      recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: "invisible",
        callback: () => {
          console.log("🔒 Firebase reCAPTCHA verified");
        },
      });
    }

    const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    console.log(`📱 Firebase SMS OTP sent to ${formattedPhone}`);
    return confirmationResult;
  } catch (error: any) {
    console.error("❌ Firebase OTP Send Error:", error?.message || error);
    throw error;
  }
}

/**
 * Verify 6-Digit Phone OTP Code entered by User
 */
export async function confirmFirebasePhoneOtp(
  confirmationResult: ConfirmationResult,
  otpCode: string
) {
  try {
    const userCredential = await confirmationResult.confirm(otpCode);
    console.log("✅ Firebase Phone OTP Verified successfully");
    return userCredential.user;
  } catch (error: any) {
    console.error("❌ Invalid OTP Code:", error?.message || error);
    throw new Error("Invalid or expired 6-digit OTP code");
  }
}
