/**
 * PDF Export Service - ייצוא נתוני Timeline ל-PDF
 * Baby Daybook has this, we need it too + make it better
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logger } from '../utils/logger';

interface ExportOptions {
    childId: string;
    childName: string;
    startDate: Date;
    endDate: Date;
    includeGrowth?: boolean;
}

/**
 * Generate PDF report and share it
 */
export async function exportTimelineToPDF(options: ExportOptions): Promise<boolean> {
    try {
        const { childId, childName, startDate, endDate, includeGrowth } = options;

        // Fetch events
        const eventsQuery = query(
            collection(db, 'events'),
            where('childId', '==', childId),
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            where('timestamp', '<=', Timestamp.fromDate(endDate)),
            orderBy('timestamp', 'desc')
        );

        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch growth data if requested
        let growthData: any[] = [];
        if (includeGrowth) {
            const growthQuery = query(
                collection(db, 'growthMeasurements'),
                where('babyId', '==', childId),
                orderBy('date', 'desc')
            );
            const growthSnapshot = await getDocs(growthQuery);
            growthData = growthSnapshot.docs.map(doc => doc.data());
        }

        // Generate HTML
        const html = generateReportHTML(childName, startDate, endDate, events, growthData);

        // Create PDF
        const { uri } = await Print.printToFileAsync({ html });

        // Share PDF
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `דוח ${childName} - ${formatDate(startDate)} עד ${formatDate(endDate)}`,
                UTI: 'com.adobe.pdf',
            });
            return true;
        } else {
            logger.error('Sharing not available');
            return false;
        }
    } catch (error) {
        logger.error('Error exporting PDF:', error);
        return false;
    }
}

/**
 * Generate HTML for PDF - Clean, doctor-friendly format
 */
function generateReportHTML(
    childName: string,
    startDate: Date,
    endDate: Date,
    events: any[],
    growthData: any[]
): string {
    const eventsHTML = events
        .map(event => {
            const timestamp = event.timestamp?.toDate?.() || new Date(event.timestamp);
            const typeEmoji = getTypeEmoji(event.type);
            const note = event.note || '';
            const duration = event.duration ? ` (${formatDuration(event.duration)})` : '';

            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${typeEmoji} ${getTypeLabel(event.type)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${formatDateTime(timestamp)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${note}${duration}</td>
                </tr>
            `;
        })
        .join('');

    const growthHTML = growthData
        .map(growth => {
            const date = growth.date?.toDate?.() || new Date(growth.date);
            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${formatDate(date)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${growth.weight || '-'} ק"ג</td>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${growth.height || '-'} ס"מ</td>
                    <td style="padding: 8px; border-bottom: 1px solid #E5E7EB;">${growth.headCircumference || '-'} ס"מ</td>
                </tr>
            `;
        })
        .join('');

    return `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    direction: rtl;
                    padding: 40px;
                    color: #1F2937;
                }
                h1 {
                    color: #6366F1;
                    font-size: 28px;
                    margin-bottom: 8px;
                }
                h2 {
                    color: #4B5563;
                    font-size: 20px;
                    margin-top: 32px;
                    margin-bottom: 16px;
                    border-bottom: 2px solid #6366F1;
                    padding-bottom: 8px;
                }
                .subtitle {
                    color: #6B7280;
                    font-size: 14px;
                    margin-bottom: 32px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 16px;
                    background: white;
                }
                th {
                    background: #F3F4F6;
                    padding: 12px;
                    text-align: right;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 2px solid #D1D5DB;
                }
                .footer {
                    margin-top: 48px;
                    padding-top: 16px;
                    border-top: 1px solid #E5E7EB;
                    color: #9CA3AF;
                    font-size: 12px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <h1>דוח מעקב - ${childName}</h1>
            <div class="subtitle">
                תקופה: ${formatDate(startDate)} - ${formatDate(endDate)}<br>
                נוצר ב: ${formatDate(new Date())}<br>
                מערכת Calmino
            </div>

            <h2>📊 פעילויות יומיות</h2>
            <table>
                <thead>
                    <tr>
                        <th>סוג</th>
                        <th>תאריך ושעה</th>
                        <th>פרטים</th>
                    </tr>
                </thead>
                <tbody>
                    ${eventsHTML || '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #9CA3AF;">אין נתונים לתקופה זו</td></tr>'}
                </tbody>
            </table>

            ${growthData.length > 0 ? `
                <h2>📈 נתוני גדילה</h2>
                <table>
                    <thead>
                        <tr>
                            <th>תאריך</th>
                            <th>משקל</th>
                            <th>גובה</th>
                            <th>היקף ראש</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${growthHTML}
                    </tbody>
                </table>
            ` : ''}

            <div class="footer">
                דוח זה נוצר באמצעות אפליקציית Calmino<br>
                למידע נוסף: calmino.co.il
            </div>
        </body>
        </html>
    `;
}

// Helper functions
function formatDate(date: Date): string {
    return date.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
        return `${hours}ש ${minutes}ד`;
    }
    return `${minutes} דקות`;
}

function getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
        food: '🍼',
        sleep: '😴',
        diaper: '🧷',
        supplement: '💊',
        custom: '📝',
    };
    return emojiMap[type] || '📌';
}

function getTypeLabel(type: string): string {
    const labelMap: Record<string, string> = {
        food: 'הזנה',
        sleep: 'שינה',
        diaper: 'החלפת חיתול',
        supplement: 'תוסף תזונה',
        custom: 'אחר',
    };
    return labelMap[type] || 'אירוע';
}
