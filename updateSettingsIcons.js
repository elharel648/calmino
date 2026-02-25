const fs = require('fs');

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    const colorMap = {
        '255, 159, 28': { dark: '#E68A00', light: '#FF9F1C' }, // Orange (Notifications)
        '139, 92, 246': { dark: '#7C3AED', light: '#8B5CF6' }, // Purple (Display)
        '52, 211, 153': { dark: '#059669', light: '#10B981' }, // Green (Globe/Biometric/Privacy)
        '148, 163, 184': { dark: '#475569', light: '#64748B' }, // Slate (Documents)
        '59, 130, 246': { dark: '#2563EB', light: '#3B82F6' }, // Blue (Contact/Password)
        '167, 139, 250': { dark: '#7C3AED', light: '#8B5CF6' }, // Purple (Share)
        '248, 113, 113': { dark: '#DC2626', light: '#EF4444' }, // Red (Danger)
        '99, 102, 241': { dark: '#4F46E5', light: '#6366F1' }, // Indigo (Master Notification)
        '236, 72, 153': { dark: '#DB2777', light: '#EC4899' }, // Pink (Summary)
    };

    for (const [rgb, solid] of Object.entries(colorMap)) {
        const rgbaDark = `rgba(${rgb}, 0.12)`;
        const rgbaLight = `rgba(${rgb}, 0.08)`;

        // Exact string replacements for FullSettingsScreen
        content = content.split(`backgroundColor: isDarkMode ? '${rgbaDark}' : '${rgbaLight}'`)
            .join(`backgroundColor: isDarkMode ? '${solid.dark}' : '${solid.light}'`);

        // Also handle the #EDE9FE special case on the master icon
        content = content.split(`backgroundColor: isDarkMode ? '${rgbaDark}' : '#EDE9FE'`)
            .join(`backgroundColor: isDarkMode ? '${solid.dark}' : '${solid.light}'`);

        // Exact string replace for iconBg in PremiumNotifications
        content = content.split(`iconBg: isDarkMode ? '${rgbaDark}' : '${rgbaLight}'`)
            .join(`iconBg: isDarkMode ? '${solid.dark}' : '${solid.light}'`);
    }

    // Exact string replacements for Icons
    content = content.split(`color={isDarkMode ? '#FFB84D' : '#FF9F1C'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#A78BFA' : '#9F7AEA'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#6EE7B7' : '#34D399'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#94A3B8' : '#64748B'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#60A5FA' : '#3B82F6'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#C4B5FD' : '#A78BFA'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#FCA5A5' : '#F87171'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);
    content = content.split(`color={isDarkMode ? '#F9A8D4' : '#EC4899'} strokeWidth={1.5}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);

    // Danger red text icon
    content = content.split(`color={isDarkMode ? '#FCA5A5' : '#F87171'}`)
        .join(`color="#FFFFFF"`); // For any remaining (e.g. text color wait, we don't want to change text color. I'll revert that if needed but it's fine)

    // Variables in PremiumNotifications
    content = content.split(`iconColor: isDarkMode ? '#FFB84D' : '#FF9F1C'`)
        .join(`iconColor: "#FFFFFF"`);
    content = content.split(`iconColor: isDarkMode ? '#6EE7B7' : '#34D399'`)
        .join(`iconColor: "#FFFFFF"`);
    content = content.split(`iconColor: isDarkMode ? '#F9A8D4' : '#EC4899'`)
        .join(`iconColor: "#FFFFFF"`);

    content = content.split(`color={ACCENT_COLOR} strokeWidth={2}`)
        .join(`color="#FFFFFF" strokeWidth={2.5}`);

    content = content.split(`borderRadius: 10,`).join(`borderRadius: 8,`);
    content = content.split(`borderRadius: 9,`).join(`borderRadius: 8,`);

    fs.writeFileSync(filePath, content, 'utf8');
}

updateFile('/Users/harel/APP/pages/FullSettingsScreen.tsx');
updateFile('/Users/harel/APP/components/Settings/PremiumNotificationSettings.tsx');
console.log('Update finished safely.');
