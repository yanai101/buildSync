import React from 'react';
import { TOTAL_WEEKS } from '../utils/mockData';
import { Icon } from '../components/Shared';
import { useDataSource } from '../hooks/useDataSource';
import { ScreenBoundary } from '../components/ScreenBoundary';

export const TimelineScreen = () => {
  const { data: bars, loading, error, refetch } = useDataSource<any[]>('timeline');
  const [zoom, setZoom] = React.useState(1.5);

  const today = 30; // week 30 of 58
  const months = ["ינו","פבר","מרץ","אפר","מאי","יונ","יול","אוג","ספט","אוק","נוב","דצמ","ינו","פבר","מרץ"];
  const monthMarks = months.map((m,i)=>({m,w:i*4}));

  const statusColors: Record<string, string> = {done:"#16A34A",active:"#E07A38",pending:"#D1D5DB"};
  const [hovered,setHovered] = React.useState<any>(null);

  return (
    <ScreenBoundary loading={loading} error={error} onRetry={refetch}>
      <div className="page-content">
        <div className="card" style={{overflow:"hidden"}}>
          <div className="card-header" style={{display:"flex",justifyContent:"space-between"}}>
            <span>לוח זמנים — ינואר 2025 עד מרץ 2026</span>
            <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>שבוע נוכחי: {today}</span>
          </div>
          <div style={{overflowX:"auto",padding:"0 0 16px"}}>
            <div style={{minWidth:800}}>
              {/* Month headers */}
              <div style={{display:"flex",borderBottom:"1px solid var(--border)",background:"#FAFAF8",position:"sticky",top:0,zIndex:5}}>
                <div style={{width:150,flexShrink:0,borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:11,fontWeight:600,color:"var(--text3)"}}>שלב</div>
                <div style={{flex:1,position:"relative",height:34}}>
                  {monthMarks.filter(m=>m.w<=TOTAL_WEEKS).map(({m,w})=>(
                    <div key={w} style={{position:"absolute",left:`${w/TOTAL_WEEKS*100}%`,fontSize:10,color:"var(--text3)",paddingTop:10,whiteSpace:"nowrap"}}>
                      <div style={{width:1,height:6,background:"var(--border)",margin:"0 auto 2px"}}/>
                      {m}
                    </div>
                  ))}
                  {/* Today line */}
                  <div style={{position:"absolute",left:`${today/TOTAL_WEEKS*100}%`,top:0,bottom:-9999,width:2,background:"var(--accent)",opacity:.5,zIndex:10}}/>
                </div>
              </div>
              {/* Rows */}
              {bars?.map(item=>(
                <div key={item.id} style={{display:"flex",borderBottom:"1px solid var(--border)",minHeight:40,alignItems:"center"}}
                  onMouseEnter={()=>setHovered(item.id)} onMouseLeave={()=>setHovered(null)}>
                  <div style={{width:150,flexShrink:0,borderLeft:"1px solid var(--border)",padding:"8px 12px",fontSize:12,fontWeight:500,color:item.status==="active"?"var(--accent)":item.status==="done"?"var(--text2)":"var(--text3)",background:hovered===item.id?"#FAFAF8":"transparent"}}>
                    {item.name}
                  </div>
                  <div style={{flex:1,position:"relative",height:40,padding:"8px 0"}}>
                    {/* Today vertical */}
                    <div style={{position:"absolute",left:`${today/TOTAL_WEEKS*100}%`,top:0,bottom:0,width:1,background:"var(--accent)",opacity:.25}}/>
                    {/* Bar */}
                    <div style={{
                      position:"absolute",
                      left:`${item.col/TOTAL_WEEKS*100}%`,
                      width:`${item.span/TOTAL_WEEKS*100}%`,
                      height:24,top:8,borderRadius:4,
                      background:statusColors[item.status],
                      opacity:hovered===item.id?1:.8,
                      transition:"opacity .15s",
                      display:"flex",alignItems:"center",paddingRight:6,overflow:"hidden"
                    }}>
                      <span style={{fontSize:10,color:item.status==="pending"?"var(--text3)":"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",paddingRight:6}}>
                        {item.span>=4?item.name:""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {/* Legend */}
              <div style={{display:"flex",gap:16,padding:"12px 16px",fontSize:11,color:"var(--text2)"}}>
                {[["done","הושלם","#16A34A"],["active","בביצוע","#E07A38"],["pending","מתוכנן","#D1D5DB"]].map(([k,l,c])=>(
                  <span key={k} style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:16,height:8,background:c,borderRadius:2,display:"inline-block"}}/>{l}
                  </span>
                ))}
                <span style={{display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:2,height:14,background:"var(--accent)",borderRadius:1,display:"inline-block"}}/> היום
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScreenBoundary>
  );
};
