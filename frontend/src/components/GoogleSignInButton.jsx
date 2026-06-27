import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentity, GOOGLE_CLIENT_ID } from '../utils/google.js';

// Renders the official Google sign-in button. Hidden entirely when Google is not
// configured (no VITE_GOOGLE_CLIENT_ID) or the script fails to load — we never
// show a fake/broken Google option. On success it hands the ID token (credential)
// to onCredential; the backend re-verifies it.
const GoogleSignInButton = ({ onCredential, onError }) => {
  const ref = useRef(null);
  const [available, setAvailable] = useState(Boolean(GOOGLE_CLIENT_ID));

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !ref.current) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response?.credential) onCredential(response.credential);
          },
        });
        google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          width: ref.current.offsetWidth || 320,
          text: 'continue_with',
          shape: 'pill',
          locale: 'sq',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAvailable(false);
        onError?.();
      });

    return () => { cancelled = true; };
  }, [onCredential, onError]);

  if (!available) return null;
  return <div ref={ref} className="flex w-full justify-center" />;
};

export default GoogleSignInButton;
