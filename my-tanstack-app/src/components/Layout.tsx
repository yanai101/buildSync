// @ts-nocheck

import * as React from 'react'
import { Link, useNavigate, useRouterState, Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn } from './Shared'
import { WelcomeOnboardingModal } from './WelcomeOnboardingModal'
import { useCurrentProject } from '~/hooks/useCurrentProject'
import { useConvexAuth, useQuery, useMutation } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { useOnboardingTour } from '~/hooks/useOnboardingTour'
import { useRequireRole } from '~/hooks/useRequireRole'
import { useSubscription } from '~/hooks/useSubscription'
import { SupportModal } from './SupportModal'

type NavRole = 'owner' | 'manager' | 'inspector' | 'contractor'
const ALL_ROLES: NavRole[] = ['owner', 'manager', 'inspector', 'contractor']
const OWNER_MANAGER: NavRole[] = ['owner', 'manager']
const OWNER_MANAGER_INSPECTOR: NavRole[] = ['owner', 'manager', 'inspector']
const OWNER_ONLY: NavRole[] = ['owner']

export const NAV = [
  { id: "/dashboard",     label: "לוח בקרה",    icon: "home",      section: "ראשי",   roles: ALL_ROLES },
  { id: "/projects",      label: "פרויקטים",    icon: "layers",    section: "ראשי",   roles: ALL_ROLES },
  { id: "/setup",         label: "הגדרות בית",  icon: "settings",  section: "ראשי",   roles: OWNER_MANAGER },
  { id: "/team",          label: "ניהול צוות",  icon: "users",     section: "ראשי",   roles: OWNER_MANAGER_INSPECTOR },
  { id: "/stages",        label: "שלבי בנייה", icon: "layers",    section: "ניהול",   roles: ALL_ROLES },
  { id: "/contractors",   label: "קבלנים",     icon: "users",     section: "ניהול",   roles: ALL_ROLES },
  { id: "/orders",        label: "מעקב הזמנות",icon: "search",     section: "ניהול",   roles: OWNER_MANAGER_INSPECTOR },
  { id: "/boq",           label: "כתב כמויות", icon: "clipboard", section: "ניהול",   roles: OWNER_MANAGER_INSPECTOR },
  { id: "/boqwizard",     label: "אשף כמויות", icon: "wand",      section: "ניהול",   roles: OWNER_MANAGER },
  { id: "/checklists",    label: "צ'קליסטים",  icon: "check-circle", section: "ניהול", roles: ALL_ROLES },
  { id: "/permits",       label: "היתרים",     icon: "clipboard", section: "ניהול", roles: OWNER_MANAGER_INSPECTOR },
  { id: "/daily-logs",    label: "יומן עבודה", icon: "calendar",  section: "תיעוד",   roles: ALL_ROLES },
  { id: "/photos",        label: "תמונות",     icon: "camera",    section: "תיעוד",   roles: ALL_ROLES },
  { id: "/notes",         label: "הערות",      icon: "message",   section: "תיעוד",   roles: ALL_ROLES },
  { id: "/personal-files",label: "קבצים אישיים",icon: "file-text", section: "תיעוד",  roles: OWNER_ONLY },
  { id: "/budget",        label: "תקציב",      icon: "chart",     section: "פיננסי",  roles: OWNER_ONLY },
  { id: "/analytics",     label: "דוחות ומדדים", icon: "pie-chart", section: "פיננסי",  roles: OWNER_MANAGER },
  { id: "/quotes",        label: "הצעות מחיר", icon: "clipboard", section: "פיננסי",  roles: OWNER_ONLY },
  { id: "/timeline",      label: "לוח זמנים", icon: "calendar",  section: "פיננסי",   roles: ALL_ROLES },
]

export const PREMIUM_ROUTES = [
  '/analytics',
  '/orders',
  '/boq',
  '/boqwizard',
  '/permits',
  '/daily-logs',
  '/personal-files',
  // Optional: add more like '/team' if needed
]

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "לוח בקרה",
  "/projects": "בחירת פרויקט",
  "/setup": "הגדרות בית",
  "/stages": "שלבי בנייה",
  "/contractors": "ניהול קבלנים",
  "/orders": "מעקב הזמנות",
  "/boq": "כתב כמויות",
  "/boqwizard": "אשף כתב כמויות",
  "/checklists": "צ'קליסטים ופרוטוקולים",
  "/permits": "בירוקרטיה והיתרים",
  "/daily-logs": "יומן עבודה יומי",
  "/photos": "תמונות ותיעוד",
  "/notes": "הערות",
  "/personal-files": "קבצים אישיים",
  "/team": "ניהול צוות",
  "/budget": "תקציב והוצאות",
  "/analytics": "דוחות וסטטיסטיקות",
  "/quotes": "הצעות מחיר והשוואה",
  "/timeline": "לוח זמנים",
  "/account": "פרטי חשבון",
  "/guides": "סרטוני הדרכה",
}

export const PAGE_SUBTITLES: Record<string, string> = {
  "/setup": "הגדרת מבנה הבית, חדרים וצוות",
  "/boqwizard": "עבור חדר-חדר ובנה רשימת כמויות לרכישה / יבוא",
  "/checklists": "רשימות תיוג מקצועיות לכל שלב בבנייה",
  "/daily-logs": "תיעוד יומי של התקדמות, כוח אדם, חריגות ואישורים",
  "/analytics": "תמונת מצב גרפית של תקציב, התקדמות וסטטוס משימות",
  "/quotes": "הוסיפו הצעות לפי נושא והשוו ביניהן",
  "/account": "עדכון פרטים אישיים וסיסמה",
  "/guides": "למדו כיצד להפיק את המרב מ-BuildSync בעזרת מדריכי וידאו קצרים",
}

const BOTTOM_NAV = ["/dashboard", "/boqwizard", "/photos", "/notes"].map(id => NAV.find(n => n.id === id)!)

export function AppLayout({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const navigate = useNavigate()
  const [tweaksOpen, setTweaksOpen] = React.useState(false)
  const { project, projects, hasMultipleProjects, isLoading: isProjectLoading } = useCurrentProject()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { role: resolvedRole } = useRequireRole(ALL_ROLES)
  const { isProOrPremium } = useSubscription()
  const { signOut } = useAuthActions()
  const identity = useQuery(api.users.currentIdentity, {})
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const { startTour } = useOnboardingTour()
  const dbNotes = useQuery(api.queries.listNotes, project?._id ? { projectId: project._id } : "skip")
  const unreadNotesCount = dbNotes?.filter(n => !n.resolved).length || 0;

  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [showSupportModal, setShowSupportModal] = React.useState(false);

  const supportTicketCount = useQuery(api.support.getOpenTicketCount, identity?.isSuperAdmin ? {} : 'skip') || 0;

  const COLLAPSED_KEY = 'buildsync:sidebar-collapsed-sections'
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY)
      if (raw) setCollapsedSections(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sec)) next.delete(sec)
      else next.add(sec)
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(next)))
        } catch {}
      }
      return next
    })
  }

  React.useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    try {
      if (typeof window !== 'undefined') {
        const keys = Object.keys(window.localStorage)
        for (const k of keys) {
          if (k.startsWith('buildsync:selected-project:')) {
            window.localStorage.removeItem(k)
          }
        }
      }
      await signOut()
    } finally {
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }

  // group nav sections
  const sections = Array.from(new Set(NAV.map(n => n.section)))

  const publicRoutes = ['/', '/register', '/login']
  const isPublicRoute = (path: string) =>
    publicRoutes.includes(path) || path.startsWith('/join/')

  const redeemPromoCode = useMutation(api.users.redeemPromoCode)

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated && !isPublicRoute(currentPath)) {
      navigate({ to: '/login' })
    }
  }, [currentPath, isAuthenticated, isLoading, navigate])

  React.useEffect(() => {
    if (isLoading) return
    if (isAuthenticated && (currentPath === '/login' || currentPath === '/')) {
      navigate({ to: '/dashboard' })
    }
  }, [currentPath, isAuthenticated, isLoading, navigate])

  // Process promo code if authenticated
  React.useEffect(() => {
    if (isAuthenticated && !isLoading && typeof window !== 'undefined') {
      const code = localStorage.getItem('promoCode');
      if (code) {
        // Remove it immediately to prevent infinite loops if the component re-renders while the mutation is running
        localStorage.removeItem('promoCode');
        redeemPromoCode({ code }).then((res) => {
          if (res.success) {
            alert('הקופון הופעל בהצלחה! החשבון שלך שודרג.');
          } else {
            console.error('Failed to redeem promo code:', res.error);
          }
        }).catch((err) => {
          console.error('Error redeeming promo code:', err);
        });
      }
    }
  }, [isAuthenticated, isLoading, redeemPromoCode])

  React.useEffect(() => {
    if (isLoading || isProjectLoading) return
    if (isAuthenticated && !isPublicRoute(currentPath) && currentPath !== '/projects' && projects.length === 0) {
      navigate({ to: '/projects' })
    }
  }, [currentPath, isAuthenticated, isLoading, isProjectLoading, navigate, projects.length])

  React.useEffect(() => {
    if (typeof window === 'undefined' || isLoading || isProjectLoading) return;
    if (isAuthenticated && !isPublicRoute(currentPath)) {
      if (projects.length === 0 && currentPath !== '/projects') return;

      const onboardingCompleted = window.localStorage.getItem('buildsync:welcome_onboarding_completed');
      if (!onboardingCompleted) {
        setShowWelcomeModal(true);
      }
    }
  }, [isAuthenticated, isLoading, isProjectLoading, currentPath, projects.length]);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('buildsync:welcome_onboarding_completed', 'true');
      // Set old tour to true so it doesn't pop up as well
      window.localStorage.setItem('buildsync:tour_completed', 'true');
    }
  };

  if (isPublicRoute(currentPath)) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div className="card" style={{ padding: 24 }}>טוען סשן משתמש...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <nav className="sidebar">
        <Link to="/dashboard" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <img 
            src="/logo.png" 
            alt="BuildSync Icon" 
            style={{ 
              width: 36, 
              height: 36, 
              display: 'block', 
              borderRadius: '8px',
              objectFit: 'cover'
            }} 
          />
          <div className="sidebar-logo-text" style={{ margin: 0 }}>Build<span>Sync</span></div>
        </Link>

        <div className="sidebar-scroll">
          {sections.map(sec => {
            const userRole = resolvedRole ?? 'owner'
            const items = NAV.filter(n =>
              n.section === sec &&
              (!n.roles || n.roles.includes(userRole as any))
            )
            if (items.length === 0) return null
            const hasActive = items.some(n => n.id === currentPath)
            const collapsed = collapsedSections.has(sec)
            return (
              <div key={sec}>
                <button
                  type="button"
                  className="nav-section"
                  onClick={() => toggleSection(sec)}
                  aria-expanded={!collapsed}
                >
                  <span>{sec}</span>
                  <motion.span
                    animate={{ rotate: collapsed ? 0 : 90 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'inline-flex' }}
                  >
                    <Icon n="chevron-right" s={12} c="rgba(255,255,255,.35)" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      {items.map(n => {
                        const isDisabled = projects.length === 0 && n.id !== '/projects';
                        const isPremiumLocked = PREMIUM_ROUTES.includes(n.id) && !isProOrPremium;
                        const badgeVal = n.id === '/notes' && unreadNotesCount > 0 ? unreadNotesCount : n.badge;
                        return (
                          <Link
                            id={`tour-nav-${n.id.replace('/', '') || 'dashboard'}`}
                            key={n.id}
                            to={isDisabled ? currentPath : n.id}
                            className="nav-item"
                            activeProps={isDisabled ? {} : { className: 'active' }}
                            style={{ 
                              opacity: isDisabled ? 0.4 : (isPremiumLocked ? 0.75 : 1), 
                              pointerEvents: isDisabled ? 'none' : 'auto' 
                            }}
                            exact
                          >
                            {currentPath === n.id && !isDisabled && (
                              <motion.div layoutId="nav-active" className="nav-item-bg" transition={{type:"spring", stiffness:300, damping:30}} />
                            )}
                            <Icon n={n.icon} s={18} />
                            <span style={{flex:1, display: 'flex', alignItems: 'center', gap: 6}}>
                              {n.label}
                              {isPremiumLocked && <Icon n="lock" s={12} c="var(--text3)" />}
                            </span>
                            {badgeVal ? <span className="nav-item-badge">{badgeVal}</span> : null}
                          </Link>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <div className="sidebar-footer">
          <Link to={hasMultipleProjects ? "/projects" : "/"} className="sidebar-project" style={{ textDecoration: "none" }}>
            <div className="sidebar-project-dot" />
            <div>
              <div className="sidebar-project-name">{project?.name || "ללא פרויקט"}</div>
              <div className="sidebar-project-sub">
                {project ? `${project.address} · ${project.currentStageName || 'בביצוע'}` : 'בחר פרויקט'}
              </div>
            </div>
          </Link>
        </div>
      </nav>

      <main className="main">
        <div className="page-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span className="page-title" style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", whiteSpace: "nowrap" }}>
                {NAV.find(n => n.id === currentPath)?.icon && (
                  <Icon n={NAV.find(n => n.id === currentPath)!.icon} s={18} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {PAGE_TITLES[currentPath] || PAGE_TITLES["/"]}
                </span>
              </span>
              {PAGE_SUBTITLES[currentPath] && (
                <div className="desktop-only" style={{ fontSize: 12, color: "var(--text3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {PAGE_SUBTITLES[currentPath]}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {hasMultipleProjects ? (
              <Link
                to="/projects"
                style={{
                  textDecoration: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--text2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface)",
                  maxWidth: 160,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                <Icon n="layers" s={14} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{project?.name || "בחירת פרויקט"}</span>
              </Link>
            ) : project ? (
              <span
                className="mobile-only"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "var(--text2)",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface)",
                  maxWidth: 160,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                <Icon n="layers" s={14} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{project.name}</span>
              </span>
            ) : null}
            <div className="desktop-only" style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon n="clock" s={12} c="var(--text3)" />
              <span>עודכן: היום, 09:45</span>
            </div>
            <div className="desktop-only" style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                id="tour-user-menu"
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none", padding: 0, position: "relative" }}
              >
                {(identity?.name?.[0] ?? identity?.email?.[0] ?? 'א').toUpperCase()}
                {identity?.isSuperAdmin && supportTicketCount > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "var(--danger)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 800,
                    width: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    border: "2px solid var(--surface)"
                  }}>
                    {supportTicketCount}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  style={{ position: "absolute", top: "calc(100% + 6px)", insetInlineEnd: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 8, minWidth: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 30 }}
                >
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text1)" }}>
                      {identity?.name ?? identity?.email ?? 'משתמש'}
                    </div>
                    {identity?.email && (
                      <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                        {identity.email}
                      </div>
                    )}
                  </div>
                  <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                  <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                  <Link
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      color: "var(--text1)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <Icon n="settings" s={14} />
                    פרטי חשבון
                  </Link>

                  <Link
                    to="/guides"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      color: "var(--text1)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <Icon n="video" s={14} />
                    סרטוני הדרכה
                  </Link>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowSupportModal(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      color: "var(--text1)",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "right",
                      fontFamily: "inherit",
                    }}
                  >
                    <Icon n="help-circle" s={14} />
                    פנייה לתמיכה
                  </button>

                  <a
                    href="mailto:support@buildsync.co.il"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      color: "var(--text1)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <Icon n="mail" s={14} />
                    שליחת מייל לתמיכה
                  </a>

                  {identity?.isSuperAdmin && (
                    <>
                      <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                      <Link
                        to="/super-admin"
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          color: "var(--accent)",
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        <Icon n="shield" s={14} />
                        ניהול מערכת
                      </Link>
                    </>
                  )}
                  <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      startTour();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 8,
                      color: "var(--text1)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      background: "none",
                      border: "none",
                      width: "100%",
                      cursor: "pointer",
                      textAlign: "right",
                      fontFamily: "inherit"
                    }}
                  >
                    <Icon n="help-circle" s={14} />
                    מדריך מערכת
                  </button>
                  <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                  {/* Dev-only Data Source Toggle */}
                  {import.meta.env.DEV && (
                    <>
                      <div style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase" }}>
                        Role Override (Dev)
                      </div>
                      <div style={{ padding: "4px 10px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {['owner', 'manager', 'inspector', 'contractor', 'none'].map(r => {
                          const isCurrent = (typeof window !== 'undefined' ? localStorage.getItem('buildsync:dev-role-override') : '') === (r === 'none' ? null : r);
                          return (
                            <button
                              key={r}
                              onClick={() => {
                                if (r === 'none') {
                                  localStorage.removeItem('buildsync:dev-role-override');
                                } else {
                                  localStorage.setItem('buildsync:dev-role-override', r);
                                }
                                window.location.reload();
                              }}
                              style={{
                                fontSize: 10,
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: "1px solid var(--border)",
                                background: isCurrent ? "var(--accent)" : "var(--bg)",
                                color: isCurrent ? "#fff" : "var(--text1)",
                                cursor: "pointer",
                                flex: "1 1 40%"
                              }}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ height: 1, background: "var(--border)", margin: "6px 0" }} />
                    </>
                  )}
                  <Btn
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    התנתקות
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentPath}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ position: 'absolute', inset: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM NAV (mobile) */}
      <div className="bottom-nav">
        <div className="bottom-nav-items">
          {BOTTOM_NAV.map(n => (
            <Link 
              key={n.id} 
              to={n.id} 
              className="bottom-nav-item"
              activeProps={{ className: 'active' }}
              exact
              onClick={() => setMobileMenuOpen(false)}
            >
              <Icon n={n.icon} s={20} />
              <span>{n.label}</span>
            </Link>
          ))}
          <button 
            type="button" 
            className={`bottom-nav-item ${mobileMenuOpen ? 'active' : ''}`} 
            style={{ background: 'none', border: 'none', fontFamily: 'inherit' }}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <Icon n="menu" s={20} />
            <span>תפריט</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 90,
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--surface)',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '24px 20px calc(80px + env(safe-area-inset-bottom))',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>תפריט ניווט</h3>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ background: 'var(--bg)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', cursor: 'pointer' }}
                >
                  <Icon n="x" s={16} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sections.map(sec => {
                  const userRole = resolvedRole ?? 'owner'
                  const items = NAV.filter(n =>
                    n.section === sec &&
                    (!n.roles || n.roles.includes(userRole as any))
                  )
                  if (items.length === 0) return null
                  
                  return (
                    <div key={sec}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, padding: '0 8px' }}>{sec}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {items.map(n => {
                          const isDisabled = projects.length === 0 && n.id !== '/projects';
                          const badgeVal = n.id === '/notes' && unreadNotesCount > 0 ? unreadNotesCount : n.badge;
                          
                          return (
                            <Link
                              key={n.id}
                              to={isDisabled ? currentPath : n.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '12px',
                                background: currentPath === n.id ? 'var(--accent-light)' : 'var(--bg)',
                                color: currentPath === n.id ? 'var(--accent)' : 'var(--text1)',
                                borderRadius: 12,
                                textDecoration: 'none',
                                fontWeight: currentPath === n.id ? 700 : 500,
                                opacity: isDisabled ? 0.4 : 1,
                                border: currentPath === n.id ? '1px solid var(--accent)' : '1px solid var(--border)'
                              }}
                              onClick={() => {
                                if (!isDisabled) setMobileMenuOpen(false);
                              }}
                            >
                              <Icon n={n.icon} s={18} />
                              <span style={{ fontSize: 13, flex: 1 }}>{n.label}</span>
                              {badgeVal && (
                                <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>{badgeVal}</span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="section-divider" style={{ margin: '20px 0 16px' }} />

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, padding: '0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>חשבון ותמיכה</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Link
                    to="/guides"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px',
                      background: currentPath === '/guides' ? 'var(--accent-light)' : 'var(--bg)',
                      color: currentPath === '/guides' ? 'var(--accent)' : 'var(--text1)',
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontWeight: currentPath === '/guides' ? 700 : 500,
                      border: currentPath === '/guides' ? '1px solid var(--accent)' : '1px solid var(--border)'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon n="video" s={18} />
                    <span style={{ fontSize: 13 }}>סרטוני הדרכה</span>
                  </Link>

                  <Link
                    to="/account"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px',
                      background: currentPath === '/account' ? 'var(--accent-light)' : 'var(--bg)',
                      color: currentPath === '/account' ? 'var(--accent)' : 'var(--text1)',
                      borderRadius: 12,
                      textDecoration: 'none',
                      fontWeight: currentPath === '/account' ? 700 : 500,
                      border: currentPath === '/account' ? '1px solid var(--accent)' : '1px solid var(--border)'
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon n="settings" s={18} />
                    <span style={{ fontSize: 13 }}>פרטי חשבון</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <WelcomeOnboardingModal 
        isOpen={showWelcomeModal} 
        onClose={handleCloseWelcomeModal} 
        onStartTour={() => {
          handleCloseWelcomeModal();
          setTimeout(() => {
            startTour();
          }, 400);
        }}
      />

      {showSupportModal && (
        <SupportModal onClose={() => setShowSupportModal(false)} />
      )}
    </>
  )
}
