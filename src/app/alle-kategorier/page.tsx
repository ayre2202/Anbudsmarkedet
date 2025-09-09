'use client'

import React from 'react'
import { Hammer, Home, Users, Wrench, Building2, Brush, Tool, Box, Truck } from 'lucide-react'

interface CategoryGroup {
  title: string
  icon: React.ReactNode
  subcategories: string[]
}

const groups: CategoryGroup[] = [
  {
    title: 'Innvendig oppussing',
    icon: <Brush size={28} className="text-[#0009e2]" />,
    subcategories: [
      'Gulvbelegg',
      'Gulv',
      'Hybel og utleieenhet',
      'Pusse opp kjøkken',
      'Pusse opp loft',
      'Flislegging',
      'Pusse opp vaskerom',
      'Pusse opp leilighet',
      'Pigging av gulv',
      'Pusse opp oppholdsrom',
      'Trapp',
      'Interiørarkitekt',
      'Pusse opp bad',
      'Pusse opp kjeller',
      'Membran',
      'Maling, tapetsering, overflater',
      'Våtromsbelegg',
      'Sparkling',
      'Gulvavretting',
      'Vedovn',
      'Peis og peisovn',
      'Mikrosement',
      'Varmtvannsbereder',
      'Montering av kjøkken',
      'Gulvsliping',
      'Vannbåren varme',
      'Varmekabler',
      'VVS og kjøling',
    ],
  },
  {
    title: 'Håndverker',
    icon: <Hammer size={28} className="text-[#0009e2]" />,
    subcategories: [
      'Murer',
      'Maler',
      'Låsesmed',
      'Maskinentreprenør',
      'Elektriker',
      'Rørlegger',
      'Tømrer',
      'Blikkenslager',
      'Taktekkere',
      'Solskjerming',
    ],
  },
  {
    title: 'Bygge nytt',
    icon: <Building2 size={28} className="text-[#0009e2]" />,
    subcategories: [
      'Byggefirma',
      'Totalrenovering av bolig',
      'Prosjektleder',
      'Bygge påbygg',
      'Byggesøknad',
      'Entreprenør',
      'Arkitekt',
      'Bygge hytte',
      'Bygge hus',
      'Bygge tilbygg',
      'Bygge garasje',
      'Ansvarlig utførende',
      'Ansvarlig kontrollerende',
      'Garasjeport',
      'Ferdighus og ferdighytte',
      'Byggingeniør',
    ],
  },
  {
    title: 'Borettslag og sameier',
    icon: <Box size={28} className="text-[#0009e2]" />,
    subcategories: ['Borettslag og sameier'],
  },
  {
    title: 'Transport',
    icon: <Truck size={28} className="text-[#0009e2]" />,
    subcategories: ['Flyttevask', 'Flyttebyrå', 'Transport'],
  },
  {
    title: 'Kundeservice',
    icon: <Users size={28} className="text-[#0009e2]" />,
    subcategories: ['Kundeservice', 'Kundestøtte', 'Brukerstøtte'],
  },
]

export default function AlleKategorier() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-extrabold text-[#0009e2] mb-12 text-center">
        Alle kategorier
      </h1>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {groups.map(({ title, icon, subcategories }) => (
          <section
            key={title}
            className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition cursor-default"
          >
            <div className="flex items-center gap-3 mb-6">
              {icon}
              <h2 className="text-xl font-semibold text-[#0009e2]">{title}</h2>
            </div>
            <div className="columns-2 gap-6 text-gray-700">
              {subcategories.map((subcat) => (
                <p key={subcat} className="mb-2 cursor-pointer hover:text-[#0009e2]">
                  {subcat}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
