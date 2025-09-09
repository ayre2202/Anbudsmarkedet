'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Lottie from 'lottie-react';
import ReCAPTCHA from 'react-google-recaptcha';
import kontaktAnimasjon from '@/assets/kontakt-animasjon.json';

export default function KontaktOss() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Initialize reCAPTCHA on mount
  useEffect(() => {
    if (recaptchaRef.current && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      recaptchaRef.current.reset();
      setRecaptchaToken(null);
      recaptchaRef.current.executeAsync().then((token) => {
        setRecaptchaToken(token);
      }).catch(() => {
        setError('Kunne ikke initialisere reCAPTCHA. Prøv igjen senere.');
      });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRecaptcha = useCallback((token: string | null) => {
    setRecaptchaToken(token);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitted(false);

    // Check if reCAPTCHA is available
    if (!recaptchaRef.current) {
      setError('reCAPTCHA er ikke tilgjengelig. Prøv å laste siden på nytt.');
      setLoading(false);
      return;
    }

    // Generate a fresh reCAPTCHA token
    try {
      const token = await recaptchaRef.current.executeAsync();
      setRecaptchaToken(token);
      if (!token) {
        setError('Kunne ikke hente reCAPTCHA-token. Prøv igjen.');
        setLoading(false);
        return;
      }
    } catch {
      setError('Kunne ikke fullføre reCAPTCHA. Prøv igjen.');
      setLoading(false);
      return;
    }

    // Verify reCAPTCHA token
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
        setError(data.error || 'reCAPTCHA-verifisering feilet. Prøv igjen.');
        setLoading(false);
        return;
      }

      // Proceed with form submission
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSubmitted(true);
        setForm({ name: '', email: '', phone: '', message: '' });
      } else {
        const data = await res.json();
        setError(data.error || 'Noe gikk galt. Prøv igjen.');
      }
    } catch (e) {
      setError('Noe gikk galt under reCAPTCHA-verifisering eller sending.');
    } finally {
      setLoading(false);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        // Regenerate token for the next submission
        recaptchaRef.current.executeAsync().then((token) => {
          setRecaptchaToken(token);
        }).catch(() => {
          setError('Kunne ikke regenerere reCAPTCHA-token. Prøv igjen senere.');
        });
      }
    }
  };

  const inputClass =
    'w-full border-2 border-gray-400 p-2 rounded transition focus:border-[#0009e2] focus:ring-2 focus:ring-[#0009e2] focus:outline-none';

  return (
    <div className="min-h-[70vh] flex items-start justify-center bg-gray-50 py-4 px-4">
      <div className="max-w-5xl w-full bg-white shadow-lg rounded-2xl p-8 flex flex-col">
        {/* Topptekst */}
        <div className="mb-5 w-full text-center px-2">
          <h1 className="text-4xl font-bold text-[#0009e2] mb-3 leading-tight">
            Kontakt oss
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-3">
            Har du spørsmål, forslag eller trenger hjelp? Vårt team svarer deg alltid så raskt som mulig.
            Bruk skjemaet under for generelle henvendelser, samarbeid, support eller tilbakemeldinger.
          </p>
          <p className="text-base text-gray-600 max-w-2xl mx-auto mb-6">
            Vi setter pris på alle tilbakemeldinger – enten du har spørsmål om tjenesten, ønsker samarbeid, eller har forslag til forbedringer.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-[#0009e2]">
              <Mail size={18} />
              <span>post@anbudsmarkedet.no</span>
            </div>
            <div className="flex items-center gap-2 text-[#0009e2]">
              <Phone size={18} />
              <span>22 08 60 00</span>
            </div>
            <div className="flex items-center gap-2 text-[#0009e2]">
              <MapPin size={18} />
              <span>Karl Johans gate 1, 0154 Oslo</span>
            </div>
          </div>
        </div>
        {/* Innholdsrad: Lottie + skjema */}
        <div className="flex flex-col md:flex-row gap-8 items-end">
          {/* Lottie-animasjon */}
          <div
            className="flex-1 flex justify-center items-end self-end"
            style={{
              marginTop: '-68px',
            }}
          >
            <Lottie
              animationData={kontaktAnimasjon}
              loop
              style={{ width: 440, height: 440, maxWidth: '100%' }}
            />
          </div>
          {/* Skjema */}
          <div className="flex-1 w-full flex items-end">
            <form onSubmit={handleSubmit} className="space-y-4 w-full">
              <input
                type="text"
                name="name"
                placeholder="Navn"
                required
                value={form.name}
                onChange={handleChange}
                className={inputClass}
              />
              <input
                type="email"
                name="email"
                placeholder="E-post"
                required
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
              <input
                type="tel"
                name="phone"
                placeholder="Telefon"
                required
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
              />
              <textarea
                name="message"
                placeholder="Hva gjelder henvendelsen?"
                required
                rows={4}
                value={form.message}
                onChange={handleChange}
                className={inputClass + ' resize-none'}
              />
              {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? (
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  onChange={handleRecaptcha}
                  size="invisible"
                />
              ) : (
                <p className="text-red-600 text-sm text-center">
                  reCAPTCHA-nøkkel mangler. Kontakt support.
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0009e2] text-white py-2 rounded font-bold hover:bg-[#0007b8] transition flex items-center justify-center gap-2"
              >
                <Send size={18} />{loading ? 'Sender...' : 'Send melding'}
              </button>
              {error && (
                <div className="text-red-600 text-sm text-center mt-2">
                  {error}
                </div>
              )}
              {submitted && (
                <div className="text-green-600 text-sm text-center mt-2">
                  Takk for din henvendelse! Vi svarer deg så snart som mulig.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}