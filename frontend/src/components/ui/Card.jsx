const PADDING = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = ({
  children,
  padding = 'md',
  className = '',
  as: Tag = 'div',
  ...rest
}) => (
  <Tag
    className={[
      'rounded-3xl border border-line bg-paper',
      PADDING[padding] ?? PADDING.md,
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </Tag>
);

export default Card;
