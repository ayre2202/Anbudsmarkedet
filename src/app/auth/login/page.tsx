'use client';

import supabase from '@/lib/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { X } from 'lucide-react';

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Initialize reCAPTCHA
  useEffect(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
      setRecaptchaToken(null);
      recaptchaRef.current.executeAsync().then((token) => {
        setRecaptchaToken(token);
      }).catch(() => {});
    }
  }, []);

  // Handle click outside to close modal
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      router.back(); // Go back to previous page, or home if no history
    }
  }, [router]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  const handleRecaptcha = useCallback((token: string | null) => {
    setRecaptchaToken(token);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase er ikke initialisert.');
      return;
    }
    setLoading(true);
    setError(null);

    if (recaptchaRef.current) {
      try {
        const token = await recaptchaRef.current.executeAsync();
        setRecaptchaToken(token);
        if (!token) {
          setError('Kunne ikke hente reCAPTCHA-token.');
          setLoading(false);
          return;
        }
      } catch {
        setError('Kunne ikke fullføre reCAPTCHA.');
        setLoading(false);
        return;
      }
    } else {
      setError('reCAPTCHA er ikke tilgjengelig.');
      setLoading(false);
      return;
    }

    if (!recaptchaToken) {
      setError('Vennligst fullfør reCAPTCHA.');
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('/api/auth/callback/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: recaptchaToken }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError('Ugyldig svar fra serveren under reCAPTCHA-verifisering.');
        setLoading(false);
        return;
      }

      if (!data.success) {
        setError(data.error || 'reCAPTCHA-verifisering feilet.');
        setLoading(false);
        return;
      }

      await performLogin();
    } catch {
      setError('En feil oppstod under reCAPTCHA-verifisering.');
      setLoading(false);
    }
  };

  const performLogin = async () => {
    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('Innlogging feilet: ' + signInError.message);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) {
        setError('Kunne ikke hente session etter innlogging.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (profErr || !profile) {
        setError('Bruker mangler profil. Kontakt support.');
        setLoading(false);
        return;
      }

      if (profile.role === 'business_user') {
        router.push('/bedrift-dashboard');
      } else {
        router.push('/privat-dashboard');
      }
    } catch {
      setError('En feil oppstod under innlogging.');
      setLoading(false);
    } finally {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="bg-white p-8 rounded-lg w-full max-w-[600px] max-h-[600px] overflow-auto shadow-xl relative"
        ref={modalRef}
      >
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-full transition"
        >
          <X size={20} className="text-gray-500" />
        </button>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Eksisterende brukere, logg inn.
          </h2>
          <form
            onSubmit={handleLoginSubmit}
            className="flex flex-col gap-4"
            id="login-form"
          >
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <input
              type="text"
              name="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:border-[#0009e2] focus:ring-[#0009e2]"
              placeholder="E-post"
            />
            <input
              type="password"
              name="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:border-[#0009e2] focus:ring-[#0009e2]"
              placeholder="Passord"
            />
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
              onChange={handleRecaptcha}
              size="invisible"
            />
            <button
              type="submit"
              className="w-full bg-[#0009e2] hover:bg-[#0007b8] text-white py-2 px-4 rounded-md disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Laster...' : 'Logg inn'}
            </button>
          </form>
          <Link
            href="/auth/forgot-password"
            className="text-[#0009e2] hover:underline text-sm"
          >
            Glemt passord?
          </Link>
        </div>
      </div>
    </div>
  );
}