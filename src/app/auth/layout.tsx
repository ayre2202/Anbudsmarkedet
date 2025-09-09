import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white relative">
      {/* Separate div for the back link */}
      <div className="absolute left-20 top-4">
        <Link
          href="/"
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tilbake til hjemmesiden
        </Link>
      </div>

      {/* Centered login form */}
      <div className="w-full max-w-md px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto w-full">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            {productName}
          </h2>
        </div>

        <div className="mt-8 mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}