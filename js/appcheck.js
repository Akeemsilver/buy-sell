/* Firebase App Check: Firebase then answers only requests that come from this real app and store page (a quick automatic reCAPTCHA check),
   not scripts that copy the public Firebase keys. It switches itself on when SITE_KEY below holds the reCAPTCHA v3 site key made in
   Firebase console > App Check; while it is empty nothing changes. Turn on "Enforce" in the console only after the key is in and the app has run once. */
(function (root) {
  const SITE_KEY = '';
  const FILE = 'vendor/firebase/firebase-app-check-compat.js';
  // Loads the App Check part of the Firebase code (only when a key is set).
  const load = () => new Promise((ok) => {
    if (!SITE_KEY) return ok(false);
    const s = document.createElement('script'); s.src = FILE; s.onload = () => ok(true); s.onerror = () => ok(false); document.head.appendChild(s);
  });
  // Call right after firebase.initializeApp and before anything uses Firestore or Storage.
  const activate = (fb) => { if (!SITE_KEY || !fb || !fb.appCheck) return false; try { fb.appCheck().activate(SITE_KEY, true); return true; } catch (e) { return false; } };
  root.AppCheckKit = { enabled: !!SITE_KEY, load, activate };
})(typeof window !== 'undefined' ? window : this);
