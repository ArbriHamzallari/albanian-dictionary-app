// PhoneFrame — a pure-CSS device frame (no screenshot image, m4-rebrand.md
// §5.1). Renders whatever children compose the on-screen replica. The bezel
// uses `ink`, which flips light↔dark with the theme, so the frame stays
// visible against both page backgrounds.

const PhoneFrame = ({ children, className = '', screenClassName = '' }) => (
  <div
    className={['relative mx-auto w-full max-w-[300px]', className]
      .filter(Boolean)
      .join(' ')}
  >
    <div className="relative rounded-[2.5rem] border-[10px] border-ink bg-ink p-2.5 shadow-card-hover">
      {/* speaker notch */}
      <div
        className="absolute left-1/2 top-[18px] z-10 h-5 w-24 -translate-x-1/2 rounded-pill bg-paper/20"
        aria-hidden="true"
      />
      <div
        className={['overflow-hidden rounded-[1.85rem] bg-cloud', screenClassName]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  </div>
);

export default PhoneFrame;
