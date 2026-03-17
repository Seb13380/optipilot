// ─── Gestionnaire de sécurité opticien ────────────────────────────────────────
// Code PIN 4 chiffres stocké dans localStorage.
// État verrouillé/déverrouillé stocké en sessionStorage (perdu à la fermeture du navigateur).

const PIN_KEY = "optipilot_pin";
const LOCK_KEY = "optipilot_locked";
export const DEFAULT_PIN = "1234";

/** Récupère le PIN stocké (défaut : 1234) */
export function getStoredPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN;
  return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
}

/** Retourne true si un PIN personnalisé a été défini */
export function isPinConfigured(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PIN_KEY) !== null;
}

/** Retourne true si la session est verrouillée */
export function isSessionLocked(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(LOCK_KEY) === "1";
}

/** Verrouille la session (opticien passe la tablette au client) */
export function lockSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(LOCK_KEY, "1");
  }
}

/** Déverrouille la session après PIN correct */
export function unlockSession(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(LOCK_KEY);
  }
}

/** Vérifie le PIN saisi */
export function checkPin(input: string): boolean {
  return input === getStoredPin();
}

/** Enregistre un nouveau PIN (après confirmation) */
export function savePin(newPin: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PIN_KEY, newPin);
    // Synchroniser la clé legacy utilisée par la page client
    localStorage.setItem("optipilot_client_pin", newPin);
  }
}
