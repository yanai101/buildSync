import * as React from 'react';
import { Icon } from '../Shared';

export type RoomCardViewProps = {
  name: string;
  typeLabel: string;
  photoCount: number;
  lastUpdatedLabel?: string | null;
  coverUrl: string | null;
  /** Omit to render a non-interactive card (e.g. feature teaser previews). */
  onClick?: () => void;
};

/** Room card used by the rooms archive list (and its feature-teaser preview). */
export const RoomCardView = ({ name, typeLabel, photoCount, lastUpdatedLabel, coverUrl, onClick }: RoomCardViewProps) => {
  const body = (
    <>
      <div style={{ aspectRatio: '16 / 10', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text3)' }}>
        {coverUrl
          ? <img src={coverUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon n="camera" s={28} />}
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text1)' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {typeLabel} · {photoCount > 0 ? `${photoCount} תמונות` : 'אין תמונות'}
          {lastUpdatedLabel ? ` · עודכן ${lastUpdatedLabel}` : ''}
        </div>
      </div>
    </>
  );

  const frame: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: 'var(--surface)',
    display: 'flex', flexDirection: 'column',
  };

  if (!onClick) return <div style={frame}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-label={`פתח את ${name}`} style={{ all: 'unset', cursor: 'pointer', ...frame }}>
      {body}
    </button>
  );
};

export const roomGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: 12,
};
