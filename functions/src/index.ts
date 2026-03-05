import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';

admin.initializeApp();

const db = admin.firestore();

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES — HTML email generator for branded Calmino emails
// ══════════════════════════════════════════════════════════════════════════════

function calminoEmailTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);padding:32px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Calmino 👶</h1>
                            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">ההורות שלך, בקצב שלך</p>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="color:#2d3436;margin:0 0 16px;font-size:22px;">${title}</h2>
                            ${bodyContent}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #eee;">
                            <p style="color:#999;font-size:12px;margin:0;">Calmino © ${new Date().getFullYear()}</p>
                            <p style="color:#999;font-size:12px;margin:4px 0 0;">calminogroup@gmail.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

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
        <p style="color:#636e72;line-height:1.8;font-size:15px;">שלום <strong>${displayName}</strong> 👋</p>
        <p style="color:#636e72;line-height:1.8;font-size:15px;">שמחים שהצטרפת ל-<strong>Calmino</strong>! האפליקציה שתעזור לך לעקוב אחרי התינוק ולעשות סדר בהורות.</p>
        
        <div style="background:#f8f9fa;border-radius:12px;padding:20px;margin:24px 0;">
            <p style="color:#2d3436;font-weight:600;margin:0 0 12px;">הנה כמה דברים שאפשר להתחיל איתם:</p>
            <p style="color:#636e72;margin:6px 0;">🍼 <strong>מעקב יומי</strong> — תעדו האכלה, שינה, והחתלות בלחיצה</p>
            <p style="color:#636e72;margin:6px 0;">👶 <strong>פרופיל תינוק</strong> — הוסיפו תמונה ופרטים</p>
            <p style="color:#636e72;margin:6px 0;">👨‍👩‍👧 <strong>שיתוף משפחתי</strong> — הזמינו בן/בת זוג לצפות בזמן אמת</p>
            <p style="color:#636e72;margin:6px 0;">📊 <strong>דו"חות חכמים</strong> — גלו דפוסים ותובנות</p>
            <p style="color:#636e72;margin:6px 0;">📏 <strong>מעקב גדילה</strong> — לפי תקני WHO עם גרפים</p>
        </div>
        
        <p style="color:#636e72;line-height:1.8;font-size:15px;">יש שאלות? פשוט שלחו לנו מייל ל-<a href="mailto:calminogroup@gmail.com" style="color:#6C5CE7;">calminogroup@gmail.com</a> 💌</p>
        <p style="color:#636e72;line-height:1.8;font-size:15px;">בהצלחה!<br/>צוות Calmino 💛</p>`;

    await db.collection('mail').add({
        to: [email],
        message: {
            subject: 'ברוכים הבאים ל-Calmino! 👶',
            text: `שלום ${displayName}, שמחים שהצטרפת ל-Calmino! פתחו את האפליקציה כדי להתחיל.`,
            html: calminoEmailTemplate('!ברוכים הבאים 🎉', bodyContent),
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
            message: {
                subject: `🍼 ${creatorName} הזמין/ה אותך לשמור על ${childName}`,
                text: `${creatorName} הזמין/ה אותך לשמור על ${childName} דרך Calmino. קוד הגישה: ${inviteCode}. הורד את האפליקציה והזן את הקוד.`,
                html: calminoEmailTemplate('!קיבלת הזמנה לשמרטפות 🍼', bodyContent),
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
            message: {
                subject: `👨‍👩‍👧 ${creatorName} הזמין/ה אותך להצטרף למשפחה ב-Calmino`,
                text: `${creatorName} הזמין/ה אותך להצטרף למשפחה ב-Calmino. קוד ההצטרפות: ${inviteCode}. הורד את האפליקציה והזן את הקוד.`,
                html: calminoEmailTemplate('!הוזמנת להצטרף למשפחה 👨‍👩‍👧', bodyContent),
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
        message: {
            subject: `⭐ קיבלת דירוג חדש מ${parentName}!`,
            text: `שלום ${sitterName}, ${parentName} השאיר/ה לך דירוג ${rating}/5. ${comment ? `"${comment}"` : ''} פתחו את Calmino לפרטים.`,
            html: calminoEmailTemplate('!קיבלת דירוג חדש ⭐', bodyContent),
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
            message: {
                subject: `💬 הודעה חדשה מ${senderName || 'משתמש'} ב-Calmino`,
                text: `יש לך הודעה חדשה מ${senderName || 'משתמש'}: ${previewText}. פתחו את Calmino כדי להשיב.`,
                html: calminoEmailTemplate('💬 הודעה חדשה', bodyContent),
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

