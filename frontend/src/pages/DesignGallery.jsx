import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot, { PARROT_STATES } from '../components/mascot/Parrot.jsx';
import SectionShell from '../components/ui/SectionShell.jsx';
import Eyebrow from '../components/ui/Eyebrow.jsx';
import SectionTitle from '../components/ui/SectionTitle.jsx';
import PhoneFrame from '../components/ui/PhoneFrame.jsx';
import StatChip from '../components/ui/StatChip.jsx';
import Manifesto from '../components/landing/Manifesto.jsx';
import EverydayExamples from '../components/landing/EverydayExamples.jsx';
import FeatureProof from '../components/landing/FeatureProof.jsx';

const isDesignGalleryEnabled = () =>
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DESIGN_GALLERY === 'true';

// Renders the same preview twice — the page theme on the left, a forced-dark
// panel on the right — so RB-0 primitives are reviewable in both themes at once
// without leaving /design (where the header theme toggle is hidden).
const ThemePair = ({ children }) => (
  <div className="grid gap-4 lg:grid-cols-2">
    {[
      { key: 'light', wrap: '', label: 'Light (tema e faqes)' },
      { key: 'dark', wrap: 'dark', label: 'Dark (i detyruar)' },
    ].map(({ key, wrap, label }) => (
      <div key={key} className={wrap}>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">
          {label}
        </p>
        <div className="overflow-hidden rounded-2xl border border-line bg-cloud">
          {children}
        </div>
      </div>
    ))}
  </div>
);

// A tiny static quiz replica composed from primitives, only to show PhoneFrame
// rendering real children (the full replica is RB-1's job).
const PhoneMock = () => (
  <div className="space-y-3 bg-paper p-4">
    <p className="text-center text-sm font-black text-ink">
      Cila është fjala shqipe?
    </p>
    <p className="text-center text-lg font-black text-accent-coral">event</p>
    <div className="grid gap-2">
      {['ngjarje', 'takim', 'festë'].map((opt, i) => (
        <div
          key={opt}
          className={[
            'rounded-xl border-2 px-3 py-2 text-center text-sm font-bold',
            i === 0
              ? 'border-brand-green bg-brand-green/10 text-brand-green'
              : 'border-line text-ink-soft',
          ].join(' ')}
        >
          {opt}
        </div>
      ))}
    </div>
  </div>
);

const DesignGallery = () => {
  const { isAdmin, loading } = useAuth();
  const enabled = isDesignGalleryEnabled();

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud flex items-center justify-center">
        <p className="text-ink-soft font-semibold">Duke u ngarkuar…</p>
      </div>
    );
  }

  if (!enabled && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const buttonVariants = ['primary', 'secondary', 'ghost', 'danger'];
  const buttonSizes = ['md', 'lg'];

  return (
    <div className="min-h-screen bg-cloud py-10 px-6">
      <div className="max-w-5xl mx-auto space-y-12">
        <header>
          <Heading level={1}>Galeria e dizajnit</Heading>
          <p className="mt-2 text-ink-soft font-semibold">
            Tokenët, komponentët dhe gjendjet e papagallit — vetëm për verifikim.
          </p>
        </header>

        <section>
          <Heading level={2} className="mb-6">
            Butonat
          </Heading>
          <div className="space-y-8">
            {buttonVariants.map((variant) => (
              <Card key={variant} padding="md">
                <Heading level={3} className="mb-4 capitalize">
                  {variant}
                </Heading>
                <div className="flex flex-wrap gap-4 items-center">
                  {buttonSizes.map((size) => (
                    <Button key={size} variant={variant} size={size}>
                      {size === 'lg' ? 'Fillo' : 'Vazhdo'}
                    </Button>
                  ))}
                  <Button variant={variant} size="md" loading>
                    Duke u ngarkuar
                  </Button>
                  <Button variant={variant} size="md" fullWidth className="max-w-xs">
                    Gjerësi e plotë
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Heading level={2} className="mb-6">
            Kartat
          </Heading>
          <div className="grid md:grid-cols-3 gap-6">
            {['sm', 'md', 'lg'].map((padding) => (
              <Card key={padding} padding={padding}>
                <Heading level={3} className="mb-2">
                  Padding {padding}
                </Heading>
                <p className="text-ink-soft font-semibold text-sm">
                  Kornizë me rreze 24px dhe kufi të butë.
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Heading level={2} className="mb-6">
            Titullat
          </Heading>
          <Card padding="lg" className="space-y-4">
            <Heading level={1}>Titulli kryesor (900)</Heading>
            <Heading level={2}>Titulli i dytë (800)</Heading>
            <Heading level={3}>Titulli i tretë (600)</Heading>
          </Card>
        </section>

        <section>
          <Heading level={2} className="mb-6">
            Papagalli — gjendjet
          </Heading>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {PARROT_STATES.map((state) => (
              <Card key={state} padding="md" className="flex flex-col items-center text-center gap-3">
                <Parrot
                  state={state}
                  size={140}
                  correctionText={state === 'think' ? 'takim' : undefined}
                />
                <p className="text-sm font-bold text-ink-soft">{state}</p>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <Heading level={2} className="mb-6">
            Paleta
          </Heading>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              ['--brand-green', 'Jeshile'],
              ['--accent-yellow', 'Verdhë'],
              ['--accent-coral', 'Koral'],
              ['--accent-purple', 'Vjollcë'],
              ['--ink', 'Tekst'],
            ].map(([token, label]) => (
              <div key={token} className="text-center">
                <div
                  className="h-16 rounded-2xl border border-line mb-2"
                  style={{ backgroundColor: `var(${token})` }}
                />
                <p className="text-xs font-bold text-ink-soft">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── M4 rebrand primitives (RB-0) ───────────────────────────────── */}
        <section className="space-y-10">
          <div>
            <Heading level={2}>M4 — primitivat e reja</Heading>
            <p className="mt-2 text-ink-soft font-semibold">
              SectionShell · Eyebrow · SectionTitle · PhoneFrame · StatChip —
              çdo bllok tregohet në dritë dhe në errësirë.
            </p>
          </div>

          {/* Surfaces */}
          <div>
            <Heading level={3} className="mb-4">
              Sipërfaqet e alternimit
            </Heading>
            <ThemePair>
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                {[
                  ['bg-paper', 'paper'],
                  ['bg-surface-mint', 'surface-mint'],
                  ['bg-surface-cream', 'surface-cream'],
                  ['bg-[image:var(--surface-hero)]', 'surface-hero'],
                ].map(([cls, label]) => (
                  <div key={label} className="text-center">
                    <div
                      className={`h-20 rounded-2xl border border-line ${cls}`}
                    />
                    <p className="mt-2 text-xs font-bold text-ink-soft">{label}</p>
                  </div>
                ))}
              </div>
            </ThemePair>
          </div>

          {/* SectionShell */}
          <div>
            <Heading level={3} className="mb-4">
              SectionShell (ritmi + zbulimi në lëvizje)
            </Heading>
            <ThemePair>
              <SectionShell surface="mint" containerClassName="!py-10">
                <Eyebrow>Shembull</Eyebrow>
                <p className="mt-4 text-ink font-bold">
                  Përmbajtja e seksionit rri brenda max-w-6xl me ritmin vertikal.
                </p>
              </SectionShell>
            </ThemePair>
          </div>

          {/* Eyebrow + SectionTitle */}
          <div>
            <Heading level={3} className="mb-4">
              Eyebrow + SectionTitle (fjala theksuese)
            </Heading>
            <ThemePair>
              <div className="space-y-8 bg-paper p-6">
                <div>
                  <Eyebrow>Si funksionon</Eyebrow>
                  <SectionTitle
                    className="mt-4"
                    title="E kthen shqipen fjalë pas fjale"
                    accentWord="shqipen"
                    accent="green"
                    subline="Nënrreshti opsional rri i qetë poshtë titullit."
                  />
                </div>
                <SectionTitle
                  title="Ti thua event çative"
                  accentWord="event"
                  accent="coral"
                />
              </div>
            </ThemePair>
          </div>

          {/* PhoneFrame */}
          <div>
            <Heading level={3} className="mb-4">
              PhoneFrame
            </Heading>
            <ThemePair>
              <div className="bg-paper p-6">
                <PhoneFrame>
                  <PhoneMock />
                </PhoneFrame>
              </div>
            </ThemePair>
          </div>

          {/* StatChip */}
          <div>
            <Heading level={3} className="mb-4">
              StatChip (me gjendje ngarkimi)
            </Heading>
            <ThemePair>
              <div className="flex flex-wrap items-center gap-3 bg-paper p-6">
                <StatChip value="1 240" label="fjalë" accent="green" />
                <StatChip value="58%" label="kursim" accent="purple" />
                <StatChip value="12" label="seri" accent="coral" />
                <StatChip value="7" label="botë" accent="ink" />
                <StatChip label="fjalë" loading />
              </div>
            </ThemePair>
          </div>
        </section>

        {/* ── M4 Manifesto — signature section (RB-2) ────────────────────── */}
        <section className="space-y-8">
          <div>
            <Heading level={2}>M4 — Manifesto (fjalia nënshkruese)</Heading>
            <p className="mt-2 text-ink-soft font-semibold">
              Fjalia zbulohet fjalë pas fjale; poshtë saj, huazimi (koral) tretet
              dhe fjala shqipe (jeshile) zë vendin. Të dyja temat, plus varianti
              me lëvizje të reduktuar.
            </p>
          </div>

          <div>
            <Heading level={3} className="mb-3">
              E animuar
            </Heading>
            <ThemePair>
              <Manifesto />
            </ThemePair>
          </div>

          <div>
            <Heading level={3} className="mb-3">
              Lëvizje e reduktuar (statik)
            </Heading>
            <ThemePair>
              <Manifesto forceReducedMotion />
            </ThemePair>
          </div>
        </section>

        {/* ── M4 Everyday examples (RB-3) ────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <Heading level={2}>M4 — Shembuj të përditshëm (RB-3)</Heading>
            <p className="mt-2 text-ink-soft font-semibold">
              Karta me flluska bisede; huazimi theksohet me koral. Toni: njohje,
              jo korrigjim.
            </p>
          </div>
          <ThemePair>
            <EverydayExamples />
          </ThemePair>
        </section>

        {/* ── M4 Features + live proof, merged (RB-7) ────────────────────── */}
        <section className="space-y-6">
          <div>
            <Heading level={2}>M4 — Veçoritë + prova live (RB-7)</Heading>
            <p className="mt-2 text-ink-soft font-semibold">
              Brez i hollë me statistika (StatChip) mbi kartat e veçorive. Poshtë:
              gjendja e ngarkimit (skeleton, pa zhvendosje).
            </p>
          </div>
          <ThemePair>
            <FeatureProof words={1240} />
          </ThemePair>
          <Heading level={3}>Gjendja e ngarkimit</Heading>
          <ThemePair>
            <FeatureProof words={null} />
          </ThemePair>
        </section>
      </div>
    </div>
  );
};

export default DesignGallery;
