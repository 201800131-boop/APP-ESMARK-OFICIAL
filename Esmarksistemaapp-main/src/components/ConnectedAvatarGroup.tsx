import './ConnectedAvatarGroup.css';

export interface AvatarGroupUser {
  id?: string;
  username?: string;
  name: string;
  role: string;
  photo?: string;
  isCurrent?: boolean;
}

interface ConnectedAvatarGroupProps {
  users: AvatarGroupUser[];
  maxVisible?: number;
}

const fallbackColors = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#ea580c', '#be123c'];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  const index = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return fallbackColors[index % fallbackColors.length];
}

export default function ConnectedAvatarGroup({ users, maxVisible = 6 }: ConnectedAvatarGroupProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const hiddenCount = Math.max(0, users.length - visibleUsers.length);

  return (
    <span className="connected-avatar-group" aria-hidden="true">
      {visibleUsers.map((connectedUser, index) => (
          <span
            key={connectedUser.id || connectedUser.username || `${connectedUser.name}-${index}`}
            className="connected-avatar-group__item"
            style={{
              zIndex: visibleUsers.length - index,
              animationDelay: `${Math.min(index, 6) * 45}ms`,
            }}
          >
            <span
              className={`connected-avatar-group__avatar ${
                connectedUser.isCurrent ? 'connected-avatar-group__avatar--current' : ''
              }`}
            >
              {connectedUser.photo ? (
                <img src={connectedUser.photo} alt={connectedUser.name} />
              ) : (
                <span
                  className="connected-avatar-group__fallback"
                  style={{ backgroundColor: getAvatarColor(connectedUser.name) }}
                >
                  {getInitials(connectedUser.name)}
                </span>
              )}
            </span>
            <span className="connected-avatar-group__status" />
            <span className="connected-avatar-group__tooltip">
              <strong>{connectedUser.name}</strong>
              <span>
                {connectedUser.isCurrent ? 'Tú · ' : ''}
                {connectedUser.role === 'admin' ? 'Administrador' : 'Operador'}
              </span>
            </span>
          </span>
        ))}

      {hiddenCount > 0 ? (
        <span className="connected-avatar-group__more">
          +{hiddenCount}
        </span>
      ) : null}
    </span>
  );
}
