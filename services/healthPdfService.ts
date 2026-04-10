/**
 * Health PDF Export Service
 * Generates a professional, doctor-ready health report PDF
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logger } from '../utils/logger';
import { VACCINE_SCHEDULE } from '../types/profile';

interface HealthPdfOptions {
    childId: string;
    childName: string;
    birthDate?: string;
}

interface AllergyEntry {
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    diagnosisDate: string;
    note?: string;
}

export async function exportHealthPDF(options: HealthPdfOptions): Promise<boolean> {
    try {
        const { childId, childName, birthDate } = options;

        // Fetch baby document
        const babyDoc = await getDoc(doc(db, 'babies', childId));
        if (!babyDoc.exists()) {
            logger.error('Baby document not found');
            return false;
        }

        const data = babyDoc.data();
        const healthLog = data.healthLog || [];
        const allergies: AllergyEntry[] = data.allergies || [];
        const completedVaccines = data.completedVaccines || {};

        // Parse health log entries
        const temperatureEntries = healthLog
            .filter((e: any) => e.type === 'temperature')
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const illnessEntries = healthLog
            .filter((e: any) => e.type === 'illness')
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const doctorEntries = healthLog
            .filter((e: any) => e.type === 'doctor')
            .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Count completed vaccines
        const totalVaccines = VACCINE_SCHEDULE.length;
        const completedCount = Object.keys(completedVaccines).filter(k => completedVaccines[k]).length;

        // Generate HTML
        const html = generateHealthHTML({
            childName,
            birthDate,
            allergies,
            temperatureEntries,
            illnessEntries,
            doctorEntries,
            completedVaccines,
            totalVaccines,
            completedCount,
        });

        // Create PDF
        const { uri } = await Print.printToFileAsync({ html });

        // Share
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `דוח בריאות - ${childName}`,
                UTI: 'com.adobe.pdf',
            });
            return true;
        }

        return false;
    } catch (error) {
        logger.error('Error exporting health PDF:', error);
        return false;
    }
}

function generateHealthHTML(data: {
    childName: string;
    birthDate?: string;
    allergies: AllergyEntry[];
    temperatureEntries: any[];
    illnessEntries: any[];
    doctorEntries: any[];
    completedVaccines: Record<string, any>;
    totalVaccines: number;
    completedCount: number;
}): string {
    const {
        childName, birthDate, allergies, temperatureEntries,
        illnessEntries, doctorEntries, completedVaccines,
        totalVaccines, completedCount
    } = data;

    // Allergies section
    const allergiesHTML = allergies.length > 0
        ? allergies.map(a => {
            const severityColor = a.severity === 'severe' ? '#EF4444' : a.severity === 'moderate' ? '#F59E0B' : '#10B981';
            const severityLabel = a.severity === 'severe' ? 'חמור' : a.severity === 'moderate' ? 'בינוני' : 'קל';
            return `
                <tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6;">${a.name}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6;">
                        <span style="background: ${severityColor}15; color: ${severityColor}; padding: 3px 10px; border-radius: 6px; font-weight: 600; font-size: 12px;">${severityLabel}</span>
                    </td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280;">${a.note || '-'}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #9CA3AF; font-size: 12px;">${formatDate(new Date(a.diagnosisDate))}</td>
                </tr>
            `;
        }).join('')
        : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #9CA3AF;">לא תועדו אלרגיות</td></tr>';

    // Temperature section
    const tempHTML = temperatureEntries.slice(0, 20).map((e: any) => {
        const temp = parseFloat(e.value);
        const tempColor = temp >= 38 ? '#EF4444' : temp >= 37.5 ? '#F59E0B' : '#10B981';
        return `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6;">
                    <span style="color: ${tempColor}; font-weight: 700;">${e.value}°C</span>
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280;">${e.note || '-'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #9CA3AF; font-size: 12px;">${formatDateTime(new Date(e.timestamp))}</td>
            </tr>
        `;
    }).join('');

    // Illness section
    const illnessHTML = illnessEntries.slice(0, 15).map((e: any) => `
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-weight: 600;">${e.illness || e.name || '-'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280;">${e.note || '-'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #9CA3AF; font-size: 12px;">${formatDate(new Date(e.timestamp))}</td>
        </tr>
    `).join('');

    // Doctor visits
    const doctorHTML = doctorEntries.slice(0, 15).map((e: any) => `
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-weight: 600;">${e.reason || '-'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280;">${e.note || '-'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #9CA3AF; font-size: 12px;">${formatDate(new Date(e.timestamp))}</td>
        </tr>
    `).join('');

    // Vaccines section - flatten the grouped schedule
    const vaccineHTML = VACCINE_SCHEDULE.map(group => {
        return group.vaccines.map(v => {
            const isDone = !!completedVaccines[v.key];
            const vaccineData = completedVaccines[v.key];
            const dateStr = vaccineData && typeof vaccineData === 'object' && vaccineData.date
                ? formatDate(new Date(vaccineData.date?.seconds ? vaccineData.date.seconds * 1000 : vaccineData.date))
                : '';
            return `
                <tr>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6;">
                        ${isDone ? '✅' : '⬜'} ${v.name}
                    </td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: #6B7280; font-size: 12px;">${group.ageTitle}</td>
                    <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; color: ${isDone ? '#10B981' : '#D1D5DB'}; font-weight: 600;">
                        ${isDone ? `בוצע ${dateStr}` : 'טרם בוצע'}
                    </td>
                </tr>
            `;
        }).join('');
    }).join('');

    return `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                    font-family: 'Helvetica Neue', 'Arial', sans-serif;
                    direction: rtl;
                    padding: 32px;
                    color: #1F2937;
                    background: #FFFFFF;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .header {
                    text-align: center;
                    padding-bottom: 24px;
                    margin-bottom: 24px;
                    border-bottom: 3px solid #10B981;
                }
                .header h1 {
                    color: #10B981;
                    font-size: 26px;
                    margin-bottom: 4px;
                    letter-spacing: -0.5px;
                }
                .header .subtitle {
                    color: #6B7280;
                    font-size: 13px;
                }
                .header .child-info {
                    margin-top: 12px;
                    background: #F0FDF4;
                    padding: 12px 20px;
                    border-radius: 10px;
                    display: inline-block;
                }
                .header .child-name {
                    font-size: 20px;
                    font-weight: 700;
                    color: #065F46;
                }
                .section {
                    margin-bottom: 28px;
                    page-break-inside: avoid;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #1F2937;
                    padding: 10px 0;
                    margin-bottom: 8px;
                    border-bottom: 2px solid #E5E7EB;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .section-title .emoji { font-size: 18px; }
                .alert-box {
                    background: #FEF2F2;
                    border: 1px solid #FECACA;
                    border-radius: 10px;
                    padding: 14px 16px;
                    margin-bottom: 16px;
                }
                .alert-title {
                    color: #DC2626;
                    font-weight: 700;
                    font-size: 14px;
                    margin-bottom: 6px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: #FAFAFA;
                    border-radius: 8px;
                    overflow: hidden;
                }
                th {
                    background: #F3F4F6;
                    padding: 10px 12px;
                    text-align: right;
                    font-weight: 600;
                    color: #374151;
                    font-size: 12px;
                    border-bottom: 2px solid #E5E7EB;
                }
                .stat-row {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .stat-card {
                    flex: 1;
                    background: #F9FAFB;
                    border: 1px solid #E5E7EB;
                    border-radius: 10px;
                    padding: 14px;
                    text-align: center;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: 800;
                    color: #10B981;
                }
                .stat-label {
                    font-size: 11px;
                    color: #6B7280;
                    margin-top: 4px;
                }
                .footer {
                    margin-top: 32px;
                    padding-top: 16px;
                    border-top: 2px solid #E5E7EB;
                    text-align: center;
                    color: #9CA3AF;
                    font-size: 11px;
                }
                .footer .brand {
                    color: #10B981;
                    font-weight: 700;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 600;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🏥 דוח בריאות</h1>
                <div class="subtitle">Health Report</div>
                <div class="child-info">
                    <div class="child-name">${childName}</div>
                    ${birthDate ? `<div style="color: #6B7280; font-size: 12px; margin-top: 2px;">תאריך לידה: ${formatDate(new Date(birthDate))}</div>` : ''}
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="stat-row">
                <div class="stat-card">
                    <div class="stat-value">${completedCount}/${totalVaccines}</div>
                    <div class="stat-label">חיסונים</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: ${allergies.length > 0 ? '#EF4444' : '#10B981'}">${allergies.length}</div>
                    <div class="stat-label">אלרגיות</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #6366F1">${illnessEntries.length}</div>
                    <div class="stat-label">מחלות מתועדות</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" style="color: #0EA5E9">${doctorEntries.length}</div>
                    <div class="stat-label">ביקורי רופא</div>
                </div>
            </div>

            <!-- Allergies - CRITICAL SECTION -->
            ${allergies.length > 0 ? `
                <div class="section">
                    <div class="alert-box">
                        <div class="alert-title">⚠️ אלרגיות ורגישויות ידועות</div>
                        ${allergies.map(a => {
                            const label = a.severity === 'severe' ? '🔴 חמור' : a.severity === 'moderate' ? '🟡 בינוני' : '🟢 קל';
                            return `<div style="margin-top: 4px;">• <strong>${a.name}</strong> — ${label} ${a.note ? `(${a.note})` : ''}</div>`;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Vaccines -->
            <div class="section">
                <div class="section-title"><span class="emoji">💉</span> לוח חיסונים (${completedCount}/${totalVaccines})</div>
                <table>
                    <thead>
                        <tr>
                            <th>חיסון</th>
                            <th>גיל מומלץ</th>
                            <th>סטטוס</th>
                        </tr>
                    </thead>
                    <tbody>${vaccineHTML}</tbody>
                </table>
            </div>

            <!-- Temperature History -->
            ${temperatureEntries.length > 0 ? `
                <div class="section">
                    <div class="section-title"><span class="emoji">🌡️</span> היסטוריית חום (${temperatureEntries.length} מדידות)</div>
                    <table>
                        <thead>
                            <tr>
                                <th>טמפרטורה</th>
                                <th>הערות</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>
                        <tbody>${tempHTML}</tbody>
                    </table>
                </div>
            ` : ''}

            <!-- Illnesses -->
            ${illnessEntries.length > 0 ? `
                <div class="section">
                    <div class="section-title"><span class="emoji">🤒</span> מחלות מתועדות</div>
                    <table>
                        <thead>
                            <tr>
                                <th>מחלה</th>
                                <th>הערות</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>
                        <tbody>${illnessHTML}</tbody>
                    </table>
                </div>
            ` : ''}

            <!-- Doctor Visits -->
            ${doctorEntries.length > 0 ? `
                <div class="section">
                    <div class="section-title"><span class="emoji">🩺</span> ביקורי רופא</div>
                    <table>
                        <thead>
                            <tr>
                                <th>סיבה</th>
                                <th>סיכום</th>
                                <th>תאריך</th>
                            </tr>
                        </thead>
                        <tbody>${doctorHTML}</tbody>
                    </table>
                </div>
            ` : ''}

            <div class="footer">
                דוח זה נוצר באמצעות <span class="brand">Calmino</span> בתאריך ${formatDate(new Date())}<br>
                המידע נועד לשימוש אישי ורפואי בלבד • calmino.co.il
            </div>
        </body>
        </html>
    `;
}

function formatDate(date: Date): string {
    return date.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(date: Date): string {
    return date.toLocaleString('he-IL', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}
