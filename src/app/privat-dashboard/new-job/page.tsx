'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase/client'
import { Sparkles, ArrowRight, ArrowLeft, UploadCloud, X, CheckCircle2, Hammer, PaintRoller, Wrench, Zap, Leaf, Scissors, Package, Car, Ruler, Home as HomeIcon, DollarSign, Building, Monitor, Truck, Camera, Laptop, Users, Briefcase, Shield, Coins, Trash2, Droplets, Flame, Trees, Sofa, Lock } from 'lucide-react'

// Force dynamic rendering to fix useSearchParams() issue
export const dynamic = 'force-dynamic'

type Category = { id: number; name: string }

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const getCategoryIcon = (categoryName: string) => {
  const iconMap: { [key: string]: any } = {
    'Snekker': Hammer, 'Maler': PaintRoller, 'Rørlegger': Wrench, 'Elektriker': Zap,
    'Murer': Building, 'Flislegger': Building, 'Tømrer': Hammer, 'Blikkenslager': Droplets,
    'Taktekker': HomeIcon, 'Møbelsnekker': Hammer, 'Møbelmontering': Hammer,
    'Stålarbeider': Wrench, 'Steinlegger': Building, 'Låsesmed': Lock, 'Glassarbeider': Sparkles,
    'Installasjon og montering': Wrench, 'Isolering': Shield, 'Vanntetting': Droplets,
    'Lafting': Trees, 'Gulv': Building, 'Gjerder og porter': Shield, 'Torvtak': Leaf,
    'Transport': Truck, 'Varetransport': Package, 'Massetransport': Truck, 'Flyttebyrå': Truck,
    'Kraner og løfteutstyr': Truck, 'Stiger og stillaser': Ruler,
    'Rengjøring': Scissors, 'Fasadevask': Scissors, 'Trappevask': Scissors, 'Flyttevask': Scissors,
    'Snørydding': Scissors, 'Skadedyrkontroll': Shield,
    'Bilverksted': Wrench, 'EU‑kontroll på bil': CheckCircle2, 'Hjul og dekkskift': Car,
    'Mekanisk verksted': Wrench, 'Trafikkskole': CheckCircle2,
    'Innvendig oppussing': PaintRoller, 'Riving': Hammer, 'Sanering': Shield,
    'Vann og avløp': Droplets, 'Drenering': Droplets, 'Kulde og varme': Flame,
    'Varmepumpe': Flame, 'Ventilasjon': Wrench, 'Bygge nytt': Building, 'Betong': Building,
    'Betongsaging': Wrench
  }
  return iconMap[categoryName] || HomeIcon
}

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const subcategoriesMap = {
    'Håndverker': [
      'Snekker', 'Maler', 'Rørlegger', 'Elektriker', 'Murer', 'Flislegger', 
      'Tømrer', 'Blikkenslager', 'Taktekker', 'Møbelsnekker', 'Møbelmontering',
      'Stålarbeider', 'Steinlegger', 'Låsesmed', 'Glassarbeider',
      'Installasjon og montering', 'Isolering', 'Vanntetting', 'Lafting',
      'Gulv', 'Gjerder og porter', 'Torvtak'
    ],
    'Transport': [
      'Transport', 'Varetransport', 'Massetransport', 'Flyttebyrå', 
      'Kraner og løfteutstyr', 'Stiger og stillaser'
    ],
    'Renhold': [
      'Rengjøring', 'Fasadevask', 'Trappevask', 'Flyttevask', 
      'Snørydding', 'Skadedyrkontroll'
    ],
    'Bilverksted': [
      'Bilverksted', 'EU‑kontroll på bil', 'Hjul og dekkskift', 
      'Mekanisk verksted', 'Trafikkskole'
    ],
    'Oppussing Bad': [
      'Innvendig oppussing', 'Riving', 'Sanering', 'Vann og avløp',
      'Drenering', 'Kulde og varme', 'Varmepumpe', 'Ventilasjon',
      'Bygge nytt', 'Betong', 'Betongsaging'
    ]
  }

  const mainCategories = [
    { name: 'Håndverker', icon: Hammer },
    { name: 'Transport', icon: Truck },
    { name: 'Renhold', icon: Scissors },
    { name: 'Bilverksted', icon: Car },
    { name: 'Oppussing Bad', icon: Droplets }
  ]

  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [filePreviews, setFilePreviews] = useState<string[]>([])

  const [mainCategory, setMainCategory] = useState<string | null>(null)
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([])
  const [showingMainCategories, setShowingMainCategories] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [countryCode, setCountryCode] = useState('+47')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')

  const [wallColor, setWallColor] = useState('')
  const [pipeLocation, setPipeLocation] = useState('')
  const [electricIssue, setElectricIssue] = useState('')

  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const mainCat = searchParams.get('main_category')
    if (mainCat && subcategoriesMap[mainCat as keyof typeof subcategoriesMap]) {
      setMainCategory(mainCat)
      setAvailableSubcategories(subcategoriesMap[mainCat as keyof typeof subcategoriesMap])
      setShowingMainCategories(false)
    } else {
      setShowingMainCategories(true)
    }
    
    let ignore = false
    const fetchCategories = async () => {
      setCategories([])
      setCategoriesError(null)
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true })

      if (!ignore) {
        if (error) {
          setCategories([])
          setCategoriesError('Feil ved henting av kategorier: ' + error.message)
        } else if (data && Array.isArray(data) && data.length > 0) {
          setCategories(data as Category[])
          setCategoriesError(null)
          const catParam = searchParams.get('category')
          if (catParam && data.some((c: any) => c.name === catParam)) {
            setSelectedCategories([catParam])
          }
        } else {
          setCategories([])
          setCategoriesError('Ingen kategorier funnet i databasen.')
        }
      }
    }
    fetchCategories()
    return () => { ignore = true }
  }, [searchParams])

  useEffect(() => {
    if (zip.length === 4) {
      fetch(`https://api.bring.com/shippingguide/api/postalCode.json?clientUrl=anbudsmarkedet.no&country=no&pnr=${zip}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) setCity(data.result)
          else setCity('')
        })
        .catch(() => setCity(''))
    } else {
      setCity('')
    }
  }, [zip])

  useEffect(() => {
    if (!files) {
      setFilePreviews([])
      return
    }
    const urls: string[] = []
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        urls.push(URL.createObjectURL(file))
      } else {
        urls.push('')
      }
    })
    setFilePreviews(urls)
    return () => {
      urls.forEach((u) => u && URL.revokeObjectURL(u))
    }
  }, [files])

  const ProgressBar = () => {
    const steps = [
      { label: 'Kategori', number: 1 },
      { label: 'Beskrivelse', number: 2 },
      { label: 'Kontakt', number: 3 },
      { label: 'Fullfør', number: 4 },
    ]
    
    return (
      <div className="mb-6 md:mb-10">
        <div className="flex items-center justify-between w-full max-w-lg mx-auto px-2">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center relative">
              <div className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    step === s.number
                      ? 'bg-[#0009e2] border-[#0009e2] ring-2 ring-[#0009e2]/20'
                      : step > s.number
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {step > s.number && (
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {step === s.number && (
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"></div>
                  )}
                </div>
                
                <span 
                  className={`mt-2 text-xs font-medium text-center transition-all duration-300 whitespace-nowrap ${
                    step === s.number
                      ? 'text-[#0009e2]'
                      : step > s.number
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              
              {i < steps.length - 1 && (
                <div 
                  className="absolute h-0.5 transition-all duration-300 w-16 md:w-32"
                  style={{ 
                    top: '12px', 
                    left: '24px',
                    backgroundColor: step > i + 1 
                      ? '#10b981'
                      : step === i + 2 
                      ? '#0009e2'
                      : '#d1d5db'
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const handleMainCategorySelect = (categoryName: string) => {
    setMainCategory(categoryName)
    setAvailableSubcategories(subcategoriesMap[categoryName as keyof typeof subcategoriesMap] || [])
    setShowingMainCategories(false)
    setSelectedCategories([])
  }

  const selectSingleCategory = (categoryName: string) => {
    setSelectedCategories([categoryName])
  }

  const next = () => setStep((s) => Math.min(s + 1, 4))
  const back = () => setStep((s) => Math.max(s - 1, 1))

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files
    if (!newFiles) return

    const dt = new DataTransfer()
    
    if (files) {
      Array.from(files).forEach(file => dt.items.add(file))
    }
    
    const currentCount = files ? files.length : 0
    const remainingSlots = 10 - currentCount
    
    Array.from(newFiles).slice(0, remainingSlots).forEach(file => {
      dt.items.add(file)
    })
    
    setFiles(dt.files)
    e.target.value = ''
  }

  const handleRemoveFile = (index: number) => {
    if (!files) return
    const dt = new DataTransfer()
    const fileArray = Array.from(files)
    fileArray
      .filter((_, i) => i !== index)
      .forEach((file) => { dt.items.add(file) })
    setFiles(dt.files)
  }

  const handleSubmit = async () => {
    setLoading(true)
    let userId: string | null = null

    try {
      // Sjekk om bruker er innlogget
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Bruker er innlogget - bruk den innloggede brukerens ID
        userId = user.id
        console.log('Using logged in user:', userId)
      } else {
        // Bruker er IKKE innlogget
        if (!isValidEmail(email.toLowerCase())) {
          alert('Vennligst skriv inn en gyldig e-postadresse.')
          setLoading(false)
          return
        }

        // Sjekk om e-posten allerede eksisterer i users tabellen
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle()

        if (existingUser?.id) {
          // E-post eksisterer i users tabell - bruk eksisterende bruker
          userId = existingUser.id
          console.log('Using existing user for email:', email, 'User ID:', userId)
        } else {
          // E-post eksisterer ikke i users tabell - prøv å opprett ny bruker
          console.log('Creating new user for email:', email)
          
          // Prøv å opprette ny auth bruker
          const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: crypto.randomUUID(), // Temp passord
            options: {
              data: {
                full_name: fullName
              }
            }
          })

          if (signUpError) {
            if (signUpError.message.includes('User already registered') || signUpError.message.includes('already registered')) {
              // E-posten eksisterer i auth.users men ikke i users tabell
              // Opprett jobb uten bruker-ID, bare bruk e-post som kontakt
              console.log('Email exists in auth but not in users table. Creating job without user ID.')
              userId = null // Vi setter til null og håndterer dette i job creation
            } else {
              console.error('Auth signup failed:', signUpError)
              alert('Kunne ikke opprette bruker. Prøv igjen eller kontakt support.')
              setLoading(false)
              return
            }
          } else if (authData.user) {
            // Ny bruker opprettet successfully
            userId = authData.user.id

            // Opprett tilhørende records i users og profiles tabellene
            await supabase.from('users').insert({
              id: userId,
              email: email.toLowerCase(),
              name: fullName,
              role: 'private',
              phone: `${countryCode}${phone}`
            })

            await supabase.from('profiles').insert({
              user_id: userId,
              full_name: fullName,
              role: 'private_user'
            })
            
            console.log('Created new user with ID:', userId)
          }
        }
      }

      // Last opp filer (kun hvis vi har en userId)
      const fileArray = files ? Array.from(files).slice(0, 10) : []
      const attachmentUrls: string[] = []
      
      if (userId && fileArray.length > 0) {
        for (const file of fileArray) {
          const uid = crypto.randomUUID()
          const path = `job-attachments/${userId}/${uid}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('job-attachments')
            .upload(path, file as any, { cacheControl: '3600', upsert: false })
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('job-attachments')
              .getPublicUrl(path)
            attachmentUrls.push(urlData.publicUrl)
          }
        }
      }

      // Sett opp additional_info basert på valgte kategorier
      const additionalInfo: any = {}
      if (selectedCategories.includes('Maler') && wallColor) {
        additionalInfo.wall_color = wallColor
      }
      if (selectedCategories.includes('Rørlegger') && pipeLocation) {
        additionalInfo.pipe_location = pipeLocation
      }
      if (selectedCategories.includes('Elektriker') && electricIssue) {
        additionalInfo.electric_issue = electricIssue
      }

      // Opprett jobben
      const jobPayload: any = {
        categories: selectedCategories,
        category: selectedCategories[0] || '',
        title,
        description,
        address,
        city,
        zip,
        email: email.toLowerCase(),
        full_name: fullName,
        phone: `${countryCode}${phone}`,
        contact_email: email.toLowerCase(),
        contact_phone: `${countryCode}${phone}`,
        attachments: attachmentUrls,
        additional_info: Object.keys(additionalInfo).length > 0 ? additionalInfo : null,
        status: 'pending'
      }

      // Legg til bruker-referanser kun hvis vi har en userId
      if (userId) {
        jobPayload.user_id = userId
        jobPayload.poster_id = userId
      }

      const { error: jobError } = await supabase.from('jobs').insert(jobPayload)
      
      if (jobError) {
        console.error('Job insert error:', jobError)
        alert('Feil ved publisering av jobb: ' + jobError.message)
        setLoading(false)
        return
      }
      
      // Suksess!
      setShowSuccess(true)
      
    } catch (error: any) {
      console.error('Submit error:', error)
      alert('Uventet feil ved publisering: ' + (error.message || 'Ukjent feil'))
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const focusClasses =
    'focus:border-[#0009e2] focus:ring-2 focus:ring-[#0009e2] focus:outline-none transition-all duration-200'

  const countryOptions = [
    { value: '+47', flag: '🇳🇴', label: 'Norge', code: '+47' },
    { value: '+46', flag: '🇸🇪', label: 'Sverige', code: '+46' },
    { value: '+45', flag: '🇩🇰', label: 'Danmark', code: '+45' },
    { value: '+44', flag: '🇬🇧', label: 'Storbritannia', code: '+44' },
    { value: '+49', flag: '🇩🇪', label: 'Tyskland', code: '+49' },
  ]

  const RequiredStar = () => (
    <span className="text-[#0009e2] ml-1 font-bold">*</span>
  )

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    router.push('/privat-dashboard')
  }

  const handleFileUploadClick = () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.click()
    }
  }

  return (
    <div style={{ background: '#F9F7F2', minHeight: '100vh', width: '100vw', position: 'fixed', left: 0, top: 0 }}>
      <div className="relative flex justify-center h-full w-full z-10 px-4 md:px-6 py-4 md:py-8 overflow-y-auto">
        <div 
          className="w-full max-w-4xl bg-white shadow-2xl relative z-20 my-auto"
          style={{ 
            borderRadius: '1rem',
            minHeight: 'calc(100vh - 32px)',
            overflow: 'hidden'
          }}
        >
          <div 
            className="p-4 md:p-6 lg:p-10 overflow-y-auto"
            style={{
              minHeight: 'calc(100vh - 32px)',
              maxHeight: 'calc(100vh - 32px)'
            }}
          >
            {showSuccess && (
              <div
                className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                onClick={handleCloseSuccess}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full relative"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={handleCloseSuccess}
                    className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
                  >
                    <X size={24} />
                  </button>
                  <div className="text-center">
                    <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl md:text-2xl font-bold mb-3 text-gray-900">
                      Takk for din innsending!
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Jobben din må gjennom en kort internkontroll før den publiseres. 
                      Du blir varslet så snart annonsen er publisert og synlig for bedrifter.
                    </p>
                    <button
                      onClick={handleCloseSuccess}
                      className="bg-[#0009e2] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#2a39e2] transition-colors"
                    >
                      Lukk
                    </button>
                  </div>
                </div>
              </div>
            )}

            <ProgressBar />

            {/* STEG 1: KATEGORIVALG */}
            {step === 1 && (
              <div className="flex flex-col min-h-[calc(100vh-200px)]">
                {showingMainCategories ? (
                  <>
                    <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-[#0009e2] text-center">
                      Velg hovedkategori
                    </h2>
                    <p className="text-gray-600 mb-6 md:mb-8 text-center text-sm md:text-base max-w-2xl mx-auto">
                      Velg først hvilken type jobb du har, så kan du velge mer spesifikke underkategorier.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8 max-w-4xl mx-auto">
                      {mainCategories.map((category) => {
                        const IconComponent = category.icon
                        return (
                          <button
                            key={category.name}
                            onClick={() => handleMainCategorySelect(category.name)}
                            className="group transition-all duration-300 hover:-translate-y-1 p-4 md:p-6 rounded-2xl border-2 border-gray-200 bg-white hover:border-[#0009e2]/50 hover:bg-gray-50 shadow-sm hover:shadow-lg"
                          >
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#0009e2]/10 rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:bg-[#0009e2]/15 group-hover:scale-110 transition-all duration-300">
                              <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-[#0009e2]" />
                            </div>
                            <h3 className="font-semibold text-xs md:text-sm text-center text-gray-900">
                              {category.name}
                            </h3>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : mainCategory ? (
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowingMainCategories(true)
                        setMainCategory(null)
                        setAvailableSubcategories([])
                        setSelectedCategories([])
                      }}
                      className="absolute top-0 left-0 flex items-center gap-2 text-gray-500 hover:text-[#0009e2] transition-colors group"
                    >
                      <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                      <span className="text-sm font-medium">Tilbake</span>
                    </button>

                    <h2 className="text-xl md:text-3xl font-bold mb-3 md:mb-4 text-[#0009e2] text-center mt-8">
                      Velg underkategori for {mainCategory}
                    </h2>
                    <p className="text-gray-600 mb-4 md:mb-6 text-center text-sm md:text-base max-w-2xl mx-auto">
                      Du valgte <span className="font-semibold text-[#0009e2]">{mainCategory}</span>. 
                      Velg én underkategori som passer best for din jobb:
                    </p>
                    
                    <div className="flex-1 overflow-y-auto max-h-80 md:max-h-96 mb-4 md:mb-6 py-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 max-w-5xl mx-auto">
                        {availableSubcategories.map((subcat) => {
                          const IconComponent = getCategoryIcon(subcat)
                          const isSelected = selectedCategories.includes(subcat)
                          
                          return (
                            <button
                              key={subcat}
                              onClick={() => selectSingleCategory(subcat)}
                              className={`group transition-all duration-300 hover:-translate-y-1 p-3 md:p-4 rounded-lg border-2 relative ${
                                isSelected
                                  ? 'border-[#0009e2] bg-[#0009e2]/10 shadow-lg shadow-[#0009e2]/20'
                                  : 'border-gray-200 bg-white hover:border-[#0009e2]/50 hover:bg-gray-50 shadow-sm hover:shadow-lg'
                              }`}
                            >
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-2 md:mb-3 mx-auto transition-all duration-300 ${
                                isSelected 
                                  ? 'bg-[#0009e2]/15 group-hover:scale-110' 
                                  : 'bg-[#0009e2]/10 group-hover:bg-[#0009e2]/15 group-hover:scale-110'
                              }`}>
                                <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-[#0009e2]" />
                              </div>
                              
                              <h3 className={`font-medium text-xs leading-tight text-center transition-colors ${
                                isSelected ? 'text-[#0009e2]' : 'text-gray-900'
                              }`}>
                                {subcat}
                              </h3>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedCategories.length > 0 && (
                      <div className="mb-4 md:mb-6 text-center">
                        <span className="text-sm font-medium text-gray-600 mb-3 block">Valgt kategori:</span>
                        <div className="flex justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 bg-[#0009e2]/10 border border-[#0009e2]/30 rounded-lg text-[#0009e2]">
                            {(() => {
                              const IconComponent = getCategoryIcon(selectedCategories[0])
                              return <IconComponent className="w-4 h-4" />
                            })()}
                            <span className="text-sm font-medium">{selectedCategories[0]}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-center mt-auto pt-6">
                  <button
                    onClick={next}
                    disabled={selectedCategories.length === 0}
                    className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold text-sm md:text-base flex items-center gap-2 shadow-lg transition-all ${
                        selectedCategories.length > 0
                          ? 'bg-[#0009e2] text-white hover:bg-[#2a39e2] hover:scale-105'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Neste <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* STEG 2: ARBEIDSBESKRIVELSE */}
            {step === 2 && (
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-[#0009e2]">Beskriv jobben din</h2>
                
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">Tittel<RequiredStar /></span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="F.eks. Male stue"
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">Beskrivelse<RequiredStar /></span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Beskriv hva du ønsker gjort, tidspunkter, detaljer osv."
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 resize-none shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                
                {selectedCategories.includes('Maler') && (
                  <label className="block mb-4">
                    <span className="font-semibold text-sm md:text-base">Ønsket veggfarge<RequiredStar /></span>
                    <input
                      type="text"
                      value={wallColor}
                      onChange={(e) => setWallColor(e.target.value)}
                      placeholder="F.eks. grå"
                      required
                      className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                    />
                  </label>
                )}
                {selectedCategories.includes('Rørlegger') && (
                  <label className="block mb-4">
                    <span className="font-semibold text-sm md:text-base">Hvor er rørene?<RequiredStar /></span>
                    <input
                      type="text"
                      value={pipeLocation}
                      onChange={(e) => setPipeLocation(e.target.value)}
                      placeholder="F.eks. kjeller"
                      required
                      className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                    />
                  </label>
                )}
                {selectedCategories.includes('Elektriker') && (
                  <label className="block mb-4">
                    <span className="font-semibold text-sm md:text-base">Hva er problemet?<RequiredStar /></span>
                    <textarea
                      value={electricIssue}
                      onChange={(e) => setElectricIssue(e.target.value)}
                      rows={2}
                      required
                      placeholder="Beskriv feilen"
                      className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 resize-none shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                    />
                  </label>
                )}

                <div className="block mb-4">
                  <span className="font-semibold flex items-center gap-2 mb-2 text-sm md:text-base">
                    <UploadCloud size={18} className="text-[#0009e2]" />
                    Bilder/dokumenter (valgfritt, maks 10)
                  </span>
                  <div className="text-sm text-gray-500 mb-3">
                    Du har valgt {files ? files.length : 0}/10 filer.
                  </div>
                  
                  <div 
                    onClick={handleFileUploadClick}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 md:p-8 bg-gray-50 hover:border-[#0009e2]/70 hover:bg-gray-100 transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[100px] md:min-h-[120px] group"
                  >
                    <UploadCloud size={28} className="text-gray-400 group-hover:text-[#0009e2] transition-colors mb-2" />
                    <span className="text-gray-600 group-hover:text-[#0009e2] font-medium transition-colors text-sm md:text-base">
                      Trykk for å laste opp filer
                    </span>
                    <span className="text-xs md:text-sm text-gray-500 mt-1">
                      Bilder og PDF-filer støttes
                    </span>
                  </div>

                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileAdd}
                    className="hidden"
                  />

                  {filePreviews.length > 0 && files && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {Array.from(files).map((file, idx) => (
                        <div
                          key={file.name + idx}
                          className="relative rounded-xl bg-gray-100 p-2 flex flex-col items-center justify-center shadow-sm border border-gray-200 group"
                        >
                          {file.type.startsWith('image/') ? (
                            <img
                              src={filePreviews[idx]}
                              alt={file.name}
                              className="h-12 w-12 md:h-16 md:w-16 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="h-12 w-12 md:h-16 md:w-16 flex items-center justify-center">
                              <span className="text-xs text-gray-600 font-medium text-center px-1">
                                {file.name.split('.').pop()?.toUpperCase() || 'FIL'}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-gray-500 mt-1 text-center max-w-[60px] md:max-w-[80px] truncate">
                            {file.name}
                          </span>
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full shadow-md p-1 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemoveFile(idx)
                            }}
                            title="Fjern fil"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-6">
                  <button
                    onClick={back}
                    className="px-4 md:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-gray-300 hover:border-[#0009e2] hover:text-[#0009e2] transition text-sm md:text-base"
                  >
                    <ArrowLeft size={20} /> Tilbake
                  </button>
                  <button
                    onClick={next}
                    disabled={!title.trim() || !description.trim()}
                    className={`px-4 md:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow transition-all text-sm md:text-base ${
                        title.trim() && description.trim()
                          ? 'bg-[#0009e2] text-white hover:bg-[#2a39e2]'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Neste <ArrowRight size={20} />
                  </button>
                </div>
              </>
            )}

            {/* STEG 3: KONTAKTINFO */}
            {step === 3 && (
              <>
                <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-[#0009e2]">Hvem skal kontaktes?</h2>
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">Fullt navn<RequiredStar /></span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">E-post<RequiredStar /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="ola@nordmann.no"
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                
                <div className="mb-4">
                  <span className="font-semibold text-sm md:text-base">Telefon<RequiredStar /></span>
                  <div className="flex gap-2 mt-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={`border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm w-20 md:w-24 ${focusClasses}`}
                    >
                      {countryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.flag} {opt.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="Telefonnummer"
                      className={`flex-1 border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                    />
                  </div>
                </div>
                
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">Adresse<RequiredStar /></span>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Hvor skal arbeidet utføres?"
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                <label className="block mb-4">
                  <span className="font-semibold text-sm md:text-base">Postnummer<RequiredStar /></span>
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) =>
                      setZip(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    required
                    placeholder="Postnummer"
                    className={`mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-50 shadow-sm hover:border-[#0009e2]/50 text-sm md:text-base ${focusClasses}`}
                  />
                </label>
                <label className="block mb-6">
                  <span className="font-semibold text-sm md:text-base">Poststed<RequiredStar /></span>
                  <input
                    type="text"
                    value={city}
                    readOnly
                    placeholder="Fylles ut automatisk"
                    className="mt-2 block w-full border border-gray-200 p-3 rounded-xl bg-gray-100 text-gray-600 shadow-sm text-sm md:text-base"
                  />
                </label>
                <div className="flex justify-between mt-4">
                  <button
                    onClick={back}
                    className="px-4 md:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border border-gray-300 hover:border-[#0009e2] hover:text-[#0009e2] transition text-sm md:text-base"
                  >
                    <ArrowLeft size={20} /> Tilbake
                  </button>
                  <button
                    onClick={next}
                    disabled={
                      !fullName.trim() ||
                      !email.trim() ||
                      !phone.trim() ||
                      !address.trim() ||
                      !zip.trim() ||
                      !city.trim()
                    }
                    className={`px-4 md:px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow transition-all text-sm md:text-base ${
                        fullName.trim() &&
                        email.trim() &&
                        phone.trim() &&
                        address.trim() &&
                        zip.trim() &&
                        city.trim()
                          ? 'bg-[#0009e2] text-white hover:bg-[#2a39e2]'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                  >
                    Neste <ArrowRight size={20} />
                  </button>
                </div>
              </>
            )}

            {/* STEG 4: FULLFØR */}
            {step === 4 && (
              <div className="pb-6 md:pb-8">
                <div className="flex flex-col items-center justify-center text-center mb-6 md:mb-8">
                  <h2 className="text-xl md:text-3xl font-bold mb-3 text-[#0009e2]">
                    Se over før du publiserer!
                  </h2>
                  <p className="text-gray-600 max-w-md leading-relaxed text-sm md:text-base">
                    Se nøye over informasjonen før du publiserer jobben. Korrekt info gjør det lettere for bedrifter å kontakte deg raskt og trygt.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 md:p-6 mb-6 md:mb-8 border border-gray-100 shadow-sm">
                  <h3 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-green-500" />
                    Oppsummering av jobben din
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Kategori:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedCategories.map((cat) => {
                          const IconComponent = getCategoryIcon(cat)
                          return (
                            <div key={cat} className="flex items-center gap-1 px-2 py-1 bg-[#0009e2]/10 rounded-lg">
                              <IconComponent className="w-3 h-3 text-[#0009e2]" />
                              <span className="text-xs text-[#0009e2] font-medium">{cat}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Tittel:</span>
                      <span className="text-gray-800 text-right">{title}</span>
                    </div>
                    <div className="py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Beskrivelse:</span>
                      <p className="text-gray-800 mt-1 text-right">{description}</p>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Navn:</span>
                      <span className="text-gray-800 text-right">{fullName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">E-post:</span>
                      <span className="text-gray-800 text-right break-all">{email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Telefon:</span>
                      <span className="text-gray-800 text-right">{countryCode}{phone}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Adresse:</span>
                      <span className="text-gray-800 text-right">{address}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-600">Poststed:</span>
                      <span className="text-gray-800 text-right">{zip} {city}</span>
                    </div>
                    {files && files.length > 0 && (
                      <div className="flex justify-between py-2">
                        <span className="font-medium text-gray-600">Vedlegg:</span>
                        <span className="text-gray-800 text-right">{files.length} fil(er)</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  <button
                    onClick={back}
                    className="px-6 md:px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 border-2 border-gray-300 hover:border-[#0009e2] hover:text-[#0009e2] transition-all bg-white text-sm md:text-base"
                  >
                    <ArrowLeft size={20} /> Tilbake
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`px-6 md:px-8 py-3 bg-gradient-to-r from-[#0009e2] to-[#2a39e2] hover:from-[#2a39e2] hover:to-[#0009e2] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-105 text-sm md:text-base ${loading ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Publiserer...
                      </>
                    ) : (
                      'Publiser jobb'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}