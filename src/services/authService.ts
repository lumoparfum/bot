import type { ApplicationVerifier, ConfirmationResult } from 'firebase/auth';
import { signInWithPhoneNumber } from 'firebase/auth';
import { auth } from './firebase';

// TODO: sendOtp needs a reCAPTCHA-compatible ApplicationVerifier to actually
// call Firebase. Decide how phone verification will run on native (custom
// WebView reCAPTCHA vs. @react-native-firebase/auth) before wiring this up
// from AuthScreen.
export function sendOtp(
  phoneNumber: string,
  verifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export function confirmOtp(confirmation: ConfirmationResult, code: string) {
  return confirmation.confirm(code);
}
