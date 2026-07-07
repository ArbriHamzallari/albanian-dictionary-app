import { Helmet } from 'react-helmet-async';

// Production origin for canonical/OG URLs. Override per environment with
// VITE_SITE_URL (e.g. a Vercel preview); defaults to the live domain.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://fjalingo.com').replace(/\/$/, '');

const DEFAULT_DESCRIPTION =
  'Fjalingo të ndihmon t\'i kthesh fjalët e huazuara në shqipen e vërtetë — me lojë, jo me mësim.';

// Per-page <head> tags: unique Albanian title + description, canonical, Open
// Graph + Twitter cards. `children` is for page-specific tags (e.g. JSON-LD).
const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = '/og-default.png',
  type = 'website',
  children,
}) => {
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="sq_AL" />
      <meta property="og:site_name" content="Fjalingo" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {children}
    </Helmet>
  );
};

export default Seo;
