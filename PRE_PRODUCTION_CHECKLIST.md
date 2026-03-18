# 📋 Pre-Production Checklist - CalmParent App

**Last Updated:** 2026-02-16
**Version:** 1.0.7
**Target:** App Store Release

---

## 🔴 **קריטי (חובה לפני Launch)**

### 1. בדיקות פונקציונליות מקיפות

#### ✅ Features Core
- [ ] **Quick Reminder**
  - צור תזכורת חד-פעמית
  - צור תזכורת יומית
  - צור תזכורת שבועית
  - ✅ וודא שנשמר ב-Firestore (תוקן!)
  - בדוק notification מגיע בזמן

- [ ] **BabySitter System**
  - חפש בייביסיטר
  - צור הזמנה חדשה
  - אשר הזמנה (כסיטר)
  - התחל משמרת
  - pause/resume טיימר
  - סיים משמרת - וודא תשלום נכון
  - בדוק chat עם סיטר

- [ ] **Health Tracking**
  - הוסף חיסון
  - הוסף חום
  - הוסף ביקור רופא
  - העלה תמונת מסמך
  - וודא שהכל נשמר ומוצג

- [ ] **Growth Tracking**
  - הוסף מדידה (משקל, אורך, היקף ראש)
  - צפה בגרף growth
  - השווה ל-WHO percentiles

- [ ] **Teeth Tracker**
  - סמן שן כבקעה
  - סמן שן כנפלה
  - וודא timeline מדויק

- [ ] **Daily Timeline**
  - הוסף אירוע הזנה
  - הוסף אירוע שינה
  - הוסף אירוע חיתול
  - הוסף אירוע custom
  - וודא סינון לפי ילד

- [ ] **Family Sharing**
  - צור משפחה חדשה
  - שלח הזמנה למשפחה
  - הצטרף למשפחה קיימת
  - בדוק real-time sync בין מכשירים
  - נהל הרשאות (admin/member/viewer)

- [ ] **Guest Access**
  - צור קוד הזמנה לאורח
  - הצטרף כאורח
  - וודא access מוגבל (לילד ספציפי)
  - בדוק תפוגה אוטומטית

#### 🎨 UI/UX
- [ ] **Dark Mode**
  - עבור בין Light/Dark
  - בדוק כל מסך שנראה טוב
  - **⚠️ HealthCard.tsx צריך תיקון** (50+ hardcoded colors)

- [ ] **Live Activities (iOS)**
  - התחל משמרת בייביסיטר - וודא Live Activity
  - התחל הזנה - וודא Live Activity
  - התחל שינה - וודא Live Activity
  - pause/resume - וודא עדכון ב-Lock Screen

- [ ] **Notifications**
  - שלח push notification
  - וודא שמגיע גם כש-app ברקע
  - בדוק notification permissions

- [ ] **Image Upload**
  - העלה תמונת פרופיל
  - העלה תמונת ילד
  - העלה תמונת מסמך רפואי
  - וודא compression עובד
  - וודא security (הרשאות Firebase)

#### 📱 Device Compatibility
- [ ] **iPhone SE (קטן)** - 4.7"
- [ ] **iPhone 14 Pro Max (גדול)** - 6.7"
- [ ] **iPad** - tablet mode
- [ ] בדוק orientations (portrait בעיקר)

---

## 🟡 **חשוב (רצוי מאוד)**

### 2. אבטחה ו-Performance

- [ ] **Firebase Crashlytics**
  ```bash
  npm install @react-native-firebase/crashlytics
  ```
  - הגדר ב-App.tsx
  - בדוק שקורסים מדווחים

- [ ] **Firebase Analytics**
  - וודא שמוגדר נכון
  - Track key events:
    - `screen_view`
    - `baby_added`
    - `booking_created`
    - `health_event_added`
    - `family_created`

- [ ] **Security Review**
  - ✅ Firestore Rules deployed
  - בדוק אין API keys חשופים
  - וודא sensitive data מוצפן

- [ ] **Performance**
  - בדוק loading times
  - וודא אין memory leaks (✅ תוקן)
  - בדוק offline support
  - Cache images

### 3. תוכן ומשפטי

- [ ] **Privacy Policy**
  - כתוב Privacy Policy (נדרש ל-App Store)
  - העלה ל-https://yourwebsite.com/privacy
  - קישור ב-Settings

- [ ] **Terms of Service**
  - כתוב Terms of Service
  - העלה ל-https://yourwebsite.com/terms
  - קישור ב-Settings

- [ ] **COPPA Compliance**
  - האפליקציה מיועדת להורים, לא לילדים
  - וודא בApp Store Connect

---

## 🟢 **App Store Preparation**

### 4. App Store Assets

- [ ] **Screenshots** (נדרש!)
  - 6.7" (iPhone 14 Pro Max) - 3-10 screenshots
  - 6.5" (iPhone 11 Pro Max) - 3-10 screenshots
  - 5.5" (iPhone 8 Plus) - 3-10 screenshots
  - iPad Pro 12.9" - 3-10 screenshots
  - **Tip:** צלם את המסכים הכי יפים:
    - Home Screen עם Timeline
    - Quick Actions
    - Health Tracking
    - Family Sharing
    - BabySitter booking

- [ ] **App Icon**
  - 1024x1024 PNG (no alpha)
  - וודא נראה טוב בכל הגדלים
  - בדוק ב-App Icon Generator

- [ ] **App Preview Video** (אופציונלי)
  - 15-30 שניות
  - הצג features עיקריים
  - Silent או עם מוזיקה

### 5. App Store Listing

- [ ] **App Name**
  - עברית: "CalmParent - יומן תינוק חכם"
  - אנגלית: "CalmParent - Smart Baby Tracker"
  - מקס 30 תווים

- [ ] **Subtitle**
  - עברית: "מעקב הזנה, שינה, בריאות ועוד"
  - אנגלית: "Track feeding, sleep, health & more"
  - מקס 30 תווים

- [ ] **Description**
  - כתוב תיאור מלא (4000 תווים)
  - הדגש features:
    - 📊 Daily Timeline
    - 👶 Multi-child support
    - 👨‍👩‍👧 Family sharing
    - 🩺 Health tracking
    - 👶‍🍼 BabySitter marketplace
    - 🌙 Live Activities
    - 🌓 Dark Mode

- [ ] **Keywords**
  - baby, tracker, feeding, sleep, health, family, parent
  - (מקס 100 תווים)

- [ ] **Support URL**
  - https://yourwebsite.com/support

- [ ] **Marketing URL** (אופציונלי)
  - https://yourwebsite.com

### 6. App Store Connect Setup

- [ ] **Bundle ID**
  - וודא: `com.harel.calmparentapp`

- [ ] **Certificates & Profiles**
  ```bash
  eas credentials
  ```
  - Distribution Certificate
  - Push Notification Certificate
  - Provisioning Profile

- [ ] **App Store Information**
  - Category: Health & Fitness / Parenting
  - Age Rating: 4+
  - Copyright: 2026 [Your Name]

---

## 🚀 **Build & Deploy**

### 7. Production Build

- [ ] **Update Version**
  ```json
  // app.json
  "version": "1.0.8",
  "ios": {
    "buildNumber": "4"
  }
  ```

- [ ] **Build**
  ```bash
  eas build --platform ios --profile production
  ```

- [ ] **Download IPA**
  - Test on real device via TestFlight

### 8. TestFlight Beta Testing

- [ ] **Add Beta Testers**
  - Internal: 5-10 people
  - External: 20-50 people (אופציונלי)

- [ ] **Beta Testing Checklist**
  - שלח הוראות למשתתפים
  - בקש feedback על:
    - Bugs
    - UX issues
    - Performance
    - Missing features

- [ ] **Fix Beta Bugs**
  - תעדוף לפי severity
  - תקן critical bugs

### 9. Final Review

- [ ] **Code Review**
  - ✅ אין console.log (תוקן!)
  - ✅ הכל ב-logger
  - ✅ אין hardcoded secrets
  - ✅ Firebase Rules deployed

- [ ] **Manual Testing**
  - עבור על כל feature פעם אחרונה
  - בדוק edge cases

- [ ] **Performance Check**
  - App launch time < 3s
  - No crashes
  - No memory leaks (✅)

---

## 📝 **Submission Checklist**

### 10. Submit to App Store

- [ ] **Upload to App Store Connect**
  ```bash
  eas submit --platform ios
  ```

- [ ] **Fill App Information**
  - Screenshots ✅
  - Description ✅
  - Keywords ✅
  - Support URL ✅
  - Privacy Policy URL ✅

- [ ] **App Review Information**
  - Demo Account (if needed)
  - Notes to reviewer
  - Contact info

- [ ] **Submit for Review**
  - 🎉 לחץ Submit!
  - זמן review: 1-3 ימים בדרך כלל

---

## ✅ **Post-Launch**

- [ ] **Monitor Crashes** (Crashlytics)
- [ ] **Monitor Analytics** (Firebase)
- [ ] **Respond to Reviews**
- [ ] **Plan v1.1** features

---

## 🎯 **סטטוס נוכחי**

| קטגוריה | % הושלם |
|---------|---------|
| Core Features | ✅ 100% |
| Code Quality | ✅ 100% |
| Dark Mode | ⚠️ 90% |
| Testing | ❌ 0% |
| App Store Assets | ❌ 0% |
| Security | ⚠️ 80% |

---

**🎯 המטרה: להשלים 100% לפני Launch!**

**זמן משוער:** 3-5 ימים של עבודה רצופה

**אם תצטרך עזרה - פינג אותי!** 🚀
