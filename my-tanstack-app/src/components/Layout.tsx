// @ts-nocheck

import * as React from 'react'
import { Link, useRouterState, Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from './Shared'
import { useCurrentProject } from '~/hooks/useCurrentProject'

export const NAV = [
  { id: "/",              label: "לוח בקרה",    icon: "home",      section: "ראשי" },
  { id: "/projects",      label: "פרויקטים",    icon: "layers",    section: "ראשי" },
  { id: "/setup",         label: "הגדרות בית",  icon: "settings",  section: "ראשי" },
  { id: "/stages",        label: "שלבי בנייה", icon: "layers",    section: "ניהול" },
  { id: "/contractors",   label: "קבלנים",     icon: "users",     section: "ניהול" },
  { id: "/boq",           label: "כתב כמויות", icon: "clipboard", section: "ניהול" },
  { id: "/boqwizard",     label: "אשף כמויות", icon: "zoom-in",   section: "ניהול" },
  { id: "/photos",        label: "תמונות",     icon: "camera",    section: "תיעוד" },
  { id: "/notes",         label: "הערות",      icon: "message",   section: "תיעוד", badge: 3 },
  { id: "/budget",        label: "תקציב",      icon: "chart",     section: "פיננסי" },
  { id: "/quotes",        label: "הצעות מחיר", icon: "clipboard", section: "פיננסי" },
  { id: "/timeline",      label: "לוח זמנים", icon: "calendar",  section: "פיננסי" },
]

export const PAGE_TITLES: Record<string, string> = {
  "/": "לוח בקרה",
  "/projects": "בחירת פרויקט",
  "/setup": "הגדרות בית",
  "/stages": "שלבי בנייה",
  "/contractors": "ניהול קבלנים",
  "/boq": "כתב כמויות",
  "/boqwizard": "אשף כתב כמויות",
  "/photos": "תמונות ותיעוד",
  "/notes": "הערות",
  "/budget": "תקציב והוצאות",
  "/quotes": "הצעות מחיר והשוואה",
  "/timeline": "לוח זמנים",
}

export const PAGE_SUBTITLES: Record<string, string> = {
  "/setup": "הגדרת מבנה הבית, חדרים וצוות",
  "/boqwizard": "עבור חדר-חדר ובנה רשימת כמויות לרכישה / יבוא",
  "/quotes": "הוסיפו הצעות לפי נושא והשוו ביניהן",
}

const BOTTOM_NAV = ["/", "/setup", "/boqwizard", "/photos", "/notes"].map(id => NAV.find(n => n.id === id)!)

export function AppLayout({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [tweaksOpen, setTweaksOpen] = React.useState(false)
  const { project, hasMultipleProjects } = useCurrentProject()

  // group nav sections
  const sections = Array.from(new Set(NAV.map(n => n.section)))

  const noLayoutRoutes = ['/landing', '/register']
  if (noLayoutRoutes.includes(currentPath)) {
    return <>{children}</>
  }

  return (
    <>
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">B</div>
          <div><div className="sidebar-logo-text">Build<span>Sync</span></div></div>
        </div>

        {sections.map(sec => (
          <div key={sec}>
            <div className="nav-section">{sec}</div>
            {NAV.filter(n => n.section === sec).map(n => (
              <Link 
                key={n.id} 
                to={n.id} 
                className="nav-item"
                activeProps={{ className: 'active' }}
                exact
              >
                {currentPath === n.id && (
                  <motion.div layoutId="nav-active" className="nav-item-bg" transition={{type:"spring", stiffness:300, damping:30}} />
                )}
                <Icon n={n.icon} s={18} />
                <span style={{flex:1}}>{n.label}</span>
                {n.badge && <span className="nav-item-badge">{n.badge}</span>}
              </Link>
            ))}
          </div>
        ))}

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <span className="page-title">{PAGE_TITLES[currentPath] || PAGE_TITLES["/"]}</span>
              {PAGE_SUBTITLES[currentPath] && <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{PAGE_SUBTITLES[currentPath]}</div>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                }}
              >
                <Icon n="layers" s={14} />
                <span>{project?.name || "בחירת פרויקט"}</span>
              </Link>
            ) : null}
            <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon n="clock" s={12} c="var(--text3)" />
              <span>עודכן: היום, 09:45</span>
            </div>
            <div style={{ width: 1, height: 16, background: "var(--border)", margin: "0 4px" }} />
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>א</div>
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
            >
              <Icon n={n.icon} s={20} />
              <span>{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
