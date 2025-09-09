'use client'

import { useState, useEffect, Dispatch, SetStateAction, ChangeEvent, useRef } from 'react'
import {
  Search,
  Mail,
  X,
  ArrowLeft,
  Hammer,
  Wrench,
  HardHat,
  PaintRoller,
  Scissors,
  Zap,
  Briefcase,
  Settings,
  Home as HomeIcon,
  Leaf,
  Car,
  SprayCan,
  CreditCard,
  Truck,
  Clipboard,
  Ruler,
} from 'lucide-react'
import Lottie from 'lottie-react'
import registrerAnimasjon from '@/assets/registrer-bedrift.json'

export default function RegistrerBedrift() {
  const [step, setStep] = useState<number>(1)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // Steg 1
  const [companyName, setCompanyName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)
  const [selectedFromList, setSelectedFromList] = useState(false)
  const [companyValid, setCompanyValid] = useState(true)
  const [emailValid, setEmailValid] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Steg 2-5
  const categories: string[] = [
    'Snekkertjenester', 'Rørleggertjenester', 'Arkitekt', 'Bil',
    'Blikkenslager', 'Entreprenørtjenester', 'Elektrikertjenester', 'Finans',
    'Flytting og transport', 'Hage og uteområde', 'Hus og hjem', 'Malertjenester',
    'Maskinentreprenør', 'Mur og betong', 'Prosjektkontroll', 'Rengjøring',
  ]
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const regions: string[] = [
    'Agder', 'Innlandet', 'Jan Mayen', 'Møre og Romsdal',
    'Nordland', 'Oslo', 'Rogaland', 'Troms og Finnmark',
    'Trøndelag', 'Vestfold og Telemark', 'Vestland', 'Viken',
  ]
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [zip, setZip] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [orgNumber, setOrgNumber] = useState<string>('')

  const toggleSelection = (
    list: string[],
    setList: Dispatch<SetStateAction<string[]>>,
    value: string
  ) => setList(list.includes(value) ? list.filter(i => i !== value) : [...list, value])

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => Math.max(s - 1, 1))
  const goToStep1 = () => setStep(1)
  const handleSubmit = () => alert('Bedrift registrert!')

  useEffect(() => {
    const timer = setTimeout(() => {
      // Denne linjen er endret for å ikke søke og vise forslag hvis vi allerede har valgt fra listen
      if (companyName.length > 2 && !selectedFromList) {
        fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(companyName)}`)
          .then(res => res.json())
          .then(data => {
            const enheter: any[] = data?._embedded?.enheter || []
            setSuggestions(enheter)
            setShowSuggestions(enheter.length > 0)
            setSelectedFromList(false)
          })
          .catch(() => { setSuggestions([]); setShowSuggestions(false) })
      } else {
        setSuggestions([])
        setShowSuggestions(false)
        if (companyName === '') setSelectedFromList(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [companyName, selectedFromList])

  // Lukk forslag hvis klikker utenfor
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  const handleSelectSuggestion = (sug: { navn: string; organisasjonsnummer: string }) => {
    setCompanyName(`${sug.navn} (${sug.organisasjonsnummer})`)
    setOrgNumber(sug.organisasjonsnummer)
    setShowSuggestions(false)
    setSelectedFromList(true)
  }

  // Email validering
  useEffect(() => {
    setEmailValid(email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  }, [email])

  const icons: Record<string, React.ComponentType<any>> = {
    Snekkertjenester: Hammer,
    Rørleggertjenester: Wrench,
    Arkitekt: Ruler,
    Bil: Car,
    Blikkenslager: Scissors,
    Entreprenørtjenester: Briefcase,
    Elektrikertjenester: Zap,
    Finans: CreditCard,
    'Flytting og transport': Truck,
    'Hage og uteområde': Leaf,
    'Hus og hjem': HomeIcon,
    Malertjenester: PaintRoller,
    Maskinentreprenør: Settings,
    'Mur og betong': HardHat,
    Prosjektkontroll: Clipboard,
    Rengjøring: SprayCan,
  }

  const modalWrapper = (content: React.ReactNode) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
      <div className="bg-white w-full max-w-4xl min-h-[700px] p-10 rounded-xl relative shadow-lg">
        <button onClick={prevStep} className="absolute top-8 left-8 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={28} />
        </button>
        <button onClick={goToStep1} className="absolute top-8 right-8 text-gray-500 hover:text-gray-700">
          <X size={28} />
        </button>
        <div className="mt-10">{content}</div>
      </div>
    </div>
  )

  return (
    <>
      <div
        className="max-w-[1200px] mx-auto mt-20 p-14 bg-[#f5f8fd] shadow-xl rounded-2xl relative flex flex-col min-h-[700px]"
        style={{ minHeight: 700 }}
        ref={containerRef}
      >
        {step === 1 && (
          <div className="flex items-center gap-16 h-full relative">
            {/* Lottie animasjon */}
            <div className="w-[570px] flex-shrink-0 flex flex-col items-center justify-center">
              <Lottie
                animationData={registrerAnimasjon}
                loop
                className="w-[627px] h-[627px] min-w-[370px] min-h-[370px]"
                style={{ marginLeft: 0 }}
              />
            </div>
            {/* Skjema og tekst */}
            <div className="flex-1 relative z-10">
              <h2 className="text-3xl font-bold mb-2 text-[#0009e2]">Registrer din bedrift og kom i gang!</h2>
              <p className="mb-6 text-gray-700 text-lg">
                Opprett gratis profil og få tilgang til relevante oppdrag, akkurat som over 30 000 andre norske bedrifter.
              </p>
              <div
                className={`flex items-center border ${companyValid ? '' : 'border-red-500'} rounded mb-3 px-3 py-3 transition relative ${focusedField==='companyName'?'border-[#0009e2] ring-1 ring-[#0009e2]':'border-gray-300'}`}
                style={{ position: 'relative' }}
              >
                <Search className="text-gray-400 mr-2" size={22} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Bedriftsnavn"
                  value={companyName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setCompanyName(e.target.value)
                    setCompanyValid(true)
                    if(selectedFromList) setSelectedFromList(false) // Reset når brukeren skriver på nytt
                  }}
                  onFocus={() => setFocusedField('companyName')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full focus:outline-none text-lg"
                  autoComplete="off"
                />
                {/* Dropdown-meny */}
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    ref={suggestionsRef}
                    className="absolute left-0 w-[350px] bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto z-30"
                    style={{
                      top: '100%', // rett under inputboksen
                      marginTop: '4px', // litt luft under inputboksen
                    }}
                  >
                    {suggestions.map(s => (
                      <li
                        key={s.organisasjonsnummer}
                        className="px-4 py-2 hover:bg-[#f3f5fd] cursor-pointer text-sm flex flex-col"
                        onClick={() => handleSelectSuggestion(s)}
                      >
                        <span className="font-semibold text-gray-800">{s.navn}</span>
                        <span className="text-gray-500 text-xs">Org.nr: {s.organisasjonsnummer}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!companyValid && (
                <div className="text-red-500 text-xs mt-1 mb-2">
                  Du må velge et gyldig registrert foretak i Norge.
                </div>
              )}

              <div className={`flex items-center border ${emailValid ? '' : 'border-red-500'} rounded mb-6 px-3 py-3 transition relative ${focusedField==='email'?'border-[#0009e2] ring-1 ring-[#0009e2]':'border-gray-300'}`}>
                <Mail className="text-gray-400 mr-2" size={22} />
                <input
                  type="email"
                  placeholder="E-postadresse"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setEmail(e.target.value)
                    setEmailValid(true)
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full focus:outline-none text-lg"
                  autoComplete="off"
                />
              </div>
              {!emailValid && (
                <div className="text-red-500 text-xs mt-1 mb-2">
                  Du må skrive inn en gyldig e-postadresse.
                </div>
              )}

              <button
                onClick={() => {
                  if (selectedFromList && emailValid) nextStep()
                  else {
                    setCompanyValid(selectedFromList)
                    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                  }
                }}
                disabled={!(companyName && email && selectedFromList && emailValid)}
                className="w-full bg-[#0009e2] text-white py-3 rounded hover:bg-opacity-90 disabled:opacity-50 mt-2 font-semibold text-xl shadow"
              >
                Kom i gang – se jobber!
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                Ved å registrere deg aksepterer du våre <a href="/brukervilkar" className="underline hover:text-[#0009e2]">brukervilkår</a> og <a href="/personvern" className="underline hover:text-[#0009e2]">personvernerklæring</a>.
                Du mottar kun nødvendig informasjon vedrørende registreringen og tilgang til plattformen.
              </p>
            </div>
          </div>
        )}

        {/* Step 2–5 uendret */}
        {step === 2 && modalWrapper(
          <>
            <h2 className="text-2xl font-bold mb-2">Hvilken kategori beskriver din bedrift best?</h2>
            <p className="mb-4 text-gray-600">Du kan velge flere kategorier.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {categories.map(cat => {
                const Icon = icons[cat]
                const sel = selectedCategories.includes(cat)
                return (
                  <button key={cat} onClick={() => toggleSelection(selectedCategories, setSelectedCategories, cat)} className={`flex items-center p-3 border rounded transition ${sel?'bg-[#0009e2] text-white border-[#0009e2]':'bg-gray-50 border-gray-300'}`}>
                    {Icon && <Icon size={20} className="mr-2" />}<span>{cat}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end">
              <button onClick={nextStep} className="px-6 py-2 bg-[#0009e2] text-white rounded hover:bg-opacity-90">Fortsett</button>
            </div>
          </>
        )}

        {step === 3 && modalWrapper(
          <>
            <h2 className="text-2xl font-bold mb-4">Velg ditt område</h2>
            <p className="mb-4 text-gray-600">Du kan velge flere områder.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {regions.map(reg => (
                <button key={reg} onClick={() => toggleSelection(selectedRegions, setSelectedRegions, reg)} className={`p-2 border rounded ${selectedRegions.includes(reg)?'bg-[#0009e2] text-white border-[#0009e2]':'bg-gray-50 border-gray-300'}`}>
                  {reg}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={nextStep} className="px-6 py-2 bg-[#0009e2] text-white rounded hover:bg-opacity-90">Fortsett</button>
            </div>
          </>
        )}

        {step === 4 && modalWrapper(
          <>
            <h2 className="text-2xl font-bold mb-4">Velkommen! La oss komme i gang</h2>
            <p className="mb-4 text-gray-600">Vi trenger litt mer informasjon om deg.</p>
            <input type="text" placeholder="Fornavn" value={firstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <input type="text" placeholder="Etternavn" value={lastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <input type="tel" placeholder="Telefonnummer" value={phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} className="w-full border p-2 rounded mb-6" />
            <button onClick={nextStep} className="w-full bg-[#0009e2] text-white py-2 rounded hover:bg-opacity-90">Fortsett</button>
          </>
        )}

        {step === 5 && modalWrapper(
          <>
            <h2 className="text-2xl font-bold mb-4">Flott, la oss komme i gang!</h2>
            <p className="mb-4 text-gray-600">Vi trenger litt mer informasjon om bedriften din.</p>
            <input type="text" placeholder="Firmaadresse" value={address} onChange={(e: ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <input type="text" placeholder="Postnummer" value={zip} onChange={(e: ChangeEvent<HTMLInputElement>) => setZip(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <input type="text" placeholder="Poststed" value={city} onChange={(e: ChangeEvent<HTMLInputElement>) => setCity(e.target.value)} className="w-full border p-2 rounded mb-3" />
            <input type="text" placeholder="Org. nr." value={orgNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setOrgNumber(e.target.value)} className="w-full border p-2 rounded mb-6" />
            <button onClick={handleSubmit} className="w-full bg-green-600 text-white py-2 rounded hover:bg-opacity-90">Fullfør</button>
          </>
        )}
      </div>
    </>
  )
}
