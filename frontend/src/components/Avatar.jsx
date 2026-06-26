import { t } from '../i18n/index.js';

const Avatar = ({ filename, size = 40, className = '' }) => {
  const src = `/avatars/${filename || 'default.png'}`;

  return (
    <img
      src={src}
      alt={t('common.avatarAlt')}
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
