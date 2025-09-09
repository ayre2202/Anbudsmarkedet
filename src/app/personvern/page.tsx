'use client'

import Link from "next/link"

export default function PersonvernPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg px-6 py-10 mt-10 mb-20">
      <h1 className="text-3xl font-bold text-[#0009e2] mb-6">Personvernerklæring</h1>

      <p className="mb-6 text-gray-600">
        Anbudsmarkedet drives av Anbudsmarkedet AS (org nr. 931 863 010), og tilbyr en digital plattform for formidling av anbud mellom privatpersoner eller virksomheter og håndverksbedrifter. Vi forklarer her hvordan vi samler inn, behandler og beskytter dine personopplysninger når du benytter tjenesten.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Behandlingsansvarlig og kontaktinformasjon</h2>
      <p className="mb-4">
        Behandlingsansvarlig for innsamling og behandling av personopplysninger er Anbudsmarkedet AS. Kontakt oss via <Link href="/kontakt-oss" className="text-[#0009e2] underline hover:text-blue-800">kontaktskjemaet</Link> på nettsiden ved spørsmål eller for å utøve dine rettigheter.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Omfanget av personopplysninger</h2>
      <p className="mb-4">
        Personopplysninger omfatter all informasjon som kan knyttes til deg som person. Dette inkluderer opplysningene du selv oppgir ved registrering og bruk, tekniske metadata (IP-adresse, nettlesertype), geografisk plassering, samt din aktivitet og preferanser på nettstedet. Enkelte opplysninger samles automatisk via informasjonskapsler og lignende teknologier, andre fra samarbeidspartnere.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Formål og rettslig grunnlag for behandlingen</h2>
      <p className="mb-4">
        Vi behandler personopplysninger for å levere og forbedre våre tjenester, samt for å muliggjøre kontakt mellom brukere og håndverkere. Grunnlaget kan være samtykke, avtaleforhold, lovpålagte krav eller vår berettigede interesse i å sikre stabil drift og forebygge misbruk.
      </p>
      <ul className="list-disc list-inside mb-4">
        <li>Levering av tjenesten (formidling, kommunikasjon, betaling).</li>
        <li>Brukervennlighet (automatisk pålogging, forhåndsutfylling).</li>
        <li>Analyse og produktutvikling.</li>
        <li>Sikkerhet, drift og forebygging av svindel.</li>
        <li>Oppfyllelse av rettslige krav, som bokføringsplikt.</li>
      </ul>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Deling og lagring av data</h2>
      <p className="mb-4">
        Personopplysningene kan deles med databehandlere som leverer tekniske tjenester (drift, betaling, analyse) under strenge avtaler. Kontaktinformasjon formidles til håndverksbedrifter kun når du sender et anbud. Ved mistanke om ulovlig aktivitet kan vi dele opplysninger med relevante myndigheter. Data lagres som hovedregel ikke mer enn fem år etter siste aktivitet, og anonymiserte analyser kan beholdes i inntil tre år.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Dine rettigheter og innstillinger</h2>
      <p className="mb-4">
        Du har rett til innsyn, retting eller sletting av personopplysninger, og kan trekke samtykke tilbake når som helst. Du kan protestere mot eller be om begrensning av behandling, samt be om dataportabilitet. Innstillinger for cookies, markedsføring og varslinger kan tilpasses i profilen eller i appen/enheten.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Sikkerhet og kvalitetssikring</h2>
      <p className="mb-4">
        Vi sikrer informasjonen din med kryptering, tilgangskontroller og regelmessige internrevisjoner. Alle databehandlere vurderes ut fra strenge krav til informasjonssikkerhet.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Endringer i personvernerklæringen</h2>
      <p className="mb-4">
        Denne erklæringen kan oppdateres ved endringer i regelverk, teknologi eller våre tjenester. Større endringer varsles, og vi anbefaler jevnlig å sjekke denne siden for siste versjon.
      </p>

      <h2 className="text-xl font-semibold text-[#0009e2] mt-6 mb-2">Klageadgang</h2>
      <p className="mb-4">
        Dersom du mener vår behandling bryter regelverket, kontakt oss først for en avklaring. Du kan også klage til Datatilsynet (<a href="https://www.datatilsynet.no/" target="_blank" rel="noopener noreferrer" className="text-[#0009e2] underline hover:text-blue-800">www.datatilsynet.no</a>).
      </p>

      <div className="text-center mt-10 text-gray-400 text-sm">
        <p>www.Anbudsmarkedet.no</p>
        <p>© {new Date().getFullYear()} Anbudsmarkedet AS</p>
      </div>
    </div>
  )
}
