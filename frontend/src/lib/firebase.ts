// Firebase is optional in this environment.
// This placeholder keeps TypeScript builds passing when Firebase SDK is unavailable.

type FirebasePlaceholder = {
  unavailable: true;
};

const app: FirebasePlaceholder = { unavailable: true };
export const db: FirebasePlaceholder = app;
export const auth: FirebasePlaceholder = app;

export default app;
