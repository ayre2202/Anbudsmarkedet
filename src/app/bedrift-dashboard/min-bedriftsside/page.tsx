'use client'

import { useState, useEffect, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { BadgeCheck, Edit, Camera, MapPin, User2, Image as ImageIcon, Star, Briefcase, CheckCircle2, Lock } from 'lucide-react'
import ChangePasswordModal from '@/components/ChangePasswordModal'

interface Job {
  id: string
  title: string
  attachments?: string[]
}

interface Review {
  id: string
  job_id: string
  reviewer_name: string
  rating: number
  comment: string
  created_at: string
}

export default function MinBedriftsside() {
  const router = useRouter()
  const [info, setInfo] = useState<{
    company_name: string
    org_number: string
    full_name: string
    address: string
    company_images: string[]
    map_url: string
    description?: string
  } | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [orgNumber, setOrgNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [companyImages, setCompanyImages] = useState<string[]>([])
  const [mapUrl, setMapUrl] = useState('')
  const [description, setDescription] = useState('')
  const [newImages, setNewImages] = useState<FileList | null>(null)
  const [newMapFile, setNewMapFile] = useState<File | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/auth/role-login')

      const meta = user.user_metadata || {}
      setInfo({
        company_name: meta.company_name || '',
        org_number:   meta.org_number   || '',
        full_name:    meta.full_name    || '',
        address:      meta.address      || '',
        company_images: meta.company_images || [],
        map_url: meta.map_url || '',
        description: meta.description || '',
      })

      setCompanyName(meta.company_name || '')
      setOrgNumber(meta.org_number || '')
      setFullName(meta.full_name || '')
      setAddress(meta.address || '')
      setCompanyImages(meta.company_images || [])
      setMapUrl(meta.map_url || '')
      setDescription(meta.description || '')

      const { data: accepted } = await supabase
        .from('offers')
        .select('job_id')
        .eq('sender_id', user.id)
        .eq('status', 'accepted')
      const jobIds = Array.from(new Set(accepted?.map((a: any) => a.job_id) || []))
      if (jobIds.length) {
        const { data: jobsData } = await supabase
          .from('jobs')
          .select('id,title,attachments')
          .in('id', jobIds)
        setJobs(jobsData || [])
      }

      const { data: revData } = await supabase
        .from('reviews')
        .select('id,job_id,reviewer_name,rating,comment,created_at')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })

      if (revData) {
        const reviewsWithId: Review[] = revData.map(r => ({
          id: r.id,
          job_id: r.job_id,
          reviewer_name: r.reviewer_name,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
        }))
        setReviews(reviewsWithId)
      } else {
        setReviews([])
      }
    })()
  }, [router])

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return alert('Ikke innlogget')
    }

    let imageUrls = [...companyImages]
    if (newImages && newImages.length > 0) {
      for (const file of Array.from(newImages)) {
        const path = `company-images/${user.id}/${Date.now()}_${file.name}`
        const { error: upErr } = await supabase.storage.from('company-images').upload(path, file)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('company-images').getPublicUrl(path)
          if (urlData?.publicUrl) imageUrls.push(urlData.publicUrl)
        }
      }
    }

    let finalMapUrl = mapUrl
    if (newMapFile) {
      const path = `company-maps/${user.id}/${Date.now()}_${newMapFile.name}`
      const { error: upErr } = await supabase.storage.from('company-maps').upload(path, newMapFile)
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('company-maps').getPublicUrl(path)
        if (urlData?.publicUrl) finalMapUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        company_name: companyName,
        org_number: orgNumber,
        full_name: fullName,
        address: address,
        company_images: imageUrls,
        map_url: finalMapUrl,
        description: description,
      }
    })
    setLoading(false)
    if (error) return alert('Feil ved lagring: ' + error.message)

    setCompanyImages(imageUrls)
    setMapUrl(finalMapUrl)
    setEditMode(false)
    setInfo({
      company_name: companyName,
      org_number: orgNumber,
      full_name: fullName,
      address: address,
      company_images: imageUrls,
      map_url: finalMapUrl,
      description: description,
    })
    setNewImages(null)
    setNewMapFile(null)
  }

  if (!info) {
    return <p className="p-6">Laster bedriftsside…</p>
  }

  const mainBanner = info.company_images?.[0] || ''
  const initials = (info.company_name || '')
    .split(' ')
    .map(w => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2)

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-12">
      <div className="max-w-4xl mx-auto pt-6 px-2">
        <div className="flex justify-between items-center mb-4">
          <Link href="/bedrift-dashboard" className="text-[#0009e2] font-medium hover:underline flex items-center gap-1">
            <Briefcase size={20} /> Tilbake til dashboard
          </Link>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <Lock size={16} /> Bytt passord
          </button>
        </div>

        <div className="relative bg-white shadow-xl rounded-3xl overflow-hidden mb-8">
          <div className="h-44 md:h-60 w-full bg-gradient-to-br from-[#0009e2] to-[#1823b7] flex items-end relative">
            {mainBanner ? (
              <img
                src={mainBanner}
                alt="Bedriftsbilde"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                draggable={false}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
            <div className="relative flex items-end gap-4 px-8 pb-6 z-20">
              <span title="Verifisert bedrift">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-[#0009e2] shadow-xl flex items-center justify-center text-3xl font-bold text-[#0009e2] select-none relative">
                  {initials || <User2 size={36} />}
                  <span title="Verifisert bedrift">
                    <BadgeCheck className="absolute -bottom-2 -right-2 text-[#2dbb46] bg-white rounded-full border-2 border-white" size={28} />
                  </span>
                </div>
              </span>
              <div>
                <h1 className="text-3xl font-extrabold text-white drop-shadow">
                  {info.company_name}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle2 size={18} className="text-[#2dbb46]" />
                  <span className="text-white text-base font-semibold">Verifisert</span>
                  <span className="bg-white/20 px-2 py-1 rounded-lg text-xs text-white ml-2">{info.org_number ? `Org.nr: ${info.org_number}` : ''}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditMode(true)}
              className="absolute top-5 right-6 bg-white text-[#0009e2] rounded-xl px-4 py-2 shadow font-semibold flex items-center gap-2 hover:bg-[#0009e2] hover:text-white transition z-20"
            >
              <Edit size={16} /> Rediger profil
            </button>
          </div>

          <div className="px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-7 bg-white">
            <div className="col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <User2 size={20} className="text-gray-400" />
                <span className="font-medium">{info.full_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={20} className="text-gray-400" />
                <span>{info.address}</span>
              </div>
              {info.map_url && (
                <img src={info.map_url} alt="Kart" className="w-full h-32 object-cover rounded-xl shadow" />
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <h2 className="text-xl font-bold mb-1 text-[#0009e2]">Om oss</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {info.description
                  ? info.description
                  : 'Ingen beskrivelse lagt inn ennå. Legg til mer info om din bedrift og deres tjenester!'}
              </p>
            </div>
          </div>

          {info.company_images && info.company_images.length > 1 && (
            <div className="py-6 px-8 bg-gray-50 border-t">
              <h3 className="font-semibold text-[#0009e2] mb-3 flex items-center gap-2"><ImageIcon /> Bildegalleri</h3>
              <div className="flex gap-3 overflow-x-auto">
                {info.company_images.slice(1).map((url, i) => (
                  <img key={i} src={url} alt={`Galleri bilde ${i+2}`} className="rounded-xl h-24 w-36 object-cover border shadow" />
                ))}
              </div>
            </div>
          )}
        </div>

        {editMode && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative animate-fadeIn">
              <button
                onClick={() => setEditMode(false)}
                className="absolute top-3 right-4 text-gray-400 hover:text-[#0009e2] text-2xl"
                title="Lukk"
              >×</button>
              <h2 className="text-2xl font-extrabold text-[#0009e2] mb-6 flex items-center gap-2">
                <Edit size={22} /> Rediger bedriftsprofil
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Bedriftsnavn"
                  className="border p-3 rounded-xl w-full"
                />
                <input
                  type="text"
                  value={orgNumber}
                  onChange={e => setOrgNumber(e.target.value)}
                  placeholder="Org.nr"
                  className="border p-3 rounded-xl w-full"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Kontaktperson"
                  className="border p-3 rounded-xl w-full"
                />
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Adresse"
                  className="border p-3 rounded-xl w-full"
                />
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Beskrivelse av bedriften, tjenester, osv."
                  rows={4}
                  className="border p-3 rounded-xl w-full resize-none"
                />
                <label className="block font-medium">
                  <Camera size={18} className="inline mb-0.5" /> Bilder av bedriften (flere kan velges)
                  <input
                    type="file"
                    multiple
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewImages(e.target.files)}
                    className="mt-1 block"
                  />
                </label>
                <label className="block font-medium">
                  <MapPin size={18} className="inline mb-0.5" /> Kart/illustrasjon
                  <input
                    type="file"
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewMapFile(e.target.files?.[0] || null)
                    }
                    className="mt-1 block"
                  />
                </label>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleSave}
                  className={`bg-[#2dbb46] hover:bg-[#1d9334] text-white px-5 py-2 rounded-xl font-bold text-lg shadow transition ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Lagrer..." : "Lagre endringer"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-xl font-semibold"
                  disabled={loading}
                >
                  Avbryt
                </button>
              </div>
              <style jsx>{`
                .animate-fadeIn {
                  animation: fadeIn .3s cubic-bezier(.22,1.1,.36,1) both;
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(40px);}
                  to { opacity: 1; transform: none;}
                }
              `}</style>
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="mb-10">
            <h2 className="text-2xl font-extrabold text-[#0009e2] mb-4 flex items-center gap-2">
              <Briefcase /> Utførte jobber
            </h2>
            {jobs.length === 0 ? (
              <p className="text-gray-500">Ingen fullførte jobber enda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {jobs.map(job => (
                  <div key={job.id} className="rounded-xl shadow bg-white hover:shadow-lg transition overflow-hidden border">
                    {job.attachments?.[0] && (
                      <img
                        src={job.attachments[0]}
                        alt=""
                        className="w-full h-32 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-[#0009e2] text-lg">{job.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#0009e2] mb-4 flex items-center gap-2">
              <Star className="text-yellow-400" /> Anmeldelser
            </h2>
            {reviews.length === 0 ? (
              <p className="text-gray-500">Ingen anmeldelser enda.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {reviews.map(r => (
                  <div key={r.id} className="rounded-xl shadow bg-white p-5 border hover:shadow-lg transition">
                    <div className="flex items-center gap-2 mb-2">
                      <User2 size={20} className="text-gray-400" />
                      <span className="font-semibold">{r.reviewer_name}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} className={i < r.rating ? "text-yellow-400" : "text-gray-200"} fill={i < r.rating ? "#FACC15" : "none"} />
                      ))}
                      <span className="ml-2 text-sm text-gray-600">{r.rating} / 5</span>
                    </div>
                    <p className="text-gray-700 mb-2">{r.comment}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  )
}