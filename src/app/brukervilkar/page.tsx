'use client'

import Link from "next/link"

export default function BrukervilkarPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg px-6 py-10 mt-10 mb-20">
      <h1 className="text-3xl font-bold text-[#0009e2] mb-6">Brukervilkår</h1>

      <p className="mb-6 text-gray-600">
        Disse brukervilkårene gjelder for bruk av Anbudsmarkedets digitale formidlingstjeneste, drevet av Anbudsmarkedet AS (org.nr. 931 863 010).
        Ved å opprette konto eller publisere forespørsler på plattformen godtar du vilkårene i sin helhet. Hvis du ikke aksepterer vilkårene, vennligst ikke benytt tjenesten.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Tjenestens omfang</h2>
      <p className="mb-4">
        Anbudsmarkedet tilbyr en plattform der privatpersoner og virksomheter kan publisere forespørsler om håndverkstjenester. Når du sender inn en forespørsel, blir din kontaktinformasjon og beskrivelse gjort tilgjengelig for relevante håndverksbedrifter, som kan gi deg tilbud. Anbudsmarkedet er ikke part i selve avtalen mellom bruker og håndverker, men fasiliterer kun kontaktformidling på vegne av deg.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Aksept og oppdatering av vilkår</h2>
      <p className="mb-4">
        Du anses å ha godtatt disse vilkårene når du oppretter konto, logger inn eller sender inn en forespørsel. Anbudsmarkedet kan oppdatere vilkårene ved behov, blant annet ved endringer i lovverk, tekniske plattformer eller forretningsmodeller. Vesentlige endringer varsles via melding ved neste innlogging. Fortsatt bruk etter publisering av endringer innebærer aksept av nye vilkår.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Brukerkonto og sikkerhetsansvar</h2>
      <p className="mb-4">
        For å bruke tjenesten må du registrere en personlig brukerkonto. Du er ansvarlig for at informasjonen du oppgir er korrekt og oppdatert, og for all aktivitet som skjer under din konto. Kontoen skal ikke deles med andre. Ved mistanke om uautorisert tilgang, må du umiddelbart varsle oss via kontaktskjema på nettsiden.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Brukeransvar og innholdsskaping</h2>
      <p className="mb-4">
        Du skal bruke tjenesten i samsvar med gjeldende lover, god forretningsskikk og respekt for tredjeparters rettigheter. Alt innhold du publiserer – inkludert forespørsler, beskrivelser og evalueringer – skal være sannferdig og ikke krenkende, diskriminerende eller ulovlig. Vi forbeholder oss retten til å fjerne, blokkere eller endre innhold som anses uakseptabelt uten ytterligere varsel.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Immaterielle rettigheter</h2>
      <p className="mb-4">
        Du beholder eierskapet til innholdet du laster opp. Samtidig gir du Anbudsmarkedet en vederlagsfri, ikke-eksklusiv, global lisens til å bruke, reprodusere, tilpasse og publisere innholdet i den grad det er nødvendig for å levere tjenesten. Alle øvrige rettigheter til plattformen – inkludert programvare, design, tekst og bilder – tilhører Anbudsmarkedet AS eller dets lisensgivere.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Personvern</h2>
      <p className="mb-4">
        Behandling av personopplysninger skjer i tråd med vår <Link href="/personvern" className="text-[#0009e2] underline hover:text-blue-800">personvernerklæring</Link>. Ved å benytte tjenesten samtykker du til at vi behandler informasjon om deg som beskrevet der.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Ansvarsfraskrivelse og tvister</h2>
      <p className="mb-4">
        Anbudsmarkedet tilbyr plattformen "as is" uten garanti for faglig kvalitet, tilgjengelighet eller feilfri drift. Plattformen skal under ingen omstendigheter betraktes som part i kontrakter eller arbeidsavtaler inngått mellom deg og håndverksbedrifter. Enhver kommunikasjon, kontraktinngåelse, gjennomføring av arbeid og eventuelle tvister oppstår direkte mellom deg og den aktuelle håndverksbedriften. Anbudsmarkedet fraskriver seg alt ansvar for mangler, forsinkelser, kontraktsbrudd, skader på person eller eiendom, økonomisk tap, erstatningsansvar eller andre krav som følge av bruk av plattformen eller arbeid utført av tredjepart.
        Dette inkluderer, men er ikke begrenset til, indirekte tap som tapt fortjeneste, driftsstans, tap av data, goodwill og andre følgeskader.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Suspensjon og oppsigelse av konto</h2>
      <p className="mb-4">
        Anbudsmarkedet kan midlertidig suspendere eller permanent avslutte din tilgang ved mistanke om misbruk, brudd på vilkår eller rettsstridige handlinger. Du kan selv slette din konto og tilhørende data når som helst via innstillingene i din profil.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Endringer i tjenesten</h2>
      <p className="mb-4">
        Vi kan til enhver tid endre eller fjerne funksjonalitet, innhold eller design på plattformen uten varsel, forutsatt at endringene ikke begrenser dine grunnleggende rettigheter under disse vilkårene.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Lovvalg og tvisteløsning</h2>
      <p className="mb-4">
        Disse vilkårene reguleres av norsk rett. Eventuelle tvister skal søkes løst i minnelighet. Dersom dette ikke lykkes, er Oslo tingrett verneting, med mindre annet følger av ufravikelige rettsregler.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Kontakt</h2>
      <p className="mb-4">
        Spørsmål om brukervilkår eller tjenesten rettes via vårt kontaktskjema på nettsiden.
      </p>

      <div className="text-center mt-10 text-gray-400 text-sm">
        <p>www.Anbudsmarkedet.no</p>
        <p>© {new Date().getFullYear()} Anbudsmarkedet AS</p>
      </div>
    </div>
  )
}
