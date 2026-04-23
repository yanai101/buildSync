
// ── BuildPro DATA + HELPERS ──────────────────────────────────────────────────
// Exports to window via Object.assign at bottom

const { useState, useEffect, useRef, useCallback } = React;

const PROJECT = {
  name:"בית רוזנברג", address:"רחוב הכרם 14, נהריה",
  owner:"יוסי רוזנברג", manager:"אבי כהן", inspector:"רון לוי",
  startDate:"01/01/2025", expectedEnd:"31/12/2025",
  progress:35, currentStage:"טיח ועבודות פנים",
  budget:2800000, spent:980000, committed:450000
};

const STAGES = [
  {id:1,name:"תכנון והיתרים",status:"done",progress:100,start:"2025-01-01",end:"2025-02-15",contractor:"מפקח",icon:"📋",tasks:[
    {id:11,name:"תכניות אדריכל",done:true,assignee:"מפקח"},
    {id:12,name:"תכניות קונסטרוקציה",done:true,assignee:"מפקח"},
    {id:13,name:"הגשת בקשה להיתר",done:true,assignee:"בעל הבית"},
    {id:14,name:"קבלת היתר בנייה",done:true,assignee:"בעל הבית"},
  ]},
  {id:2,name:"עבודות עפר ויסודות",status:"done",progress:100,start:"2025-02-16",end:"2025-03-31",contractor:"קבלן עפר",icon:"⛏️",tasks:[
    {id:21,name:"חפירה",done:true,assignee:"קבלן עפר"},
    {id:22,name:"יסודות",done:true,assignee:"קבלן שלד"},
    {id:23,name:"ריצוף בטון כושי",done:true,assignee:"קבלן שלד"},
  ]},
  {id:3,name:"שלד",status:"done",progress:100,start:"2025-04-01",end:"2025-06-30",contractor:"קבלן שלד",icon:"🏗️",tasks:[
    {id:31,name:"עמודים וקורות קומה א'",done:true,assignee:"קבלן שלד"},
    {id:32,name:"תקרה קומה א'",done:true,assignee:"קבלן שלד"},
    {id:33,name:"קירות קומה ב'",done:true,assignee:"קבלן שלד"},
    {id:34,name:"גג",done:true,assignee:"קבלן שלד"},
  ]},
  {id:4,name:"גג וחיפויים חיצוניים",status:"done",progress:100,start:"2025-07-01",end:"2025-07-31",contractor:"קבלן גג",icon:"🏠",tasks:[
    {id:41,name:"איטום גג",done:true,assignee:"קבלן גג"},
    {id:42,name:"חיפוי אבן חיצוני",done:true,assignee:"קבלן חיפויים"},
  ]},
  {id:5,name:"אינסטלציה גולמית",status:"done",progress:100,start:"2025-07-01",end:"2025-08-15",contractor:"קבלן אינסטלציה",icon:"🔧",tasks:[
    {id:51,name:"צינורות מים",done:true,assignee:"קבלן אינסטלציה"},
    {id:52,name:"ביוב",done:true,assignee:"קבלן אינסטלציה"},
  ]},
  {id:6,name:"חשמל גולמי",status:"done",progress:100,start:"2025-07-15",end:"2025-08-31",contractor:"חשמלאי",icon:"⚡",tasks:[
    {id:61,name:"הטמנת צינורות",done:true,assignee:"חשמלאי"},
    {id:62,name:"לוח חשמל ראשי",done:true,assignee:"חשמלאי"},
  ]},
  {id:7,name:"טיח ועבודות פנים",status:"active",progress:60,start:"2025-09-01",end:"2025-10-31",contractor:"קבלן טיח",icon:"🪣",tasks:[
    {id:71,name:"טיח פנים קומה א'",done:true,assignee:"קבלן טיח"},
    {id:72,name:"טיח פנים קומה ב'",done:true,assignee:"קבלן טיח"},
    {id:73,name:"טיח חוץ",done:false,assignee:"קבלן טיח"},
    {id:74,name:"סיום אינסטלציה עדינה",done:false,assignee:"קבלן אינסטלציה"},
  ]},
  {id:8,name:"ריצוף וחיפוי",status:"pending",progress:0,start:"2025-11-01",end:"2025-11-30",contractor:"קבלן ריצוף",icon:"🪟",tasks:[
    {id:81,name:"ריצוף קומה א'",done:false,assignee:"קבלן ריצוף"},
    {id:82,name:"ריצוף קומה ב'",done:false,assignee:"קבלן ריצוף"},
    {id:83,name:"חיפוי מטבח",done:false,assignee:"קבלן ריצוף"},
    {id:84,name:"חיפוי אמבטיות",done:false,assignee:"קבלן ריצוף"},
  ]},
  {id:9,name:"גבס ותקרות",status:"pending",progress:0,start:"2025-11-15",end:"2025-12-15",contractor:"קבלן גבס",icon:"🔲",tasks:[
    {id:91,name:"תקרות גבס קומה א'",done:false,assignee:"קבלן גבס"},
    {id:92,name:"קירות גבס",done:false,assignee:"קבלן גבס"},
  ]},
  {id:10,name:"חשמל עדין",status:"pending",progress:0,start:"2025-12-01",end:"2025-12-20",contractor:"חשמלאי",icon:"💡",tasks:[
    {id:101,name:"נקודות תאורה",done:false,assignee:"חשמלאי"},
    {id:102,name:"שקעים ומפסקים",done:false,assignee:"חשמלאי"},
    {id:103,name:"מזגנים",done:false,assignee:"חשמלאי"},
  ]},
  {id:11,name:"נגרות ומטבח",status:"pending",progress:0,start:"2025-12-01",end:"2025-12-31",contractor:"נגר",icon:"🪚",tasks:[
    {id:111,name:"ארונות מטבח",done:false,assignee:"נגר"},
    {id:112,name:"ארונות שינה",done:false,assignee:"נגר"},
    {id:113,name:"דלתות פנים",done:false,assignee:"נגר"},
  ]},
  {id:12,name:"צביעה",status:"pending",progress:0,start:"2025-12-15",end:"2026-01-15",contractor:"צבעי",icon:"🖌️",tasks:[
    {id:121,name:"סיוד ראשון",done:false,assignee:"צבעי"},
    {id:122,name:"צביעה גמר",done:false,assignee:"צבעי"},
  ]},
  {id:13,name:"גינה וחוץ",status:"pending",progress:0,start:"2026-01-01",end:"2026-01-31",contractor:"קבלן גינה",icon:"🌿",tasks:[
    {id:131,name:"שביל כניסה",done:false,assignee:"קבלן גינה"},
    {id:132,name:"גדר",done:false,assignee:"קבלן גינה"},
  ]},
  {id:14,name:"מסירה ובדיקות",status:"pending",progress:0,start:"2026-02-01",end:"2026-02-28",contractor:"מפקח",icon:"✅",tasks:[
    {id:141,name:"בדיקת אינסטלציה",done:false,assignee:"מפקח"},
    {id:142,name:"בדיקת חשמל",done:false,assignee:"מפקח"},
    {id:143,name:"טופס 4",done:false,assignee:"בעל הבית"},
  ]},
];

const CONTRACTORS_DATA = [
  {id:1,name:"דוד בן-דוד",company:"ב.ד. שלד בע\"מ",role:"קבלן שלד",phone:"052-1234567",email:"david@bdshelet.co.il",status:"completed",rating:4.8,budget:450000,paid:450000,avatar:"ד",color:"#7B9B8A"},
  {id:2,name:"מוחמד עלי",company:"עלי עבודות עפר",role:"קבלן עפר",phone:"050-7654321",email:"moh@ali-works.co.il",status:"completed",rating:4.5,budget:85000,paid:85000,avatar:"מ",color:"#8B7B5A"},
  {id:3,name:"יעקב פרץ",company:"פרץ טיח ובנייה",role:"קבלן טיח",phone:"054-9876543",email:"peretz@tiach.co.il",status:"active",rating:4.2,budget:120000,paid:72000,avatar:"י",color:"#7B8FA1"},
  {id:4,name:"אלון ברק",company:"ברק חשמל",role:"חשמלאי ראשי",phone:"053-1122334",email:"alon@barak.co.il",status:"active",rating:4.7,budget:95000,paid:45000,avatar:"א",color:"#E07A38"},
  {id:5,name:"ניסים כהן",company:"כהן אינסטלציה",role:"אינסטלטור",phone:"050-5544332",email:"nisim@cohen-plumbing.co.il",status:"active",rating:4.3,budget:110000,paid:65000,avatar:"נ",color:"#6B8B6B"},
  {id:6,name:"ריצוף ישראל בע\"מ",company:"ישראל ריצוף",role:"קבלן ריצוף",phone:"052-6677889",email:"info@israel-tiles.co.il",status:"pending",rating:0,budget:140000,paid:0,avatar:"ר",color:"#8B5A5A"},
  {id:7,name:"אברהם גלעד",company:"גלעד בנייה ופיתוח",role:"קבלן עד מפתח",phone:"054-3334455",email:"avraham@gilad-build.co.il",status:"pending",rating:0,budget:1800000,paid:0,avatar:"ג",color:"#5A5A8B"},
];

const ROOMS_LIST = [
  {id:"living",name:"סלון"},{id:"kitchen",name:"מטבח"},
  {id:"master",name:"חדר שינה ראשי"},{id:"bed2",name:"חדר שינה 2"},
  {id:"bed3",name:"חדר שינה 3"},{id:"bath1",name:"חדר אמבטיה 1"},
  {id:"bath2",name:"חדר אמבטיה 2"},{id:"toilet",name:"שירותי אורחים"},
  {id:"entrance",name:"כניסה ומסדרון"},{id:"utility",name:"חדר שירות"},
];

const BOQ_DATA = {
  living:[
    {id:1,name:"ריצוף פורצלן 60×60",cat:"ריצוף",qty:45,unit:"מ\"ר",unitPrice:280,supplier:"כרמל ריצוף",spec:"פורצלן מלוטש אפור בהיר",status:"approved"},
    {id:2,name:"תאורה מרכזית תלויה",cat:"חשמל",qty:2,unit:"יח'",unitPrice:950,supplier:"פנס טוב",spec:"תליון מודרני LED 40W",status:"approved"},
    {id:3,name:"ספוטים שקועים",cat:"חשמל",qty:12,unit:"יח'",unitPrice:180,supplier:"ברק חשמל",spec:"LED 7W 3000K",status:"approved"},
    {id:4,name:"שקעים כפולים",cat:"חשמל",qty:8,unit:"יח'",unitPrice:85,supplier:"ברק חשמל",spec:"עם ארקה",status:"pending"},
    {id:5,name:"מזגן 18000BTU",cat:"מיזוג",qty:1,unit:"יח'",unitPrice:4200,supplier:"קר מזגנים",spec:"אינוורטר A++",status:"pending"},
  ],
  kitchen:[
    {id:1,name:"ריצוף אנטיסליפ 60×60",cat:"ריצוף",qty:18,unit:"מ\"ר",unitPrice:280,supplier:"כרמל ריצוף",spec:"פורצלן אפור כהה",status:"approved"},
    {id:2,name:"חיפוי קיר פסיפס",cat:"חיפוי",qty:8,unit:"מ\"ר",unitPrice:350,supplier:"כרמל ריצוף",spec:"פסיפס זכוכית לבן-אפור",status:"pending"},
    {id:3,name:"ארון מטבח תחתון",cat:"נגרות",qty:5,unit:"מ'",unitPrice:3200,supplier:"מטבחי לוי",spec:"MDF אקרילי לבן",status:"approved"},
    {id:4,name:"ארון מטבח עליון",cat:"נגרות",qty:4,unit:"מ'",unitPrice:2800,supplier:"מטבחי לוי",spec:"MDF אקרילי לבן",status:"approved"},
    {id:5,name:"כיריים גז 5 להבות",cat:"מכשירים",qty:1,unit:"יח'",unitPrice:3500,supplier:"כלים סניטריים",spec:"נירוסטה 90×60",status:"pending"},
    {id:6,name:"כיור מטבח כפול",cat:"אינסטלציה",qty:1,unit:"יח'",unitPrice:1200,supplier:"כהן אינסטלציה",spec:"נירוסטה עמוק",status:"approved"},
  ],
  master:[
    {id:1,name:"פרקט עץ אלון",cat:"ריצוף",qty:22,unit:"מ\"ר",unitPrice:450,supplier:"יער פרקט",spec:"אלון 12mm",status:"pending"},
    {id:2,name:"ארון הזזה 4 דלתות",cat:"נגרות",qty:1,unit:"יח'",unitPrice:12000,supplier:"מטבחי לוי",spec:"240×240×60 מראות",status:"pending"},
    {id:3,name:"תאורה מרכזית",cat:"חשמל",qty:1,unit:"יח'",unitPrice:1200,supplier:"פנס טוב",spec:"תליון LED מינימליסטי",status:"pending"},
    {id:4,name:"מזגן 12000BTU",cat:"מיזוג",qty:1,unit:"יח'",unitPrice:3200,supplier:"קר מזגנים",spec:"אינוורטר A++",status:"pending"},
  ],
  bath1:[
    {id:1,name:"ריצוף שיש קררה",cat:"ריצוף",qty:8,unit:"מ\"ר",unitPrice:680,supplier:"כרמל ריצוף",spec:"שיש 60×60",status:"approved"},
    {id:2,name:"חיפוי קיר שיש",cat:"חיפוי",qty:16,unit:"מ\"ר",unitPrice:680,supplier:"כרמל ריצוף",spec:"שיש קררה עד תקרה",status:"approved"},
    {id:3,name:"אמבטיה חפויה",cat:"כלים סניטריים",qty:1,unit:"יח'",unitPrice:8500,supplier:"כלים סניטריים",spec:"אקרילי לבן 170×75",status:"approved"},
    {id:4,name:"מקלחון זכוכית",cat:"כלים סניטריים",qty:1,unit:"יח'",unitPrice:4200,supplier:"כלים סניטריים",spec:"זכוכית שקופה 8mm",status:"pending"},
    {id:5,name:"כיור תלוי",cat:"כלים סניטריים",qty:1,unit:"יח'",unitPrice:1800,supplier:"כלים סניטריים",spec:"פורצלן לבן 80cm",status:"approved"},
  ],
  bed2:[],bed3:[],bath2:[],toilet:[],entrance:[],utility:[],
};

const PHOTOS_DATA = [
  {id:1,date:"15/09/2025",stage:"שלד",location:"קומה א'",tag:"התקדמות",notesCount:2,color:"#7B8FA1",label:"שלד — עמודים קומה א'",annotations:[]},
  {id:2,date:"20/09/2025",stage:"שלד",location:"קומה ב'",tag:"בעיה",notesCount:3,color:"#8B6060",label:"שלד — קירות קומה ב'",annotations:[{type:"rect",x:30,y:40,w:120,h:80,color:"#FF3B30",text:"סדק בקיר!"}]},
  {id:3,date:"01/10/2025",stage:"אינסטלציה",location:"מטבח",tag:"התקדמות",notesCount:1,color:"#5A7B5A",label:"צנרת מטבח",annotations:[]},
  {id:4,date:"05/10/2025",stage:"חשמל",location:"כל הבית",tag:"בדיקה",notesCount:0,color:"#8B7B5A",label:"לוח חשמל ראשי",annotations:[]},
  {id:5,date:"10/10/2025",stage:"חשמל",location:"מרתף",tag:"בעיה",notesCount:2,color:"#6B6B8B",label:"צינורות חשמל",annotations:[{type:"circle",x:90,y:60,r:30,color:"#FF9500",text:"בדוק כאן"}]},
  {id:6,date:"15/10/2025",stage:"טיח",location:"סלון",tag:"התקדמות",notesCount:1,color:"#7B9B8A",label:"טיח סלון",annotations:[]},
  {id:7,date:"20/10/2025",stage:"טיח",location:"חדר שינה 1",tag:"התקדמות",notesCount:0,color:"#9B8A7B",label:"טיח חדר שינה ראשי",annotations:[]},
  {id:8,date:"25/10/2025",stage:"טיח",location:"חדר שינה 2",tag:"אישור",notesCount:1,color:"#7B8B9B",label:"טיח חדר שינה 2 — אושר",annotations:[]},
];

const NOTES_INITIAL = [
  {id:1,fromName:"רון לוי",role:"inspector",text:"יש לוודא כי קבלן הטיח מסיים את הטיח החיצוני לפני גשמי החורף. תאריך יעד: 15/11",date:"10/10",time:"09:30",thread:"internal",resolved:false},
  {id:2,fromName:"אבי כהן",role:"manager",text:"יעקב שלום, חשוב לסיים את הטיח בחדר השינה השני עד סוף השבוע. תאם עם המפקח לבדיקה.",date:"12/10",time:"14:15",thread:"contractor",resolved:false},
  {id:3,fromName:"יעקב פרץ",role:"contractor",text:"הבנתי. נסיים את הטיח בחדר שינה 2 עד יום חמישי. יש לנו בעיה עם חומרים — צריך אישור רכישה נוספת.",date:"12/10",time:"15:00",thread:"contractor",resolved:false},
  {id:4,fromName:"רון לוי",role:"inspector",text:"בדיקת טיח בסלון — נמצאו סדקים קלים ליד חלונות. קבלן טיפל. צולם ותועד.",date:"13/10",time:"10:00",thread:"internal",resolved:true},
  {id:5,fromName:"יוסי רוזנברג",role:"owner",text:"מה הסטטוס של הריצוף? יש ספק מועדף שאנחנו רוצים להשתמש בו.",date:"14/10",time:"18:30",thread:"internal",resolved:false},
];

const BUDGET_CATS = [
  {name:"שלד ויסודות",budget:650000,spent:650000,color:"#18181B"},
  {name:"חשמל",budget:120000,spent:65000,color:"#E07A38"},
  {name:"אינסטלציה",budget:130000,spent:85000,color:"#7B8FA1"},
  {name:"טיח",budget:150000,spent:90000,color:"#8B7B5A"},
  {name:"ריצוף וחיפוי",budget:200000,spent:0,color:"#5A7B5A"},
  {name:"נגרות ומטבח",budget:380000,spent:0,color:"#8B5A5A"},
  {name:"גינה וחוץ",budget:120000,spent:0,color:"#6B8B6B"},
  {name:"צביעה",budget:80000,spent:0,color:"#9B8A7B"},
  {name:"מיזוג",budget:90000,spent:0,color:"#7B9B9B"},
  {name:"גבס ותקרות",budget:85000,spent:0,color:"#8B8BAB"},
  {name:"תכנון ופיקוח",budget:210000,spent:90000,color:"#4B4B4B"},
  {name:"שונות",budget:185000,spent:0,color:"#AAAAAA"},
];

const TIMELINE_DATA = [
  {id:1,name:"תכנון והיתרים",col:0,span:6.5,status:"done",row:0},
  {id:2,name:"עפר ויסודות",col:6.5,span:5,status:"done",row:1},
  {id:3,name:"שלד",col:10,span:13,status:"done",row:0},
  {id:4,name:"גג וחיפויים",col:18,span:4,status:"done",row:1},
  {id:5,name:"אינסטלציה גולמית",col:18,span:6.5,status:"done",row:2},
  {id:6,name:"חשמל גולמי",col:20,span:7,status:"done",row:3},
  {id:7,name:"טיח ופנים",col:26,span:8.5,status:"active",row:0},
  {id:8,name:"ריצוף וחיפוי",col:30,span:4,status:"pending",row:1},
  {id:9,name:"גבס ותקרות",col:31.5,span:4.5,status:"pending",row:2},
  {id:10,name:"חשמל עדין",col:34,span:2.5,status:"pending",row:3},
  {id:11,name:"נגרות",col:34,span:4,status:"pending",row:4},
  {id:12,name:"צביעה",col:37.5,span:4,status:"pending",row:0},
  {id:13,name:"גינה וחוץ",col:38,span:4,status:"pending",row:1},
  {id:14,name:"מסירה",col:41.5,span:4,status:"pending",row:2},
];

const TOTAL_WEEKS = 58;

const fmt = n => new Intl.NumberFormat('he-IL').format(Math.round(n));
const fmtMoney = n => `₪${fmt(n)}`;

const ROLE_LABELS = {owner:"בעל הבית",manager:"בעל בנייה",inspector:"מפקח",contractor:"קבלן"};
const ROLE_COLORS = {owner:"#7B9B8A",manager:"#E07A38",inspector:"#7B8FA1",contractor:"#8B7B5A"};

Object.assign(window, {
  PROJECT, STAGES, CONTRACTORS_DATA, ROOMS_LIST, BOQ_DATA,
  PHOTOS_DATA, NOTES_INITIAL, BUDGET_CATS, TIMELINE_DATA, TOTAL_WEEKS,
  fmt, fmtMoney, ROLE_LABELS, ROLE_COLORS,
});
