'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'

const LottiePlayer = dynamic(() => import('@/components/LottiePlayer'), {
  ssr: false
})

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf6f5] px-4">
      <div className="flex flex-col md:flex-row items-center justify-center max-w-6xl mx-auto w-full">
        {/* Lottie Animation - Venstre side med margin og større */}
        <div className="w-full md:w-1/2 mb-8 md:mr-16">
          <LottiePlayer 
            src="/lottie/404.json"
            className="w-full h-full"
            style={{ maxWidth: '120%', objectFit: 'contain' }}
          />
        </div>
        
        {/* Text Content - Høyre side med margin */}
        <div className="w-full md:w-1/2 text-center md:text-left md:ml-16">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0009e2] mb-4">
            Siden ble ikke funnet
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8">
            Beklager, vi kunne ikke finne siden du leter etter. Den kan ha blitt flyttet eller slettet.
          </p>
          
          <Link
            href="/"
            className="inline-block bg-[#0009e2] text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-[#0007b8] transition-colors shadow-lg"
          >
            Tilbake til forsiden
          </Link>
        </div>
      </div>
    </div>
  )
}