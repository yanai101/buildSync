// @ts-nocheck

import * as React from 'react'
import { Link, useNavigate, useRouterState, Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon, Btn, Modal } from './Shared'
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
  { id: "/contractors",   label: "קבלנים",     icon: "users",     section: "ניהול",   roles: OWNER_MANAGER },
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
  const accessInfo = useQuery(
    api.projects.getProjectAccessInfo,
    project?._id ? { projectId: project._id } : "skip"
  )
  const canViewBudget = accessInfo?.canViewBudget ?? false
  const canViewSchedule = accessInfo?.canViewSchedule ?? false
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const { startTour } = useOnboardingTour()

  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showPWABanner, setShowPWABanner] = React.useState(false);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [showPWAInstructions, setShowPWAInstructions] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if running in standalone mode (already open as PWA)
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone === true;
    
    // 2. Check if marked as installed in localStorage
    const isMarkedInstalled = localStorage.getItem('buildsync:pwa-installed') === 'true';

    if (checkStandalone || isMarkedInstalled) {
      setIsStandalone(true);
      if (checkStandalone) return;
    }

    // 3. Check Chromium's getInstalledRelatedApps API
    if ('navigator' in window && 'getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          localStorage.setItem('buildsync:pwa-installed', 'true');
          setIsStandalone(true);
        }
      }).catch(() => {});
    }

    // 4. Listen to the native appinstalled event (fired when installation completes)
    const handleAppInstalled = () => {
      localStorage.setItem('buildsync:pwa-installed', 'true');
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if there is already a captured prompt on window (from early head script)
    if ((window as any).deferredPrompt) {
      const prompt = (window as any).deferredPrompt;
      setDeferredPrompt(prompt);
      
      // Check quiet period for automatic banner
      const dismissedTime = localStorage.getItem('buildsync:install-prompt-dismissed');
      let isQuiet = false;
      if (dismissedTime) {
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(dismissedTime, 10) < fourteenDays) {
          isQuiet = true;
        }
      }
      if (!isQuiet) {
        setShowPWABanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e);
      
      // Check quiet period ONLY for automatic banner
      const dismissedTime = localStorage.getItem('buildsync:install-prompt-dismissed');
      let isQuiet = false;
      if (dismissedTime) {
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(dismissedTime, 10) < fourteenDays) {
          isQuiet = true;
        }
      }
      if (!isQuiet) {
        setShowPWABanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
  }, []);

  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;
    setShowPWABanner(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handlePWADismiss = () => {
    setShowPWABanner(false);
    localStorage.setItem('buildsync:install-prompt-dismissed', Date.now().toString());
  };

  const handleManualPWAInstall = () => {
    if (deferredPrompt) {
      handlePWAInstall();
    } else {
      if (typeof window !== 'undefined') {
        const ua = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && 'ontouchend' in document);
        
        if (isIOS) {
          // iOS Safari requires manual "Add to Home Screen" instructions
          setShowPWAInstructions(true);
        }
      }
    }
  };
  const dbNotes = useQuery(api.queries.listNotes, project?._id ? { projectId: project._id } : "skip")
  const unreadNotesCount = dbNotes?.filter(n => !(n as any).readAt && (n as any).fromUserId !== identity?.userId).length || 0;

  const dbDailyLogs = useQuery(api.dailyLogs.getLogs, project?._id ? { projectId: project._id } : "skip")
  const todayStr = new Date().toISOString().split('T')[0];
  const hasDailyLogToday = dbDailyLogs?.some(l => l.date === todayStr) ?? false;
  
  const [lastViewedDailyLogs, setLastViewedDailyLogs] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setLastViewedDailyLogs(window.localStorage.getItem('buildsync:last_viewed_daily_logs'));
    }
  }, []);

  React.useEffect(() => {
    if (currentPath === '/daily-logs' && typeof window !== 'undefined') {
      const today = new Date().toISOString().split('T')[0];
      window.localStorage.setItem('buildsync:last_viewed_daily_logs', today);
      setLastViewedDailyLogs(today);
    }
  }, [currentPath]);

  const showDailyLogBadge = hasDailyLogToday && lastViewedDailyLogs !== todayStr && currentPath !== '/daily-logs';

  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [showMobileGuidesModal, setShowMobileGuidesModal] = React.useState(false);
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
        if (isMobile) {
          setShowMobileGuidesModal(true);
        } else {
          setShowWelcomeModal(true);
        }
      }
    }
  }, [isAuthenticated, isLoading, isProjectLoading, currentPath, projects.length, isMobile]);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('buildsync:welcome_onboarding_completed', 'true');
      // Set old tour to true so it doesn't pop up as well
      window.localStorage.setItem('buildsync:tour_completed', 'true');
    }
  };

  const handleCloseMobileGuidesModal = (goToGuides: boolean) => {
    setShowMobileGuidesModal(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('buildsync:welcome_onboarding_completed', 'true');
      window.localStorage.setItem('buildsync:tour_completed', 'true');
      window.localStorage.setItem('buildsync:mobile_guides_prompt_completed', 'true');
    }
    if (goToGuides) {
      navigate({ to: '/guides' });
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
            const BUDGET_ROUTES = ['/budget', '/analytics', '/quotes']
            const SCHEDULE_ROUTES = ['/timeline', '/stages']
            const items = NAV.filter(n => {
              if (n.section !== sec) return false
              if (BUDGET_ROUTES.includes(n.id)) {
                if (userRole === 'owner') return true
                return canViewBudget
              }
              if (SCHEDULE_ROUTES.includes(n.id)) {
                if (userRole === 'owner') return true
                return canViewSchedule
              }
              return !n.roles || n.roles.includes(userRole as any)
            })
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
                        const badgeVal = n.id === '/notes' && unreadNotesCount > 0 ? unreadNotesCount : 
                                         n.id === '/daily-logs' && showDailyLogBadge ? 'חדש' : n.badge;
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

                  {!isStandalone && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleManualPWAInstall();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 700,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "right",
                        fontFamily: "inherit",
                      }}
                    >
                      <Icon n="download" s={14} c="var(--accent)" />
                      הוסף למסך הבית
                    </button>
                  )}

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
                  const BUDGET_ROUTES = ['/budget', '/analytics', '/quotes']
                  const SCHEDULE_ROUTES = ['/timeline', '/stages']
                  const items = NAV.filter(n => {
                    if (n.section !== sec) return false
                    if (BUDGET_ROUTES.includes(n.id)) {
                      if (userRole === 'owner') return true
                      return canViewBudget
                    }
                    if (SCHEDULE_ROUTES.includes(n.id)) {
                      if (userRole === 'owner') return true
                      return canViewSchedule
                    }
                    return !n.roles || n.roles.includes(userRole as any)
                  })
                  if (items.length === 0) return null
                  
                  return (
                    <div key={sec}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, padding: '0 8px' }}>{sec}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {items.map(n => {
                          const isDisabled = projects.length === 0 && n.id !== '/projects';
                          const badgeVal = n.id === '/notes' && unreadNotesCount > 0 ? unreadNotesCount : 
                                           n.id === '/daily-logs' && showDailyLogBadge ? 'חדש' : n.badge;
                          
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
                  {!isStandalone && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleManualPWAInstall();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px',
                        background: 'var(--accent-light)',
                        color: 'var(--accent)',
                        borderRadius: 12,
                        fontWeight: 700,
                        border: '1px solid var(--accent)',
                        cursor: 'pointer',
                        textAlign: 'right',
                        fontFamily: 'inherit',
                        gridColumn: 'span 2',
                        width: '100%'
                      }}
                    >
                      <Icon n="download" s={18} c="var(--accent)" />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>הוסף למסך הבית</span>
                    </button>
                  )}
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

      <AnimatePresence>
        {showMobileGuidesModal && (
          <MobileGuidesPromptModal 
            onClose={handleCloseMobileGuidesModal} 
          />
        )}
      </AnimatePresence>

      {showSupportModal && (
        <SupportModal onClose={() => setShowSupportModal(false)} />
      )}

      <PWAInstallPrompt 
        showPrompt={showPWABanner}
        onInstall={handlePWAInstall}
        onDismiss={handlePWADismiss}
      />

      <PWAInstructionsModal 
        isOpen={showPWAInstructions}
        onClose={() => setShowPWAInstructions(false)}
      />
    </>
  )
}

function PWAInstallPrompt({ showPrompt, onInstall, onDismiss }: { showPrompt: boolean, onInstall: () => void, onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: 'max(20px, calc(85px + env(safe-area-inset-bottom)))',
            insetInlineEnd: 24,
            zIndex: 1000,
            maxWidth: 380,
            width: 'calc(100vw - 48px)',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(224, 122, 56, 0.2)',
            borderRadius: 20,
            padding: 16,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(224, 122, 56, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            direction: 'rtl'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(224, 122, 56, 0.25)'
            }}>
              <Icon n="download" s={20} c="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text1)' }}>התקנת אפליקציית BuildSync</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>פלטפורמה לניהול בנייה ושיפוצים</div>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
            הוסיפו את BuildSync למסך הבית לגישה מהירה ונוחה במיוחד מהנייד ומהדסקטופ – בדיוק כמו אפליקציה רגילה!
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn
              onClick={onInstall}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '8px 16px',
                fontSize: 12.5,
                borderRadius: 10
              }}
            >
              התקנה
            </Btn>
            <Btn
              variant="ghost"
              onClick={onDismiss}
              style={{
                flex: 1,
                justifyContent: 'center',
                padding: '8px 16px',
                fontSize: 12.5,
                borderRadius: 10,
                color: 'var(--text2)'
              }}
            >
              לא עכשיו
            </Btn>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PWAInstructionsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [device, setDevice] = React.useState<'ios' | 'other'>('other');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || (ua.includes('macintosh') && 'ontouchend' in document)) {
      setDevice('ios');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} title="התקנת אפליקציית BuildSync" width={460}>
      <div style={{ direction: 'rtl', textAlign: 'right' }}>
        
        {device === 'ios' ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="phone" s={18} />
              </div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>מדריך התקנה למכשירי iPhone / iPad</h4>
            </div>
            
            <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
              דפדפן ספארי (Safari) ב-iOS אינו תומך בהתקנה אוטומטית בלחיצת כפתור, אך ניתן להתקין את האפליקציה בקלות רבה באופן ידני:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>1.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  לחצו על כפתור <strong>השיתוף (Share)</strong> בדפדפן ספארי <span style={{ fontSize: 14 }}>📤</span> (נמצא בתחתית המסך באייפון או בראש המסך באייפד).
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>2.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  גללו מעט למטה בתפריט שנפתח ובחרו בצירוף <strong>"הוסף למסך הבית" (Add to Home Screen)</strong> <span style={{ fontSize: 14 }}>➕</span>.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>3.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  לחצו על <strong>"הוסף" (Add)</strong> בפינה הימנית העליונה. האפליקציה תופיע מיד על מסך הבית שלכם!
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon n="settings" s={18} />
              </div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>התקנה ידנית בדפדפני Android / Chrome</h4>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 20 }}>
              במידה וחלון ההתקנה האוטומטי אינו מופיע, ניתן להתקין את האפליקציה בקלות ישירות מתפריט הדפדפן:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>1.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  לחצו על כפתור <strong>שלוש הנקודות</strong> (או כפתור התפריט) בפינת הדפדפן.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>2.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  חפשו ולחצו על האפשרות <strong>"התקן אפליקציה" (Install app)</strong> או <strong>"הוסף למסך הבית" (Add to Home screen)</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 14 }}>3.</div>
                <div style={{ fontSize: 13, color: 'var(--text1)', lineHeight: 1.4 }}>
                  אשרו את ההתקנה בחלונית שתקפוץ. האפליקציה תותקן ותהיה זמינה מיידית לשימוש!
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Btn onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
            הבנתי, תודה
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function MobileGuidesPromptModal({ onClose }: { onClose: (goToGuides: boolean) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'grid',
        placeItems: 'center',
        padding: 20
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 420,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          direction: 'rtl'
        }}
      >
        {/* Header Graphic */}
        <div style={{ padding: '36px 28px 24px', textAlign: 'center', position: 'relative' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(224, 122, 56, 0.15) 0%, rgba(201, 107, 48, 0.15) 100%)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              boxShadow: '0 8px 20px rgba(224, 122, 56, 0.15)',
              border: '1px solid rgba(224, 122, 56, 0.2)'
            }}
          >
            <Icon n="video" s={34} c="var(--accent)" />
          </div>
          
          <h2 style={{ margin: '0 0 12px 0', fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.5px' }}>
            ברוכים הבאים ל-BuildSync! 👋
          </h2>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--text2)', lineHeight: 1.6, fontWeight: 500 }}>
            כדי שתוכל להתחיל לעבוד בצורה החלקה והיעילה ביותר מהנייד, הכנו עבורך סדרת סרטוני הדרכה קצרים שמראים בדיוק איך להפיק את המרב מהמערכת.
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14.5, color: 'var(--text1)', fontWeight: 600 }}>
            האם תרצה לעבור כעת לדף המדריכים?
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--bg)'
          }}
        >
          <Btn 
            variant="primary" 
            onClick={() => onClose(true)} 
            style={{ 
              width: '100%', 
              justifyContent: 'center',
              padding: '12px 20px',
              fontSize: 14.5,
              fontWeight: 700,
              borderRadius: 14,
              boxShadow: '0 4px 12px rgba(224, 122, 56, 0.25)'
            }}
          >
            כן, מעבר למדריכים <Icon n="arrow-left" s={16} style={{ marginRight: 6 }} />
          </Btn>

          <button
            onClick={() => onClose(false)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text3)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '10px',
              textAlign: 'center',
              borderRadius: 10,
              transition: 'all 0.2s'
            }}
          >
            לא תודה, אמשיך מאוחר יותר
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
