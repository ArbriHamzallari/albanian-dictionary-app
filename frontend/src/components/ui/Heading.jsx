const LEVELS = {
  1: {
    Tag: 'h1',
    className: 'text-4xl md:text-5xl font-black text-ink leading-tight',
  },
  2: {
    Tag: 'h2',
    className: 'text-3xl md:text-4xl font-extrabold text-ink leading-tight',
  },
  3: {
    Tag: 'h3',
    className: 'text-xl md:text-2xl font-semibold text-ink leading-snug',
  },
};

const Heading = ({ level = 1, children, className = '', ...rest }) => {
  const config = LEVELS[level] ?? LEVELS[1];
  const { Tag, className: levelClass } = config;

  return (
    <Tag className={[levelClass, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  );
};

export default Heading;
