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

/* ============================================================
 * Motion utilities
 * ============================================================ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return reduced
}

/* IntersectionObserver-based reveal — adds .is-visible when in view. */
function useReveal(options = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-visible')
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            obs.unobserve(el)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px', ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* Animated number — eases from previous value to current `value`. */
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      fromRef.current = value
      return
    }
    cancelAnimationFrame(rafRef.current)
    const from = fromRef.current
    const to = value
    if (from === to) return
    startRef.current = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(from + (to - from) * eased)
      setDisplay(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])
  return <>{formatRand(display)}</>
}

/* Cursor glow follower — single fixed div with smoothed (lerp) tracking. */
function CursorGlow() {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()
  useEffect(() => {
    if (reduced) return
    if (window.matchMedia('(hover: none)').matches) return
    const el = ref.current
    if (!el) return
    let tx = window.innerWidth / 2, ty = window.innerHeight / 2
    let cx = tx, cy = ty
    let raf = 0
    const onMove = (e) => {
      tx = e.clientX
      ty = e.clientY
      el.classList.add('is-active')
    }
    const onLeave = () => el.classList.remove('is-active')
    const tick = () => {
      cx += (tx - cx) * 0.15
      cy += (ty - cy) * 0.15
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [reduced])
  return <div ref={ref} className="cursor-glow" aria-hidden />
}

/* Generic 3D tilt — pass through a wrapper or use the hook directly. */
function useTilt({ max = 8, scale = 1.02 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      const rx = (0.5 - py) * max * 2
      const ry = (px - 0.5) * max * 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [max, scale])
  return ref
}

/* Magnetic effect — element translates toward the cursor when hovered. */
function useMagnetic({ strength = 0.35, radius = 120 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > radius) {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => { el.style.transform = '' })
        return
      }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength, radius])
  return ref
}

/* Parallax — translates an element based on global pointer position. */
function useParallax({ strength = 12 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    let raf = 0
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * strength
      const y = (e.clientY / window.innerHeight - 0.5) * strength
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [strength])
  return ref
}

/* ============================================================
 * Scroll-experience layer
 * ============================================================ */

/* Global scroll Y + velocity store, updated by a single rAF loop
 * that we initialise once per page. Components subscribe via hooks. */
const scrollState = {
  y: 0,
  vy: 0,
  height: 1,
  initialized: false,
  listeners: new Set(),
}

function initScrollLoop() {
  if (scrollState.initialized) return
  scrollState.initialized = true
  let last = window.scrollY
  let lastTs = performance.now()
  const loop = (ts) => {
    const cur = window.scrollY
    const dt = Math.max(1, ts - lastTs)
    const vy = (cur - last) / dt // px per ms
    scrollState.y = cur
    scrollState.vy = scrollState.vy * 0.7 + vy * 0.3 // smoothed velocity
    scrollState.height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    last = cur
    lastTs = ts
    scrollState.listeners.forEach((fn) => fn())
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function useScrollSubscribe(fn) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    initScrollLoop()
    scrollState.listeners.add(fn)
    fn() // initial run
    return () => scrollState.listeners.delete(fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/* Returns a ref + a callback ref-based progress hook.
 * The progress is 0 when the element's top hits the viewport bottom,
 * and 1 when its bottom passes the viewport top.
 * Provides this via CSS variables on the element so styles can bind. */
function useScrollProgress({ onProgress } = {}) {
  const ref = useRef(null)
  useScrollSubscribe(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    // Span: from element-enters-viewport to element-leaves-viewport
    const start = vh
    const end = -r.height
    const raw = (start - r.top) / (start - end)
    const p = Math.max(0, Math.min(1, raw))
    el.style.setProperty('--scroll-progress', p.toFixed(4))
    if (onProgress) onProgress(p, r)
  })
  return ref
}

/* Global scroll progress bar across page total */
function ScrollProgressBar() {
  const ref = useRef(null)
  useScrollSubscribe(() => {
    const el = ref.current
    if (!el) return
    const p = scrollState.y / scrollState.height
    el.style.setProperty('--scroll-progress', Math.max(0, Math.min(1, p)).toFixed(4))
  })
  return <div ref={ref} className="scroll-progress" aria-hidden />
}

/* Smooth-scroll wrapper using rAF lerp. We intercept wheel events
 * and animate window.scrollY toward a target. Disabled on touch
 * (native momentum scroll is better) and reduced-motion. */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return
    if (matchMedia('(pointer: coarse)').matches) return
    let target = window.scrollY
    let current = target
    let raf = 0
    let active = false

    const tick = () => {
      current += (target - current) * 0.12
      if (Math.abs(target - current) < 0.5) {
        current = target
        active = false
        window.scrollTo(0, current)
        return
      }
      window.scrollTo(0, current)
      raf = requestAnimationFrame(tick)
    }
    const onWheel = (e) => {
      // Allow modifier-driven zoom / horizontal scroll behaviour
      if (e.ctrlKey || e.metaKey || e.deltaX !== 0) return
      e.preventDefault()
      target = Math.max(0, Math.min(
        document.documentElement.scrollHeight - window.innerHeight,
        target + e.deltaY
      ))
      if (!active) {
        current = window.scrollY
        active = true
        raf = requestAnimationFrame(tick)
      }
    }
    // Sync target if user uses keyboard, anchor, or touch
    const onScroll = () => {
      if (!active) target = window.scrollY
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])
}

/* Cursor trail — N small dots trailing the cursor with progressive lag */
function CursorTrail({ count = 6 }) {
  const refs = useRef([])
  refs.current = []
  const setRef = (el) => el && refs.current.push(el)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    if (window.matchMedia('(hover: none)').matches) return
    const dots = refs.current
    if (!dots.length) return
    const positions = dots.map(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    let raf = 0
    const onMove = (e) => { mx = e.clientX; my = e.clientY }
    const tick = () => {
      // First dot follows the cursor with high lerp; each subsequent dot
      // chases the previous, producing a soft tail.
      let prevX = mx, prevY = my
      for (let i = 0; i < dots.length; i++) {
        const ease = 0.32 - i * 0.035
        positions[i].x += (prevX - positions[i].x) * ease
        positions[i].y += (prevY - positions[i].y) * ease
        const scale = 1 - i * 0.12
        const opacity = 0.85 - i * 0.12
        dots[i].style.transform = `translate3d(${positions[i].x}px, ${positions[i].y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(2)})`
        dots[i].style.opacity = opacity.toFixed(2)
        prevX = positions[i].x
        prevY = positions[i].y
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
    }
  }, [reduced])

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} ref={setRef} className="cursor-trail-dot" aria-hidden />
      ))}
    </>
  )
}

export default function App() {
  useSmoothScroll()
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
      <ScrollProgressBar />
      <CursorGlow />
      <CursorTrail count={6} />
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
  const logoParallax = useParallax({ strength: 18 })
  const primaryCTA = useMagnetic({ strength: 0.3, radius: 110 })
  const ghostCTA = useMagnetic({ strength: 0.25, radius: 110 })

  // Scroll choreography — bind transforms to scroll progress through the hero
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const logoStageRef = useRef(null)
  const blobARef = useRef(null)
  const blobBRef = useRef(null)
  const blobCRef = useRef(null)

  useScrollSubscribe(() => {
    const section = sectionRef.current
    if (!section) return
    const r = section.getBoundingClientRect()
    const vh = window.innerHeight
    // Progress from 0 (hero fully on-screen at top) to 1 (hero scrolled past)
    const p = Math.max(0, Math.min(1, -r.top / Math.max(1, vh * 0.9)))
    if (stageRef.current) {
      stageRef.current.style.setProperty('--hero-y', `${(-p * 60).toFixed(2)}px`)
      stageRef.current.style.setProperty('--hero-scale', `${(1 - p * 0.06).toFixed(4)}`)
      stageRef.current.style.setProperty('--hero-opacity', `${(1 - p * 0.65).toFixed(3)}`)
    }
    if (logoStageRef.current) {
      logoStageRef.current.style.setProperty('--hero-logo-rot', `${(p * 14).toFixed(2)}deg`)
      logoStageRef.current.style.setProperty('--hero-logo-scale', `${(1 - p * 0.18).toFixed(4)}`)
    }
    // Blobs drift at different rates — depth illusion
    if (blobARef.current) blobARef.current.style.transform = `translate3d(${(-p * 80).toFixed(1)}px, ${(-p * 30).toFixed(1)}px, 0)`
    if (blobBRef.current) blobBRef.current.style.transform = `translate3d(${(p * 60).toFixed(1)}px, ${(p * 50).toFixed(1)}px, 0)`
    if (blobCRef.current) blobCRef.current.style.transform = `translate3d(${(p * 100).toFixed(1)}px, ${(-p * 80).toFixed(1)}px, 0)`
  })

  // Sparkle positions — fixed seed so layout is stable per render
  const sparkles = [
    { left: '8%',  top: '70%', size: 6,  delay: 0,    dur: 8.5 },
    { left: '18%', top: '40%', size: 10, delay: 1500, dur: 10 },
    { left: '28%', top: '85%', size: 8,  delay: 600,  dur: 9 },
    { left: '46%', top: '30%', size: 7,  delay: 2200, dur: 11 },
    { left: '58%', top: '78%', size: 9,  delay: 800,  dur: 9.5 },
    { left: '72%', top: '20%', size: 6,  delay: 3000, dur: 10.5 },
    { left: '82%', top: '60%', size: 11, delay: 400,  dur: 9 },
    { left: '92%', top: '45%', size: 7,  delay: 1800, dur: 10 },
    { left: '38%', top: '60%', size: 5,  delay: 2500, dur: 8 },
    { left: '64%', top: '50%', size: 6,  delay: 1200, dur: 9.2 },
  ]

  const headline = ['Professional', 'Cleaning,']
  const headlineAccent = ['Booked', 'in', 'Seconds.']

  return (
    <section ref={sectionRef} id="top" className="hero-gradient relative overflow-hidden">
      {/* Floating colored blobs (scroll-driven offsets) */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <span ref={blobARef} className="blob blob-a scroll-driven" />
        <span ref={blobBRef} className="blob blob-b scroll-driven" />
        <span ref={blobCRef} className="blob blob-c scroll-driven" />
      </div>

      {/* Dotted overlay */}
      <div className="hero-pattern absolute inset-0 opacity-50 pointer-events-none" />

      {/* Sparkle particles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {sparkles.map((s, i) => (
          <span
            key={i}
            className="sparkle"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}ms`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      <div ref={stageRef} className="hero-stage relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-28">
        <div ref={logoParallax} className="mb-8 inline-block">
          <div ref={logoStageRef} className="hero-logo-stage inline-block">
            <LogoBadge size={140} />
          </div>
        </div>

        <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight max-w-3xl">
          <span className="overflow-hidden inline-block align-bottom">
            {headline.map((w, i) => (
              <span
                key={i}
                className="headline-word mr-3"
                style={{ '--word-delay': `${i * 80 + 200}ms` }}
              >
                {w}
              </span>
            ))}
          </span>
          <br />
          <span className="overflow-hidden inline-block align-bottom text-brand">
            {headlineAccent.map((w, i) => (
              <span
                key={i}
                className="headline-word mr-3"
                style={{ '--word-delay': `${(headline.length + i) * 80 + 300}ms` }}
              >
                {w}
              </span>
            ))}
          </span>
        </h1>

        <p
          className="mt-5 text-base sm:text-lg text-muted max-w-2xl headline-word"
          style={{ '--word-delay': '700ms' }}
        >
          Skilled, vetted residential cleaners across Johannesburg North, Midrand and Centurion.
          Book via WhatsApp — confirmed in writing within 2 hours.
        </p>

        <div
          className="mt-8 flex flex-wrap gap-3 headline-word"
          style={{ '--word-delay': '850ms' }}
        >
          <a
            ref={primaryCTA}
            href="#packages"
            className="magnetic inline-flex items-center gap-2 bg-brand text-ink px-6 py-3.5 rounded-full font-semibold shadow-card hover:shadow-cardHover transition-shadow"
          >
            Book a Clean
          </a>
          <a
            ref={ghostCTA}
            href="#process"
            className="magnetic inline-flex items-center gap-2 bg-white/60 backdrop-blur border-2 border-ink/15 text-ink px-6 py-3.5 rounded-full font-semibold hover:border-ink/40 transition-colors"
          >
            How It Works
          </a>
        </div>

        <div
          className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted headline-word"
          style={{ '--word-delay': '1000ms' }}
        >
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
    <section id="packages" className="relative overflow-hidden py-20 sm:py-24">
      <BgNumeral text="01" right="-3vw" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 z-10">
        <Reveal>
          <SectionHeading
            eyebrow="Packages"
            title="Choose Your Clean"
            subtitle="Transparent pricing. Pick the package that fits — we’ll confirm the exact total when we accept your booking."
          />
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
          {PACKAGES.map((p, i) => (
            <ScrollStaggerCard key={p.id} index={i}>
              <PackageCard p={p} isSelected={selected === p.id} onSelect={onSelect} />
            </ScrollStaggerCard>
          ))}
        </div>
      </div>
    </section>
  )
}

/* Wrapper that animates each card in from alternating sides with rotation
 * tied to its own scroll progress. More dramatic than a simple Reveal. */
function ScrollStaggerCard({ index, children }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          setVisible(true)
          obs.unobserve(el)
        }
      }),
      { threshold: 0.2, rootMargin: '0px 0px -60px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const fromLeft = index % 2 === 0
  const x = visible ? '0px' : (fromLeft ? '-80px' : '80px')
  const rot = visible ? '0deg' : (fromLeft ? '-6deg' : '6deg')
  const opacity = visible ? 1 : 0
  return (
    <div
      ref={ref}
      style={{
        transform: `translate3d(${x}, ${visible ? 0 : 40}px, 0) rotate(${rot})`,
        opacity,
        transition: `transform 900ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 110}ms, opacity 700ms ease-out ${index * 110}ms`,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  )
}

/* Massive faded background numeral that parallaxes vertically with scroll. */
function BgNumeral({ text, left, right }) {
  const ref = useRef(null)
  useScrollSubscribe(() => {
    const el = ref.current
    if (!el?.parentElement) return
    const r = el.parentElement.getBoundingClientRect()
    const vh = window.innerHeight
    const span = vh + r.height
    const p = Math.max(0, Math.min(1, (vh - r.top) / span))
    el.style.setProperty('--numeral-y', `${(p * 220 - 110).toFixed(1)}px`)
  })
  return (
    <span
      ref={ref}
      className="bg-numeral select-none"
      style={{
        ...(left !== undefined ? { left } : {}),
        ...(right !== undefined ? { right } : {}),
        top: '50%',
      }}
      aria-hidden
    >
      {text}
    </span>
  )
}

function PackageCard({ p, isSelected, onSelect }) {
  const Icon = p.icon
  const tilt = useTilt({ max: 6, scale: 1.02 })
  return (
    <article
      ref={tilt}
      className={[
        'tilt h-full relative flex flex-col rounded-2xl border p-6',
        p.isAddon
          ? 'bg-brand-soft/40 border-brand/30'
          : 'bg-white border-line shadow-card hover:shadow-cardHover',
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
}

/* ----------------- How It Works ----------------- */
function HowItWorks() {
  const steps = [
    { n: 1, title: 'Choose Your Clean', text: 'Pick a package and date below.' },
    { n: 2, title: 'Send via WhatsApp', text: 'One tap submits your booking.' },
    { n: 3, title: 'Get Confirmed', text: 'We reply with written confirmation within 2 hours.' },
    { n: 4, title: 'We Clean', text: 'Cleaner arrives on time, ready to deliver.' },
  ]

  // Section-level scroll progress drives a giant numeral that slides
  // horizontally in the background as the user scrolls through the steps.
  const sectionRef = useRef(null)
  const numeralRef = useRef(null)
  useScrollSubscribe(() => {
    const sec = sectionRef.current
    const num = numeralRef.current
    if (!sec || !num) return
    const r = sec.getBoundingClientRect()
    const vh = window.innerHeight
    const span = vh + r.height
    const p = Math.max(0, Math.min(1, (vh - r.top) / span))
    // -120px (above) to +120px (below)
    num.style.setProperty('--numeral-y', `${(p * 240 - 120).toFixed(1)}px`)
    num.style.opacity = (0.5 + Math.sin(p * Math.PI) * 0.5).toFixed(2)
  })

  return (
    <section ref={sectionRef} id="process" className="relative overflow-hidden py-20 sm:py-24 bg-white border-y border-line">
      {/* Massive parallax numeral spanning the section background */}
      <span
        ref={numeralRef}
        className="bg-numeral select-none"
        style={{ left: '-2vw', top: '50%', transform: 'translateY(-50%)' }}
        aria-hidden
      >
        02
      </span>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 z-10">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Four simple steps."
            subtitle="No phone tag. No quote forms. Just a straight path from booking to a clean home."
          />
        </Reveal>

        <ol className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 120} className="relative">
              <div className="flex md:flex-col items-start md:items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-brand text-ink font-display font-extrabold text-lg grid place-items-center shadow-card flex-shrink-0 hover:scale-110 hover:rotate-6 transition-transform">
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
            </Reveal>
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
    <section id="book" className="relative overflow-hidden py-20 sm:py-24 bg-cream">
      <BgNumeral text="03" left="-4vw" />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 z-10">
        <Reveal>
          <SectionHeading
            eyebrow="Book"
            title="Book Your Clean"
            subtitle="Fill in your details — we’ll prep a WhatsApp message you can send with one tap."
          />
        </Reveal>

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
        <span className="font-display font-extrabold text-2xl text-ink tabular-nums">
          <AnimatedNumber value={p.total} />
        </span>
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
    <section id="area" className="relative overflow-hidden py-20 sm:py-24 bg-white border-y border-line">
      <BgNumeral text="04" right="-3vw" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center z-10">
        <Reveal>
          <SectionHeading
            eyebrow="Coverage"
            title="Where We Clean"
            subtitle="From Johannesburg North through Midrand to Centurion. Three regions, one consistent standard."
            centered
          />
        </Reveal>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUBURB_GROUPS.map((g, i) => (
            <Reveal
              key={g.region}
              delay={i * 110}
              className="rounded-2xl border border-line bg-cream/60 p-6 text-left hover:border-brand/40 hover:shadow-card transition-all"
            >
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-brand-dark" />
                <h3 className="font-display font-bold text-base text-ink">{g.region}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.suburbs.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center bg-white border border-line rounded-full px-3 py-1 text-xs font-semibold text-ink/85 hover:bg-brand/10 hover:border-brand/50 hover:scale-105 transition-all cursor-default"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Reveal>
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
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions, answered." centered />
        </Reveal>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQS.map((f, i) => {
            const open = openFaq === i
            return (
              <Reveal as="div" delay={i * 60} key={f.q}>
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
              </Reveal>
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
          Subsidiary of SolveX Systems (Pty) Ltd
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
