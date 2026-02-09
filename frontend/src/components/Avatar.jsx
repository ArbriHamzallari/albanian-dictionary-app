const Avatar = ({ filename, size = 40, className = '' }) => {
  const src = `/avatars/${filename || 'default.png'}`;

  return (
    <img
      src={src}
      alt="Avatar"
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '/avatars/default.png';
      }}
    />
  );
};

export default Avatar;
