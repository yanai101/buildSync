import React, { useState, useMemo, useRef } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useQuery, useMutation, useAction, usePaginatedQuery } from 'convex/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { Icon, Btn, Modal } from '../components/Shared';

type SuperAdminTab = 'users' | 'promo' | 'cleanup' | 'support' | 'guides' | 'reviews';
const isSuperAdminTab = (value: string | undefined): value is SuperAdminTab => ['users', 'promo', 'cleanup', 'support', 'guides', 'reviews'].includes(value ?? '');

function formatTimeAgo(timestamp: number) {
  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  const months = Math.floor(days / 30);
  if (months < 12) return `לפני ${months} חודשים`;
  const years = Math.floor(days / 365);
  return `לפני ${years} שנים`;
}

export function SuperAdminScreen() {
  const search = useSearch({ from: '/super-admin', shouldThrow: false }) as { tab?: string } | undefined;
  const identity = useQuery(api.users.currentIdentity);
  const isSuperAdmin = identity?.isSuperAdmin;
  const users = useQuery(api.superAdmin.getAllUsers, isSuperAdmin ? {} : 'skip');
  const updateUserStatus = useMutation(api.superAdmin.updateUserStatus);
  const cancelUserSubscription = useAction(api.superAdmin.cancelUserSubscription);
  const deleteUserCascade = useMutation(api.superAdmin.deleteUserCascade);
  const forceResetPassword = useAction(api.superAdmin.forceResetPassword);
  const sendTestPushNotification = useMutation(api.superAdmin.sendTestPushNotification);
  
  const promoCodes = useQuery(api.superAdmin.getPromoCodes, isSuperAdmin ? {} : 'skip');
  const generatePromoCode = useMutation(api.superAdmin.generatePromoCode);
  const deletePromoCode = useMutation(api.superAdmin.deletePromoCode);
  const [activeTab, setActiveTab] = useState<SuperAdminTab>(() => isSuperAdminTab(search?.tab) ? search.tab : 'users');

  React.useEffect(() => {
    if (isSuperAdminTab(search?.tab)) setActiveTab(search.tab);
  }, [search?.tab]);

  const cleanupCandidates = useQuery(api.cleanup.getCleanupCandidates, isSuperAdmin && activeTab === 'cleanup' ? {} : 'skip');
  const deleteProject = useMutation(api.cleanup.manualDeleteProject);
  const createSimulatedInactiveProject = useMutation(api.cleanup.createSimulatedInactiveProject);

  const supportTickets = useQuery(api.support.getOpenTickets, isSuperAdmin && activeTab === 'support' ? {} : 'skip');
  const supportTicketCount = useQuery(api.support.getOpenTicketCount, isSuperAdmin ? {} : 'skip') || 0;
  const resolveTicket = useMutation(api.support.resolveTicket);
  const pendingContractorReviews = useQuery(api.contractorRecommendations.listPendingReviews, isSuperAdmin ? {} : 'skip') || [];
  const openReviewReportCount = useQuery(api.contractorRecommendations.getOpenReviewReportCount, isSuperAdmin ? {} : 'skip') || 0;
  const initializeModerationStats = useMutation(api.contractorRecommendations.initializeModerationStats);
  const { results: moderationReviews, status: moderationReviewsStatus, loadMore: loadMoreModerationReviews } = usePaginatedQuery(
    api.contractorRecommendations.listModerationReviews,
    isSuperAdmin && activeTab === 'reviews' ? {} : 'skip',
    { initialNumItems: 30 },
  );
  const moderateContractorReview = useMutation(api.contractorRecommendations.moderateReview);
  const resolveReportedReview = useMutation(api.contractorRecommendations.resolveReportedReview);
  const republishReview = useMutation(api.contractorRecommendations.republishReview);
  const updateModerationReview = useMutation(api.contractorRecommendations.updateModerationReview);
  const deleteModerationReview = useMutation(api.contractorRecommendations.deleteModerationReview);
  const [moderatingReviewId, setModeratingReviewId] = useState<Id<'contractorReviews'> | null>(null);
  const [reviewModerationError, setReviewModerationError] = useState<string | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected' | 'reported' | 'hidden'>('pending');
  const [reviewSearch, setReviewSearch] = useState('');
  const [editingModerationReview, setEditingModerationReview] = useState<any | null>(null);
  const [deleteModerationReviewTarget, setDeleteModerationReviewTarget] = useState<any | null>(null);
  const [deleteProfileImage, setDeleteProfileImage] = useState(false);
  const [rejectingReview, setRejectingReview] = useState<any | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [auditReview, setAuditReview] = useState<any | null>(null);
  const reviewModerationEvents = useQuery(
    api.contractorRecommendations.listReviewModerationEvents,
    isSuperAdmin && auditReview ? { reviewId: auditReview.id } : 'skip',
  );

  React.useEffect(() => {
    if (!isSuperAdmin) return;
    void initializeModerationStats({});
  }, [initializeModerationStats, isSuperAdmin]);

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState<Id<'users'> | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<any | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const [newPassword, setNewPassword] = useState('');
  const [promoTier, setPromoTier] = useState<'pro' | 'premium'>('pro');
  const [promoValidity, setPromoValidity] = useState<number>(1);
  const [promoMaxUses, setPromoMaxUses] = useState<number>(1);
  const [promoDuration, setPromoDuration] = useState<number>(12); // months

  const guides = useQuery(api.guides.get, isSuperAdmin && activeTab === 'guides' ? {} : 'skip');
  const createGuide = useMutation(api.guides.create);
  const updateGuide = useMutation(api.guides.update);
  const deleteGuide = useMutation(api.guides.remove);
  const [editingGuide, setEditingGuide] = useState<any | null>(null);
  const [isAddingGuide, setIsAddingGuide] = useState(false);
  const [guideForm, setGuideForm] = useState({
    title: '',
    videoUrl: '',
    duration: '',
    description: '',
    topics: '',
    tips: '',
    faqs: [] as { q: string, a: string }[]
  });

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterActivity, setFilterActivity] = useState<string>('all');
  const [filterLastActivity, setFilterLastActivity] = useState<string>('all');
  const [filterExpiration, setFilterExpiration] = useState<string>('all');
  const [filterJoinDate, setFilterJoinDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Filtered users array
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let result = users.filter((u: any) => {
      const matchesSearch = !searchQuery || 
        (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
         u.phone?.includes(searchQuery));
         
      const matchesTier = filterTier === 'all' || 
        (filterTier === 'free' && !['pro', 'premium'].includes(u.subscriptionTier as string)) ||
        u.subscriptionTier === filterTier;
        
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'suspended' ? u.isSuspended : !u.isSuspended);
        
      const matchesRole = filterRole === 'all' ||
        (filterRole === 'superAdmin' && u.isSuperAdmin) ||
        (!u.isSuperAdmin && u.role === filterRole) || 
        (filterRole === 'owner' && !u.isSuperAdmin && (!u.role || u.role === 'owner'));

      const matchesActivity = filterActivity === 'all' ||
        (filterActivity === 'active' && (u.projectCount || 0) > 0) ||
        (filterActivity === 'inactive' && (u.projectCount || 0) === 0);

      let matchesLastActivity = true;
      if (filterLastActivity !== 'all') {
        const ts = u.lastActivityAt as number | null;
        if (filterLastActivity === 'never') {
          matchesLastActivity = !ts;
        } else if (ts) {
          const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
          if (filterLastActivity === 'week') matchesLastActivity = days <= 7;
          else if (filterLastActivity === 'month') matchesLastActivity = days <= 30;
          else if (filterLastActivity === 'inactive30') matchesLastActivity = days > 30;
        } else {
          matchesLastActivity = false;
        }
      }

      let matchesExpiration = true;
      if (filterExpiration !== 'all') {
        const now = Date.now();
        const expiresAt = u.subscriptionExpiresAt;
        if (!expiresAt) {
          matchesExpiration = filterExpiration === 'free'; // no expiration = free usually
        } else {
          const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
          if (filterExpiration === 'expired') matchesExpiration = daysLeft < 0;
          else if (filterExpiration === 'month1') matchesExpiration = daysLeft >= 0 && daysLeft <= 30;
          else if (filterExpiration === 'month2') matchesExpiration = daysLeft > 30 && daysLeft <= 60;
          else if (filterExpiration === 'month3') matchesExpiration = daysLeft > 60 && daysLeft <= 90;
        }
      }
        
      let matchesJoinDate = true;
      if (filterJoinDate !== 'all') {
        const now = Date.now();
        const joinDays = (now - u._creationTime) / (1000 * 60 * 60 * 24);
        if (filterJoinDate === 'today') matchesJoinDate = joinDays < 1;
        else if (filterJoinDate === 'week') matchesJoinDate = joinDays <= 7;
        else if (filterJoinDate === 'month') matchesJoinDate = joinDays <= 30;
        else if (filterJoinDate === 'year') matchesJoinDate = joinDays <= 365;
      }

      return matchesSearch && matchesTier && matchesStatus && matchesRole && matchesActivity && matchesLastActivity && matchesExpiration && matchesJoinDate;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      if (sortBy === 'newest') return (b._creationTime || 0) - (a._creationTime || 0);
      if (sortBy === 'oldest') return (a._creationTime || 0) - (b._creationTime || 0);
      if (sortBy === 'projects') return (b.projectCount || 0) - (a.projectCount || 0);
      if (sortBy === 'activity') return (b.lastActivityAt || 0) - (a.lastActivityAt || 0);
      return 0;
    });

    return result;
  }, [users, searchQuery, filterTier, filterStatus, filterRole, filterActivity, filterLastActivity, filterExpiration, filterJoinDate, sortBy]);

  const filteredModerationReviews = moderationReviews.filter((review: any) => {
    const search = reviewSearch.trim().toLocaleLowerCase('he');
    const matchesStatus = reviewStatusFilter === 'all'
      || (reviewStatusFilter === 'reported' ? review.reports?.some((report: any) => report.status !== 'resolved') : review.status === reviewStatusFilter);
    if (!matchesStatus) return false;
    if (!search) return true;
    return [review.contractorName, review.contractorCompany, review.projectName, review.authorName, review.body]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('he')
      .includes(search);
  });

  // Virtualizer setup — dynamic height via measureElement
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => expandedUserId === filteredUsers[i]?._id ? 260 : 68,
    measureElement: (el) => el.getBoundingClientRect().height,
    overscan: 5,
  });

  if (users === undefined) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        טוען משתמשים...
      </div>
    );
  }

  const handleDelete = async () => {
    if (!showConfirmDelete) return;
    if (confirm("האם אתה בטוח? פעולה זו תמחק את המשתמש ואת כל הפרויקטים שלו לצמיתות!")) {
      await deleteUserCascade({ userId: showConfirmDelete });
    }
    setShowConfirmDelete(null);
  };

  const handleSendTestPush = async (userId: Id<'users'>) => {
    try {
      const result = await sendTestPushNotification({ userId });
      if (result.subscriptionCount === 0) {
        alert('למשתמש זה אין מנויי Push פעילים (לא הפעיל התראות במכשיר כלשהו).');
      } else {
        alert(`נשלחה התראת בדיקה ל-${result.subscriptionCount} מכשיר/ים.`);
      }
    } catch (e: any) {
      alert('שגיאה בשליחת התראת בדיקה: ' + e.message);
    }
  };

  const handleGeneratePromo = async () => {
    try {
      await generatePromoCode({ 
        tier: promoTier, 
        validityDays: promoValidity,
        maxUses: promoMaxUses,
        subscriptionDurationMonths: promoDuration
      });
      alert('הקוד נוצר בהצלחה!');
    } catch (e: any) {
      alert('שגיאה ביצירת הקוד: ' + e.message);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            background: activeTab === 'users' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: activeTab === 'users' ? 600 : 400,
            color: activeTab === 'users' ? 'var(--text1)' : 'var(--text2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Icon n="users" s={20} />
          ניהול משתמשים
        </button>
        <button 
          onClick={() => setActiveTab('promo')}
          style={{ 
            background: activeTab === 'promo' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'promo' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: activeTab === 'promo' ? 600 : 400,
            color: activeTab === 'promo' ? 'var(--text1)' : 'var(--text2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Icon n="link" s={20} />
          קישורי הרשמה
        </button>
        <button 
          onClick={() => setActiveTab('cleanup')}
          style={{ 
            background: activeTab === 'cleanup' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cleanup' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: activeTab === 'cleanup' ? 600 : 400,
            color: activeTab === 'cleanup' ? 'var(--text1)' : 'var(--text2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Icon n="trash-2" s={20} />
          ניקוי פרויקטים (Data Retention)
        </button>
        <button 
          onClick={() => setActiveTab('support')}
          style={{ 
            background: activeTab === 'support' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'support' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: activeTab === 'support' ? 600 : 400,
            color: activeTab === 'support' ? 'var(--text1)' : 'var(--text2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Icon n="help-circle" s={20} />
          פניות תמיכה
          {supportTicketCount > 0 && (
            <span style={{
              background: 'var(--danger)',
              color: 'white',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 10,
              marginLeft: 4,
            }}>
              {supportTicketCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('guides')}
          style={{ 
            background: activeTab === 'guides' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'guides' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px',
            fontSize: 16,
            fontWeight: activeTab === 'guides' ? 600 : 400,
            color: activeTab === 'guides' ? 'var(--text1)' : 'var(--text2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <Icon n="play-circle" s={20} />
          ניהול הדרכות וידאו
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          style={{
            background: activeTab === 'reviews' ? 'var(--surface)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '12px 24px', fontSize: 16, fontWeight: activeTab === 'reviews' ? 600 : 400,
            color: activeTab === 'reviews' ? 'var(--text1)' : 'var(--text2)', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: 8, position: 'relative', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <Icon n="star" s={20} />
          אישור ביקורות
          {pendingContractorReviews.length > 0 && <span style={{ background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 10, marginLeft: 4 }}>{pendingContractorReviews.length}</span>}
          {openReviewReportCount > 0 && <span aria-label={`${openReviewReportCount} דיווחים פתוחים`} title={`${openReviewReportCount} דיווחים פתוחים`} style={{ background: 'var(--danger)', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 6px', borderRadius: 10, marginLeft: 2 }}>{openReviewReportCount > 99 ? '99+' : openReviewReportCount}</span>}
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon n="shield" s={28} c="var(--accent)" />
            ניהול מערכת (Super Admin)
          </h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
            כאן תוכל לראות את כל המשתמשים הרשומים, לנהל מנויים, להשעות משתמשים ולמחוק פרויקטים במידת הצורך. סה"כ משתמשים: {filteredUsers.length}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24, background: 'var(--surface)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            
            {/* Top row: Search, Sort, Clear */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: '1 1 250px', position: 'relative' }}>
                <Icon n="search" s={18} c="var(--text3)" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="חיפוש משתמש לפי שם, אימייל או טלפון..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14, background: 'var(--surface-2)' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input" style={{ width: 'auto', padding: '10px 32px 10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <option value="newest">מיין לפי: חדשים קודם</option>
                  <option value="oldest">מיין לפי: ותיקים קודם</option>
                  <option value="projects">מיין לפי: כמות פרויקטים</option>
                  <option value="activity">מיין לפי: פעילות אחרונה</option>
                </select>
                <button
                  onClick={() => {
                    setSearchQuery(''); setFilterTier('all'); setFilterStatus('all');
                    setFilterRole('all'); setFilterActivity('all'); setFilterLastActivity('all'); setFilterExpiration('all'); setFilterJoinDate('all'); setSortBy('newest');
                  }}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: 14, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon n="x-circle" s={16} />
                  נקה הכל
                </button>
              </div>
            </div>

            <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '4px 0' }}></div>

            {/* Bottom row: Filters Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>סוג מנוי</label>
                <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="free">ללא מנוי (Free)</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>סטטוס השעיה</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="active">פעיל</option>
                  <option value="suspended">מושעה</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>תפקיד</label>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="superAdmin">מנהלי מערכת</option>
                  <option value="owner">מנהלי פרויקט</option>
                  <option value="manager">מנהלי עבודה</option>
                  <option value="inspector">מפקחים</option>
                  <option value="contractor">קבלנים</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>פעילות פרויקטים</label>
                <select value={filterActivity} onChange={e => setFilterActivity(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="active">עם פרויקטים</option>
                  <option value="inactive">ללא פרויקטים</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>פעילות אחרונה</label>
                <select value={filterLastActivity} onChange={e => setFilterLastActivity(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="week">פעיל/ה ב-7 ימים</option>
                  <option value="month">פעיל/ה ב-30 יום</option>
                  <option value="inactive30">לא פעיל/ה 30+ יום</option>
                  <option value="never">אף פעם</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>תוקף מנוי</label>
                <select value={filterExpiration} onChange={e => setFilterExpiration(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="expired">פג תוקף</option>
                  <option value="month1">יפוג החודש</option>
                  <option value="month2">יפוג בעוד חודשיים</option>
                  <option value="month3">יפוג בעוד 3 חודשים</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>תאריך הצטרפות</label>
                <select value={filterJoinDate} onChange={e => setFilterJoinDate(e.target.value)} className="input" style={{ padding: '10px 12px', background: 'var(--surface-2)' }}>
                  <option value="all">הכל</option>
                  <option value="today">היום</option>
                  <option value="week">בשבוע האחרון</option>
                  <option value="month">בחודש האחרון</option>
                  <option value="year">בשנה האחרונה</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Table header — hidden on mobile */}
            {!isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.7fr 1fr 1fr 1fr 1.1fr 32px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, color: 'var(--text3)', padding: '12px 16px', gap: 12 }}>
                <div>שם משתמש</div>
                <div>אימייל / טלפון</div>
                <div>תפקיד</div>
                <div>מנוי</div>
                <div>סטטוס</div>
                <div>פעילות אחרונה</div>
                <div></div>
              </div>
            )}
            {isMobile && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 32px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13, color: 'var(--text3)', padding: '12px 16px', gap: 12 }}>
                <div>שם משתמש</div>
                <div>מנוי / סטטוס</div>
                <div></div>
              </div>
            )}

            <div ref={parentRef} style={{ height: '600px', overflowY: 'auto', background: 'var(--surface-2)' }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
                  לא נמצאו משתמשים התואמים לחיפוש.
                </div>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const u = filteredUsers[virtualRow.index];
                    const isCurrentAdmin = u._id === identity?.userId;
                    const isExpanded = expandedUserId === u._id;

                    const tierBadge = u.subscriptionTier === 'premium'
                      ? <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.12)', color: 'var(--warning)', fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>⭐ פרימיום</span>
                      : u.subscriptionTier === 'pro'
                      ? <span style={{ fontSize: 11, background: 'var(--accent-light, #EFF6FF)', color: 'var(--accent)', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>Pro</span>
                      : <span style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 8px', borderRadius: 10, background: 'var(--surface)' }}>חינם</span>;

                    const statusBadge = u.isSuspended
                      ? <span style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>● מושעה</span>
                      : <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>● פעיל</span>;

                    return (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          borderBottom: '1px solid var(--border)',
                          opacity: isCurrentAdmin ? 0.7 : 1,
                          background: isExpanded ? 'var(--surface)' : (isCurrentAdmin ? 'var(--surface)' : 'var(--bg)'),
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* ── Collapsed row header (always visible) ── */}
                        <div
                          onClick={() => setExpandedUserId(isExpanded ? null : u._id)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isMobile ? '1fr 80px 32px' : '2fr 1.7fr 1fr 1fr 1fr 1.1fr 32px',
                            gap: 12,
                            padding: '0 16px',
                            alignItems: 'center',
                            height: 68,
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          {/* Name */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.name || 'ללא שם'}
                              </span>
                              {u.isSuperAdmin && (
                                <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', padding: '2px 6px', borderRadius: 10, flexShrink: 0 }}>Admin</span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              הצטרף/ה: {new Date(u._creationTime).toLocaleDateString('he-IL')} ({formatTimeAgo(u._creationTime)})
                            </div>
                          </div>

                          {/* Desktop: email + phone */}
                          {!isMobile && (
                            <div style={{ color: 'var(--text2)', fontSize: 13, overflow: 'hidden', minWidth: 0 }}>
                              {u.email && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>}
                              {u.phone && <div style={{ color: 'var(--text3)' }}>{u.phone}</div>}
                            </div>
                          )}

                          {/* Desktop: role */}
                          {!isMobile && (
                            <div style={{ fontSize: 13, color: 'var(--text2)' }}>{u.role || 'owner'}</div>
                          )}

                          {/* Desktop: tier badge */}
                          {!isMobile && <div>{tierBadge}</div>}

                          {/* Desktop: status */}
                          {!isMobile && <div>{statusBadge}</div>}

                          {/* Desktop: last activity */}
                          {!isMobile && (
                            <div style={{ fontSize: 12, color: u.lastActivityAt ? 'var(--text2)' : 'var(--text3)' }}>
                              {u.lastActivityAt ? formatTimeAgo(u.lastActivityAt) : '—'}
                            </div>
                          )}

                          {/* Mobile: tier + status together */}
                          {isMobile && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              {tierBadge}
                              {statusBadge}
                            </div>
                          )}

                          {/* Chevron */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: 'var(--text3)',
                            fontSize: 18,
                          }}>
                            ▾
                          </div>
                        </div>

                        {/* ── Expanded panel ── */}
                        {isExpanded && (
                          <div style={{
                            padding: '16px 20px 20px',
                            background: 'linear-gradient(to bottom, var(--surface), var(--surface))',
                            borderTop: '1px solid var(--border)',
                          }}>
                            {/* Details grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                              gap: '12px 24px',
                              marginBottom: 16,
                              fontSize: 13,
                            }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>אימייל</div>
                                <div style={{ color: 'var(--text1)', wordBreak: 'break-all' }}>{u.email || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>טלפון</div>
                                <div>{u.phone || '—'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>תפקיד</div>
                                <div>{u.role || 'owner'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>פרויקטים</div>
                                <div>{u.projectCount || 0}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>מנוי</div>
                                <div>{tierBadge}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>סטטוס</div>
                                <div>{statusBadge}</div>
                              </div>
                              {u.subscriptionExpiresAt && (
                                <div>
                                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>תוקף מנוי</div>
                                  <div style={{ color: u.subscriptionExpiresAt < Date.now() ? 'var(--danger)' : 'var(--text1)' }}>
                                    {new Date(u.subscriptionExpiresAt).toLocaleDateString('he-IL')}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>הצטרפות</div>
                                <div>{new Date(u._creationTime).toLocaleDateString('he-IL')}</div>
                              </div>
                            </div>

                            {/* ── Activity Stats ── */}
                            {(() => {
                              const lastActivity = (u as any).lastActivityAt as number | null;
                              const lastSession = (u as any).lastSessionAt as number | null;
                              const pushDevices = (u as any).pushDeviceCount as number ?? 0;
                              const teamMembers = (u as any).teamMemberCount as number ?? 0;
                              const lastDailyLog = (u as any).lastDailyLogDate as string | null;

                              // Activity score 0–100
                              const now = Date.now();
                              let score = 0;
                              if (lastActivity) {
                                const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);
                                if (daysSince <= 7) score += 40;
                                else if (daysSince <= 30) score += 20;
                                else if (daysSince <= 90) score += 8;
                              }
                              if (pushDevices > 0) score += 15;
                              if (teamMembers > 0) score += 20;
                              if ((u as any).projectCount > 0) score += 10;
                              if (lastDailyLog) score += 15;
                              score = Math.min(score, 100);

                              const scoreColor = score >= 70 ? 'var(--success)' : score >= 35 ? 'var(--warning)' : 'var(--danger)';
                              const scoreLabel = score >= 70 ? 'פעיל מאוד' : score >= 35 ? 'פעיל חלקית' : 'לא פעיל';

                              return (
                                <div style={{
                                  marginBottom: 16,
                                  padding: '14px 16px',
                                  background: 'var(--surface-2)',
                                  borderRadius: 10,
                                  border: '1px solid var(--border)',
                                  borderRight: `4px solid ${scoreColor}`,
                                  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      📊 פעילות באפליקציה
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>
                                      {scoreLabel} ({score}%)
                                    </span>
                                  </div>

                                  {/* Score bar */}
                                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, marginBottom: 14, overflow: 'hidden' }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${score}%`,
                                      background: scoreColor,
                                      borderRadius: 4,
                                      transition: 'width 0.4s ease',
                                    }} />
                                  </div>

                                  {/* Stats row */}
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
                                    gap: '8px 16px',
                                    fontSize: 12,
                                  }}>
                                    <div>
                                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>🛠 פעולה בפרויקט</div>
                                      <div style={{ fontWeight: 600, color: lastActivity ? 'var(--text1)' : 'var(--text3)' }}>
                                        {lastActivity ? formatTimeAgo(lastActivity) : 'אין פעילות'}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>🔑 כניסה לאפליקציה</div>
                                      <div style={{ fontWeight: 600, color: lastSession ? 'var(--text1)' : 'var(--text3)' }}>
                                        {lastSession ? formatTimeAgo(lastSession) : 'לא ידוע'}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>📱 מכשירי Push</div>
                                      <div style={{ fontWeight: 600, color: pushDevices > 0 ? 'var(--success)' : 'var(--text3)' }}>
                                        {pushDevices > 0 ? `${pushDevices} מכשיר${pushDevices > 1 ? 'ים' : ''}` : 'לא מופעל'}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>👥 חברי צוות</div>
                                      <div style={{ fontWeight: 600, color: teamMembers > 0 ? 'var(--accent)' : 'var(--text3)' }}>
                                        {teamMembers > 0 ? `${teamMembers} חבר${teamMembers > 1 ? 'י צוות' : ' צוות'}` : 'עובד לבד'}
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ color: 'var(--text3)', marginBottom: 2 }}>📋 יומן אחרון</div>
                                      <div style={{ fontWeight: 600, color: lastDailyLog ? 'var(--text1)' : 'var(--text3)' }}>
                                        {lastDailyLog
                                          ? new Date(lastDailyLog).toLocaleDateString('he-IL')
                                          : 'אין יומנים'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {isCurrentAdmin ? (
                                <>
                                  <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, alignSelf: 'center' }}>מנהל מערכת (מוגן)</span>
                                  {import.meta.env.DEV && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSendTestPush(u._id); }}
                                      style={{ border: 'none', background: 'var(--surface-hover)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}
                                    >🔔 בדיקת Push</button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingUser(u); }}
                                    style={{ border: 'none', background: 'var(--surface-hover)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', color: 'var(--text1)', fontWeight: 600, fontSize: 13 }}
                                  >✏️ עריכה</button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setResetPasswordUser(u); }}
                                    style={{ border: 'none', background: 'rgba(245,158,11,0.12)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}
                                  >🔑 איפוס סיסמה</button>
                                  {import.meta.env.DEV && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSendTestPush(u._id); }}
                                      style={{ border: 'none', background: 'var(--surface-hover)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}
                                    >🔔 בדיקת Push</button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(u._id); }}
                                    style={{ border: 'none', background: 'rgba(239,68,68,0.1)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}
                                  >🗑 מחיקה</button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'promo' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon n="link" s={24} c="var(--accent)" />
          קישורי הרשמה (Promo Codes)
        </h2>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סוג מנוי</label>
            <select className="input" value={promoTier} onChange={(e) => setPromoTier(e.target.value as any)}>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>מקסימום שימושים</label>
            <input type="number" min="1" className="input" value={promoMaxUses} onChange={(e) => setPromoMaxUses(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>אורך מנוי (חודשים)</label>
            <input type="number" min="1" className="input" value={promoDuration} onChange={(e) => setPromoDuration(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>תוקף הקוד (ימים)</label>
            <input type="number" min="1" max="365" className="input" value={promoValidity} onChange={(e) => setPromoValidity(Number(e.target.value))} />
          </div>
          <Btn variant="primary" onClick={handleGeneratePromo} style={{ height: 42 }}>
            <Icon n="plus" s={18} /> צור קוד חדש
          </Btn>
        </div>

        {promoCodes !== undefined && promoCodes.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13 }}>
                  <th style={{ padding: 12, fontWeight: 600 }}>קוד</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>קישור הרשמה</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>מנוי</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>אורך מנוי</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>פג תוקף הקוד</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>שימושים</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>סטטוס</th>
                  <th style={{ padding: 12, fontWeight: 600 }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((p) => {
                  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?promo=${p.code}`;
                  const isExpired = Date.now() > p.expiresAt;
                  const isFullyUsed = p.currentUses >= p.maxUses;
                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--border)', opacity: isFullyUsed ? 0.6 : 1 }}>
                      <td style={{ padding: 12, fontWeight: 'bold' }}>{p.code}</td>
                      <td style={{ padding: 12 }}>
                        <Btn variant="outline" onClick={() => { navigator.clipboard.writeText(link); alert('הקישור הועתק!'); }} style={{ padding: '4px 8px', fontSize: 12 }}>
                          <Icon n="copy" s={14} /> העתק קישור
                        </Btn>
                      </td>
                      <td style={{ padding: 12 }}>{p.tier === 'premium' ? 'Premium' : 'Pro'}</td>
                      <td style={{ padding: 12 }}>{p.subscriptionDurationMonths} חודשים</td>
                      <td style={{ padding: 12, color: isExpired && !isFullyUsed ? 'var(--danger)' : 'inherit' }}>
                        {new Date(p.expiresAt).toLocaleDateString('he-IL')}
                      </td>
                      <td style={{ padding: 12 }}>{p.currentUses} / {p.maxUses}</td>
                      <td style={{ padding: 12 }}>
                        {isFullyUsed ? (
                          <span style={{ color: 'var(--text3)' }}>נוצל במלואו</span>
                        ) : isExpired ? (
                          <span style={{ color: 'var(--danger)' }}>פג תוקף</span>
                        ) : (
                          <span style={{ color: 'var(--success)' }}>פעיל</span>
                        )}
                      </td>
                      <td style={{ padding: 12 }}>
                        <button 
                          onClick={async () => {
                            if (confirm('האם אתה בטוח שברצונך למחוק קוד הרשמה זה?')) {
                              await deletePromoCode({ promoCodeId: p._id });
                            }
                          }} 
                          style={{ 
                            border: 'none', 
                            background: 'rgba(239,68,68,0.1)', 
                            padding: '6px 12px', 
                            borderRadius: 6, 
                            cursor: 'pointer', 
                            color: 'var(--danger)',
                            fontWeight: 500
                          }}
                        >
                          מחק
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'cleanup' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon n="trash-2" s={24} c="var(--danger)" />
            ניקוי נתונים ישנים (Data Retention)
          </h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
            פרויקטים המופיעים כאן עומדים בקריטריונים למחיקה: מנוי פג תוקף מעל 3 חודשים או מנוי חינמי, וללא פעילות מעל 3 חודשים. מחיקה תשמיד את כל הקבצים הפיזיים משרת האחסון והרשומות הקשורות אליהם, לא ניתן לשחזר.
          </p>

          <div style={{ marginBottom: 24 }}>
            <Btn variant="outline" onClick={async () => {
              try {
                await createSimulatedInactiveProject();
                alert('פרויקט סימולציה נוצר בהצלחה!');
              } catch (e: any) {
                alert('שגיאה ביצירת סימולציה: ' + e.message);
              }
            }}>
              <Icon n="plus" s={18} /> יצירת פרויקט סימולציה (לבדיקה)
            </Btn>
          </div>

          {cleanupCandidates === undefined ? (
            <div style={{ padding: 40, textAlign: 'center' }}>טוען מועמדים למחיקה...</div>
          ) : cleanupCandidates.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
              <Icon n="check-circle" s={40} style={{ display: 'block', margin: '0 auto 12px' }} />
              אין פרויקטים המיועדים למחיקה. המערכת נקייה.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text3)', fontSize: 13 }}>
                    <th style={{ padding: 12, fontWeight: 600 }}>שם הפרויקט</th>
                    <th style={{ padding: 12, fontWeight: 600 }}>בעלים (אימייל)</th>
                    <th style={{ padding: 12, fontWeight: 600 }}>ימי אי-פעילות</th>
                    <th style={{ padding: 12, fontWeight: 600 }}>סיבת מחיקה</th>
                    <th style={{ padding: 12, fontWeight: 600 }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanupCandidates.map((c: any) => (
                    <tr key={c.project._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: 12, fontWeight: 'bold' }}>{c.project.name}</td>
                      <td style={{ padding: 12 }}>{c.ownerName} ({c.ownerEmail})</td>
                      <td style={{ padding: 12, color: 'var(--danger)', fontWeight: 600 }}>{c.inactiveDays} ימים</td>
                      <td style={{ padding: 12 }}>{c.reason}</td>
                      <td style={{ padding: 12 }}>
                        <button 
                          onClick={async () => {
                            if (confirm(`האם אתה בטוח שברצונך למחוק את הפרויקט "${c.project.name}" לצמיתות כולל כל המסמכים?`)) {
                              try {
                                await deleteProject({ projectId: c.project._id });
                                alert('הפרויקט נמחק בהצלחה.');
                              } catch(e: any) {
                                alert('שגיאה: ' + e.message);
                              }
                            }
                          }} 
                          style={{ 
                            border: 'none', 
                            background: 'rgba(239,68,68,0.1)', 
                            padding: '6px 12px', 
                            borderRadius: 6, 
                            cursor: 'pointer', 
                            color: 'var(--danger)',
                            fontWeight: 500
                          }}
                        >
                          מחק לצמיתות
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!!editingUser && (
        <Modal onClose={() => setEditingUser(null)} title="עריכת משתמש">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 600 }}>{editingUser.name || 'ללא שם'}</div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סוג מנוי</label>
              <select 
                value={editingUser.subscriptionTier || 'none'}
                onChange={(e) => setEditingUser({ ...editingUser, subscriptionTier: e.target.value === 'none' ? undefined : e.target.value })}
                className="input"
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
              >
                <option value="none">ללא מנוי (Free)</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {['pro', 'premium'].includes(editingUser.subscriptionTier) && (
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>
                  חידוש תוקף מנוי (ימים מעכשיו)
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
                    השאר ריק כדי לשמור על התוקף הנוכחי: {editingUser.subscriptionExpiresAt ? new Date(editingUser.subscriptionExpiresAt).toLocaleDateString('he-IL') : 'לא מוגדר'}
                  </span>
                </label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="לדוגמה: 30 לטסט, 365 לשנה"
                  value={editingUser.newSubscriptionDays || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setEditingUser({ ...editingUser, newSubscriptionDays: Number(e.target.value) });
                    } else {
                      const copy = { ...editingUser };
                      delete copy.newSubscriptionDays;
                      setEditingUser(copy);
                    }
                  }}
                  className="input"
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)' }}>סטטוס השעיה</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input 
                  type="checkbox" 
                  checked={!!editingUser.isSuspended}
                  onChange={(e) => setEditingUser({ ...editingUser, isSuspended: e.target.checked })}
                  id="suspend-checkbox"
                />
                <label htmlFor="suspend-checkbox" style={{ color: 'var(--danger)', fontWeight: 600 }}>השעה משתמש זה</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Btn 
                variant="primary" 
                onClick={async () => {
                  try {
                    let expiresAt = editingUser.subscriptionExpiresAt;
                    if (!['pro', 'premium'].includes(editingUser.subscriptionTier)) {
                      // Downgrading to free/none
                      await cancelUserSubscription({ 
                        userId: editingUser._id,
                        isSuspended: editingUser.isSuspended 
                      });
                    } else {
                      if (editingUser.newSubscriptionDays) {
                        expiresAt = Date.now() + editingUser.newSubscriptionDays * 24 * 60 * 60 * 1000;
                      } else if (!expiresAt) {
                        // Default to 1 year if they didn't specify and don't have one
                        expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
                      }

                      await updateUserStatus({
                        userId: editingUser._id,
                        isSuspended: editingUser.isSuspended,
                        subscriptionTier: editingUser.subscriptionTier,
                        subscriptionExpiresAt: expiresAt,
                      });
                    }
                    setEditingUser(null);
                  } catch (e: any) {
                    alert('שגיאה בשמירת פרטים: ' + e.message);
                  }
                }}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                שמור שינויים
              </Btn>
              <Btn variant="outline" onClick={() => setEditingUser(null)} style={{ flex: 1, justifyContent: 'center' }}>
                ביטול
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {!!resetPasswordUser && (
        <Modal onClose={() => { setResetPasswordUser(null); setNewPassword(''); }} title="איפוס סיסמה">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14 }}>
              אתה עומד לשנות את הסיסמה עבור <strong>{resetPasswordUser.name || resetPasswordUser.email}</strong>.
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text2)', fontWeight: 600 }}>סיסמה חדשה</label>
              <input
                type="text"
                placeholder="הכנס סיסמה זמנית..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                * חובה לפחות 8 תווים
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Btn 
                variant="primary" 
                onClick={async () => {
                  if (newPassword.length < 8) return;
                  try {
                    await forceResetPassword({
                      userId: resetPasswordUser._id,
                      email: resetPasswordUser.email,
                      newPassword: newPassword,
                    });
                    alert('הסיסמה שונתה בהצלחה!');
                    setResetPasswordUser(null);
                    setNewPassword('');
                  } catch (e: any) {
                    alert('שגיאה: ' + e.message);
                  }
                }}
                disabled={newPassword.length < 8}
                style={{ flex: 1, justifyContent: 'center', background: 'var(--warning)', borderColor: 'var(--warning)' }}
              >
                שנה סיסמה
              </Btn>
              <Btn variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(''); }} style={{ flex: 1, justifyContent: 'center' }}>
                ביטול
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {activeTab === 'support' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon n="help-circle" s={28} c="var(--accent)" />
            פניות תמיכה פתוחות
          </h2>
          
          {!supportTickets ? (
            <div style={{ padding: 40, textAlign: 'center' }}>טוען פניות...</div>
          ) : supportTickets.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
              <Icon n="check-circle" s={40} style={{ display: 'block', margin: '0 auto 12px' }} />
              אין פניות תמיכה פתוחות.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {supportTickets.map((ticket: any) => (
                <div key={ticket._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 16 }}>נושא: {ticket.topic}</span>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                          ({new Date(ticket._creationTime).toLocaleString('he-IL')})
                        </span>
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--text2)' }}>
                        <strong>מאת:</strong> {ticket.user.name} ({ticket.user.email}) | <strong>טלפון:</strong> {ticket.user.phone}
                      </div>
                    </div>
                    <Btn 
                      variant="primary" 
                      onClick={async () => {
                        if (confirm('האם לסמן את הפנייה כטופלה?')) {
                          try {
                            await resolveTicket({ ticketId: ticket._id });
                            alert('הפנייה סומנה כטופלה.');
                          } catch (e: any) {
                            alert('שגיאה: ' + e.message);
                          }
                        }
                      }}
                      style={{ background: 'rgba(34,197,94,0.12)', borderColor: 'var(--success)' }}
                    >
                      <Icon n="check" s={16} /> סמן כטופל
                    </Btn>
                  </div>
                  
                  <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap', marginBottom: ticket.urlContext ? 12 : 0 }}>
                    {ticket.message}
                  </div>
                  
                  {ticket.urlContext && (
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                      <strong>הקשר (URL):</strong> <a href={ticket.urlContext} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{ticket.urlContext}</a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guides' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 24, display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
              <Icon n="play-circle" s={28} c="var(--accent)" />
              ניהול הדרכות וידאו (Guides)
            </h2>
            <Btn variant="primary" onClick={() => {
              setGuideForm({ title: '', videoUrl: '', duration: '', description: '', topics: '', tips: '', faqs: [] });
              setIsAddingGuide(true);
            }}>
              <Icon n="plus" s={18} /> הוסף מדריך חדש
            </Btn>
          </div>
          
          {!guides ? (
            <div>טוען הדרכות...</div>
          ) : guides.length === 0 ? (
            <div style={{ color: 'var(--text3)' }}>אין הדרכות כרגע.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {guides.map((guide: any) => (
                <div key={guide._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{guide.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>{guide.description}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="link" s={14}/> <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={guide.videoUrl}>{guide.videoUrl}</span></span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="clock" s={14}/> {guide.duration || 'לא צוין'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="list" s={14}/> {guide.topics?.length || 0} נושאים</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="zap" s={14}/> {guide.tips?.length || 0} טיפים</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon n="help-circle" s={14}/> {guide.faqs?.length || 0} שאלות</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', alignSelf: 'flex-start', borderTop: '1px solid var(--border)', width: '100%', paddingTop: 16 }}>
                    <button onClick={() => {
                      setGuideForm({
                        title: guide.title,
                        videoUrl: guide.videoUrl,
                        duration: guide.duration || '',
                        description: guide.description,
                        topics: (guide.topics || []).join('\n'),
                        tips: (guide.tips || []).join('\n'),
                        faqs: guide.faqs || []
                      });
                      setEditingGuide(guide);
                    }} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--surface)', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--text1)', fontWeight: 500 }}>
                      <Icon n="edit" s={16} /> עריכה
                    </button>
                    <button onClick={async () => {
                      if (confirm('האם למחוק מדריך זה?')) {
                        await deleteGuide({ id: guide._id });
                      }
                    }} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center', border: 'none', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', color: 'var(--danger)', fontWeight: 500 }}>
                      <Icon n="trash" s={16} /> מחיקה
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}><h2 style={{ fontSize: 24, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}><Icon n="shield" s={28} c="var(--accent)" />אישור ביקורות קבלנים</h2>{openReviewReportCount > 0 && <button type="button" onClick={() => setReviewStatusFilter('reported')} style={{ border: '1px solid color-mix(in srgb, var(--danger) 35%, var(--border))', background: 'color-mix(in srgb, var(--danger) 9%, var(--surface))', color: 'var(--danger)', padding: '7px 10px', borderRadius: 999, fontWeight: 800, cursor: 'pointer' }}><Icon n="alert" s={15} /> {openReviewReportCount} דיווחים ממתינים</button>}</div>
          <p style={{ color: 'var(--text2)', margin: '0 0 20px', lineHeight: 1.55 }}>ביקורות ותמונות חדשות אינן נחשפות במאגר עד לאישור שלך. כאן אפשר גם לאתר, לערוך או למחוק ביקורות שכבר טופלו.</p>
          {reviewModerationError && <div style={{ marginBottom: 14, padding: 11, color: 'var(--danger)', borderRadius: 8, background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }}>{reviewModerationError}</div>}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <input aria-label="חיפוש ביקורות" className="input" value={reviewSearch} onChange={(event) => setReviewSearch(event.target.value)} placeholder="חיפוש קבלן, פרויקט או כותב…" style={{ minWidth: 220, flex: '1 1 260px' }} />
            <select aria-label="סינון ביקורות לפי סטטוס" className="input" value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value as typeof reviewStatusFilter)} style={{ minWidth: 170 }}>
              <option value="all">כל הסטטוסים</option><option value="pending">ממתינות לאישור</option><option value="published">פורסמו</option><option value="rejected">נדחו</option><option value="reported">דיווחים פתוחים</option><option value="hidden">מוסתרות</option>
            </select>
            <span style={{ alignSelf: 'center', color: 'var(--text3)', fontSize: 13 }}>{filteredModerationReviews.length} ביקורות נטענו</span>
          </div>
          {moderationReviewsStatus === 'LoadingFirstPage' ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}>טוען ביקורות…</div> : filteredModerationReviews.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}><Icon n={pendingContractorReviews.length === 0 ? 'check-circle' : 'search'} s={36} c={pendingContractorReviews.length === 0 ? 'var(--success)' : 'var(--text3)'} style={{ display: 'block', margin: '0 auto 10px' }} />{reviewStatusFilter === 'pending' && !reviewSearch && pendingContractorReviews.length === 0 ? 'אין ביקורות ממתינות לאישור.' : 'לא נמצאו ביקורות התואמות לסינון.'}</div> : <div style={{ display: 'grid', gap: 12 }}>
            {filteredModerationReviews.map((review: any) => <article key={review.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {review.pendingImageUrl || review.imageUrl ? <img src={review.pendingImageUrl || review.imageUrl} alt={`תמונת ${review.contractorName}`} style={{ width: 58, height: 58, flexShrink: 0, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} /> : <div style={{ width: 58, height: 58, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}><Icon n="users" s={22} c="var(--text3)" /></div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><strong>{review.contractorName}</strong><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 8px', fontSize: 11 }}>{({ pending: 'ממתינה', published: 'פורסמה', rejected: 'נדחתה', reported: 'דווחה', hidden: 'מוסתרת' } as Record<string, string>)[review.status] ?? review.status}</span><span style={{ color: 'var(--accent)', fontWeight: 800 }}>{review.overallRating.toFixed(1)} <Icon n="star" s={14} /></span></span></div>
                  <div style={{ marginTop: 4, color: 'var(--text3)', fontSize: 12 }}>{review.contractorCompany ?? 'ללא שם חברה'} · {review.projectName} · נשלח על ידי {review.authorName} ({review.authorRole}) · {formatTimeAgo(review.createdAt)}</div>
                  <p style={{ margin: '10px 0', color: 'var(--text2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{review.body}</p>
                  {review.tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{review.tags.map((tag: string) => <span key={tag} style={{ padding: '3px 7px', borderRadius: 999, fontSize: 11, background: 'var(--surface)', color: 'var(--text2)' }}>{tag}</span>)}</div>}
                  {(() => { const openReports = review.reports?.filter((report: any) => report.status !== 'resolved') ?? []; return openReports.length > 0 ? <div style={{ marginTop: 12, padding: 10, borderRadius: 9, border: '1px solid color-mix(in srgb, var(--danger) 30%, var(--border))', background: 'color-mix(in srgb, var(--danger) 7%, var(--surface))' }}><strong style={{ display: 'block', color: 'var(--danger)', fontSize: 13, marginBottom: 5 }}>{openReports.length} דיווחים פתוחים על ביקורת זו</strong>{openReports.map((report: any) => <div key={report.id} style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{report.reporterName}: {report.reason}</div>)}</div> : null; })()}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                    {review.status === 'pending' && <><Btn size="sm" variant="ghost" disabled={moderatingReviewId === review.id} onClick={() => { setRejectingReview(review); setRejectionNote(''); }}>דחה</Btn><Btn size="sm" disabled={moderatingReviewId === review.id} onClick={async () => { setModeratingReviewId(review.id); setReviewModerationError(null); try { await moderateContractorReview({ reviewId: review.id, decision: 'published' }); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו לאשר את הביקורת.'); } finally { setModeratingReviewId(null); } }}>{moderatingReviewId === review.id ? 'שומר…' : 'אשר ופרסם'}</Btn></>}
                    {review.reports?.some((report: any) => report.status !== 'resolved') && <><Btn size="sm" variant="ghost" disabled={moderatingReviewId === review.id} onClick={async () => { setModeratingReviewId(review.id); setReviewModerationError(null); try { await resolveReportedReview({ reviewId: review.id, decision: 'hidden' }); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו להסתיר את הביקורת.'); } finally { setModeratingReviewId(null); } }}>הסתר ביקורת</Btn><Btn size="sm" disabled={moderatingReviewId === review.id} onClick={async () => { setModeratingReviewId(review.id); setReviewModerationError(null); try { await resolveReportedReview({ reviewId: review.id, decision: 'published' }); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו לסגור את הדיווח.'); } finally { setModeratingReviewId(null); } }}>{moderatingReviewId === review.id ? 'שומר…' : 'השאר מפורסמת'}</Btn></>}
                    {review.status === 'hidden' && <Btn size="sm" disabled={moderatingReviewId === review.id} onClick={async () => { setModeratingReviewId(review.id); setReviewModerationError(null); try { await republishReview({ reviewId: review.id }); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו לפרסם מחדש את הביקורת.'); } finally { setModeratingReviewId(null); } }}>{moderatingReviewId === review.id ? 'מפרסם…' : 'פרסום מחדש'}</Btn>}
                    <Btn size="sm" variant="ghost" onClick={() => setAuditReview(review)}><Icon n="clock" s={15} />היסטוריית פעולות</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditingModerationReview({ ...review })}><Icon n="edit" s={15} />עריכה</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setDeleteModerationReviewTarget(review); setDeleteProfileImage(false); }} style={{ color: 'var(--danger)' }}><Icon n="trash" s={15} />מחיקה</Btn>
                  </div>
                </div>
              </div>
            </article>)}
          </div>}
          {moderationReviewsStatus === 'CanLoadMore' && <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}><Btn variant="outline" onClick={() => loadMoreModerationReviews(30)}>טען ביקורות נוספות</Btn></div>}
        </div>
      )}

      {auditReview && (
        <Modal onClose={() => setAuditReview(null)} title="היסטוריית טיפול בביקורת">
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ margin: 0, color: 'var(--text2)' }}>הביקורת של <strong>{auditReview.contractorName}</strong>.</p>
            {!reviewModerationEvents ? <div style={{ color: 'var(--text3)' }}>טוען היסטוריה…</div> : reviewModerationEvents.length === 0 ? <div style={{ color: 'var(--text3)' }}>אין עדיין פעולות מתועדות עבור ביקורת זו.</div> : reviewModerationEvents.map((event: any) => <div key={event.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}><strong>{({ submitted: 'נשלחה לאישור', resubmitted: 'נשלחה מחדש לאישור', approved: 'אושרה ופורסמה', rejected: 'נדחתה', report_received: 'התקבל דיווח', report_kept_visible: 'הדיווח נסגר — נשארה מפורסמת', report_hidden: 'הדיווח טופל — הוסתרה', republished: 'פורסמה מחדש', edited: 'נערכה על ידי מנהל', deleted: 'נמחקה' } as Record<string, string>)[event.action] ?? event.action}</strong><div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 3 }}>{event.actorName} · {formatTimeAgo(event.createdAt)}</div>{event.note && <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 13 }}>{event.note}</div>}</div>)}
          </div>
        </Modal>
      )}

      {rejectingReview && (
        <Modal onClose={() => setRejectingReview(null)} title="דחיית חוות דעת">
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.55 }}>חוות הדעת על <strong>{rejectingReview.contractorName}</strong> לא תופיע במאגר. אפשר לצרף סיבה כדי שהכותב יבין מה נדרש לתקן לפני שליחה חדשה.</p>
            <label style={{ display: 'grid', gap: 6 }}><span>סיבת הדחייה <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(אופציונלי)</span></span><textarea className="input" value={rejectionNote} onChange={(event) => setRejectionNote(event.target.value)} maxLength={500} rows={4} placeholder="לדוגמה: יש להסיר פרטי קשר מהטקסט." /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn variant="ghost" onClick={() => setRejectingReview(null)}>ביטול</Btn><Btn disabled={moderatingReviewId === rejectingReview.id} onClick={async () => { setModeratingReviewId(rejectingReview.id); setReviewModerationError(null); try { await moderateContractorReview({ reviewId: rejectingReview.id, decision: 'rejected', note: rejectionNote.trim() || undefined }); setRejectingReview(null); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו לדחות את הביקורת.'); } finally { setModeratingReviewId(null); } }} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>{moderatingReviewId === rejectingReview.id ? 'דוחה…' : 'דחה ושלח עדכון'}</Btn></div>
          </div>
        </Modal>
      )}

      {editingModerationReview && (
        <Modal onClose={() => setEditingModerationReview(null)} title="עריכת ביקורת">
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ color: 'var(--text2)', fontSize: 14 }}>הביקורת של <strong>{editingModerationReview.contractorName}</strong> בפרויקט {editingModerationReview.projectName}.</div>
            <label style={{ display: 'grid', gap: 6 }}><span>דירוג כללי</span><input className="input" type="number" min="1" max="5" step="0.5" value={editingModerationReview.overallRating} onChange={(event) => setEditingModerationReview((current: any) => ({ ...current, overallRating: Number(event.target.value) }))} /></label>
            <label style={{ display: 'grid', gap: 6 }}><span>חוות הדעת</span><textarea className="input" style={{ minHeight: 140 }} value={editingModerationReview.body} onChange={(event) => setEditingModerationReview((current: any) => ({ ...current, body: event.target.value }))} /></label>
            <label style={{ display: 'grid', gap: 6 }}><span>תגיות (מופרדות בפסיקים)</span><input className="input" value={editingModerationReview.tags.join(', ')} onChange={(event) => setEditingModerationReview((current: any) => ({ ...current, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }))} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn variant="ghost" onClick={() => setEditingModerationReview(null)}>ביטול</Btn><Btn disabled={moderatingReviewId === editingModerationReview.id} onClick={async () => { setModeratingReviewId(editingModerationReview.id); setReviewModerationError(null); try { await updateModerationReview({ reviewId: editingModerationReview.id, overallRating: editingModerationReview.overallRating, body: editingModerationReview.body, tags: editingModerationReview.tags }); setEditingModerationReview(null); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו לעדכן את הביקורת.'); } finally { setModeratingReviewId(null); } }}>{moderatingReviewId === editingModerationReview.id ? 'שומר…' : 'שמור שינויים'}</Btn></div>
          </div>
        </Modal>
      )}

      {deleteModerationReviewTarget && (
        <Modal onClose={() => setDeleteModerationReviewTarget(null)} title="מחיקת ביקורת">
          <div style={{ display: 'grid', gap: 16 }}>
            <p style={{ margin: 0, color: 'var(--text2)', lineHeight: 1.55 }}>למחוק את הביקורת של <strong>{deleteModerationReviewTarget.contractorName}</strong>? פעולה זו תמחק גם תגובות ודיווחים המשויכים אליה ולא ניתן לשחזר אותה.</p>
            {(deleteModerationReviewTarget.imageUrl || deleteModerationReviewTarget.pendingImageUrl) && <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12, border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }}><input type="checkbox" checked={deleteProfileImage} onChange={(event) => setDeleteProfileImage(event.target.checked)} /><span><strong>מחק גם את תמונת הקבלן</strong><br /><span style={{ color: 'var(--text3)', fontSize: 13 }}>התמונה תימחק מהפרופיל ומכל הופעה שלה במאגר, לא רק מביקורת זו.</span></span></label>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}><Btn variant="ghost" onClick={() => setDeleteModerationReviewTarget(null)}>ביטול</Btn><Btn disabled={moderatingReviewId === deleteModerationReviewTarget.id} onClick={async () => { setModeratingReviewId(deleteModerationReviewTarget.id); setReviewModerationError(null); try { await deleteModerationReview({ reviewId: deleteModerationReviewTarget.id, deleteProfileImage }); setDeleteModerationReviewTarget(null); } catch (error) { setReviewModerationError(error instanceof Error ? error.message : 'לא הצלחנו למחוק את הביקורת.'); } finally { setModeratingReviewId(null); } }} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>{moderatingReviewId === deleteModerationReviewTarget.id ? 'מוחק…' : 'מחק ביקורת'}</Btn></div>
          </div>
        </Modal>
      )}

      {(isAddingGuide || editingGuide) && (
        <Modal onClose={() => { setIsAddingGuide(false); setEditingGuide(null); }} title={isAddingGuide ? 'הוספת מדריך חדש' : 'עריכת מדריך'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>כותרת המדריך</label>
              <input className="input" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} value={guideForm.title} onChange={e => setGuideForm({...guideForm, title: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>לינק לסרטון (יוטיוב או MP4 מקומי)</label>
              <input className="input" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} placeholder="https://www.youtube.com/watch?v=... או /videos/step1.mp4" value={guideForm.videoUrl} onChange={e => setGuideForm({...guideForm, videoUrl: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>משך (טקסט, למשל: "10 דקות")</label>
              <input className="input" style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} value={guideForm.duration} onChange={e => setGuideForm({...guideForm, duration: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>תיאור</label>
              <textarea className="input" style={{ width: '100%', minHeight: 80, padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} value={guideForm.description} onChange={e => setGuideForm({...guideForm, description: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>נושאים (כל נושא בשורה חדשה)</label>
              <textarea className="input" style={{ width: '100%', minHeight: 80, padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} value={guideForm.topics} onChange={e => setGuideForm({...guideForm, topics: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>טיפים (כל טיפ בשורה חדשה)</label>
              <textarea className="input" style={{ width: '100%', minHeight: 80, padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} value={guideForm.tips} onChange={e => setGuideForm({...guideForm, tips: e.target.value})} />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13 }}>שאלות ותשובות</label>
                <button type="button" onClick={() => setGuideForm({...guideForm, faqs: [...guideForm.faqs, { q: '', a: '' }]})} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 13 }}>+ הוסף שאלה</button>
              </div>
              {guideForm.faqs.map((faq, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input className="input" style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} placeholder="שאלה" value={faq.q} onChange={e => {
                      const nf = [...guideForm.faqs];
                      nf[idx].q = e.target.value;
                      setGuideForm({...guideForm, faqs: nf});
                    }} />
                    <input className="input" style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)' }} placeholder="תשובה" value={faq.a} onChange={e => {
                      const nf = [...guideForm.faqs];
                      nf[idx].a = e.target.value;
                      setGuideForm({...guideForm, faqs: nf});
                    }} />
                  </div>
                  <button type="button" onClick={() => {
                    const nf = guideForm.faqs.filter((_, i) => i !== idx);
                    setGuideForm({...guideForm, faqs: nf});
                  }} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 8 }}>
                    <Icon n="x" s={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Btn variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={async () => {
                const payload = {
                  title: guideForm.title,
                  videoUrl: guideForm.videoUrl,
                  duration: guideForm.duration,
                  description: guideForm.description,
                  topics: guideForm.topics.split('\n').map(s => s.trim()).filter(Boolean),
                  tips: guideForm.tips.split('\n').map(s => s.trim()).filter(Boolean),
                  faqs: guideForm.faqs.filter(f => f.q.trim() && f.a.trim())
                };

                if (isAddingGuide) {
                  await createGuide(payload);
                } else if (editingGuide) {
                  await updateGuide({ id: editingGuide._id, ...payload });
                }
                setIsAddingGuide(false);
                setEditingGuide(null);
              }}>
                שמור מדריך
              </Btn>
              <Btn variant="outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setIsAddingGuide(false); setEditingGuide(null); }}>
                ביטול
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {!!showConfirmDelete && (
        <Modal onClose={() => setShowConfirmDelete(null)} title="מחיקת משתמש לצמיתות">
          <div style={{ color: 'var(--danger)', marginBottom: 16 }}>
            <Icon n="alert-triangle" s={32} style={{ marginBottom: 12, display: 'block' }} />
            אזהרה: הפעולה תמחק את המשתמש, את כל הפרויקטים שלו, את התמונות, הקבצים וכל מידע אחר שקשור אליו באופן בלתי הפיך.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn variant="primary" onClick={handleDelete} style={{ flex: 1, justifyContent: 'center', background: 'var(--danger)', borderColor: 'var(--danger)' }}>
              כן, מחק משתמש ופרויקטים
            </Btn>
            <Btn variant="outline" onClick={() => setShowConfirmDelete(null)} style={{ flex: 1, justifyContent: 'center' }}>
              ביטול
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
