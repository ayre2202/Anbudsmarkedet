'use client'

import { MessageCircle, HelpCircle } from 'lucide-react'

export default function FAQPage() {
  return (
    <div className="max-w-2xl mx-auto pt-16 pb-20 px-4">
      <div className="mb-10 text-center">
        <HelpCircle size={48} className="mx-auto mb-2 text-[#0009e2]" />
        <h1 className="text-3xl font-extrabold text-[#0009e2]">Ofte stilte spørsmål</h1>
        <p className="mt-2 text-gray-600">Her finner du svar på de vanligste spørsmålene om Anbudsmarkedet.</p>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-2 text-[#0009e2]">Hvordan fungerer Anbudsmarkedet?</h2>
          <p className="text-gray-700">
            Anbudsmarkedet lar deg enkelt legge ut jobber eller oppdrag, enten du er privatperson eller bedrift. Bedrifter kan sende tilbud på dine jobber – du velger selv hvem du vil gå videre med!
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-2 text-[#0009e2]">Koster det noe å bruke tjenesten?</h2>
          <p className="text-gray-700">
            Det er gratis for privatpersoner å legge ut jobber og motta tilbud. Bedrifter kan velge ulike betalingsmodeller for å svare på jobber.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-2 text-[#0009e2]">Er bedriftene på plattformen kvalitetssikret?</h2>
          <p className="text-gray-700">
            Vi verifiserer alle bedrifter manuelt før de får tilgang til plattformen, og tilbyr BankID-verifisering for ekstra trygghet.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-2 text-[#0009e2]">Hvordan får jeg best mulig tilbud?</h2>
          <p className="text-gray-700">
            Legg inn så mye relevant informasjon som mulig når du beskriver jobben. Last gjerne opp bilder og vær konkret – det gjør det enklere for bedriftene å gi et nøyaktig tilbud.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-lg mb-2 text-[#0009e2]">Hva gjør jeg hvis jeg har problemer eller spørsmål?</h2>
          <p className="text-gray-700">
            Kontakt oss via kontaktskjemaet på <a href="/kontakt-oss" className="text-[#0009e2] underline">Kontakt oss</a> – vi hjelper deg så raskt vi kan!
          </p>
        </div>
      </div>
    </div>
  )
}
