'use client';

import supabase from '@/lib/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useLoginModal } from '@/context/LoginModalContext';
import ErrorBoundary from './ErrorBoundary';
import LottiePlayer from '@/components/LottiePlayer';

interface LoginModalProps {
  onClose?: () => void;
}

interface ValidationState {
  email: { isValid: boolean; message: string };
  password: { isValid: boolean; message: string };
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    email: { isValid: false, message: '' },
    password: { isValid: false, message: '' }
  });
  const [touched, setTouched] = useState({ email: false, password: false });
  
  const { setShowLoginModal } = useLoginModal();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return { isValid: false, message: '' };
    }
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Ugyldig e-postformat' };
    }
    return { isValid: true, message: '' };
  };

  const validatePassword = (password: string) => {
    if (!password) {
      return { isValid: false, message: '' };
    }
    if (password.length < 4) {
      return { isValid: false, message: 'Passord må være minst 4 tegn' };
    }
    return { isValid: true, message: '' };
  };

  // Update validation when inputs change
  useEffect(() => {
    setValidation(prev => ({
      ...prev,
      email: validateEmail(email)
    }));
  }, [email]);

  useEffect(() => {
    setValidation(prev => ({
      ...prev,
      password: validatePassword(password)
    }));
  }, [password]);

  // Click outside to close modal
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        if (setShowLoginModal) {
          setShowLoginModal(false);
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      }
    },
    [onClose, setShowLoginModal]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
    };
  }, [handleClickOutside]);

  const handleClose = () => {
    if (setShowLoginModal) {
      setShowLoginModal(false);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
  };

  // Main login function
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Login form submitted');

    if (!supabase) {
      setError('Supabase er ikke initialisert.');
      return;
    }

    // Validate fields
    if (!validation.email.isValid || !validation.password.isValid) {
      setTouched({ email: true, password: true });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', { email });

      // Direct Supabase login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase sign-in result:', { signInData, signInError });

      if (signInError) {
        setError('Innlogging feilet: ' + signInError.message);
        return;
      }

      // Get session
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      console.log('Session obtained:', { userId });

      if (!userId) {
        setError('Kunne ikke hente session etter innlogging.');
        return;
      }

      // Get user profile
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      console.log('Profile fetched:', { profile, profErr });

      if (profErr || !profile) {
        setError('Bruker mangler profil. Kontakt support.');
        return;
      }

      console.log('Login successful! Redirecting...');

      // Close modal
      if (setShowLoginModal) {
        setShowLoginModal(false);
      }
      if (typeof onClose === 'function') {
        onClose();
      }

      // Redirect based on role
      if (profile.role === 'business_user') {
        router.push('/bedrift-dashboard');
      } else {
        router.push('/privat-dashboard');
      }

    } catch (error) {
      console.error('Login error:', error);
      setError('En feil oppstod under innlogging.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] transition-all duration-300">
        <div
          ref={modalRef}
          className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-6xl mx-4 flex flex-col md:flex-row overflow-hidden shadow-2xl border border-white/20 transform transition-all duration-300 scale-100"
        >
          {/* Left Section: Lottie Animation and Welcome Text with Gradient */}
          <div className="md:w-1/2 bg-gradient-to-br from-[#0009e2] via-[#0007b8] to-[#0005a0] p-8 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <LottiePlayer 
                src="/lottie/Outbound_integrations.json" 
                className="w-[600px] h-[600px] object-contain"
              />
            </div>
            <h5 className="relative z-10 text-xl font-semibold text-white text-center mt-auto">
              Velkommen tilbake til Anbudsmarkedet!
            </h5>
          </div>

          {/* Right Section: Form */}
          <div className="md:w-1/2 p-8 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0009e2]/50 backdrop-blur-sm"
              aria-label="Lukk modal"
            >
              <X size={20} />
            </button>
            
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Logg inn</h1>
                <p className="text-gray-600 text-sm">Velkommen tilbake! Fyll inn dine opplysninger.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl text-center">
                    {error}
                  </div>
                )}
                
                {/* Email Field */}
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    E-post
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      required
                      autoComplete="email"
                      placeholder="din@epost.no"
                      disabled={loading}
                      className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-[#0009e2]/20 focus:border-[#0009e2] disabled:opacity-50 disabled:cursor-not-allowed ${
                        touched.email && !validation.email.isValid
                          ? 'border-red-300 bg-red-50'
                          : touched.email && validation.email.isValid
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-white'
                      }`}
                      autoFocus
                    />
                    {touched.email && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {validation.email.isValid ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <XCircle size={20} className="text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {touched.email && validation.email.message && !validation.email.isValid && (
                    <p className="text-xs mt-1 text-red-600">
                      {validation.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Passord
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={handlePasswordBlur}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      disabled={loading}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl transition-all duration-200 outline-none focus:ring-2 focus:ring-[#0009e2]/20 focus:border-[#0009e2] disabled:opacity-50 disabled:cursor-not-allowed ${
                        touched.password && !validation.password.isValid
                          ? 'border-red-300 bg-red-50'
                          : touched.password && validation.password.isValid
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-white'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                      {touched.password && (
                        validation.password.isValid ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-500" />
                        )
                      )}
                      <button
                        type="button"
                        onClick={togglePassword}
                        disabled={loading}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50"
                        aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {touched.password && validation.password.message && !validation.password.isValid && (
                    <p className="text-xs mt-1 text-red-600">
                      {validation.password.message}
                    </p>
                  )}
                </div>

                {/* Remember me and Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 text-[#0009e2] focus:ring-[#0009e2] border-gray-300 rounded transition-colors duration-200 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-600">Husk meg</span>
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-[#0009e2] hover:text-[#0007b8] hover:underline transition-colors duration-200"
                    onClick={() => localStorage.setItem('Email', email)}
                  >
                    Glemt passord?
                  </Link>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !validation.email.isValid || !validation.password.isValid}
                  className="w-full bg-gradient-to-r from-[#0009e2] to-[#0007b8] text-white py-3 rounded-xl font-semibold hover:from-[#0007b8] hover:to-[#0005a0] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#0009e2]/50 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Logger inn...
                    </span>
                  ) : (
                    'Logg inn'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}