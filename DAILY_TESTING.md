# 🧪 Daily Testing Routine

**מטרה:** לוודא שהכל עובד לפני כל commit/build

---

## ⚡ Quick Smoke Test (5 דקות)

### 1. Login Flow ✅
- [ ] התחבר עם Google/Apple/Email
- [ ] וודא profile נטען

### 2. Home Screen ✅
- [ ] Timeline מוצג
- [ ] Quick Actions עובדים
- [ ] הוסף אירוע מהיר (הזנה/שינה)

### 3. Critical Features ✅
- [ ] צור תזכורת חדשה
- [ ] הוסף health event
- [ ] בדוק family sharing (אם יש)

### 4. Dark Mode ✅
- [ ] החלף ל-Dark Mode
- [ ] וודא שהכל נראה טוב

### 5. Build ✅
```bash
npm start
# או
npx expo run:ios
```
- [ ] אין שגיאות
- [ ] אין warnings קריטיים

---

## 📱 Full Testing Session (30 דקות)

**תדירות:** לפני כל build ל-TestFlight

### Baby Management
- [ ] הוסף ילד חדש
- [ ] ערוך פרטי ילד
- [ ] העלה תמונת פרופיל
- [ ] מחק ילד (אם צריך)

### Timeline & Events
- [ ] הוסף 5 אירועי הזנה
- [ ] הוסף 3 אירועי שינה
- [ ] הוסף 2 אירועי חיתול
- [ ] סנן לפי ילד
- [ ] ערוך אירוע
- [ ] מחק אירוע

### Family Sharing
- [ ] צור משפחה חדשה
- [ ] שלח הזמנה
- [ ] (במכשיר אחר) הצטרף למשפחה
- [ ] בדוק real-time sync
- [ ] הסר member

### BabySitter
- [ ] חפש בייביסיטר
- [ ] צור הזמנה
- [ ] (כסיטר) אשר הזמנה
- [ ] התחל משמרת
- [ ] pause/resume
- [ ] סיים משמרת

### Health Tracking
- [ ] הוסף חיסון
- [ ] הוסף חום
- [ ] הוסף ביקור רופא
- [ ] העלה מסמך

### Growth & Development
- [ ] הוסף מדידת משקל
- [ ] הוסף מדידת אורך
- [ ] צפה בגרף
- [ ] הוסף milestone
- [ ] סמן שן כבקעה

### Settings
- [ ] שנה שפה (עברית/אנגלית)
- [ ] החלף theme
- [ ] עדכן פרטים אישיים
- [ ] התנתק

---

## 🐛 Bug Reporting Template

כשמוצא bug, תעד ככה:

```markdown
**Bug:** [תיאור קצר]

**Steps to Reproduce:**
1. פתח את [מסך]
2. לחץ על [כפתור]
3. [מה קרה]

**Expected:** [מה היה צריך לקרות]
**Actual:** [מה קרה בפועל]

**Device:** iPhone 14 Pro / iOS 17.2
**App Version:** 1.0.7 (build 3)
**Screenshots:** [צילום מסך אם יש]

**Priority:** 🔴 Critical / 🟡 High / 🟢 Low
```

---

## ✅ Pre-Commit Checklist

לפני כל `git commit`:

```bash
# 1. בדוק שאין console.log
grep -r "console\." --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".claude" | grep -v ios_old | grep -v "logger.ts"

# 2. בדוק TypeScript errors
npx tsc --noEmit

# 3. Build מצליח
npm start
# או
npx expo run:ios

# 4. אין warnings קריטיים
```

---

## 🚀 Pre-Build Checklist

לפני `eas build`:

- [ ] ✅ All tests passed
- [ ] ✅ No console.log
- [ ] ✅ Version bumped (app.json)
- [ ] ✅ Build number bumped
- [ ] ✅ Firestore rules deployed
- [ ] ✅ All features working
- [ ] ✅ Dark Mode OK

```bash
# Build command
eas build --platform ios --profile production
```

---

**💡 Tip:** שמור את הקובץ הזה פתוח תמיד כדי לעבור על הבדיקות בזריזות!
