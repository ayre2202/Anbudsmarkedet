import React from 'react'
import { Shield, Users, Award, Target, Heart, Building, Phone, Mail, MapPin } from 'lucide-react'

export default function OmOss() {
  const values = [
    {
      icon: Target,
      title: "Målrettet matching",
      description: "Vi kobler sammen riktige kunder med riktige fagfolk gjennom smart teknologi og kvalitetssikring."
    },
    {
      icon: Shield,
      title: "Trygghet og tillit",
      description: "Alle bedrifter verifiseres grundig mot Brønnøysundregisteret og må ha gyldig forsikring."
    },
    {
      icon: Heart,
      title: "Kundefokus",
      description: "Vi setter våre brukere først og jobber kontinuerlig for å forbedre opplevelsen."
    },
    {
      icon: Award,
      title: "Kvalitet over kvantitet",
      description: "Vi prioriterer kvalitet i alle ledd - fra bedriftsverifisering til kundeservice."
    }
  ]

  const team = [
    {
      name: "Gründerteamet",
      role: "Ledelse og visjon",
      description: "Erfarne gründere med bakgrunn fra teknologi og byggebransjen som så behovet for en bedre anbudsplattform."
    },
    {
      name: "Utviklingsteam",
      role: "Teknologi og innovasjon", 
      description: "Dyktige utviklere som bygger fremtidens anbudsplattform med moderne teknologi og brukeropplevelse."
    },
    {
      name: "Kundeservice",
      role: "Support og veiledning",
      description: "Vårt norske kundeserviceteam som sørger for at alle får den hjelpen de trenger."
    }
  ]

  return (
    <div>
      {/* HERO SEKSJON */}
      <section className="relative pt-32 pb-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Om <span className="text-[#0009e2]">Anbudsmarkedet</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Vi bygger Norges tryggeste og mest effektive anbudsplattform som forenkler samarbeidet mellom kunder og fagfolk.
            </p>
          </div>
        </div>
      </section>

      {/* VÅR HISTORIE */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Vår historie</h2>
              <div className="space-y-6 text-gray-600 leading-relaxed">
                <p>
                  Anbudsmarkedet ble grunnlagt ut fra en enkel observasjon: eksisterende anbudsplattformer 
                  var kompliserte, dyre og ofte frustrerende å bruke - både for kunder og fagfolk.
                </p>
                <p>
                  Vi opplevde selv problemene med uklare priser, binding til lange kontrakter, og dårlig 
                  kvalitetskontroll. Derfor bestemte vi oss for å bygge noe bedre - en plattform som 
                  faktisk fungerer for alle parter.
                </p>
                <p>
                  I dag er vi stolte av å tilby Norges mest transparente og brukervennlige anbudsplattform, 
                  hvor trygghet, kvalitet og enkelhet står i sentrum.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#0009e2] to-[#0007b8] rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Vårt oppdrag</h3>
              <p className="text-lg leading-relaxed mb-6">
                "Å forenkle og forbedre måten nordmenn finner kvalitetsfagfolk på, ved å bygge 
                tillit, transparens og effektivitet inn i hver del av prosessen."
              </p>
              <div className="border-t border-white/20 pt-6">
                <p className="text-sm opacity-90">
                  Vi tror på at gode relasjoner bygges på tillit, og at teknologi skal gjøre livet enklere - ikke mer komplisert.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VÅRE VERDIER */}
      <section className="py-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Våre verdier</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Disse prinsippene styrer alt vi gjør og alle beslutninger vi tar
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div key={index} className="text-center p-6 bg-white rounded-lg shadow-sm">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#0009e2] to-[#0007b8] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">{value.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* TEAMET VÅRT */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Teamet vårt</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vi er en dedikert gruppe mennesker som brenner for å skape positive endringer i anbudsbransjen
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {team.map((member, index) => (
              <div key={index} className="text-center p-8 bg-[#faf6f5] rounded-lg">
                <div className="w-20 h-20 bg-[#0009e2] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{member.name}</h3>
                <p className="text-[#0009e2] font-medium mb-4">{member.role}</p>
                <p className="text-gray-600 leading-relaxed">{member.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT INFO */}
      <section className="py-20" style={{ backgroundColor: '#faf6f5' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0009e2] mb-6">Kontakt oss</h2>
            <p className="text-xl text-gray-600">
              Vi er alltid interessert i å høre fra deg
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <Phone className="w-8 h-8 text-[#0009e2] mx-auto mb-4" />
              <h3 className="font-semibold mb-3">Telefon</h3>
              <p className="text-[#0009e2] font-semibold">22 08 60 00</p>
              <p className="text-sm text-gray-600 mt-2">Mandag - Fredag: 08:00 - 16:00</p>
            </div>
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <Mail className="w-8 h-8 text-[#0009e2] mx-auto mb-4" />
              <h3 className="font-semibold mb-3">E-post</h3>
              <p className="text-[#0009e2] font-semibold">post@anbudsmarkedet.no</p>
              <p className="text-sm text-gray-600 mt-2">Svarer innen 24 timer</p>
            </div>
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <MapPin className="w-8 h-8 text-[#0009e2] mx-auto mb-4" />
              <h3 className="font-semibold mb-3">Adresse</h3>
              <p className="text-gray-900 font-medium">Karl Johans gate 1</p>
              <p className="text-gray-900 font-medium">0154 Oslo</p>
            </div>
          </div>
        </div>
      </section>

      {/* SELSKAPS INFO */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="max-w-2xl mx-auto p-8 bg-[#faf6f5] rounded-lg">
              <Building className="w-12 h-12 text-[#0009e2] mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Anbudsmarkedet AS</h3>
              <div className="space-y-2 text-gray-600">
                <p><span className="font-medium">Organisasjonsnummer:</span> 931 863 010</p>
                <p><span className="font-medium">Adresse:</span> Karl Johans gate 1, 0154 Oslo</p>
                <p><span className="font-medium">Stiftet:</span> 2024</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}