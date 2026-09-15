# השימוש ב-NumberInput לסכומים כספיים

כאשר משתמשים בשדות הזנה עבור סכומי כסף (תקציבים, הוצאות, תשלומים, עלויות וכו'), **חובה** להשתמש ברכיב ה-`NumberInput` הגלובלי (מתוך `src/components/Shared.tsx`) במקום בתגית `<input type="number">` או `<Input type="number">` רגילה. 

הסיבה לכך היא ש-`NumberInput` מוסיף פסיקים אוטומטית למספרים גדולים (למשל `1,200,000`) בזמן ההקלדה, מה שמשפר משמעותית את חווית המשתמש ומקל על קריאת סכומים באפליקציה.

## דוגמה לשימוש נכון:
```tsx
import { NumberInput } from '../components/Shared';

// הגדרת הסטייט צריכה לאפשר number או undefined
const [amount, setAmount] = useState<number | undefined>();

// שימוש בקומפוננטה (שימו לב ש-onChange מחזיר ישר את המספר או undefined)
<NumberInput 
  className="bp-input" 
  value={amount} 
  onChange={setAmount} 
  placeholder="100000" 
/>
```

## כללים חשובים:
1. סטייט המקושר ל-`NumberInput` צריך להיות מטיפוס `number | undefined`.
2. הפונקציה המועברת ל-`onChange` מקבלת ישירות את הערך המספרי, כך שאין צורך לעשות `e.target.value` כמו ב-input רגיל.
3. עבור שדות שאינם סכומי כסף (כמו אחוזים, שטח דירה וכו'), ניתן להמשיך להשתמש ב-`<input type="number">` במידת הצורך, אם כי `NumberInput` תומך גם בהם.
