import * as React from 'react';
import { useQuery } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { floorLabel, MAX_PHOTOS_PER_ROOM_STAGE } from '../../../convex/_lib/roomArchiveShared';
import { Btn, Icon, Spinner } from '../Shared';
import { openUpgradeModal } from '../UpgradeModalHost';
import { RoomDetail } from './RoomDetail';
import { RoomCardView, roomGridStyle } from './RoomCardView';
import { RoomsArchivePreview } from './RoomsArchivePreview';
import { FeatureTeaser } from '../FeatureTeaser';
import { formatDate, roomTypeLabel } from './roomArchiveUtils';

type Notify = (opts: { title: string; body?: string; kind?: 'success' | 'error' | 'info' }) => unknown;

const Panel = ({ icon, iconBg, title, children }: { icon: string; iconBg: string; title: string; children?: React.ReactNode }) => (
  <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <div style={{ width: 60, height: 60, borderRadius: '50%', background: iconBg, color: '#fff', display: 'grid', placeItems: 'center' }}>
      <Icon n={icon} s={26} />
    </div>
    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text1)' }}>{title}</div>
    {children}
  </div>
);

const muted: React.CSSProperties = { fontSize: 14, color: 'var(--text2)', maxWidth: 440, lineHeight: 1.6 };

/**
 * Premium "Rooms" tab of the project archive. Self-contained: owns all of its
 * data fetching and gating so the host screen only needs to render it.
 */
export const RoomsArchiveTab = ({
  projectId, projectName, notify, initialRoomId,
}: {
  projectId: Id<'projects'>;
  projectName: string;
  notify: Notify;
  initialRoomId?: string | null;
}) => {
  const navigate = useNavigate();
  const access = useQuery(api.roomArchive.getAccess, { projectId });
  const rooms = useQuery(api.roomArchive.listRooms, access?.canView ? { projectId } : 'skip');
  const [roomId, setRoomId] = React.useState<Id<'projectRooms'> | null>((initialRoomId as Id<'projectRooms'>) ?? null);

  React.useEffect(() => {
    // Scroll to the top when switching between list and room views.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [roomId]);

  if (access === undefined) return <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>;
  if (access === null) return <Panel icon="lock" iconBg="var(--text3)" title="אין לך גישה לתמונות החדרים" />;

  if (!access.isPremium && !access.readOnly) {
    return (
      <FeatureTeaser
        tier="pro"
        title="תיעוד תמונות לפי חדרים"
        description="תעד כל חדר בבית לאורך שלבי הבנייה, כדי לדעת בדיוק מה עובר בתוך הקירות גם אחרי שהם נסגרים."
        benefits={[
          'תמונות לכל חדר לפי שלבי הבנייה — שלד, מערכות גולמיות, טיח, ריצוף וגמרים',
          'קטגוריות (חשמל, אינסטלציה, מיזוג…), תיאור קצר והערות לכל תמונה',
          'השוואת לפני / אחרי בין שלבים',
          'דוח PDF להדפסה לכל חדר וייצוא מסודר לפי חדר ושלב',
        ]}
        preview={<RoomsArchivePreview />}
        interactive
        canPurchase={access.isOwner}
        memberMessage="תיעוד תמונות לפי חדרים יהיה זמין לך כאשר בעל הפרויקט ישדרג ל-Pro."
        upgradeReason="פיצ'ר זה זמין במנוי Pro."
      />
    );
  }

  if (!access.canView) {
    return (
      <Panel icon="lock" iconBg="var(--text3)" title="אין לך הרשאה לתמונות החדרים">
        <div style={muted}>בעל הפרויקט טרם הגדיר עבורך הרשאת צפייה בתמונות החדרים. ניתן לבקש ממנו להפעיל אותה במסך ניהול הצוות.</div>
      </Panel>
    );
  }

  if (rooms === undefined) return <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}><Spinner /></div>;

  const readOnlyBanner = access.readOnly && (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text1)', marginBottom: 16 }}>
      <Icon n="lock" s={16} />
      <span style={{ flex: 1, minWidth: 200 }}>
        המנוי אינו Pro כרגע — התמונות שתועדו נשמרו וזמינות לצפייה, להורדה ולדוח PDF בלבד.
        {access.isOwner ? ' שדרג כדי להעלות, לערוך ולמחוק תמונות.' : ''}
      </span>
      {access.isOwner && (
        <Btn size="sm" onClick={() => openUpgradeModal({ tier: 'pro', title: 'תיעוד תמונות לפי חדרים', reason: 'העלאה ועריכה של תמונות חדרים זמינות במנוי Pro.' })}
          style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
          <Icon n="star" s={13} /> שדרג ל-Pro
        </Btn>
      )}
    </div>
  );

  if (roomId && rooms?.some((r) => r.id === roomId)) {
    return (
      <>
        {readOnlyBanner}
        <RoomDetail
          projectId={projectId}
          projectName={projectName}
          roomId={roomId}
          canUpload={access.canUpload}
          onBack={() => setRoomId(null)}
          notify={notify}
        />
      </>
    );
  }

  const canEditSetup = access.role === 'owner' || access.role === 'manager';

  if (!rooms || rooms.length === 0) {
    return (
      <Panel icon="home" iconBg="var(--accent)" title="עדיין לא הוגדרו חדרים בפרויקט">
        <div style={muted}>
          {canEditSetup
            ? 'כדי לתעד תמונות לפי חדר, הוסף את החדרים והאזורים של הבית בהגדרות הבית. החדרים יופיעו כאן אוטומטית.'
            : 'כדי לתעד תמונות לפי חדר, בעל הפרויקט צריך להגדיר את החדרים בהגדרות הבית.'}
        </div>
        {canEditSetup && (
          <Btn onClick={() => navigate({ to: '/setup', search: { step: 'rooms' } })} style={{ marginTop: 6 }}>
            <Icon n="settings" s={14} /> עבור להגדרות הבית
          </Btn>
        )}
      </Panel>
    );
  }

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);
  const totalPhotos = rooms.reduce((sum, r) => sum + r.photoCount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {readOnlyBanner}
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
        תיעוד מצב החדרים לאורך הבנייה: {rooms.length} חדרים · {totalPhotos} תמונות · עד {MAX_PHOTOS_PER_ROOM_STAGE} תמונות לחדר בכל שלב.
        {canEditSetup && <> החדרים מגיעים מ<button type="button" onClick={() => navigate({ to: '/setup', search: { step: 'rooms' } })} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit', textDecoration: 'underline' }}>הגדרות הבית</button>.</>}
      </div>
      {floors.map((floor) => (
        <section key={floor}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text3)', margin: '0 0 10px 0' }}>{floorLabel(floor)}</h3>
          <div style={roomGridStyle}>
            {rooms.filter((r) => r.floor === floor).map((r) => (
              <RoomCardView
                key={r.id}
                name={r.name}
                typeLabel={roomTypeLabel(r.type)}
                photoCount={r.photoCount}
                lastUpdatedLabel={r.lastUploadedAt ? formatDate(r.lastUploadedAt) : null}
                coverUrl={r.coverUrl}
                onClick={() => setRoomId(r.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
