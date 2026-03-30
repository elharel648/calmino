import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const db = admin.firestore();

// ══════════════════════════════════════════════════════════════════════════════
// EOF

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES — HTML email generator for branded Calmino emails
// ══════════════════════════════════════════════════════════════════════════════

function calminoEmailTemplate(heTitle: string, heBody: string, enTitle: string = '', enBody: string = ''): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="he">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta name="color-scheme" content="light"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
  </style>
  <title>${heTitle} | ${enTitle}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Heebo', 'Inter', -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 12px 40px rgba(108,92,231,0.08), 0 4px 12px rgba(0,0,0,0.04);">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#6C5CE7 0%,#8c7df7 60%,#b39dfe 100%);padding:48px 32px 40px;text-align:center;" role="banner">
          <img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/48/28/82/4828828b-b804-996c-0e5d-ff89f9e1fd4d/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg" alt="Calmino Logo" width="84" height="84" style="border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); border: 2px solid rgba(255,255,255,0.8); margin-bottom: 20px; display: inline-block;" />
          <h1 style="color:#ffffff;margin:0;font-size:38px;font-weight:800;letter-spacing:-1px;font-family:'Inter', sans-serif;text-shadow:0 2px 8px rgba(0,0,0,0.1);">Calmino</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;font-weight:500;letter-spacing:0.5px;" dir="rtl" lang="he">ההורות שלך, בקצב שלך.</p>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;font-weight:400;font-family:'Inter', sans-serif;letter-spacing:0.2px;" dir="ltr" lang="en">Parenting, at your pace.</p>
        </td>
      </tr>

      <!-- DIVIDER -->
      <tr><td style="height:4px;background:linear-gradient(90deg,#a29bfe,#dfe6e9,#a29bfe);"></td></tr>

      <!-- CONTENT WRAPPER -->
      <tr>
        <td style="padding:48px 40px 40px;">
          <!-- HEBREW SECTION -->
          <div dir="rtl" lang="he" style="text-align:right;">
            <h2 style="color:#0f172a;margin:0 0 24px;font-size:26px;font-weight:800;line-height:1.3;">${heTitle}</h2>
            <div style="color:#334155;font-size:16px;line-height:1.8;font-weight:400;">
              ${heBody}
            </div>
          </div>

          ${enTitle ? `
          <!-- SEPARATOR -->
          <div style="margin:48px 0 40px;position:relative;text-align:center;border-top:1px dashed #cbd5e1;">
            <span style="background:#ffffff;color:#94a3b8;font-size:11px;font-weight:700;padding:0 16px;position:relative;top:-9px;letter-spacing:1.5px;font-family:'Inter', sans-serif;text-transform:uppercase;">✦ English Below ✦</span>
          </div>

          <!-- ENGLISH SECTION -->
          <div dir="ltr" lang="en" style="text-align:left;font-family:'Inter', sans-serif;">
            <h2 style="color:#0f172a;margin:0 0 24px;font-size:24px;font-weight:800;line-height:1.3;">${enTitle}</h2>
            <div style="color:#334155;font-size:16px;line-height:1.8;font-weight:400;">
              ${enBody}
            </div>
          </div>` : ''}
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#F8FAFC;padding:32px 40px;text-align:center;border-top:1px solid #E2E8F0;" role="contentinfo">
          <p style="margin:0;color:#94A3B8;font-size:13px;font-family:'Inter', sans-serif;font-weight:500;">Calmino &copy; ${year}</p>
          <p style="margin:8px 0 0;color:#94A3B8;font-size:13px;font-weight:400;">
            <a href="mailto:calminogroup@gmail.com" style="color:#6C5CE7;text-decoration:none;font-weight:600;">calminogroup@gmail.com</a>
          </p>
          <p style="margin:24px 0 0;color:#CBD5E1;font-size:11px;letter-spacing:0.2px;">
            נשלח באהבה מצוות Calmino 🤍
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 0️⃣ SEND VERIFICATION EMAIL — Branded replacement for Firebase's plain email
// ══════════════════════════════════════════════════════════════════════════════

export const sendVerificationEmail = onCall(async (request) => {
    // Accept explicit email payload to bypass Android Native token initialization hang during Firebase Auth signup
    const email = request.auth?.token?.email || request.data?.email;
    if (!email) throw new HttpsError('invalid-argument', 'יש לספק כתובת מייל');

    const userRecord = await admin.auth().getUserByEmail(email);

    if (userRecord.emailVerified) {
        return { success: true, alreadyVerified: true };
    }

    // Generate a Firebase verification link (valid 1 hour)
    const verificationLink = await admin.auth().generateEmailVerificationLink(email, {
        url: 'https://baby-app-42b3b.firebaseapp.com/__/auth/action',
    });

    const displayName = userRecord.displayName || 'הורה יקר/ה';

    const heBodyContent = `
        <p style="margin:0 0 16px;">שלום <strong style="color:#0f172a;font-weight:700;">${displayName}</strong> 👋</p>
        <p style="margin:0 0 24px;">נשאר רק צעד אחד קטן — לחצו על הכפתור למטה כדי לאמת את כתובת המייל שלכם, ולהתחיל להשתמש ב-Calmino.</p>

        <div style="text-align:center;margin:40px 0;">
            <a href="${verificationLink}" role="button" aria-label="אמתו את המייל שלכם ב-Calmino"
               style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,92,231,0.25), inset 0 2px 0 rgba(255,255,255,0.2);border:1px solid #5F50E0;">
                אימות המייל החשבון
            </a>
        </div>

        <div style="background:#F8FAFC;border-radius:16px;padding:20px;text-align:center;margin:32px 0 0;border:1px solid #F1F5F9;">
            <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">
                הקישור מאובטח ותקף לשעה אחת.<br/>
                לא נרשמתם ל-Calmino? אפשר להתעלם ממייל זה בבטחה.
            </p>
        </div>

        <div style="margin-top:24px;text-align:center;">
            <p style="color:#94A3B8;font-size:12px;margin:0 0 8px;">הכפתור לא עובד? העתיקו והדביקו את הקישור בדפדפן:</p>
            <p style="color:#6C5CE7;font-size:11px;word-break:break-all;margin:0;direction:ltr;background:#F1F5F9;padding:12px;border-radius:8px;">${verificationLink}</p>
        </div>`;

    const enBodyContent = `
        <p style="margin:0 0 16px;">Hi <strong style="color:#0f172a;font-weight:700;">${displayName}</strong> 👋</p>
        <p style="margin:0 0 24px;">Just one small step left — click the button below to verify your email address and start using Calmino.</p>

        <div style="text-align:center;margin:40px 0;">
            <a href="${verificationLink}" role="button" aria-label="Verify your email address for Calmino"
               style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,92,231,0.25), inset 0 2px 0 rgba(255,255,255,0.2);border:1px solid #5F50E0;">
                Verify Email Address
            </a>
        </div>

        <div style="background:#F8FAFC;border-radius:16px;padding:20px;text-align:center;margin:32px 0 0;border:1px solid #F1F5F9;">
            <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">
                This link is secure and expires in 1 hour.<br/>
                Didn't sign up for Calmino? You can safely ignore this email.
            </p>
        </div>

        <div style="margin-top:24px;text-align:center;">
            <p style="color:#94A3B8;font-size:12px;margin:0 0 8px;">Button not working? Copy and paste this link in your browser:</p>
            <p style="color:#6C5CE7;font-size:11px;word-break:break-all;margin:0;direction:ltr;background:#F1F5F9;padding:12px;border-radius:8px;">${verificationLink}</p>
        </div>`;

    await db.collection('mail').add({
        to: [email],
        replyTo: 'calminogroup@gmail.com',
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Calmino App',
            'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
        },
        message: {
            subject: 'אמתו את המייל שלכם ל-Calmino | Verify your Calmino email',
            text: `שלום ${displayName}, לחצו על הקישור הבא כדי לאמת את המייל שלכם: ${verificationLink}\n\nHi ${displayName}, click the link below to verify your email: ${verificationLink}`,
            html: calminoEmailTemplate('אימות אחד — וסיימנו!', heBodyContent, 'Almost there — verify your email!', enBodyContent),
        },
    });

    console.log(`✅ Branded verification email queued for ${email}`);
    return { success: true };
});

// ══════════════════════════════════════════════════════════════════════════════
// 0b️⃣ SEND PASSWORD RESET EMAIL — Branded replacement for Firebase's plain reset
// ══════════════════════════════════════════════════════════════════════════════

export const sendPasswordResetEmailBranded = onCall(async (request) => {
    const email = request.data?.email;
    if (!email) throw new HttpsError('invalid-argument', 'נדרשת כתובת מייל');

    // Verify user exists (don't leak info — just silently succeed if not found)
    let displayName = '';
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        displayName = userRecord.displayName || '';
    } catch {
        // User not found — return success anyway to avoid email enumeration
        return { success: true };
    }

    const resetLink = await admin.auth().generatePasswordResetLink(email);

    const heBody = `
        <p style="margin:0 0 16px;">
            ${displayName ? `שלום <strong style="color:#0f172a;font-weight:700;">${displayName}</strong> 👋<br/><br/>` : ''}
            קיבלנו בקשה לאיפוס הסיסמא לחשבון ה-Calmino שלך.<br/>
            לחצו על הכפתור למטה כדי לבחור סיסמא חדשה.
        </p>
        <div style="text-align:center;margin:40px 0;">
            <a href="${resetLink}"
               style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,92,231,0.25), inset 0 2px 0 rgba(255,255,255,0.2);border:1px solid #5F50E0;"
               aria-label="איפוס סיסמא עבור Calmino">
                איפוס סיסמא
            </a>
        </div>
        
        <div style="background:#F8FAFC;border-radius:16px;padding:20px;text-align:center;margin:32px 0 0;border:1px solid #F1F5F9;">
            <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">
                הקישור מאובטח ותקף ל-24 שעות.<br/>
                לא ביקשת איפוס סיסמא? אין בעיה, אפשר פשוט להתעלם ממייל זה בבטחה, החשבון שלך מוגן.
            </p>
        </div>`;

    const enBody = `
        <p style="margin:0 0 16px;">
            ${displayName ? `Hi <strong style="color:#0f172a;font-weight:700;">${displayName}</strong> 👋<br/><br/>` : ''}
            We received a request to reset your Calmino password.<br/>
            Click the button below to choose a new, secure password.
        </p>
        <div style="text-align:center;margin:40px 0;">
            <a href="${resetLink}"
               style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,92,231,0.25), inset 0 2px 0 rgba(255,255,255,0.2);border:1px solid #5F50E0;"
               aria-label="Reset your Calmino password">
                Reset Password
            </a>
        </div>
        
        <div style="background:#F8FAFC;border-radius:16px;padding:20px;text-align:center;margin:32px 0 0;border:1px solid #F1F5F9;">
            <p style="color:#64748B;font-size:13px;line-height:1.6;margin:0;">
                This link is secure and expires in 24 hours.<br/>
                Didn't request a password reset? No problem, you can safely ignore this email — your account is protected.
            </p>
        </div>`;

    await db.collection('mail').add({
        to: [email],
        replyTo: 'calminogroup@gmail.com',
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Calmino App',
            'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
        },
        message: {
            subject: 'איפוס סיסמא - Calmino | Reset your Calmino password',
            text: `לאיפוס הסיסמא לחצו: ${resetLink}\n\nTo reset your password click: ${resetLink}`,
            html: calminoEmailTemplate('איפוס סיסמא באפליקציה', heBody, 'Reset your password', enBody),
        },
    });

    console.log(`✅ Branded password reset email queued for ${email}`);
    return { success: true };
});

// ══════════════════════════════════════════════════════════════════════════════
// 1️⃣ WELCOME EMAIL — Sent when a new user document is created in Firestore
// ══════════════════════════════════════════════════════════════════════════════

export const sendWelcomeEmail = onDocumentCreated('users/{userId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const userData = snapshot.data();
    const email = userData.email;
    if (!email) return; // No email, skip

    const displayName = userData.displayName || userData.name || 'הורה יקר/ה';

    const bodyContent = `
        <p style="margin:0 0 16px;color:#334155;font-size:16px;">
            שלום <strong style="color:#0f172a;font-weight:700;">${displayName}</strong> 👋
        </p>
        <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.8;">
            אנחנו כל כך שמחים שהצטרפת ל-<strong style="color:#6C5CE7;font-weight:700;">Calmino</strong>!<br/>
            אנחנו יודעים שהימים (והלילות...) הראשונים עם התינוק יכולים להיות עמוסים ומבלבלים. המטרה שלנו היא פשוטה: לעזור לך לרכז את כל המידע במקום אחד, כדי שתוכלי להתמקד במה שחשוב באמת – בתינוק שלך.
        </p>

        <div style="background:#F8FAFC;border-radius:16px;padding:24px;margin:32px 0;border:1px solid #F1F5F9;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
            <p style="color:#0f172a;font-weight:800;margin:0 0 16px;font-size:17px;">הנה מה שאפשר להתחיל לעשות כבר עכשיו:</p>
            <p style="color:#475569;margin:12px 0;font-size:15px;line-height:1.6;">🍼 <strong style="color:#334155;">מעקב יומי חכם</strong> – מתעדים האכלות, שינה והחתלות בקליק אחד. בלי דפים ובלי לנסות לזכור הכל בראש.</p>
            <p style="color:#475569;margin:12px 0;font-size:15px;line-height:1.6;">👶 <strong style="color:#334155;">פרופיל אישי לתינוק</strong> – יוצרים עולם שלם שמוקדש לקטנטנים שלכם, כולל תמונות ופרטים אישיים.</p>
            <p style="color:#475569;margin:12px 0;font-size:15px;line-height:1.6;">👨‍👩‍👧 <strong style="color:#334155;">שיתוף משפחתי</strong> – לא חייבים לעשות הכל לבד! מזמינים את בן/בת הזוג או הסבתא לצפייה ועדכון בזמן אמת.</p>
            <p style="color:#475569;margin:12px 0;font-size:15px;line-height:1.6;">📊 <strong style="color:#334155;">דו"חות ותובנות</strong> – מגלים את הדפוסים של התינוק ומבינים טוב יותר את הצרכים שלו.</p>
            <p style="color:#475569;margin:12px 0;font-size:15px;line-height:1.6;">📏 <strong style="color:#334155;">מעקב גדילה מקצועי</strong> – מוודאים שהכל תקין עם גרפים מדויקים לפי תקני ה-WHO (ארגון הבריאות העולמי).</p>
        </div>

        <p style="color:#334155;font-size:16px;margin:32px 0 16px;font-weight:600;text-align:center;">מוכנה להתחיל?</p>

        <div style="text-align:center;margin:24px 0 48px;">
            <a href="https://calmino.co.il" role="button" aria-label="יצירת פרופיל ראשון לתינוק"
               style="display:inline-block;background:linear-gradient(135deg,#6C5CE7 0%,#a29bfe 100%);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:50px;font-size:17px;font-weight:800;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(108,92,231,0.25), inset 0 2px 0 rgba(255,255,255,0.2);border:1px solid #5F50E0;">
                יצירת פרופיל ראשון לתינוק
            </a>
        </div>

        <p style="color:#475569;font-size:15px;line-height:1.8;margin:0 0 12px;">
            יש לך שאלה? הצעה? או סתם רוצה לשתף?<br/>
            אנחנו כאן בשבילך. פשוט תעני למייל הזה או כתבי לנו לכתובת:<br/>
            📩 <a href="mailto:calminogroup@gmail.com" style="color:#6C5CE7;font-weight:600;text-decoration:none;">calminogroup@gmail.com</a>
        </p>

        <p style="color:#0f172a;font-size:15px;line-height:1.8;margin:24px 0 0;font-weight:500;">
            באהבה,<br/>צוות Calmino 🤍
        </p>`;

    await db.collection('mail').add({
        to: [email],
        replyTo: 'calminogroup@gmail.com',
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Calmino App',
            'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
        },
        message: {
            subject: `הצעד הראשון לשקט נפשי מתחיל כאן 👣 | ברוכה הבאה ל-Calmino, ${displayName}!`,
            text: `שלום ${displayName}, שמחים שהצטרפת ל-Calmino! פתחו את האפליקציה כדי להתחיל.`,
            html: calminoEmailTemplate('ברוכים הבאים למשפחה 🎉', bodyContent),
        },
    });

    console.log(`✅ Welcome email queued for ${email}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// 2️⃣ FAMILY INVITE EMAIL — Sent when a parent creates a family invite
// ══════════════════════════════════════════════════════════════════════════════

export const onFamilyInviteCreated = onDocumentCreated('invites/{inviteCode}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const invite = snapshot.data();
    const inviteCode = event.params.inviteCode;

    // Only send email for family invites that have a target email
    const targetEmail = invite.targetEmail || invite.email;
    if (!targetEmail) {
        console.log('No target email in invite, skipping email');
        return;
    }

    // Get the inviter's name
    const creatorId = invite.createdBy;
    let creatorName = 'מישהו';
    try {
        const creatorDoc = await db.doc(`users/${creatorId}`).get();
        creatorName = creatorDoc.data()?.displayName || creatorDoc.data()?.name || 'מישהו';
    } catch (e) { /* fallback to default */ }

    // Determine if this is a guest/babysitter invite or family invite
    const isGuestInvite = invite.type === 'guest' || invite.childId;

    if (isGuestInvite) {
        // ── 3️⃣ BABYSITTER GUEST INVITE ──
        let childName = 'התינוק';
        if (invite.childId) {
            try {
                const childDoc = await db.doc(`babies/${invite.childId}`).get();
                childName = childDoc.data()?.name || 'התינוק';
            } catch (e) { /* fallback */ }
        }

        const bodyContent = `
            <p style="color:#636e72;line-height:1.8;font-size:15px;"><strong>${creatorName}</strong> הזמין/ה אותך לשמור על <strong>${childName}</strong> דרך Calmino!</p>
            
            <div style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
                <p style="color:rgba(255,255,255,0.85);margin:0 0 8px;font-size:14px;">קוד הגישה שלך:</p>
                <p style="color:#ffffff;margin:0;font-size:36px;font-weight:700;letter-spacing:8px;">${inviteCode}</p>
                <p style="color:rgba(255,255,255,0.7);margin:12px 0 0;font-size:13px;">⏰ הקוד תקף ל-24 שעות</p>
            </div>
            
            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="color:#2d3436;font-weight:600;margin:0 0 12px;">איך להצטרף:</p>
                <p style="color:#636e72;margin:6px 0;">1. הורידו את אפליקציית <strong>Calmino</strong></p>
                <p style="color:#636e72;margin:6px 0;">2. הירשמו וגשו להגדרות</p>
                <p style="color:#636e72;margin:6px 0;">3. לחצו "הצטרף עם קוד" והזינו את הקוד למעלה</p>
            </div>`;

        await db.collection('mail').add({
            to: [targetEmail],
            headers: {
                'X-Priority': '1',
                'X-Mailer': 'Calmino App',
                'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
            },
            message: {
                subject: `${creatorName} הזמין/ה אותך לשמור על ${childName} - Calmino`,
                text: `${creatorName} הזמין/ה אותך לשמור על ${childName} דרך Calmino. קוד הגישה: ${inviteCode}. הורד את האפליקציה והזן את הקוד.`,
                html: calminoEmailTemplate('!קיבלת הזמנה לשמרטפות', bodyContent),
            },
        });

        console.log(`✅ Babysitter invite email queued for ${targetEmail}`);
    } else {
        // ── FAMILY MEMBER INVITE ──
        const bodyContent = `
            <p style="color:#636e72;line-height:1.8;font-size:15px;"><strong>${creatorName}</strong> הזמין/ה אותך להצטרף למשפחה ב-Calmino!</p>
            <p style="color:#636e72;line-height:1.8;font-size:15px;">כשתצטרפו, תוכלו לראות את כל המידע על התינוק בזמן אמת — האכלה, שינה, גדילה, ועוד.</p>
            
            <div style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
                <p style="color:rgba(255,255,255,0.85);margin:0 0 8px;font-size:14px;">קוד ההצטרפות:</p>
                <p style="color:#ffffff;margin:0;font-size:36px;font-weight:700;letter-spacing:8px;">${inviteCode}</p>
            </div>
            
            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;">
                <p style="color:#2d3436;font-weight:600;margin:0 0 12px;">איך להצטרף:</p>
                <p style="color:#636e72;margin:6px 0;">1. הורידו את אפליקציית <strong>Calmino</strong></p>
                <p style="color:#636e72;margin:6px 0;">2. הירשמו וגשו להגדרות</p>
                <p style="color:#636e72;margin:6px 0;">3. לחצו "הצטרף למשפחה" והזינו את הקוד</p>
            </div>`;

        await db.collection('mail').add({
            to: [targetEmail],
            headers: {
                'X-Priority': '1',
                'X-Mailer': 'Calmino App',
                'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
            },
            message: {
                subject: `${creatorName} הזמין/ה אותך להצטרף למשפחה ב-Calmino`,
                text: `${creatorName} הזמין/ה אותך להצטרף למשפחה ב-Calmino. קוד ההצטרפות: ${inviteCode}. הורד את האפליקציה והזן את הקוד.`,
                html: calminoEmailTemplate('!הוזמנת להצטרף למשפחה', bodyContent),
            },
        });

        console.log(`✅ Family invite email queued for ${targetEmail}`);
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// 4️⃣ NEW REVIEW EMAIL — Sent to babysitter when a parent leaves a review
// ══════════════════════════════════════════════════════════════════════════════

export const onReviewCreated = onDocumentCreated('reviews/{reviewId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const review = snapshot.data();
    const sitterId = review.babysitterId || review.sitterId;
    if (!sitterId) return;

    // Get sitter email
    const sitterDoc = await db.doc(`users/${sitterId}`).get();
    if (!sitterDoc.exists) return;

    const sitterEmail = sitterDoc.data()?.email;
    if (!sitterEmail) return;

    const sitterName = sitterDoc.data()?.displayName || sitterDoc.data()?.name || 'בייביסיטר';
    const parentName = review.parentName || 'הורה';
    const rating = review.rating || 5;
    const comment = review.comment || review.text || '';

    // Generate stars
    const stars = '⭐'.repeat(Math.min(rating, 5));

    const bodyContent = `
        <p style="color:#636e72;line-height:1.8;font-size:15px;">שלום <strong>${sitterName}</strong> 👋</p>
        <p style="color:#636e72;line-height:1.8;font-size:15px;"><strong>${parentName}</strong> השאיר/ה לך דירוג חדש!</p>
        
        <div style="background:#f8f9fa;border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
            <p style="font-size:32px;margin:0;">${stars}</p>
            <p style="color:#2d3436;font-size:18px;font-weight:600;margin:12px 0 0;">${rating}/5</p>
            ${comment ? `<p style="color:#636e72;font-style:italic;margin:16px 0 0;font-size:15px;">"${comment}"</p>` : ''}
        </div>
        
        <p style="color:#636e72;line-height:1.8;font-size:15px;">פתחו את האפליקציה כדי לראות את כל הדירוגים שלכם.</p>
        <p style="color:#636e72;line-height:1.8;font-size:15px;">המשיכו ככה! 💪</p>`;

    await db.collection('mail').add({
        to: [sitterEmail],
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Calmino App',
            'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
        },
        message: {
            subject: `קיבלת דירוג חדש מ${parentName}! - Calmino`,
            text: `שלום ${sitterName}, ${parentName} השאיר/ה לך דירוג ${rating}/5. ${comment ? `"${comment}"` : ''} פתחו את Calmino לפרטים.`,
            html: calminoEmailTemplate('!קיבלת דירוג חדש', bodyContent),
        },
    });

    console.log(`✅ Review email queued for sitter ${sitterId}`);
});

// ══════════════════════════════════════════════════════════════════════════════
// 5️⃣ CHAT EMAIL — Sent when user receives a message and is offline
// ══════════════════════════════════════════════════════════════════════════════

// NOTE: Chat email logic is merged into the existing onChatMessageCreated function below
// to avoid duplicate Firestore triggers on the same path.

/**
 * joinFamilyByCode - Cloud Function (server-side) for joining a family by invite code.
 *
 * Moves the family lookup QUERY off the client entirely, so /families can be
 * locked down to members-only reads in Firestore rules.
 *
 * Params:
 *   code   - 6-digit invite code
 *   force  - if true, auto-leave current family before joining (user already confirmed)
 *
 * Returns:
 *   { success, message, familyId, isGuest }
 *   OR { success: false, requiresLeave: true, currentFamilyName } when force is needed
 */
export const joinFamilyByCode = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'יש להתחבר למערכת');

    const { code, force = false } = request.data as { code: string; force?: boolean };
    if (!code || code.trim().length !== 6) {
        throw new HttpsError('invalid-argument', 'קוד לא תקין');
    }

    const trimmedCode = code.trim();

    // ── Step 1: Check guest invite (invites/{code}) ──────────────────────────
    const inviteRef = db.doc(`invites/${trimmedCode}`);
    const inviteSnap = await inviteRef.get();

    if (inviteSnap.exists) {
        const invite = inviteSnap.data()!;

        const expiresAt = invite.expiresAt?.toDate
            ? invite.expiresAt.toDate()
            : new Date(invite.expiresAt);

        if (new Date() > expiresAt) {
            throw new HttpsError('deadline-exceeded', 'קוד ההזמנה פג תוקף');
        }
        if (invite.used) {
            throw new HttpsError('already-exists', 'קוד ההזמנה כבר נוצל');
        }
        if (invite.createdBy === uid) {
            throw new HttpsError('permission-denied', 'לא ניתן להצטרף להזמנה שיצרת בעצמך');
        }

        const { familyId, childId } = invite;
        const familySnap = await db.doc(`families/${familyId}`).get();
        if (!familySnap.exists) throw new HttpsError('not-found', 'המשפחה לא נמצאה');

        const familyData = familySnap.data()!;
        if (familyData.members?.[uid]) {
            return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
        }

        // Handle existing family membership
        const userSnap = await db.doc(`users/${uid}`).get();
        const existingFamilyId = userSnap.data()?.familyId;
        if (existingFamilyId && existingFamilyId !== familyId) {
            if (!force) {
                const existingFamilySnap = await db.doc(`families/${existingFamilyId}`).get();
                const existingFamilyName = existingFamilySnap.data()?.babyName || 'הקיימת';
                return {
                    success: false,
                    requiresLeave: true,
                    currentFamilyName: existingFamilyName,
                };
            }
            // force=true: leave current family first
            await _leaveFamily(uid, existingFamilyId);
        }

        const userRecord = await admin.auth().getUser(uid);
        const expiresAt24h = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await db.doc(`families/${familyId}`).update({
            [`members.${uid}`]: {
                role: 'guest',
                name: userRecord.displayName || 'אורח',
                email: userRecord.email || '',
                photoURL: userRecord.photoURL || null,
                joinedAt: FieldValue.serverTimestamp(),
                accessLevel: 'actions_only',
                historyAccessDays: 1,
                invitedBy: invite.createdBy,
                expiresAt: expiresAt24h,
            },
        });

        await db.doc(`users/${uid}`).set(
            {
                guestFamilyId: familyId, // Used by Firestore rules for guest read access
                guestChildIds: FieldValue.arrayUnion(childId), // Used by rules for fast 1-get access check
                guestAccess: {
                    [familyId]: {
                        role: 'guest',
                        childId,
                        accessLevel: 'actions_only',
                        joinedAt: FieldValue.serverTimestamp(),
                        expiresAt: expiresAt24h,
                    },
                },
            },
            { merge: true }
        );

        await inviteRef.update({
            used: true,
            usedBy: uid,
            usedAt: FieldValue.serverTimestamp(),
        });

        const childSnap = await db.doc(`babies/${childId}`).get();
        const childName = childSnap.exists ? (childSnap.data()?.name || 'התינוק') : 'התינוק';

        return {
            success: true,
            message: `הצטרפת כאורח ל${childName}! גישה ל-24 שעות בלבד 🎉`,
            familyId,
            isGuest: true,
        };
    }

    // ── Step 2: Check family invite code (families collection query) ──────────
    const familyQuery = await db
        .collection('families')
        .where('inviteCode', '==', trimmedCode)
        .limit(1)
        .get();

    if (familyQuery.empty) {
        throw new HttpsError('not-found', 'קוד הזמנה לא תקין');
    }

    const familyDoc = familyQuery.docs[0];
    const familyId = familyDoc.id;
    const familyData = familyDoc.data();

    if (familyData.members?.[uid]) {
        return { success: false, message: 'אתה כבר חלק מהמשפחה הזו' };
    }

    // Handle existing family membership
    const userSnap = await db.doc(`users/${uid}`).get();
    const existingFamilyId = userSnap.data()?.familyId;
    if (existingFamilyId && existingFamilyId !== familyId) {
        if (!force) {
            const existingFamilySnap = await db.doc(`families/${existingFamilyId}`).get();
            const existingFamilyName = existingFamilySnap.data()?.babyName || 'הקיימת';
            return {
                success: false,
                requiresLeave: true,
                currentFamilyName: existingFamilyName,
            };
        }
        await _leaveFamily(uid, existingFamilyId);
    }

    const userRecord = await admin.auth().getUser(uid);

    await db.doc(`families/${familyId}`).update({
        [`members.${uid}`]: {
            role: 'member',
            name: userRecord.displayName || 'משתמש חדש',
            email: userRecord.email || '',
            photoURL: userRecord.photoURL || null,
            joinedAt: FieldValue.serverTimestamp(),
            accessLevel: 'full',
        },
    });

    await db.doc(`users/${uid}`).set({ familyId }, { merge: true });

    return {
        success: true,
        message: `הצטרפת למשפחת ${familyData.babyName || 'המשפחה'}! גישה מלאה לכל הילדים 🎉`,
        familyId,
        isGuest: false,
    };
});

/**
 * Internal helper: remove uid from a family (handles last-admin edge case).
 */
async function _leaveFamily(uid: string, familyId: string): Promise<void> {
    const familyRef = db.doc(`families/${familyId}`);

    await db.runTransaction(async (tx) => {
        const familySnap = await tx.get(familyRef);
        if (!familySnap.exists) return;

        const data = familySnap.data()!;
        const members: Record<string, { role: string }> = data.members || {};

        const isLastAdmin =
            members[uid]?.role === 'admin' &&
            Object.values(members).filter((m) => m.role === 'admin').length === 1;

        if (isLastAdmin) {
            // Promote another member to admin before leaving
            const otherMember = Object.entries(members).find(([id]) => id !== uid);
            if (otherMember) {
                tx.update(familyRef, {
                    [`members.${otherMember[0]}.role`]: 'admin',
                    [`members.${uid}`]: FieldValue.delete(),
                });
            } else {
                // Last member — delete family
                tx.delete(familyRef);
            }
        } else {
            tx.update(familyRef, {
                [`members.${uid}`]: FieldValue.delete(),
            });
        }

        tx.update(db.doc(`users/${uid}`), { familyId: FieldValue.delete() });
    });
}

/**
 * ── BACKEND PUSH NOTIFICATIONS ──────────────────────────────────────────────
 * Cloud Functions for reliable push notification delivery.
 */

export const onChatMessageCreated = onDocumentCreated('chats/{chatId}/messages/{messageId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const messageData = snapshot.data();
    const senderId = messageData.senderId;
    const text = messageData.text || '';

    const chatId = event.params.chatId;

    // Get chat data to find the receiver
    const chatDoc = await db.doc(`chats/${chatId}`).get();
    if (!chatDoc.exists) return;

    const chatData = chatDoc.data()!;
    const receiverId = chatData.participants.find((id: string) => id !== senderId);

    if (!receiverId) return;

    // Get sender name
    const senderName = chatData.parentId === senderId ? chatData.parentName : chatData.sitterName;

    // Get receiver data
    const userDoc = await db.doc(`users/${receiverId}`).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data()!;
    const pushToken = userData.pushToken;

    // ── PUSH NOTIFICATION ──
    if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
        try {
            const message = {
                to: pushToken,
                sound: 'default',
                title: `הודעה חדשה מ${senderName}`,
                body: text.length > 50 ? text.substring(0, 50) + '...' : text,
                data: { type: 'chat_message', chatId },
                channelId: 'chat',
            };

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });

            if (response.ok) {
                console.log(`Push notification sent successfully to ${receiverId} for chat ${chatId}`);
            } else {
                console.error(`Push notification HTTP error: ${response.status}`, await response.text());
            }
        } catch (error) {
            console.error('Error sending push notification for chat:', error);
        }
    }

    // ── EMAIL (only if user is offline) ──
    const presenceDoc = await db.doc(`presence/${receiverId}`).get();
    const isOnline = presenceDoc.exists && presenceDoc.data()?.online === true;

    if (!isOnline && userData.email) {
        const previewText = text.length > 100 ? text.substring(0, 100) + '...' : text;

        const bodyContent = `
            <p style="color:#636e72;line-height:1.8;font-size:15px;">יש לך הודעה חדשה מ-<strong>${senderName || 'משתמש'}</strong>:</p>
            
            <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;border-right:4px solid #6C5CE7;">
                <p style="color:#2d3436;margin:0;font-size:15px;line-height:1.6;">${previewText}</p>
            </div>
            
            <p style="color:#636e72;line-height:1.8;font-size:15px;">פתחו את Calmino כדי להשיב 💬</p>`;

        await db.collection('mail').add({
            to: [userData.email],
            headers: {
                'X-Priority': '1',
                'X-Mailer': 'Calmino App',
                'List-Unsubscribe': '<mailto:calminogroup@gmail.com?subject=unsubscribe>',
            },
            message: {
                subject: `הודעה חדשה מ${senderName || 'משתמש'} ב-Calmino`,
                text: `יש לך הודעה חדשה מ${senderName || 'משתמש'}: ${previewText}. פתחו את Calmino כדי להשיב.`,
                html: calminoEmailTemplate('הודעה חדשה', bodyContent),
            },
        });

        console.log(`✅ Chat email queued for offline user ${receiverId}`);
    }
});

export const onBookingCreated = onDocumentCreated('bookings/{bookingId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const booking = snapshot.data();
    const receiverId = booking.sitterId; // Assuming sitter receives the request

    // Get receiver push token
    const userDoc = await db.doc(`users/${receiverId}`).get();
    if (!userDoc.exists) return;

    const pushToken = userDoc.data()?.pushToken;
    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) return;

    try {
        const message = {
            to: pushToken,
            sound: 'default',
            title: 'בקשת בייביסיטר חדשה!',
            body: `${booking.parentName} שלח/ה לך בקשה לשמירה ב-${new Date(booking.startTime).toLocaleDateString('he-IL')}`,
            data: { type: 'booking_new', bookingId: event.params.bookingId },
            channelId: 'booking',
        };

        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (response.ok) {
            console.log(`Push notification sent to ${receiverId} for new booking ${event.params.bookingId}`);
        } else {
            console.error(`Push notification HTTP error: ${response.status}`, await response.text());
        }
    } catch (error) {
        console.error('Error sending push for booking:', error);
    }
});
