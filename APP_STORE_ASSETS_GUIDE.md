# 📱 App Store Assets Guide

---

## 🎯 **מטרה**
להכין את כל החומרים שצריך ל-App Store listing

---

# 1. Screenshots (חובה!)

## 📏 **גדלים נדרשים:**

Apple דורשים screenshots ב-**4 גדלים** שונים:

### **iPhone 6.7"** (iPhone 14 Pro Max, 15 Pro Max)
- **Resolution:** 1290 x 2796 pixels (portrait)
- **Quantity:** 3-10 screenshots
- **זה הכי חשוב!** Apple מציגים אותו ראשון

### **iPhone 6.5"** (iPhone 11 Pro Max, XS Max)
- **Resolution:** 1242 x 2688 pixels
- **Quantity:** 3-10 screenshots

### **iPhone 5.5"** (iPhone 8 Plus)
- **Resolution:** 1242 x 2208 pixels
- **Quantity:** 3-10 screenshots (optional אבל מומלץ)

### **iPad Pro 12.9"**
- **Resolution:** 2048 x 2732 pixels
- **Quantity:** 3-10 screenshots (optional)

---

## 📸 **איך לצלם Screenshots?**

### **אופציה 1: Simulator (קל)**

```bash
# הפעל סימולטור גדול
npx expo run:ios --device "iPhone 15 Pro Max"

# נווט למסך שרוצה לצלם
# לחץ: Cmd + S (save screenshot)

# הקובץ יישמר ב-Desktop
```

**שלבים:**
1. נקה data למסך יפה (מלא באירועים)
2. פתח את המסך
3. Cmd + S
4. חזור על זה ל-3-10 מסכים

---

### **אופציה 2: Real Device (יותר טוב)**

```bash
# רוץ על מכשיר אמיתי
npx expo run:ios --device

# צלם screenshots:
# לחץ: Volume Up + Power Button
```

**Pros:** נראה יותר אמיתי (בר סטטוס אמיתי, פונטים מדויקים)

---

## 🎨 **אילו מסכים לצלם?**

### **Screenshot 1: Home Screen** (הכי חשוב!)
**מה להראות:**
- Timeline מלא באירועים צבעוניים
- Quick Actions בולטים
- Header עם פרטי ילד
- Dark Mode או Light Mode (בחר את היפה יותר)

**טיפ:** הוסף 5-10 אירועים של היום (הזנה, שינה, חיתול) כדי שה-Timeline ייראה מלא

---

### **Screenshot 2: Quick Actions**
**מה להראות:**
- הזנה פעילה עם טיימר
- או שינה פעילה עם טיימר
- מראה Live Activity (אם אפשר)

**טיפ:** התחל הזנה, המתן 5 דקות, אז צלם

---

### **Screenshot 3: Family Sharing**
**מה להראות:**
- מסך Family Settings
- רשימת members
- Real-time sync (אם אפשר להראות)

---

### **Screenshot 4: Health Tracking**
**מה להראות:**
- Health Card עם חיסונים
- או מדידת חום
- או גרף growth

---

### **Screenshot 5: BabySitter** (אם רוצה)
**מה להראות:**
- רשימת בייביסיטרים
- או משמרת פעילה
- או chat עם סיטר

---

### **Screenshot 6-10:** (אופציונלי)
- Teeth Tracker
- Milestones
- Dark Mode version של Home
- Settings
- Quick Reminder

---

## ✨ **Frame Screenshots (אופציונלי אבל מומלץ)**

**מה זה?** להוסיף מסגרת של iPhone מסביב ל-screenshot + טקסט marketing

### **כלים:**
1. **[screenshots.pro](https://screenshots.pro)** (free)
2. **[Shotsnapp](https://shotsnapp.com)** (free)
3. **Figma** (ידני)

### **דוגמה:**
```
┌─────────────────────┐
│  📱 iPhone Frame    │
│  ┌───────────────┐  │
│  │               │  │
│  │   [Screenshot]│  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  "Track Everything  │
│   Your Baby Needs"  │
└─────────────────────┘
```

**טקסטים לדוגמה:**
- "עקוב אחר הכל במקום אחד 📊"
- "שתף עם המשפחה בזמן אמת 👨‍👩‍👧"
- "מצא בייביסיטר אמינה 👶‍🍼"
- "Dark Mode מלא ✨"

---

# 2. App Icon (חובה!)

## 📐 **דרישות:**

- **Size:** 1024 x 1024 pixels
- **Format:** PNG (no alpha/transparency)
- **Content:** בלי טקסט, בלי פינות מעוגלות (Apple מוסיפות אוטומטית)

## 🎨 **איך ליצור?**

### **אופציה 1: Figma**
1. צור artboard 1024x1024
2. עצב את האייקון
3. Export כPNG

### **אופציה 2: Canva**
1. Custom size: 1024x1024
2. עצב
3. Download PNG

### **אופציה 3: Hire Designer**
- Fiverr: $10-50
- Upwork: $50-200

---

## ✅ **בדיקת האייקון:**

```bash
# וודא שהקובץ תקין:
file icon.png
# Output: PNG image data, 1024 x 1024, 8-bit/color RGB

# בדוק שאין alpha channel:
identify -verbose icon.png | grep -i alpha
# Output: (nothing) = good!
```

---

# 3. App Store Description

## 📝 **מה לכתוב?**

### **Subtitle** (30 תווים)
```
"מעקב תינוק חכם ומשפחתי"
```

### **Description** (עד 4000 תווים)

**עברית:**
```markdown
📊 עקוב אחר כל רגע בחיי התינוק שלך

CalmParent היא האפליקציה המושלמת להורים טריים - עקוב אחר הזנה, שינה, חיתולים, בריאות ועוד במקום אחד.

✨ תכונות עיקריות:

👶 עקוב אחר כמה ילדים
• הוסף מספר ילדים
• מעבר מהיר ביניהם
• כל ילד עם פרופיל משלו

📊 Daily Timeline
• כל אירועי היום במקום אחד
• הזנה, שינה, חיתולים, תרופות
• גרפים וסטטיסטיקות

👨‍👩‍👧 שיתוף משפחתי
• שתף עם בן/בת זוג
• סנכרון real-time
• כולם רואים עדכונים מיידית

🩺 מעקב בריאות
• חיסונים
• מדידות חום
• ביקורי רופא
• מסמכים רפואיים

📈 מעקב גדילה
• משקל, אורך, היקף ראש
• גרפים לעומת WHO
• מעקב אחר התפתחות

👶‍🍼 שוק בייביסיטרים
• מצא בייביסיטר אמינה
• הזמן מראש
• עקוב אחר משמרות
• תשלום אוטומטי

🌙 Live Activities (iOS)
• ראה טיימרים ב-Lock Screen
• עקוב אחר הזנה/שינה/משמרת
• עדכונים real-time

🌓 Dark Mode מלא
• מעבר חלק בין Light/Dark
• נוח לעיניים בלילה

🔔 תזכורות חכמות
• תזכורות חד-פעמיות
• תזכורות יומיות/שבועיות
• עבור ויטמינים, תרופות ועוד

📱 עובד Offline
• גם ללא אינטרנט
• סנכרון אוטומטי כשחוזרים online

🔒 פרטיות ואבטחה
• כל הנתונים מוצפנים
• שליטה מלאה על מי רואה מה
• גישת אורח מוגבלת בזמן

---

למה CalmParent?

✅ ממשק פשוט ואינטואיטיבי
✅ עיצוב מודרני ויפה
✅ עדכונים קבועים
✅ תמיכה בעברית מלאה
✅ ללא פרסומות

הורות זה מאתגר, אבל CalmParent כאן כדי לעזור לך לעקוב אחר הכל בקלות.

הורד עכשיו והתחל לעקוב! 👶✨
```

---

### **אנגלית** (לשוק בינלאומי):
```markdown
📊 Track Every Moment of Your Baby's Life

CalmParent is the perfect app for new parents - track feeding, sleep, diapers, health and more in one place.

✨ Key Features:

👶 Multi-Child Support
• Add multiple children
• Quick switch between them
• Individual profiles

📊 Daily Timeline
• All daily events in one place
• Feeding, sleep, diapers, medications
• Charts and statistics

👨‍👩‍👧 Family Sharing
• Share with partner
• Real-time sync
• Everyone sees instant updates

🩺 Health Tracking
• Vaccinations
• Temperature readings
• Doctor visits
• Medical documents

📈 Growth Tracking
• Weight, height, head circumference
• Charts vs WHO standards
• Development tracking

👶‍🍼 Babysitter Marketplace
• Find trusted babysitters
• Book in advance
• Track shifts
• Automatic payment

🌙 Live Activities (iOS)
• See timers on Lock Screen
• Track feeding/sleep/shifts
• Real-time updates

🌓 Full Dark Mode
• Smooth Light/Dark transition
• Easy on eyes at night

🔔 Smart Reminders
• One-time reminders
• Daily/weekly reminders
• For vitamins, meds & more

📱 Works Offline
• No internet needed
• Auto-sync when back online

🔒 Privacy & Security
• All data encrypted
• Full control over sharing
• Time-limited guest access

---

Why CalmParent?

✅ Simple, intuitive interface
✅ Modern, beautiful design
✅ Regular updates
✅ Full Hebrew support
✅ No ads

Parenting is challenging, but CalmParent is here to help you track everything easily.

Download now and start tracking! 👶✨
```

---

# 4. Keywords (100 characters)

**עברית:**
```
תינוק,הורות,הזנה,שינה,חיתולים,בריאות,משפחה,בייביסיטר,מעקב
```

**אנגלית:**
```
baby,tracker,feeding,sleep,diaper,health,family,babysitter,parenting,newborn
```

---

# 5. Privacy Policy & Terms (חובה!)

## 🔒 **למה צריך?**
Apple דורשים Privacy Policy ל**כל** אפליקציה שאוספת מידע.

## 📝 **מה לכלול?**

### **Privacy Policy Template:**
```markdown
# Privacy Policy - CalmParent

Last Updated: [תאריך]

## מידע שאנחנו אוספים

• **פרטי משתמש:** שם, email, תמונת פרופיל
• **פרטי ילדים:** שם, תאריך לידה, מין
• **נתוני שימוש:** אירועי הזנה, שינה, בריאות
• **תמונות:** תמונות פרופיל, מסמכים רפואיים (אופציונלי)

## איך אנחנו משתמשים במידע

• לספק את שירותי האפליקציה
• לסנכרן בין מכשירים
• לשפר את החוויה
• לשלוח תזכורות

## שיתוף מידע

• **לא נמכור** את המידע שלך לצד שלישי
• **לא נשתף** ללא הסכמתך
• **משתפים רק:** עם בני משפחה שהזמנת

## אבטחה

• כל הנתונים מוצפנים
• שמורים ב-Firebase (Google)
• גיבוי אוטומטי

## הזכויות שלך

• צפייה במידע
• מחיקת מידע
• הורדת נתונים
• מחיקת חשבון

## Contact

[your-email@example.com]
```

## 🌐 **איפה לפרסם?**

**אופציות:**

1. **GitHub Pages** (free)
   - צור repo חדש `calmparent-privacy`
   - העלה `privacy.md`
   - Settings → Pages → Enable
   - URL: `https://username.github.io/calmparent-privacy/privacy`

2. **Google Sites** (free)
   - צור site חדש
   - העלה את הטקסט
   - פרסם

3. **Your Website** (אם יש)
   - `https://yourwebsite.com/privacy`

---

# 6. Support URL (חובה!)

צריך דף support/help למשתמשים.

**אופציות:**
1. Email: `support@calmparent.com`
2. Contact form
3. FAQ page
4. GitHub Issues (אם open source)

---

# 📦 **סיכום Checklist**

- [ ] Screenshots (6.7", 6.5", 5.5") - 3-10 per size
- [ ] App Icon 1024x1024
- [ ] App Name + Subtitle
- [ ] Description (עברית + אנגלית)
- [ ] Keywords
- [ ] Privacy Policy (+ URL)
- [ ] Terms of Service (+ URL)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] App Preview Video (optional)

---

**זמן הכנה:** 4-8 שעות עבודה

**💡 Tip:** התחל מ-screenshots - זה הכי חשוב!
