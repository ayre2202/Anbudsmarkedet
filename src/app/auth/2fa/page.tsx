'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase/client'; // BRUK DENNE!
import { MFAVerification } from '@/components/MFAVerification';

export default function TwoFactorAuthPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        checkMFAStatus();
        // eslint-disable-next-line
    }, []);

    const checkMFAStatus = async () => {
        try {
            const { data: { user }, error: sessionError } = await supabase.auth.getUser();
            if (sessionError || !user) {
                router.push('/auth/login');
                return;
            }

            // MFA nivå sjekk (dette må kanskje tilpasses avhengig av din supabase versjon og plugin)
            // Hvis du bruker supabase-js v2 og har enabled mfa extension:
            // @ts-ignore (kan trenge type fixing avhengig av SDK)
            const { data: aal, error: aalError } = await (supabase.auth as any).mfa.getAuthenticatorAssuranceLevel();

            if (aalError) throw aalError;

            if (aal?.currentLevel === 'aal2' || aal?.nextLevel === 'aal1') {
                router.push('/app');
                return;
            }

            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setLoading(false);
        }
    };

    const handleVerified = () => {
        router.push('/app');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center">
                <div className="text-red-600">{error}</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            <MFAVerification onVerified={handleVerified} />
        </div>
    );
}
