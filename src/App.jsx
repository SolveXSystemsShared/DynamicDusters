import { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Home,
  Sofa,
  Shirt,
  CheckCircle2,
  ChevronDown,
  X,
  Minus,
  Plus,
  MessageCircle,
  ShieldCheck,
  Clock,
  MapPin,
  FileCheck2,
} from 'lucide-react'

// REPLACE WITH ACTUAL DYNAMIC DUSTERS WHATSAPP BUSINESS NUMBER (international format, no + or spaces)
const WHATSAPP_NUMBER = '27645552612'

const PACKAGES = [
  {
    id: 'two-hour',
    name: 'Two-Hour Express',
    duration: '2 hours',
    price: 'From R350',
    bestFor: 'Apartments & studios',
    icon: Sparkles,
    bullets: [
      'Kitchen surfaces & sink',
      'One bathroom refresh',
      'Living areas tidy & dust',
      'Floors swept / vacuumed',
    ],
  },
  {
    id: 'half-day',
    name: 'Half-Day Clean',
    duration: '4 hours',
    price: 'From R625',
    bestFor: 'Standard family homes',
    icon: Home,
    bullets: [
      'Full kitchen clean',
      'All bathrooms',
      'Bedrooms made up',
      'Floors mopped throughout',
    ],
  },
  {
    id: 'full-day',
    name: 'Full-Day Deep Clean',
    duration: '6–8 hours',
    price: 'From R1,050',
    bestFor: 'Move-in/out, deep cleans',
    icon: Sofa,
    bullets: [
      'Inside cupboards & appliances',
      'Skirtings, doors & frames',
      'Window interiors',
      'Top-to-bottom detail clean',
    ],
  },
  {
    id: 'laundry',
    name: 'Laundry Add-On',
    duration: 'Per load',
    price: 'From R100',
    bestFor: 'Wash, fold, iron — add to any clean',
    icon: Shirt,
    isAddon: true,
    bullets: [
      'Wash & tumble or line dry',
      'Neatly folded',
      'Ironing on request',
      'Combine with any package',
    ],
  },
]

// Service-area suburbs grouped by region. Used in the form dropdown
// (rendered as <optgroup>) and in the visual ServiceArea section.
const SUBURB_GROUPS = [
  {
    region: 'Johannesburg North',
    suburbs: ['Sandton', 'Fourways', 'Bryanston', 'Morningside', 'Paulshof', 'Rivonia', 'Hurlingham'],
  },
  {
    region: 'Midrand',
    suburbs: ['Midrand', 'Halfway House', 'Noordwyk', 'Vorna Valley', 'Carlswald', 'Kyalami', 'Waterfall'],
  },
  {
    region: 'Centurion',
    suburbs: ['Centurion', 'Irene', 'Lyttelton', 'Eldoraigne', 'Wierda Park', 'Doringkloof'],
  },
]

const OTHER_SUBURB = 'Other (specify in message)'

const PROPERTY_TYPES = ['Apartment', 'Townhouse', 'House', 'Airbnb', 'Other']

const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00']

const FAQS = [
  {
    q: 'Do you bring your own cleaning products?',
    a: 'No — we provide skilled, vetted labour. You supply products and equipment so we can use products you trust on your surfaces. We send a checklist when you book.',
  },
  {
    q: 'How fast will I get a confirmation?',
    a: 'Within 2 hours during operating hours (Mon–Fri 07:00–17:00, Sat 08:00–14:00).',
  },
  {
    q: 'What if I need to cancel or reschedule?',
    a: 'Let us know via WhatsApp at least 24 hours before your booking. Late cancellations may forfeit the deposit.',
  },
  {
    q: 'Do you clean Airbnbs?',
    a: 'Yes — Airbnb turnovers are one of our specialties. Mention it in your booking notes and we’ll prioritise the turnaround window.',
  },
  {
    q: 'How do I pay?',
    a: 'Payment details are confirmed when we accept your booking. New clients pay a 50% deposit; returning clients are invoiced with 7-day terms.',
  },
  {
    q: 'What if my place is bigger than the package allows?',
    a: 'No problem — we charge an overflow hourly rate beyond the package duration. We’ll always agree this with you in writing before the cleaner arrives.',
  },
]

/* Pricing model
 * Base prices match the package cards (subject to CEO sign-off before
 * launch). Surcharges apply per extra room beyond the package's
 * baseline so larger homes get a fair, predictable estimate.
 */
const PRICING = {
  packages: {
    'two-hour':  { base: 350,  baseBedrooms: 1, baseBathrooms: 1, label: 'Two-Hour Express' },
    'half-day':  { base: 625,  baseBedrooms: 3, baseBathrooms: 2, label: 'Half-Day Clean' },
    'full-day':  { base: 1050, baseBedrooms: 4, baseBathrooms: 3, label: 'Full-Day Deep Clean' },
  },
  perExtraBedroom: 75,
  perExtraBathroom: 50,
  laundryPerLoad: 100,
}

function calcPrice({ pkg, bedrooms, bathrooms, addLaundry, laundryLoads }) {
  const def = PRICING.packages[pkg]
  if (!def) return null // 'other' or unset → no estimate
  const extraBeds = Math.max(0, bedrooms - def.baseBedrooms)
  const extraBaths = Math.max(0, bathrooms - def.baseBathrooms)
  const bedroomCharge = extraBeds * PRICING.perExtraBedroom
  const bathroomCharge = extraBaths * PRICING.perExtraBathroom
  const laundryCharge = addLaundry ? laundryLoads * PRICING.laundryPerLoad : 0
  const total = def.base + bedroomCharge + bathroomCharge + laundryCharge
  return {
    label: def.label,
    base: def.base,
    extraBeds,
    extraBaths,
    bedroomCharge,
    bathroomCharge,
    laundryCharge,
    laundryLoads: addLaundry ? laundryLoads : 0,
    total,
  }
}

const formatRand = (n) => `R${n.toLocaleString('en-ZA')}`

const todayIso = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const formatLongDate = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

const isSunday = (iso) => {
  if (!iso) return false
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0
}

export default function App() {
  const [pkg, setPkg] = useState('')
  const [addLaundry, setAddLaundry] = useState(false)
  const [laundryLoads, setLaundryLoads] = useState(1)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [name, setName] = useState('')
  const [suburb, setSuburb] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [notes, setNotes] = useState('')
  const [ack, setAck] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [waUrl, setWaUrl] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [highlightForm, setHighlightForm] = useState(false)

  const formCardRef = useRef(null)

  const handleSelectPackage = (id) => {
    setPkg(id)
    if (id === 'laundry') setAddLaundry(true)
    setHighlightForm(false)
    requestAnimationFrame(() => {
      const el = document.getElementById('book')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTimeout(() => setHighlightForm(true), 400)
      setTimeout(() => setHighlightForm(false), 3000)
    })
  }

  const validate = () => {
    const e = {}
    if (!pkg) e.pkg = 'Choose a package'
    if (!date) e.date = 'Pick a date'
    else if (date < todayIso()) e.date = 'Date cannot be in the past'
    else if (isSunday(date)) e.date = 'We don’t operate on Sundays'
    if (!time) e.time = 'Pick a time'
    if (!name.trim()) e.name = 'Name is required'
    if (!suburb) e.suburb = 'Choose your suburb'
    if (!propertyType) e.propertyType = 'Choose property type'
    if (!ack) e.ack = 'Please acknowledge the products checklist'
    return e
  }

  const buildMessage = () => {
    const pkgLabel = PACKAGES.find((p) => p.id === pkg)?.name ?? 'Other / Not sure'
    const laundry = addLaundry ? `Yes, ${laundryLoads} load${laundryLoads > 1 ? 's' : ''}` : 'No'
    const estimate = calcPrice({ pkg, bedrooms, bathrooms, addLaundry, laundryLoads })
    const lines = [
      "Hi Dynamic Dusters! I'd like to book a clean.",
      '',
      '📋 BOOKING REQUEST',
      `- Package: ${pkgLabel}`,
      `- Laundry Add-On: ${laundry}`,
      `- Date: ${formatLongDate(date)}`,
      `- Preferred Time: ${time}`,
      '',
      '🏡 PROPERTY',
      `- Suburb: ${suburb}`,
      `- Type: ${propertyType}`,
      `- Bedrooms: ${bedrooms}`,
      `- Bathrooms: ${bathrooms}`,
      '',
      '👤 CONTACT',
      `- Name: ${name.trim()}`,
      '',
      '💰 ESTIMATE',
      estimate
        ? `- ${formatRand(estimate.total)} (subject to your confirmation)`
        : '- To be quoted by Dynamic Dusters',
      '',
      '📝 NOTES',
      notes.trim() ? notes.trim() : 'None',
      '',
      "✓ I confirm I'll have all cleaning products & equipment ready per the Products Checklist.",
      '',
      'Please confirm availability and final total. Thanks!',
    ]
    return lines.join('\n')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0]
      const node = document.querySelector(`[data-field="${firstKey}"]`)
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    const msg = buildMessage()
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
    setWaUrl(url)
    setSubmitted(true)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <LogoSplash />
      <Header />
      <Hero />
      <Packages onSelect={handleSelectPackage} selected={pkg} />
      <HowItWorks />
      <BookingForm
        formCardRef={formCardRef}
        highlightForm={highlightForm}
        pkg={pkg}
        setPkg={setPkg}
        addLaundry={addLaundry}
        setAddLaundry={setAddLaundry}
        laundryLoads={laundryLoads}
        setLaundryLoads={setLaundryLoads}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        name={name}
        setName={setName}
        suburb={suburb}
        setSuburb={setSuburb}
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        bedrooms={bedrooms}
        setBedrooms={setBedrooms}
        bathrooms={bathrooms}
        setBathrooms={setBathrooms}
        notes={notes}
        setNotes={setNotes}
        ack={ack}
        setAck={setAck}
        errors={errors}
        onSubmit={handleSubmit}
        submitted={submitted}
        waUrl={waUrl}
        onOpenChecklist={() => setModalOpen(true)}
        onReset={() => {
          setSubmitted(false)
        }}
      />
      <ServiceArea />
      <FAQ openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <Footer />
      <ChecklistModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

/* ----------------- Header ----------------- */
function Header() {
  return (
    <header className="sticky top-0 z-30 bg-cream/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <LogoBadge id="header-logo" size={40} />
          <span className="font-display font-bold text-ink tracking-tight text-base sm:text-lg">
            Dynamic Dusters
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
          <a href="#packages" className="hover:text-ink transition-colors">Packages</a>
          <a href="#process" className="hover:text-ink transition-colors">How it works</a>
          <a href="#area" className="hover:text-ink transition-colors">Service area</a>
          <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
        </nav>
        <a
          href="#book"
          className="inline-flex items-center gap-1.5 bg-ink text-cream px-4 py-2 rounded-full text-sm font-semibold hover:bg-brand hover:text-ink transition-colors"
        >
          Book now
        </a>
      </div>
    </header>
  )
}

function LogoBadge({ size = 56, id }) {
  return (
    <img
      id={id}
      src="/logo.png"
      alt="Dynamic Dusters"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="object-contain select-none"
      draggable={false}
    />
  )
}

/* ----------------- Logo Splash (FLIP intro) ----------------- */
function LogoSplash() {
  const [phase, setPhase] = useState('big') // 'big' | 'flying' | 'done'
  const [target, setTarget] = useState(null) // { x, y, size } screen coords of header logo
  const splashRef = useRef(null)

  useEffect(() => {
    // Lock scroll while splash is showing
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Wait a frame for header to mount, then measure the header logo's final spot
    const measure = () => {
      const el = document.getElementById('header-logo')
      if (!el) {
        // header not ready — try again next frame
        requestAnimationFrame(measure)
        return
      }
      const r = el.getBoundingClientRect()
      setTarget({
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        size: r.width,
      })
      // Hold the big state briefly, then fly
      setTimeout(() => setPhase('flying'), 700)
    }
    requestAnimationFrame(measure)

    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    if (phase !== 'flying') return
    // After the transition completes, unmount
    const t = setTimeout(() => {
      setPhase('done')
      document.body.style.overflow = ''
    }, 1100) // matches transition duration below
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'done') return null

  const BIG = 320 // splash logo size in px (intrinsic)
  const isFlying = phase === 'flying' && target

  // We position the splash element fixed and centered in the viewport, then translate
  // its center to the target center while scaling down to the target size.
  const scale = isFlying ? target.size / BIG : 1
  const tx = isFlying ? target.x - window.innerWidth / 2 : 0
  const ty = isFlying ? target.y - window.innerHeight / 2 : 0

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center pointer-events-none"
      style={{
        background: isFlying
          ? 'rgba(255, 251, 244, 0)'
          : 'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(245, 166, 35, 0.18), rgba(255, 251, 244, 1) 70%)',
        transition: 'background 700ms ease-out',
      }}
    >
      <img
        ref={splashRef}
        src="/logo.png"
        alt=""
        aria-hidden
        draggable={false}
        style={{
          width: BIG,
          height: BIG,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isFlying
            ? 'transform 1000ms cubic-bezier(0.65, 0, 0.35, 1), opacity 200ms ease-out 850ms'
            : 'none',
          opacity: isFlying ? 0 : 1,
          filter: isFlying ? 'none' : 'drop-shadow(0 16px 40px rgba(245, 166, 35, 0.35))',
          willChange: 'transform, opacity',
        }}
        className="object-contain select-none animate-fadeIn"
      />
    </div>
  )
}

/* ----------------- Hero ----------------- */
function Hero() {
  return (
    <section id="top" className="hero-gradient relative overflow-hidden">
      <div className="hero-pattern absolute inset-0 opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <div className="mb-8">
          <LogoBadge size={120} />
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight max-w-3xl">
          Professional Cleaning, <span className="text-brand">Booked in Seconds.</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted max-w-2xl">
          Skilled, vetted residential cleaners across Johannesburg North. Book via WhatsApp — confirmed
          in writing within 2 hours.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#packages"
            className="inline-flex items-center gap-2 bg-brand text-ink px-6 py-3.5 rounded-full font-semibold shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all"
          >
            Book a Clean
          </a>
          <a
            href="#process"
            className="inline-flex items-center gap-2 bg-transparent border-2 border-ink/15 text-ink px-6 py-3.5 rounded-full font-semibold hover:border-ink/40 transition-colors"
          >
            How It Works
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
          <TrustItem icon={ShieldCheck} text="Vetted Cleaners" />
          <TrustItem icon={FileCheck2} text="Written Confirmation" />
          <TrustItem icon={CheckCircle2} text="Quality Guaranteed" />
          <TrustItem icon={MapPin} text="Sandton · Midrand · Centurion" />
        </div>
      </div>
    </section>
  )
}

function TrustItem({ icon: Icon, text }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon size={16} className="text-success" strokeWidth={2.5} />
      <span className="font-medium text-ink/80">{text}</span>
    </span>
  )
}

/* ----------------- Packages ----------------- */
function Packages({ onSelect, selected }) {
  return (
    <section id="packages" className="py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading
          eyebrow="Packages"
          title="Choose Your Clean"
          subtitle="Transparent pricing. Pick the package that fits — we’ll confirm the exact total when we accept your booking."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PACKAGES.map((p) => {
            const Icon = p.icon
            const isSelected = selected === p.id
            return (
              <article
                key={p.id}
                className={[
                  'relative flex flex-col rounded-2xl border p-6 transition-all',
                  p.isAddon
                    ? 'bg-brand-soft/40 border-brand/30'
                    : 'bg-white border-line shadow-card hover:shadow-cardHover hover:-translate-y-1',
                  isSelected ? 'ring-2 ring-brand' : '',
                ].join(' ')}
              >
                {p.isAddon && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold tracking-widest uppercase bg-brand text-ink px-2 py-1 rounded-full">
                    Add-On
                  </span>
                )}
                <div className="w-12 h-12 rounded-xl bg-brand/15 grid place-items-center mb-5">
                  <Icon size={24} className="text-brand-dark" strokeWidth={2.2} />
                </div>
                <h3 className="font-display font-bold text-lg">{p.name}</h3>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <Clock size={13} /> {p.duration}
                </div>
                <div className="mt-3 font-display font-extrabold text-2xl text-ink">{p.price}</div>
                <div className="text-xs text-muted">{p.bestFor}</div>

                <ul className="mt-5 space-y-2 text-sm text-ink/80 flex-1">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-success mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={[
                    'mt-6 inline-flex items-center justify-center gap-1.5 w-full rounded-full px-4 py-2.5 font-semibold text-sm transition-colors',
                    isSelected
                      ? 'bg-success text-white'
                      : 'bg-ink text-cream hover:bg-brand hover:text-ink',
                  ].join(' ')}
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 size={16} /> Selected
                    </>
                  ) : (
                    'Select'
                  )}
                </button>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ----------------- How It Works ----------------- */
function HowItWorks() {
  const steps = [
    { n: 1, title: 'Choose Your Clean', text: 'Pick a package and date below.' },
    { n: 2, title: 'Send via WhatsApp', text: 'One tap submits your booking.' },
    { n: 3, title: 'Get Confirmed', text: 'We reply with written confirmation within 2 hours.' },
    { n: 4, title: 'We Clean', text: 'Cleaner arrives on time, ready to deliver.' },
  ]
  return (
    <section id="process" className="py-20 sm:py-24 bg-white border-y border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title="Four simple steps."
          subtitle="No phone tag. No quote forms. Just a straight path from booking to a clean home."
        />

        <ol className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((s, i) => (
            <li key={s.n} className="relative">
              <div className="flex md:flex-col items-start md:items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-brand text-ink font-display font-extrabold text-lg grid place-items-center shadow-card flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">{s.title}</h3>
                  <p className="text-sm text-muted mt-1">{s.text}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(100%-1rem)] w-[calc(100%-2.5rem)] h-px border-t-2 border-dashed border-brand/40" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* ----------------- Booking Form ----------------- */
function BookingForm(props) {
  const {
    formCardRef, highlightForm,
    pkg, setPkg,
    addLaundry, setAddLaundry,
    laundryLoads, setLaundryLoads,
    date, setDate,
    time, setTime,
    name, setName,
    suburb, setSuburb,
    propertyType, setPropertyType,
    bedrooms, setBedrooms,
    bathrooms, setBathrooms,
    notes, setNotes,
    ack, setAck,
    errors, onSubmit, submitted, waUrl,
    onOpenChecklist, onReset,
  } = props

  const packageOptions = [
    { id: 'two-hour', label: 'Two-Hour Express' },
    { id: 'half-day', label: 'Half-Day Clean' },
    { id: 'full-day', label: 'Full-Day Deep Clean' },
    { id: 'other', label: 'Other / Not sure' },
  ]

  return (
    <section id="book" className="py-20 sm:py-24 bg-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <SectionHeading
          eyebrow="Book"
          title="Book Your Clean"
          subtitle="Fill in your details — we’ll prep a WhatsApp message you can send with one tap."
        />

        <form
          ref={formCardRef}
          onSubmit={onSubmit}
          className={[
            'mt-10 bg-white rounded-2xl border border-line shadow-card p-6 sm:p-8 space-y-7',
            highlightForm ? 'animate-pulseHighlight' : '',
          ].join(' ')}
          noValidate
        >
          {submitted ? (
            <SubmittedState waUrl={waUrl} onReset={onReset} />
          ) : (
            <>
              {/* Package */}
              <Field label="Choose a package" error={errors.pkg} dataField="pkg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {packageOptions.map((opt) => {
                    const active = pkg === opt.id
                    return (
                      <label
                        key={opt.id}
                        className={[
                          'flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all',
                          active
                            ? 'border-brand bg-brand/5 shadow-sm'
                            : 'border-line bg-white hover:border-ink/30',
                        ].join(' ')}
                      >
                        <RadioDot active={active} />
                        <input
                          type="radio"
                          name="package"
                          value={opt.id}
                          checked={active}
                          onChange={() => setPkg(opt.id)}
                          className="sr-only"
                        />
                        <span className={['text-sm', active ? 'font-semibold text-ink' : 'font-medium text-ink/85'].join(' ')}>
                          {opt.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </Field>

              {/* Laundry — card with toggle */}
              <div className="rounded-2xl border border-brand/25 bg-brand-soft/35 p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-display font-bold text-base text-ink">Add laundry?</div>
                  <p className="text-sm text-muted mt-0.5">Wash, fold, light ironing — added to your clean.</p>
                  {addLaundry && (
                    <div className="mt-3 inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-muted">Loads</span>
                      <Stepper value={laundryLoads} setValue={setLaundryLoads} min={1} max={20} />
                    </div>
                  )}
                </div>
                <Toggle
                  checked={addLaundry}
                  onChange={setAddLaundry}
                  label="Toggle laundry add-on"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Preferred date" error={errors.date} dataField="date">
                  <input
                    type="date"
                    min={todayIso()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputCls(!!errors.date)}
                  />
                </Field>
                <Field label="Preferred time" error={errors.time} dataField="time">
                  <Select value={time} onChange={setTime} placeholder="Select a time" options={TIMES} hasError={!!errors.time} />
                  <p className="mt-2 text-xs text-muted">
                    Saturday: 08:00–14:00 only. We’ll confirm exact arrival when we respond.
                  </p>
                </Field>
              </div>

              {/* Name (full width) */}
              <Field label="Your name" error={errors.name} dataField="name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Thandi M."
                  className={inputCls(!!errors.name)}
                  autoComplete="name"
                />
              </Field>

              {/* Suburb + Property type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Suburb" error={errors.suburb} dataField="suburb">
                  <Select
                    value={suburb}
                    onChange={setSuburb}
                    placeholder="Select your suburb"
                    groups={SUBURB_GROUPS}
                    extraOptions={[OTHER_SUBURB]}
                    hasError={!!errors.suburb}
                  />
                  {suburb === OTHER_SUBURB && (
                    <p className="mt-2 text-xs text-muted">
                      Outside our usual area? A small travel surcharge may apply — we’ll quote in writing.
                    </p>
                  )}
                </Field>
                <Field label="Property type" error={errors.propertyType} dataField="propertyType">
                  <Select value={propertyType} onChange={setPropertyType} placeholder="Select a type" options={PROPERTY_TYPES} hasError={!!errors.propertyType} />
                </Field>
              </div>

              {/* Bedrooms + Bathrooms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Bedrooms">
                  <Stepper value={bedrooms} setValue={setBedrooms} min={1} max={6} suffixOnMax="+" />
                </Field>
                <Field label="Bathrooms">
                  <Stepper value={bathrooms} setValue={setBathrooms} min={1} max={4} suffixOnMax="+" />
                </Field>
              </div>

              {/* Notes */}
              <Field label={<>Special instructions <span className="text-muted font-normal">(optional)</span></>}>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Anything we should know? E.g. pets at home, access instructions, areas to focus on..."
                  className={inputCls(false) + ' resize-y min-h-[112px]'}
                />
              </Field>

              {/* Acknowledge — panel */}
              <div data-field="ack">
                <label
                  className={[
                    'flex items-start gap-3 rounded-2xl border-2 p-4 sm:p-5 cursor-pointer transition-colors',
                    ack ? 'border-brand bg-brand/5' : 'border-line bg-cream/60 hover:border-ink/30',
                    errors.ack ? 'border-red-400' : '',
                  ].join(' ')}
                >
                  <RadioDot active={ack} className="mt-0.5" />
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm leading-relaxed text-ink/90">
                    I understand Dynamic Dusters provides skilled labour only. I will have all cleaning
                    products and equipment ready at the property.{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onOpenChecklist()
                      }}
                      className="text-brand-dark underline font-semibold hover:text-ink"
                    >
                      View Checklist
                    </button>
                  </span>
                </label>
                {errors.ack && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.ack}</p>}
              </div>

              {/* Live price estimate */}
              <PriceSummary
                pkg={pkg}
                bedrooms={bedrooms}
                bathrooms={bathrooms}
                addLaundry={addLaundry}
                laundryLoads={laundryLoads}
              />

              {/* Submit */}
              <button
                type="submit"
                className="group w-full inline-flex items-center justify-center gap-2.5 text-ink px-6 py-4 rounded-full font-semibold text-base shadow-card hover:scale-[1.01] hover:shadow-cardHover transition-all"
                style={{ background: 'linear-gradient(180deg, #F5A623 0%, #E69612 100%)' }}
              >
                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                Send Booking via WhatsApp
              </button>
              <p className="text-center text-xs text-muted -mt-3">
                Opens WhatsApp in a new tab with your booking pre-filled.
              </p>
            </>
          )}
        </form>
      </div>
    </section>
  )
}

function SubmittedState({ waUrl, onReset }) {
  return (
    <div className="text-center py-6">
      <div className="w-14 h-14 mx-auto rounded-full bg-success/10 grid place-items-center">
        <CheckCircle2 size={32} className="text-success" />
      </div>
      <h3 className="mt-4 font-display font-bold text-2xl">Opening WhatsApp…</h3>
      <p className="mt-2 text-muted text-sm max-w-md mx-auto">
        Your booking message is ready. If WhatsApp didn’t open automatically,{' '}
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="text-brand-dark underline font-semibold">
          click here to open it manually
        </a>
        .
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 text-sm font-semibold text-muted hover:text-ink"
      >
        ← Edit booking
      </button>
    </div>
  )
}

/* ----------------- Form helpers ----------------- */
function Field({ label, error, dataField, children }) {
  return (
    <div data-field={dataField}>
      {label && (
        <label className="block text-sm font-semibold text-ink mb-2">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

function PriceSummary({ pkg, bedrooms, bathrooms, addLaundry, laundryLoads }) {
  if (!pkg) {
    return (
      <div className="rounded-2xl border border-line bg-cream/60 p-5 text-sm text-muted">
        Choose a package above to see your estimated total.
      </div>
    )
  }
  if (pkg === 'other') {
    return (
      <div className="rounded-2xl border border-brand/25 bg-brand-soft/30 p-5 text-sm text-ink/85">
        We’ll recommend the right package and quote your total when we accept the booking.
      </div>
    )
  }

  const p = calcPrice({ pkg, bedrooms, bathrooms, addLaundry, laundryLoads })
  if (!p) return null

  const lines = [
    { label: `${p.label}`, amount: p.base },
  ]
  if (p.extraBeds > 0) lines.push({ label: `+ ${p.extraBeds} extra bedroom${p.extraBeds > 1 ? 's' : ''}`, amount: p.bedroomCharge })
  if (p.extraBaths > 0) lines.push({ label: `+ ${p.extraBaths} extra bathroom${p.extraBaths > 1 ? 's' : ''}`, amount: p.bathroomCharge })
  if (p.laundryCharge > 0) lines.push({ label: `+ Laundry × ${p.laundryLoads} load${p.laundryLoads > 1 ? 's' : ''}`, amount: p.laundryCharge })

  return (
    <div className="rounded-2xl border-2 border-brand/30 bg-brand-soft/30 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display font-bold text-base text-ink">Your estimate</h3>
        <span className="text-[11px] uppercase tracking-widest font-semibold text-brand-dark">Live</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {lines.map((l, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className={i === 0 ? 'font-semibold text-ink' : 'text-ink/80'}>{l.label}</span>
            <span className={i === 0 ? 'font-semibold tabular-nums' : 'text-ink/80 tabular-nums'}>
              {formatRand(l.amount)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-brand/25 flex items-baseline justify-between gap-3">
        <span className="font-display font-bold text-ink">Estimated total</span>
        <span className="font-display font-extrabold text-2xl text-ink tabular-nums">{formatRand(p.total)}</span>
      </div>
      <p className="mt-2 text-xs text-muted leading-relaxed">
        Confirmed in writing when we accept your booking. Travel surcharge may apply for areas
        outside our usual zones.
      </p>
    </div>
  )
}

function RadioDot({ active, className = '' }) {
  return (
    <span
      aria-hidden
      className={[
        'flex-shrink-0 w-5 h-5 rounded-full border-2 grid place-items-center transition-colors',
        active ? 'border-brand' : 'border-line',
        className,
      ].join(' ')}
    >
      {active && <span className="w-2.5 h-2.5 rounded-full bg-brand" />}
    </span>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        checked ? 'bg-brand' : 'bg-line',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

function inputCls(hasError) {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/70',
    'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-colors',
    hasError ? 'border-red-400' : 'border-line hover:border-ink/30',
  ].join(' ')
}

function Select({ value, onChange, options, groups, extraOptions, placeholder, hasError }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls(hasError) + ' appearance-none pr-10 cursor-pointer'}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {groups
          ? groups.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.suburbs.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            ))
          : (options || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        {extraOptions?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  )
}

function Stepper({ value, setValue, min = 0, max = 99, suffixOnMax }) {
  const showSuffix = suffixOnMax && value >= max
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white">
      <button
        type="button"
        onClick={() => setValue(Math.max(min, value - 1))}
        className="px-3 py-2.5 text-muted hover:text-ink disabled:opacity-30"
        disabled={value <= min}
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>
      <span className="px-4 min-w-[2.5rem] text-center font-semibold text-sm tabular-nums">
        {value}{showSuffix ? '+' : ''}
      </span>
      <button
        type="button"
        onClick={() => setValue(Math.min(max, value + 1))}
        className="px-3 py-2.5 text-muted hover:text-ink disabled:opacity-30"
        disabled={value >= max}
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

/* ----------------- Service Area ----------------- */
function ServiceArea() {
  return (
    <section id="area" className="py-20 sm:py-24 bg-white border-y border-line">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <SectionHeading
          eyebrow="Coverage"
          title="Where We Clean"
          subtitle="From Johannesburg North through Midrand to Centurion. Three regions, one consistent standard."
          centered
        />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUBURB_GROUPS.map((g) => (
            <div
              key={g.region}
              className="rounded-2xl border border-line bg-cream/60 p-6 text-left"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-brand-dark" />
                <h3 className="font-display font-bold text-base text-ink">{g.region}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.suburbs.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center bg-white border border-line rounded-full px-3 py-1 text-xs font-semibold text-ink/85"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted">
          Outside these areas? Send us a message — a small travel surcharge may apply.
        </p>
      </div>
    </section>
  )
}

/* ----------------- FAQ ----------------- */
function FAQ({ openFaq, setOpenFaq }) {
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Questions, answered." centered />
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQS.map((f, i) => {
            const open = openFaq === i
            return (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between text-left py-5 gap-4 group"
                  aria-expanded={open}
                >
                  <span className="font-display font-semibold text-base sm:text-lg text-ink group-hover:text-brand-dark transition-colors">
                    {f.q}
                  </span>
                  <ChevronDown
                    size={20}
                    className={[
                      'flex-shrink-0 text-muted transition-transform',
                      open ? 'rotate-180 text-brand-dark' : '',
                    ].join(' ')}
                  />
                </button>
                {open && (
                  <p className="pb-6 text-muted text-sm sm:text-base animate-fadeIn">{f.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ----------------- Footer ----------------- */
function Footer() {
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}`
  return (
    <footer className="bg-ink text-cream/90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <LogoBadge size={36} />
            <span className="font-display font-bold text-base text-cream">Dynamic Dusters</span>
          </div>
          <p className="text-cream/70 italic">"We Don’t Cut Corners, We Clean Them."</p>
          <p className="mt-3 text-cream/60 text-xs">Dynamic Dusters (Pty) Ltd</p>
        </div>

        <div className="sm:text-center">
          <h4 className="font-display font-semibold text-cream mb-3">Get in touch</h4>
          <ul className="space-y-2">
            <li>
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="hover:text-brand transition-colors inline-flex items-center gap-1.5">
                <MessageCircle size={14} /> WhatsApp us
              </a>
            </li>
            <li>
              <a href="mailto:hello@dynamicdusters.co.za" className="hover:text-brand transition-colors">
                hello@dynamicdusters.co.za
              </a>
            </li>
          </ul>
        </div>

        <div className="sm:text-right">
          <h4 className="font-display font-semibold text-cream mb-3">Powered by</h4>
          <a
            href="https://solvexsystems.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cream/70 hover:text-brand transition-colors text-xs"
          >
            Proudly supported by SolveX Systems (Pty) Ltd
          </a>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-xs text-cream/50 text-center">
          © 2026 Dynamic Dusters (Pty) Ltd. All Rights Reserved.
        </div>
      </div>
    </footer>
  )
}

/* ----------------- Section Heading ----------------- */
function SectionHeading({ eyebrow, title, subtitle, centered }) {
  return (
    <div className={centered ? 'text-center' : ''}>
      {eyebrow && (
        <div className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-brand-dark mb-3">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight text-ink">
        {title}
      </h2>
      {subtitle && (
        <p className={['mt-3 text-muted text-base sm:text-lg', centered ? 'max-w-2xl mx-auto' : 'max-w-2xl'].join(' ')}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

/* ----------------- Checklist Modal ----------------- */
function ChecklistModal({ open, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => {
      const closeBtn = dialogRef.current?.querySelector('[data-close]')
      closeBtn?.focus()
    }, 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const products = [
    'Multi-surface cleaner',
    'Toilet bowl cleaner',
    'Glass and mirror cleaner',
    'Floor cleaner (suited to your floor type)',
    'Dishwashing liquid',
    'Bleach or disinfectant',
    'Drain cleaner (if needed)',
  ]
  const equipment = [
    'Microfibre cloths (min. 4, clean)',
    'Sponges or scrubbing pads',
    'Toilet brush (per bathroom)',
    'Mop and bucket (functional)',
    'Broom and dustpan',
    'Vacuum cleaner (functional)',
    'Rubbish bags (correct sizes)',
  ]

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checklist-title"
    >
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
      >
        <button
          type="button"
          onClick={onClose}
          data-close
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-cream hover:bg-line grid place-items-center text-muted hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="p-7 sm:p-8">
          <div className="text-xs font-bold tracking-[0.2em] uppercase text-brand-dark mb-2">
            What to have ready
          </div>
          <h3 id="checklist-title" className="font-display font-extrabold text-2xl">
            Products Checklist
          </h3>
          <p className="mt-2 text-sm text-muted">
            Dynamic Dusters provides skilled labour. To get the best result, please have these ready.
          </p>

          <div className="mt-6">
            <h4 className="font-display font-semibold text-base mb-3">Cleaning Products (you supply)</h4>
            <ul className="space-y-2">
              {products.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-ink/90">
                  <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <h4 className="font-display font-semibold text-base mb-3">Equipment (available at property)</h4>
            <ul className="space-y-2">
              {equipment.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-ink/90">
                  <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-xl bg-brand-soft/50 border border-brand/20 p-4 text-xs text-ink/80">
            If anything is unavailable, please let us know at least 24 hours before your booking.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-7 w-full bg-ink text-cream rounded-full px-5 py-3 font-semibold text-sm hover:bg-brand hover:text-ink transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
