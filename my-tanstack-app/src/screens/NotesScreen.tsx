import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '@tanstack/react-router';
import { Icon, Avatar, Select, Btn, FeedbackModal, EmptyState, PageBackground } from '../components/Shared';
import { ROLE_COLORS, ROLE_LABELS } from '../utils/mockData';
import { useDataSource } from '../hooks/useDataSource';
import { useDataMutation } from '../hooks/useDataMutation';
import { useCurrentProject } from '../hooks/useCurrentProject';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ScreenBoundary } from '../components/ScreenBoundary';

export interface Note {
  id: number;
  fromName: string;
  role: string;
  text: string;
  date: string;
  time: string;
  thread: string;
}

const getContractorIdStr = (val: any): string => {
  if (!val) return "";
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return String(val._id ?? val.id ?? "");
  }
  return String(val);
};

// WhatsApp-style read receipt tick component
const ReadTick = ({ readAt }: { readAt?: number }) => {
  const isRead = !!readAt;
  return (
    <span
      style={{
        fontSize: 13,
        color: isRead ? '#3B82F6' : 'var(--text3)',
        letterSpacing: -2,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        userSelect: 'none',
        marginRight: 2,
      }}
      title={isRead ? 'נקרא' : 'נשלח'}
    >
      {isRead ? '✓✓' : '✓'}
    </span>
  );
};

// A single conversation in the contacts list — either the shared "Team"
// broadcast, a 1:1 DM with another internal user, or a (per-contractor or
// broadcast) contractor conversation.
type Conversation = {
  key: string;
  label: string;
  thread: 'internal' | 'contractor';
  peerUserId?: string;
  contractorId?: string;
};

export const NotesScreen = () => {
  const { project, projectId, projects, setCurrentProject } = useCurrentProject();
  const search = useSearch({ from: '/notes', shouldThrow: false }) as { project?: string; peer?: string } | undefined;
  const dbNotes = useQuery(api.queries.listNotes, projectId ? { projectId } : "skip");
  const dbContractors = useQuery(api.queries.listContractors, projectId ? { projectId } : "skip");
  const currentIdentity = useQuery(api.users.currentIdentity, {});
  const { data: initialNotes, loading, error, refetch, mode } = useDataSource<Note[]>('notes', { db: dbNotes as any });
  const { mutate } = useDataMutation('notes');

  const [notes, setNotes] = React.useState<Note[]>([]);
  const [text, setText] = React.useState("");
  const [myRole, setMyRole] = React.useState<string>("manager");
  const [activeKey, setActiveKey] = React.useState<string>("internal-team");
  const [feedback, setFeedback] = React.useState<{ title: string; message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const composeRef = React.useRef<HTMLTextAreaElement>(null);

  const contractors = dbContractors ?? [];

  React.useEffect(() => {
    if (initialNotes) setNotes(initialNotes);
  }, [initialNotes]);

  // If a notification deep-link points at another project, switch to it.
  React.useEffect(() => {
    if (mode !== 'db' || !search?.project) return;
    if (search.project !== projectId && projects.some((p: any) => p._id === search.project)) {
      setCurrentProject(search.project);
    }
  }, [search?.project, projectId, projects, mode, setCurrentProject]);

  const myUserId = currentIdentity?.userId;
  const activeRole = mode === 'db'
    ? currentIdentity?.role ?? 'manager'
    : myRole;
  const canSeeAllChats = activeRole !== 'contractor';

  // The list of conversations shown as contact chips.
  const conversations: Conversation[] = React.useMemo(() => {
    if (mode !== 'db') {
      // Mock mode keeps the simple legacy two-thread view.
      return [
        { key: 'internal-team', label: 'פנימי', thread: 'internal' },
        { key: 'contractor-broadcast', label: 'לקבלן', thread: 'contractor' },
      ];
    }

    if (!canSeeAllChats) {
      return [{ key: 'contractor-team', label: 'צוות הפרויקט', thread: 'contractor' }];
    }

    const list: Conversation[] = [
      { key: 'internal-team', label: '👥 צוות (כולם)', thread: 'internal' },
    ];

    // Order: inspector, then manager, then owner — matches the requested
    // navigation order ("מפקח" then "מנהל עבודה"). A role only gets a chip
    // once someone has actually been assigned to it.
    const internalMembers: { role: 'owner' | 'manager' | 'inspector'; userId?: any; name?: string }[] = [
      { role: 'inspector', userId: project?.inspectorUserId, name: project?.inspectorName },
      { role: 'manager', userId: project?.managerUserId, name: project?.managerName },
      { role: 'owner', userId: project?.ownerUserId, name: project?.ownerName },
    ];
    for (const m of internalMembers) {
      if (!m.userId || String(m.userId) === String(myUserId)) continue;
      // Never show the "טרם הוגדר" placeholder name — fall back to the role label.
      const label = m.name && m.name !== 'טרם הוגדר' ? m.name : (ROLE_LABELS as any)[m.role];
      list.push({
        key: `dm-${String(m.userId)}`,
        label,
        thread: 'internal',
        peerUserId: String(m.userId),
      });
    }

    for (const c of contractors as any[]) {
      const cId = getContractorIdStr(c._id ?? c.id);
      list.push({ key: `contractor-${cId}`, label: c.name || (ROLE_LABELS as any).contractor, thread: 'contractor', contractorId: cId });
    }

    list.push({ key: 'contractor-broadcast', label: '📣 לכל הקבלנים', thread: 'contractor' });

    return list;
  }, [mode, canSeeAllChats, project, contractors, myUserId]);

  // Unread message count per conversation.
  const unreadByConvKey = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes as any[]) {
      if (n.readAt) continue;
      if (n.fromUserId === myUserId) continue;
      if (n.thread === 'internal') {
        if (n.recipientUserId === undefined) {
          counts['internal-team'] = (counts['internal-team'] ?? 0) + 1;
        } else if (String(n.recipientUserId) === String(myUserId)) {
          const key = `dm-${String(n.fromUserId)}`;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      } else if (n.thread === 'contractor') {
        if (canSeeAllChats) {
          const cId = getContractorIdStr(n.recipientContractorId);
          if (cId) {
            // Per-contractor conversation — only count messages FROM contractors
            if (n.role === 'contractor') {
              counts[`contractor-${cId}`] = (counts[`contractor-${cId}`] ?? 0) + 1;
            }
          } else {
            // Broadcast message (no recipientContractorId) — count under broadcast tab
            counts['contractor-broadcast'] = (counts['contractor-broadcast'] ?? 0) + 1;
          }
        } else {
          counts['contractor-team'] = (counts['contractor-team'] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [notes, myUserId, canSeeAllChats]);

  const totalUnread = Object.values(unreadByConvKey).reduce((s, v) => s + v, 0);

  // Make sure the active conversation always points at something real.
  React.useEffect(() => {
    if (conversations.length === 0) return;
    if (!conversations.some(c => c.key === activeKey)) {
      setActiveKey(conversations[0].key);
    }
  }, [conversations, activeKey]);

  // Notification deep-link: open the conversation with the given peer.
  // Apply the deep-link's `peer` exactly once (so a manual chip click afterwards isn't
  // overridden by this effect re-running when `conversations` is recomputed).
  const appliedPeerRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (mode !== 'db' || !search?.peer || conversations.length === 0) return;
    if (appliedPeerRef.current === search.peer) return;
    const target = conversations.find(c =>
      c.key === `dm-${search.peer}` ||
      c.key === `contractor-${search.peer}` ||
      (search.peer === 'team' && c.key === (canSeeAllChats ? 'internal-team' : 'contractor-team'))
    );
    if (target) {
      setActiveKey(target.key);
      appliedPeerRef.current = search.peer;
    }
  }, [search?.peer, conversations, mode, canSeeAllChats]);

  const activeConv = conversations.find(c => c.key === activeKey) ?? conversations[0];

  // When there's more than one contractor, replace their individual chips
  // with a single dropdown so the chip row doesn't get crowded.
  const showContractorDropdown = canSeeAllChats && contractors.length > 1;
  const chipConvs = showContractorDropdown ? conversations.filter(c => !c.contractorId) : conversations;
  const contractorConvs = conversations.filter(c => !!c.contractorId);

  // Auto-mark incoming messages as read when the user opens a conversation.
  // Optimistic local update fires immediately so counts reset without waiting for DB roundtrip.
  React.useEffect(() => {
    if (mode !== 'db' || !projectId || !activeConv) return;

    const now = Date.now();

    setNotes(prev => prev.map(n => {
      if ((n as any).readAt) return n;
      if ((n as any).fromUserId === myUserId) return n;
      if (n.thread !== activeConv.thread) return n;
      if (activeConv.thread === 'internal') {
        if (activeConv.peerUserId) {
          if (String((n as any).recipientUserId) !== String(myUserId) || String((n as any).fromUserId) !== activeConv.peerUserId) return n;
        } else if ((n as any).recipientUserId !== undefined) {
          return n;
        }
      } else if (canSeeAllChats && activeConv.thread === 'contractor') {
        if (activeConv.contractorId) {
          if (getContractorIdStr((n as any).recipientContractorId) !== activeConv.contractorId) return n;
        } else {
          // Broadcast tab — only mark broadcast messages (no recipientContractorId)
          if ((n as any).recipientContractorId) return n;
        }
      }
      return { ...n, readAt: now } as any;
    }));

    mutate('markMessagesAsRead', {
      projectId,
      thread: activeConv.thread,
      ...(activeConv.thread === 'internal' && activeConv.peerUserId ? { peerUserId: activeConv.peerUserId } : {}),
      ...(activeConv.thread === 'contractor' && canSeeAllChats ? { filterContractorId: activeConv.contractorId } : {}),
    }).catch(() => { /* best-effort */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, notes.length, mode, projectId, canSeeAllChats]);

  const filtered = React.useMemo(() => {
    if (!activeConv) return [];

    if (mode !== 'db') {
      return notes.filter(n => n.thread === activeConv.thread);
    }

    if (activeConv.thread === 'internal') {
      if (activeConv.peerUserId) {
        return notes.filter((n: any) => n.thread === 'internal' && (
          (String(n.fromUserId) === String(myUserId) && String(n.recipientUserId) === activeConv.peerUserId) ||
          (String(n.fromUserId) === activeConv.peerUserId && String(n.recipientUserId) === String(myUserId))
        ));
      }
      return notes.filter((n: any) => n.thread === 'internal' && n.recipientUserId === undefined);
    }

    // contractor thread
    if (!canSeeAllChats) {
      return notes.filter(n => n.thread === 'contractor');
    }
    if (activeConv.contractorId) {
      return notes.filter((n: any) => n.thread === 'contractor' && getContractorIdStr(n.recipientContractorId) === activeConv.contractorId);
    }
    // broadcast — messages addressed to all contractors
    return notes.filter((n: any) => n.thread === 'contractor' && !n.recipientContractorId);
  }, [notes, activeConv, mode, myUserId, canSeeAllChats]);

  const send = async () => {
    if (!text.trim() || !activeConv) return;
    const roleForMessage = activeRole || myRole;
    const name = mode === 'db'
      ? currentIdentity?.name || currentIdentity?.email || (ROLE_LABELS as any)[roleForMessage] || 'משתמש'
      : ["בעל הבית","אבי כהן","רון לוי","יעקב פרץ"][["owner","manager","inspector","contractor"].indexOf(myRole)];

    const recipientUserId = mode === 'db' && activeConv.thread === 'internal' ? activeConv.peerUserId : undefined;
    const recipientContractorId = mode === 'db' && activeConv.thread === 'contractor' ? activeConv.contractorId : undefined;

    // Optimistic
    const newNote = {
      id: Date.now() as any,
      fromUserId: myUserId,
      fromName: name,
      role: roleForMessage,
      text: text.trim(),
      date: "היום",
      time: new Date().toTimeString().slice(0,5),
      thread: activeConv.thread,
      recipientUserId,
      recipientUserName: recipientUserId ? activeConv.label : undefined,
      recipientContractorId,
      recipientName: recipientContractorId ? activeConv.label : undefined,
    };
    setNotes(prev=>[...prev, newNote as any]);
    setText("");
    setTimeout(()=>endRef.current?.scrollIntoView({behavior: "smooth", block:"nearest"}),50);

    try {
      await mutate('saveNote', {
        projectId: projectId || 'dummy',
        text: text.trim(),
        thread: activeConv.thread,
        ...(recipientContractorId ? { recipientContractorId: recipientContractorId as any } : {}),
        ...(recipientUserId ? { recipientUserId: recipientUserId as any } : {}),
      });
      refetch();
    } catch (err) {
      setFeedback({ title: "שגיאה", message: "שגיאה בשליחת הודעה", type: "error" });
    }
  };

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
        {/* Conversation list */}
        {conversations.length > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, overflowX: 'auto' }}>
            {chipConvs.map(c => {
              const unread = unreadByConvKey[c.key] ?? 0;
              const isActive = activeKey === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setActiveKey(c.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                    borderRadius: 20,
                    cursor: 'pointer',
                    fontFamily: "'Heebo',sans-serif",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'var(--accent)' : 'var(--surface)',
                    color: isActive ? '#fff' : 'var(--text2)',
                    whiteSpace: 'nowrap',
                    transition: 'background .15s, color .15s',
                  }}
                >
                  {c.label}
                  {unread > 0 && (
                    <span style={{background:'#DC2626',color:'#fff',borderRadius:10,fontSize:10,padding:'1px 6px',fontWeight:700,minWidth:16,textAlign:'center'}}>
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
            {showContractorDropdown && (
              <Select
                value={activeConv?.contractorId ? activeKey : ''}
                onChange={(val: string) => val && setActiveKey(val)}
                style={{
                  fontSize: 13,
                  width: 'auto',
                  borderRadius: 20,
                  fontWeight: activeConv?.contractorId ? 600 : 400,
                }}
              >
                <option value="" disabled>קבלן...</option>
                {contractorConvs.map(c => {
                  const unread = unreadByConvKey[c.key] ?? 0;
                  return (
                    <option key={c.key} value={c.key}>
                      {c.label}{unread > 0 ? ` (${unread})` : ''}
                    </option>
                  );
                })}
              </Select>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:0,paddingBottom:16,position:"relative"}}>
          {notes.length === 0 ? (
            <div style={{position:"relative",zIndex:1,flex:1,minHeight:360,display:"flex",alignItems:"center"}}>
              <PageBackground image="/empty_states/notes.png" />
              <div style={{width:"100%"}}>
                <EmptyState
                  icon="message"
                  title="אין הודעות"
                  description="נראה שעדיין לא נוספו הודעות או עדכונים לפרויקט."
                  action={
                    <Btn size="lg" onClick={() => composeRef.current?.focus()} style={{padding: "12px 28px", fontSize: 16}}>
                      <Icon n="plus" s={16}/> הודעה חדשה
                    </Btn>
                  }
                />
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text3)",fontSize:13}}>
              אין עדיין הודעות בשיחה זו
            </div>
          ) : (
            <AnimatePresence initial={false}>
            {filtered.map((n,i)=>{
              const isMe = mode === 'db'
                ? (n as any).fromUserId === currentIdentity?.userId
                : n.role === activeRole;
              const color = (ROLE_COLORS as any)[n.role]||"#888";
              const readAt = (n as any).readAt as number | undefined;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",marginBottom:16}}
                >
                  <div style={{display:"flex",alignItems:"flex-end",gap:8,flexDirection:isMe?"row-reverse":"row",maxWidth:"72%"}}>
                    <Avatar letter={n.fromName[0]} color={color} size={32}/>
                    <div>
                      <div style={{fontSize:11,color:"var(--text3)",marginBottom:5,textAlign:isMe?"left":"right"}}>{n.fromName} · {(ROLE_LABELS as any)[n.role]} · {n.date} {n.time}</div>
                      <div style={{padding:"13px 17px",borderRadius:16,fontSize:14,lineHeight:1.65,background:isMe?"linear-gradient(135deg, var(--accent) 0%, #c96b30 100%)":"var(--surface)",color:isMe?"#fff":"var(--text1)",border:isMe?"none":"1px solid var(--border)",boxShadow:isMe?"0 3px 12px rgba(224,122,56,0.28)":"var(--shadow-sm)",borderTopLeftRadius:isMe?16:4,borderTopRightRadius:isMe?4:16}}>
                        {n.text}
                      </div>
                      <div style={{marginTop:4,display:"flex",gap:6,justifyContent:isMe?"flex-end":"flex-start",flexWrap:"wrap",alignItems:"center"}}>
                        {/* Read receipt tick — only for messages I sent, in db mode */}
                        {isMe && mode === 'db' && (
                          <ReadTick readAt={readAt} />
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}
          <div ref={endRef}/>
        </div>

        {/* Compose */}
        <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:12}}>
          {activeConv && (
            <div style={{fontSize:11,color:"var(--text3)",marginBottom:6}}>
              שולח אל: <strong style={{color:"var(--text2)"}}>{activeConv.label}</strong>
            </div>
          )}
          <textarea ref={composeRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="כתוב הודעה... (Enter לשליחה)" rows={2}
            style={{width:"100%",border:"none",outline:"none",fontSize:13,fontFamily:"'Heebo',sans-serif",resize:"none",color:"var(--text1)",background:"transparent"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {mode === 'mock' ? (
                <Select value={myRole} onChange={setMyRole} style={{fontSize:12,width:"auto"}}>
                  <option value="owner">בעל הבית</option>
                  <option value="manager">בעל בנייה</option>
                  <option value="inspector">מפקח</option>
                  <option value="contractor">קבלן</option>
                </Select>
              ) : (
                <div style={{fontSize:12,color:"var(--text2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 10px",background:"var(--bg)"}}>
                  {(ROLE_LABELS as any)[activeRole] || "משתמש"}
                </div>
              )}
            </div>
            <Btn onClick={send}><Icon n="send" s={14}/> שלח</Btn>
          </div>
        </div>
        {feedback && (
          <FeedbackModal
            title={feedback.title}
            message={feedback.message}
            type={feedback.type}
            onClose={() => setFeedback(null)}
          />
        )}
      </div>
    </ScreenBoundary>
  );
};
