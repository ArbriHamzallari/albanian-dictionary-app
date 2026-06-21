import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot, { PARROT_STATES } from '../components/mascot/Parrot.jsx';

const isDesignGalleryEnabled = () =>
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DESIGN_GALLERY === 'true';

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
      </div>
    </div>
  );
};

export default DesignGallery;
