import * as React from 'react';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { Link, useSearch } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Btn, Icon, Modal } from '~/components/Shared';
import { AccessDenied, AccessLoading } from '~/components/AccessDenied';
import { openUpgradeModal } from '~/components/UpgradeModalHost';
import { useCurrentProject } from '~/hooks/useCurrentProject';
import { useRequireRole } from '~/hooks/useRequireRole';

const reviewTags = ['מקצועי', 'עומד בזמנים', 'תקשורת מצוינת', 'מסודר', 'פתר בעיות'];
const reportReasons = ['תוכן פוגעני או מטעה', 'פרטי קשר או מידע אישי', 'לא חוות דעת אותנטית', 'סיבה אחרת'];
const contractorRoles = [
  'קבלן עד מפתח', 'קבלן שלד', 'קבלן עפר', 'קבלן טיח', 'חשמלאי ראשי',
  'אינסטלטור', 'קבלן מיזוג', 'קבלן ריצוף', 'קבלן גג', 'קבלן גבס',
  'קבלן נגרות', 'צבעי', 'קבלן גינה', 'אחר',
];
const israelServiceAreas = [
  'צפון', 'חיפה והקריות', 'השרון', 'תל אביב והמרכז',
  'השפלה', 'ירושלים והסביבה', 'יהודה ושומרון', 'דרום', 'כל הארץ',
];
const CUSTOM_AREA_FILTER = '__custom_area__';

function friendlyReportError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('לא ניתן לדווח על חוות דעת שכתבת בעצמך')) return 'אי אפשר לדווח על חוות דעת שכתבת בעצמך.';
  if (message.includes('כבר דווח')) return 'כבר שלחת דיווח על חוות הדעת הזו.';
  if (message.includes('אינה זמינה לדיווח')) return 'חוות הדעת כבר אינה זמינה לדיווח.';
  return 'לא הצלחנו לשלוח את הדיווח. נסו שוב בעוד רגע.';
}

function useRecommendationsPageScroll() {
  const [usesPageScroll, setUsesPageScroll] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setUsesPageScroll(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return usesPageScroll;
}

export function ContractorRecommendationsScreen() {
  const { projectId, project, isLoading: projectLoading } = useCurrentProject();
  const { allowed: canReview, loading: roleLoading } = useRequireRole(['owner', 'manager', 'inspector']);
  const search = useSearch({ from: '/contractor-recommendations', shouldThrow: false }) as { contractorId?: string } | undefined;
  const { results: feedReviews, status: feedStatus, loadMore: loadMoreReviews } = usePaginatedQuery(
    api.contractorRecommendations.listFeed,
    projectId ? { projectId } : 'skip',
    { initialNumItems: 24 },
  );
  const feedAccess = useQuery(api.contractorRecommendations.getFeedAccess, projectId ? { projectId } : 'skip');
  const contractors = useQuery(api.queries.listContractors, projectId ? { projectId } : 'skip') ?? [];
  const myReviews = useQuery(api.contractorRecommendations.listMyProjectReviews, projectId ? { projectId } : 'skip') ?? [];
  const ensureProfile = useMutation(api.contractorRecommendations.ensureProfileForProjectContractor);
  const createReview = useMutation(api.contractorRecommendations.createReview);
  const updateMyReview = useMutation(api.contractorRecommendations.updateMyReview);
  const reportReview = useMutation(api.contractorRecommendations.reportReview);
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [selectedContractorId, setSelectedContractorId] = React.useState<string>(search?.contractorId ?? '');
  const [body, setBody] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [rating, setRating] = React.useState(5);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('');
  const [areaFilter, setAreaFilter] = React.useState('');
  const [minimumRating, setMinimumRating] = React.useState(0);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [contactTarget, setContactTarget] = React.useState<{ contractorProfileId: Id<'contractorProfiles'>; name: string } | null>(null);
  const [reportTarget, setReportTarget] = React.useState<{ id: Id<'contractorReviews'>; name: string } | null>(null);
  const [reportReason, setReportReason] = React.useState(reportReasons[0]);
  const [reportDetails, setReportDetails] = React.useState('');
  const [reportSaving, setReportSaving] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [reportNotice, setReportNotice] = React.useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = React.useState<string | null>(null);
  const reviewListRef = React.useRef<HTMLDivElement>(null);
  const usesPageScroll = useRecommendationsPageScroll();
  const contactDetails = useQuery(
    api.contractorRecommendations.getContact,
    projectId && contactTarget ? { projectId, contractorProfileId: contactTarget.contractorProfileId } : 'skip',
  );

  const existingReview = myReviews.find((review) => String(review.contractorId) === selectedContractorId && (review.status === 'pending' || review.status === 'published')) ?? null;
  const reviewedContractorIds = new Set(myReviews.filter((review) => review.status === 'pending' || review.status === 'published').map((review) => String(review.contractorId)));
  const rejectedReviews = myReviews.filter((review) => review.status === 'rejected' && !reviewedContractorIds.has(String(review.contractorId)));
  const reviewableContractors = contractors.filter((contractor: any) => !reviewedContractorIds.has(String(contractor._id)) || String(contractor._id) === selectedContractorId);
  const filteredReviews = React.useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase('he');
    return feedReviews.filter((review) => {
      const matchesRole = !roleFilter || review.role === roleFilter;
      const matchesArea = !areaFilter
        || (areaFilter === CUSTOM_AREA_FILTER
          ? review.serviceAreas.some((area) => !israelServiceAreas.includes(area))
          : review.serviceAreas.includes(areaFilter));
      const matchesRating = review.overallRating >= minimumRating;
      const searchable = [review.displayName, review.company, review.role, ...review.serviceAreas].filter(Boolean).join(' ').toLocaleLowerCase('he');
      return matchesRole && matchesArea && matchesRating && (!query || searchable.includes(query));
    });
  }, [areaFilter, feedReviews, minimumRating, roleFilter, searchText]);
  const hasActiveFilters = Boolean(searchText || roleFilter || areaFilter || minimumRating);
  const reviewVirtualizer = useVirtualizer({
    count: filteredReviews.length,
    getScrollElement: () => reviewListRef.current,
    estimateSize: () => 230,
    overscan: 5,
  });
  const renderedReviews = usesPageScroll
    ? filteredReviews.map((review, index) => ({ review, index, key: review.id, start: 0 }))
    : reviewVirtualizer.getVirtualItems().map((virtualItem) => ({
      review: filteredReviews[virtualItem.index],
      index: virtualItem.index,
      key: virtualItem.key,
      start: virtualItem.start,
    }));

  React.useEffect(() => {
    if (!existingReview) return;
    setBody(existingReview.body);
    setTags(existingReview.tags);
    setRating(existingReview.overallRating);
  }, [existingReview?.id]);

  React.useEffect(() => {
    reviewListRef.current?.scrollTo({ top: 0 });
    setExpandedReviewId(null);
  }, [areaFilter, minimumRating, roleFilter, searchText]);

  if (projectLoading || roleLoading) return <AccessLoading />;
  if (!projectId || !project) return <AccessDenied message="בחרו פרויקט כדי לעיין בהמלצות." />;

  const openReview = () => {
    if (!feedAccess?.isPro) {
      openUpgradeModal({ title: 'המלצות קבלנים זמינות ב-Pro', reason: 'שדרגו כדי לזהות קבלנים מומלצים, ליצור קשר ולכתוב חוות דעת מאומתות.' });
      return;
    }
    if (!canReview) return;
    setError(null);
    setReviewOpen(true);
  };

  const retryRejectedReview = (review: typeof myReviews[number]) => {
    setSelectedContractorId(String(review.contractorId));
    setBody('');
    setTags([]);
    setRating(5);
    setError(null);
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (!projectId || !selectedContractorId || body.trim().length < 20) {
      setError('בחרו קבלן וכתבו לפחות 20 תווים.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existingReview) {
        await updateMyReview({
          reviewId: existingReview.id, overallRating: rating, professionalismRating: rating, timelinessRating: rating, communicationRating: rating,
          tags, body: body.trim(), workMonth: existingReview.workMonth ?? new Date().toISOString().slice(0, 7),
        });
      } else {
        const contractorId = selectedContractorId as Id<'contractors'>;
        const contractorProfileId = await ensureProfile({ projectId, contractorId });
        await createReview({
          projectId, contractorId, contractorProfileId,
          overallRating: rating, professionalismRating: rating, timelinessRating: rating, communicationRating: rating,
          tags, body: body.trim(), workMonth: new Date().toISOString().slice(0, 7),
        });
      }
      setReviewOpen(false);
      setBody(''); setTags([]); setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו לפרסם את חוות הדעת.');
    } finally { setSaving(false); }
  };

  return <div className="page-content contractor-recommendations-page" style={{ maxWidth: 1180 }}>
    <div className="recommendations-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
      <div className="recommendations-title-block">
        <div className="recommendations-title-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800 }}>המלצות קבלנים</h1>
          <span style={{ fontSize: 12, color: 'var(--accent)', background: 'var(--accent-light)', padding: '4px 8px', borderRadius: 999, fontWeight: 800 }}>מהשטח</span>
          <span style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 999, fontWeight: 700 }}>גישה מוקדמת</span>
        </div>
        <p className="recommendations-page-subtitle" style={{ color: 'var(--text2)', margin: '7px 0 0', lineHeight: 1.6 }}>סיפורי פרויקטים וחוות דעת מאומתות מקהילת BuildSync.</p>
      </div>
    </div>

    {rejectedReviews.length > 0 && <section aria-labelledby="rejected-reviews-title" style={{ marginBottom: 18, display: 'grid', gap: 10 }}>
      <h2 id="rejected-reviews-title" style={{ fontSize: 16, margin: 0 }}>עדכון לגבי חוות הדעת שלך</h2>
      {rejectedReviews.map((review) => {
        const contractor = contractors.find((item: any) => String(item._id) === String(review.contractorId));
        return <div key={review.id} role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--danger) 35%, var(--border))', background: 'color-mix(in srgb, var(--danger) 8%, var(--surface))' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', minWidth: 0 }}><Icon n="alert" s={20} c="var(--danger)" /><div><strong>חוות הדעת על {contractor?.name ?? 'הקבלן'} לא אושרה</strong><div style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{review.moderationNote ? `סיבת הדחייה: ${review.moderationNote}` : 'לא נמסרה סיבה. אפשר לכתוב חוות דעת חדשה בהתאם לכללי המאגר.'}</div></div></div>
          <Btn size="sm" variant="outline" onClick={() => retryRejectedReview(review)}>כתבו חוות דעת חדשה</Btn>
        </div>;
      })}
    </section>}

    <div className="recommendations-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 260px', gap: 20, alignItems: 'start' }}>
      <section>
        <div className="recommendations-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ flex: '1 1 220px', position: 'relative' }}><span style={{ position: 'absolute', right: 11, top: 11, display: 'inline-flex', pointerEvents: 'none' }}><Icon n="search" s={16} c="var(--text3)" /></span><input className="bp-input" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="חיפוש לפי תחום או אזור" style={{ width: '100%', paddingRight: 36 }} /></label>
          <button type="button" className={`recommendations-filter-toggle${filtersOpen ? ' is-open' : ''}`} aria-expanded={filtersOpen} aria-controls="recommendation-advanced-filters" onClick={() => setFiltersOpen(current => !current)}><Icon n="filter" s={16} /> עוד מסננים {hasActiveFilters && <span className="recommendations-filter-indicator" aria-label="יש סינון פעיל" />}</button>
          <div id="recommendation-advanced-filters" className={`recommendations-filter-advanced${filtersOpen ? ' is-open' : ''}`}>
            <select className="bp-input recommendations-filter-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="סינון לפי סוג קבלן" style={{ width: 164 }}><option value="">כל סוגי הקבלנים</option>{contractorRoles.map((role) => <option value={role} key={role}>{role}</option>)}</select>
            <select className="bp-input recommendations-filter-select" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} aria-label="סינון לפי אזור פעילות" style={{ width: 164 }}><option value="">כל אזורי הפעילות</option>{israelServiceAreas.map((area) => <option value={area} key={area}>{area}</option>)}<option value={CUSTOM_AREA_FILTER}>אחר — חיפוש חופשי</option></select>
            <select className="bp-input recommendations-filter-select recommendations-rating-filter" value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))} aria-label="סינון לפי דירוג" style={{ width: 144 }}><option value={0}>כל הדירוגים</option><option value={5}>5 כוכבים</option><option value={4}>4 כוכבים ומעלה</option><option value={3}>3 כוכבים ומעלה</option><option value={2}>2 כוכבים ומעלה</option><option value={1}>1 כוכב ומעלה</option></select>
            {hasActiveFilters && <Btn size="sm" variant="ghost" onClick={() => { setSearchText(''); setRoleFilter(''); setAreaFilter(''); setMinimumRating(0); setFiltersOpen(false); }}>נקה סינון</Btn>}
          </div>
          <span className="recommendations-results-count">{filteredReviews.length} המלצות נטענו</span>
        </div>
        <div className="recommendations-list" style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
          {feedStatus === 'LoadingFirstPage' ? <div style={{ padding: 32, color: 'var(--text3)' }}>טוען המלצות…</div> : feedReviews.length === 0 ? <div className="recommendations-empty-state">
            <span className="recommendations-empty-icon"><Icon n="star" s={24} c="var(--accent)" /></span>
            <strong>המאגר רק מתחיל להיבנות</strong>
            <p>עדיין אין המלצות מאומתות להצגה. ההמלצה הראשונה שלכם תעזור לבעלי פרויקטים אחרים לבחור נכון.</p>
            {canReview ? <Link to="/contractors" search={{ contractorId: undefined }} style={{ textDecoration: 'none' }}><Btn size="sm"><Icon n="users" s={14} /> לכרטסת הקבלנים ולדירוג</Btn></Link> : <span className="recommendations-empty-note">כשתפורסם חוות דעת ראשונה, היא תופיע כאן.</span>}
          </div> : filteredReviews.length === 0 ? <div className="recommendations-empty-state">
            <span className="recommendations-empty-icon"><Icon n="search" s={24} c="var(--accent)" /></span>
            <strong>לא נמצאו המלצות מתאימות</strong>
            <p>נסו לבחור אזור, סוג קבלן או דירוג אחר.</p>
            <Btn size="sm" variant="outline" onClick={() => { setSearchText(''); setRoleFilter(''); setAreaFilter(''); setMinimumRating(0); setFiltersOpen(false); }}>נקה סינון</Btn>
          </div> : <div ref={usesPageScroll ? undefined : reviewListRef} className={`recommendations-list-viewport${usesPageScroll ? ' recommendations-list-page-scroll' : ''}`}>
            <div style={usesPageScroll ? undefined : { height: reviewVirtualizer.getTotalSize() + 24, width: '100%', position: 'relative' }}>
              {renderedReviews.map(({ review, index, key, start }) => {
                const isExpanded = expandedReviewId === review.id;
                const detailsId = `recommendation-details-${review.id}`;
                return <article key={key} data-index={usesPageScroll ? undefined : index} ref={usesPageScroll ? undefined : reviewVirtualizer.measureElement} className={`recommendation-card${isExpanded ? ' is-expanded' : ''}`} style={usesPageScroll ? { position: 'relative', width: '100%', padding: 14, borderBottom: '1px solid var(--border)' } : { position: 'absolute', top: 0, right: 0, width: '100%', transform: `translateY(${start}px)`, padding: 14, borderBottom: '1px solid var(--border)' }}>
                  <button type="button" className="recommendation-card-summary" aria-expanded={isExpanded} aria-controls={detailsId} onClick={() => setExpandedReviewId(current => current === review.id ? null : review.id)}>
                    <div className="recommendation-avatar" style={{ position: 'relative', width: 52, height: 52, borderRadius: 13, background: review.isIdentityLocked ? 'rgba(224,122,56,.08)' : 'var(--surface-2)', border: `1px solid ${review.isIdentityLocked ? 'rgba(224,122,56,.3)' : 'var(--border)'}`, overflow: 'visible', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {review.imageUrl ? <img src={review.imageUrl} alt={`לוגו ${review.displayName}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} /> : <Icon n="users" s={22} c={review.isIdentityLocked ? 'var(--accent)' : 'var(--text3)'} />}
                      {review.isIdentityLocked && <span aria-label="הלוגו זמין למנויי Pro" title="הלוגו זמין למנויי Pro" style={{ position: 'absolute', left: -5, bottom: -5, display: 'grid', placeItems: 'center', width: 23, height: 23, borderRadius: '50%', background: 'var(--surface)', border: '1px solid rgba(224,122,56,.55)', color: 'var(--accent)' }}><Icon n="lock" s={12} /></span>}
                    </div>
                    <div className="recommendation-card-content" style={{ minWidth: 0, flex: 1 }}>
                      <div className="recommendation-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}><strong>{review.displayName}</strong>{review.isIdentityLocked && <span className="recommendation-pro-lock"><Icon n="lock" s={11} /> זהות ולוגו ב‑Pro</span>}</div><div className="recommendation-meta" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5, fontSize: 12, color: 'var(--text3)' }}><span>{review.role}</span>{review.serviceAreas.map((area) => <span key={area} className="recommendation-area-chip">{area}</span>)}</div></div><div className="recommendation-rating" style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 800, whiteSpace: 'nowrap' }}>{review.overallRating.toFixed(1)} <Icon n="star" s={16} /></div></div>
                      <div className="recommendation-verified" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--success)', fontWeight: 700, marginTop: 7 }}><Icon n="check-circle" s={14} /> חוות דעת מאומתת</div>
                    </div>
                    <span className="recommendation-expand-icon" aria-hidden="true"><Icon n="chevron-down" s={19} c="var(--text3)" /></span>
                  </button>
                  <div id={detailsId} className="recommendation-card-details" aria-hidden={!isExpanded} inert={!isExpanded}>
                    <div className="recommendation-card-details-inner">
                      <p className="recommendation-review-body" style={{ margin: '12px 0 10px', color: 'var(--text2)', lineHeight: 1.65 }}>{review.body}</p>
                      <div className="recommendation-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{review.tags.map(tag => <span key={tag} style={{ fontSize: 11, padding: '4px 7px', borderRadius: 999, background: 'var(--surface-2)', color: 'var(--text2)' }}>{tag}</span>)}</div>
                      <div className="recommendation-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 11 }}>
                        <span style={{ color: 'var(--text3)', fontSize: 12 }}>פרויקט · {review.authorRole === 'owner' ? 'בעלים' : review.authorRole === 'manager' ? 'מנהל' : 'מפקח'}</span>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}><Btn size="sm" variant={feedAccess?.isPro ? 'outline' : 'ghost'} onClick={() => {
                          if (!feedAccess?.isPro || !review.contractorProfileId) {
                            openUpgradeModal({ title: 'יצירת קשר עם קבלנים זמינה ב-Pro', reason: 'רכשו מנוי Pro כדי לראות פרטי קשר ולפנות לקבלנים מומלצים מהמאגר.' });
                            return;
                          }
                          setContactTarget({ contractorProfileId: review.contractorProfileId, name: review.displayName });
                        }}>
                          <Icon n={feedAccess?.isPro ? 'phone' : 'lock'} s={13} /> {feedAccess?.isPro ? 'יצירת קשר' : 'יצירת קשר ב‑Pro'}
                        </Btn>{!review.isOwnReview && <Btn size="sm" variant="ghost" onClick={() => { setReportTarget({ id: review.id as Id<'contractorReviews'>, name: review.displayName }); setReportReason(reportReasons[0]); setReportDetails(''); setReportError(null); }}><Icon n="alert" s={13} />דיווח</Btn>}</div>
                      </div>
                    </div>
                  </div>
                </article>;
              })}
            </div>
            {feedStatus === 'CanLoadMore' && <div style={{ display: 'flex', justifyContent: 'center', padding: 14 }}><Btn variant="outline" onClick={() => loadMoreReviews(24)}>טען המלצות נוספות</Btn></div>}
          </div>}
        </div>
      </section>
      <aside className="recommendations-trust-panel" style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 18, background: 'var(--surface)' }}>
        <div className="recommendations-trust-title"><Icon n="check-circle" s={17} c="var(--accent)" /><strong>למה אפשר לסמוך?</strong></div>
        <div className="recommendations-trust-list">
          {['רק מי שעבד בפרויקט יכול להמליץ', 'ללא דירוגים ממומנים', 'פרטי פרויקט נשארים פרטיים'].map(text => <div className="recommendations-trust-item" key={text}><Icon n="check-circle" s={15} c="var(--accent)" />{text}</div>)}
        </div>
      </aside>
    </div>

    {contactTarget && <Modal title={`יצירת קשר עם ${contactTarget.name}`} onClose={() => setContactTarget(null)} width={440}>
      {contactDetails === undefined ? <div style={{ color: 'var(--text3)', padding: 12 }}>טוען פרטי קשר…</div> : <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.55 }}>פרטי הקשר נמסרים במסגרת מנוי Pro בלבד. מומלץ לפנות באופן ענייני ולציין שהגעתם דרך BuildSync.</div>
        {contactDetails.phone && <a href={`tel:${contactDetails.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text1)', textDecoration: 'none', fontWeight: 700 }}><Icon n="phone" s={17} c="var(--accent)" />{contactDetails.phone}</a>}
        {contactDetails.email && <a href={`mailto:${contactDetails.email}`} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text1)', textDecoration: 'none', fontWeight: 700 }}><Icon n="mail" s={17} c="var(--accent)" />{contactDetails.email}</a>}
        {!contactDetails.phone && !contactDetails.email && <div style={{ color: 'var(--text3)', fontSize: 13 }}>הקבלן עדיין לא הוסיף פרטי קשר למאגר.</div>}
      </div>}
    </Modal>}

    {reportNotice && <div role="status" style={{ position: 'fixed', left: 20, bottom: 20, zIndex: 100, maxWidth: 360, padding: '12px 15px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,.16)', color: 'var(--text1)' }}>{reportNotice}</div>}

    {reportTarget && <Modal title="דיווח על חוות דעת" onClose={() => !reportSaving && setReportTarget(null)} width={500}><div style={{ display: 'grid', gap: 14 }}>
      <p style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.55 }}>הדיווח על חוות הדעת של <strong>{reportTarget.name}</strong> יועבר לבדיקה של מנהל המערכת. הביקורת נשארת מוצגת עד שהסופר־אדמין יכריע אחרת.</p>
      <label><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>סיבת הדיווח</div><select className="bp-input" value={reportReason} onChange={(event) => setReportReason(event.target.value)} style={{ width: '100%' }}>{reportReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></label>
      <label><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>פירוט נוסף <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(אופציונלי)</span></div><textarea className="bp-input" value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={500} rows={4} placeholder="ספרו לנו מה דורש בדיקה." style={{ width: '100%', resize: 'vertical' }} /></label>
      {reportError && <div role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>{reportError}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn variant="ghost" onClick={() => setReportTarget(null)} disabled={reportSaving}>ביטול</Btn><Btn disabled={reportSaving} onClick={async () => { if (!projectId || !reportTarget) return; setReportSaving(true); setReportError(null); try { const reason = reportDetails.trim() ? `${reportReason}: ${reportDetails.trim()}` : reportReason; await reportReview({ projectId, reviewId: reportTarget.id, reason }); setReportTarget(null); setReportNotice('הדיווח התקבל והביקורת הועברה לבדיקה.'); window.setTimeout(() => setReportNotice(null), 5000); } catch (err) { setReportError(friendlyReportError(err)); } finally { setReportSaving(false); } }}>{reportSaving ? 'שולח…' : 'שלחו דיווח'}</Btn></div>
    </div></Modal>}

    {reviewOpen && <Modal title={existingReview ? 'עריכת חוות דעת' : 'כתיבת חוות דעת מאומתת'} onClose={() => !saving && setReviewOpen(false)} width={620}><div style={{ display: 'grid', gap: 14 }}>
      <label><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>קבלן מהפרויקט</div><select className="bp-input" value={selectedContractorId} onChange={e => setSelectedContractorId(e.target.value)} style={{ width: '100%' }}><option value="">בחרו קבלן</option>{reviewableContractors.map((c: any) => <option value={c._id} key={c._id}>{c.name} · {c.role}</option>)}</select>{existingReview && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>כבר כתבתם חוות דעת על קבלן זה בפרויקט — אתם עורכים אותה כעת.</div>}</label>
      <label><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>דירוג כללי</div><input type="range" min="1" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} /><strong>{rating} מתוך 5</strong></label>
      <div><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 7 }}>מה בלט בעבודה?</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{reviewTags.map(tag => <button key={tag} type="button" onClick={() => setTags(current => current.includes(tag) ? current.filter(value => value !== tag) : [...current, tag])} style={{ border: `1px solid ${tags.includes(tag) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 999, padding: '6px 9px', background: tags.includes(tag) ? 'var(--accent-light)' : 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>{tag}</button>)}</div></div>
      <label><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>חוות הדעת</div><textarea className="bp-input" value={body} onChange={e => setBody(e.target.value)} rows={5} placeholder="שתפו מה היה טוב, מה חשוב לדעת, ואיך הייתה העבודה בפועל." style={{ width: '100%', resize: 'vertical' }} /></label>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn variant="ghost" onClick={() => setReviewOpen(false)} disabled={saving}>ביטול</Btn><Btn onClick={submitReview} disabled={saving}>{saving ? 'שומר…' : existingReview ? 'שמרו שינויים ושלחו לאישור' : 'שלחו לאישור'}</Btn></div>
    </div></Modal>}
  </div>;
}
