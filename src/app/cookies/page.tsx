import React from 'react'
import { Shield, Settings, Eye, Users, Cookie } from 'lucide-react'
import Link from 'next/link'

export default function Cookies() {
  const cookieTypes = [
    {
      icon: Shield,
      title: "Nødvendige cookies",
      description: "Disse er essensielle for at nettsiden skal fungere og kan ikke deaktiveres.",
      examples: ["Innloggingsstatus", "Språkinnstillinger", "Sikkerhetstoken"]
    },
    {
      icon: Settings,
      title: "Funksjonalitets-cookies",
      description: "Forbedrer nettsidens funksjonalitet og personalisering.",
      examples: ["Brukerpreferanser", "Søkehistorikk", "Skjemadata"]
    },
    {
      icon: Eye,
      title: "Analyse-cookies",
      description: "Hjelper oss å forstå hvordan nettsiden brukes for å forbedre tjenesten.",
      examples: ["Google Analytics", "Sidevisninger", "Brukeradferd"]
    }
  ]

  return (
    <div>
      {/* HERO SEKSJON */}
      <section className="relative pt-32 pb-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#0009e2] rounded-full flex items-center justify-center mx-auto mb-6">
              <Cookie className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              <span className="text-[#0009e2]">Cookie</span>policy
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Vi bruker cookies for å gi deg den beste opplevelsen på anbudsmarkedet.no. 
              Her kan du lese om hvilke cookies vi bruker og hvorfor.
            </p>
          </div>
        </div>
      </section>

      {/* HVA ER COOKIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Hva er cookies?</h2>
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  Cookies er små tekstfiler som lagres på din enhet (datamaskin, telefon eller nettbrett) 
                  når du besøker en nettside. De inneholder informasjon som gjør det mulig for nettsiden 
                  å huske dine valg og preferanser.
                </p>
                <p>
                  Cookies gjør at vi kan tilby deg en bedre og mer personlig opplevelse på anbudsmarkedet.no. 
                  De hjelper oss også med å forstå hvordan nettsiden brukes, slik at vi kontinuerlig kan 
                  forbedre tjenesten vår.
                </p>
                <p>
                  Du kan når som helst endre eller slette cookies gjennom nettleserens innstillinger.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#0009e2] to-[#0007b8] rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Ditt samtykke</h3>
              <p className="text-lg leading-relaxed mb-6">
                Ved å bruke anbudsmarkedet.no samtykker du til vår bruk av cookies i henhold til denne policyen.
              </p>
              <div className="border-t border-white/20 pt-6">
                <p className="text-sm opacity-90">
                  Du kan når som helst trekke tilbake samtykket ditt ved å endre cookie-innstillingene i nettleseren din.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TYPER COOKIES */}
      <section className="py-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Hvilke cookies bruker vi?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vi bruker forskjellige typer cookies for ulike formål på anbudsmarkedet.no
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-10">
            {cookieTypes.map((type, index) => {
              const Icon = type.icon
              return (
                <div key={index} className="p-8 bg-white rounded-lg shadow-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0009e2] to-[#0007b8] rounded-full flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-900">{type.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">{type.description}</p>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Eksempler:</h4>
                    <ul className="space-y-2">
                      {type.examples.map((example, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="w-2 h-2 bg-[#0009e2] rounded-full mr-3"></span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TREDJEPARTSOOKIES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Tredjeparts cookies</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Noen cookies kommer fra tredjepartsleverandører som hjelper oss med å levere tjenester
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="p-8 bg-[#faf6f5] rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Google Analytics</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Vi bruker Google Analytics for å forstå hvordan brukere interagerer med nettsiden vår. 
                Dette hjelper oss med å forbedre brukeropplevelsen og optimalisere innholdet.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Formål:</span> Analyse av nettstedbruk</p>
                <p><span className="font-medium">Varighet:</span> Opptil 2 år</p>
                <p><span className="font-medium">Leverandør:</span> Google LLC</p>
              </div>
            </div>
            <div className="p-8 bg-[#faf6f5] rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Sosiale medier</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Når du deler innhold fra vår nettside på sosiale medier, kan disse plattformene 
                sette egne cookies på din enhet.
              </p>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Formål:</span> Deling og integrering</p>
                <p><span className="font-medium">Varighet:</span> Varierer</p>
                <p><span className="font-medium">Leverandører:</span> Facebook, Instagram, TikTok</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADMINISTRER COOKIES */}
      <section className="py-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Administrer cookies</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Du har full kontroll over hvilke cookies som lagres på din enhet
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-sm mb-10">
              <h3 className="text-xl font-semibold mb-6 text-gray-900">Slik administrerer du cookies i nettleseren:</h3>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Chrome</h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Klikk på menyknappen (tre prikker)</li>
                    <li>2. Velg "Innstillinger"</li>
                    <li>3. Klikk på "Personvern og sikkerhet"</li>
                    <li>4. Velg "Cookies og andre nettstedsdata"</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Safari</h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Åpne Safari-menyen</li>
                    <li>2. Velg "Innstillinger"</li>
                    <li>3. Klikk på "Personvern"</li>
                    <li>4. Administrer cookie-innstillinger</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Firefox</h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Klikk på menyknappen</li>
                    <li>2. Velg "Innstillinger"</li>
                    <li>3. Klikk på "Personvern og sikkerhet"</li>
                    <li>4. Finn "Cookies og nettstedsdata"</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Edge</h4>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li>1. Klikk på menyknappen (tre prikker)</li>
                    <li>2. Velg "Innstillinger"</li>
                    <li>3. Klikk på "Cookies og nettstedstillatelser"</li>
                    <li>4. Administrer cookie-innstillinger</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Merk:</span> Hvis du deaktiverer alle cookies, kan det påvirke 
                  funksjonaliteten på anbudsmarkedet.no og andre nettsider.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KONTAKT */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Spørsmål om cookies?</h2>
            <p className="text-xl text-gray-600 mb-10">
              Ta kontakt med oss hvis du har spørsmål om vår bruk av cookies
            </p>
            <div className="max-w-2xl mx-auto p-8 bg-[#faf6f5] rounded-lg">
              <Users className="w-12 h-12 text-[#0009e2] mx-auto mb-4" />
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900">E-post</p>
                  <p className="text-[#0009e2] font-semibold">post@anbudsmarkedet.no</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Telefon</p>
                  <p className="text-[#0009e2] font-semibold">22 08 60 00</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Sist oppdatert: {new Date().toLocaleDateString('no-NO', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <div className="mt-8">
              <Link 
                href="/personvern" 
                className="text-[#0009e2] hover:text-[#0007b8] font-medium underline"
              >
                Les også vår personvernerklæring
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}