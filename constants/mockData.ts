export const IS_SCREENSHOT_MODE = false;

export const MOCK_BABY_PROFILE = {
    id: 'mock-baby',
    name: 'הראל',
    ageMonths: 8,
    birthDate: new Date('2025-08-01T00:00:00.000Z'), // Adjust to match "1 באוגוסט 2025"
    photoUrl: undefined,
    gender: 'boy',
};

export const MOCK_HOME_DATA = {
    lastFeedTime: '14:30',
    lastSleepTime: '12:15',
    dailyStats: {
        feedCount: 5,
        sleepMinutes: 180,
        diaperCount: 4,
    },
    growthStats: {
        currentWeight: '7.1',
        lastWeightDiff: '+0.9',
        currentHeight: '65.0',
        lastHeightDiff: '+3.0',
    }
};

export const MOCK_TIMELINE_EVENTS = [
    {
        id: '1',
        type: 'food',
        subType: 'bottle',
        amount: 120,
        note: 'סיים בקבוק, נרדם מיד אחרי הגיהוק',
        timestamp: new Date(new Date().setHours(14, 30, 0, 0)),
        dateObj: new Date(new Date().setHours(14, 30, 0, 0)),
        reporterPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        creatorId: 'parent-1'
    },
    {
        id: '2',
        type: 'sleep',
        duration: 7200, // 2 hours in seconds
        note: 'נרדם במיטה בקלות לשנת צהריים',
        timestamp: new Date(new Date().setHours(12, 15, 0, 0)),
        dateObj: new Date(new Date().setHours(12, 15, 0, 0)),
        reporterPhotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        creatorId: 'parent-2'
    },
    {
        id: '3',
        type: 'diaper',
        subType: 'both',
        note: 'החלפה זריזה במשטח, הכל נקי עכשיו',
        timestamp: new Date(new Date().setHours(11, 0, 0, 0)),
        dateObj: new Date(new Date().setHours(11, 0, 0, 0)),
        reporterPhotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        creatorId: 'parent-1'
    },
    {
        id: '4',
        type: 'food',
        subType: 'bottle',
        amount: 150,
        note: 'אכל אצל סבתא כמות מלאה',
        timestamp: new Date(new Date().setHours(9, 30, 0, 0)),
        dateObj: new Date(new Date().setHours(9, 30, 0, 0)),
        reporterPhotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        creatorId: 'parent-2'
    }
];

export const MOCK_STATISTICS = {
    food: 17908,
    foodCount: 120,
    diapers: 150,
    sleep: 268.9,
    sleepCount: 60,
    supplements: 30,
    growthIncrease: '+0.7',
    growthWeight: '7.2'
};

export const MOCK_SITTERS = [
    {
        id: 's1',
        name: 'שירה רוזנברג',
        rating: 4.5,
        reviewCount: 8,
        pricePerHour: 50,
        distance: 1.2,
        city: 'הרצליה',
        photoUrl: 'https://i.pravatar.cc/150?img=1',
        experience: 1,
        bio: 'סטודנטית, אוהבת מאוד ילדים',
        distanceText: '1.2 ק״מ'
    },
    {
        id: 's2',
        name: 'תמר גולדשטיין',
        rating: 4.6,
        reviewCount: 15,
        pricePerHour: 80,
        distance: 2.1,
        city: 'רמת השרון',
        photoUrl: 'https://i.pravatar.cc/150?img=5',
        experience: 4,
        bio: 'גננת מוסמכת בעלת ניסיון',
        distanceText: '2.1 ק״מ'
    },
    {
        id: 's3',
        name: 'נועה כהן',
        rating: 4.9,
        reviewCount: 24,
        pricePerHour: 70,
        distance: 3.5,
        city: 'תל אביב',
        photoUrl: 'https://i.pravatar.cc/150?img=9',
        experience: 3,
        bio: 'אוהבת ילדים אחראית ומסורה',
        distanceText: '3.5 ק״מ' // Wait, picture says "פנויה להערב" 
    },
    {
        id: 's4',
        name: 'מאיה אברהם',
        rating: 5.0,
        reviewCount: 42,
        pricePerHour: 90,
        distance: 4.0,
        city: 'תל אביב',
        photoUrl: 'https://i.pravatar.cc/150?img=10',
        experience: 10,
        bio: 'ניסיון רב עם תינוקות',
        distanceText: '4.0 ק״מ' 
    },
    {
        id: 's5',
        name: 'יואב מזרחי',
        rating: 4.8,
        reviewCount: 31,
        pricePerHour: 75,
        distance: 5.2,
        city: 'גבעתיים',
        photoUrl: 'https://i.pravatar.cc/150?img=11',
        experience: 7,
        bio: 'זמין בשעות הערב',
        distanceText: '5.2 ק״מ'
    },
    {
        id: 's6',
        name: 'דניאל לוי',
        rating: 4.7,
        reviewCount: 18,
        pricePerHour: 65,
        distance: 4.5,
        city: 'רמת גן',
        photoUrl: 'https://i.pravatar.cc/150?img=15',
        experience: 5,
        bio: 'סטודנט לרפואה',
        distanceText: '4.5 ק״מ'
    }
];

export const MOCK_GROWTH_RECORDS = [
    { weight: '4.1', height: '52.4', head: '38', date: new Date('2025-08-01') },
    { weight: '4.8', height: '54.5', head: '39', date: new Date('2025-09-01') },
    { weight: '5.2', height: '57.0', head: '40', date: new Date('2025-10-01') },
    { weight: '5.8', height: '59.5', head: '41.5', date: new Date('2025-11-01') },
    { weight: '6.2', height: '62.0', head: '42.2', date: new Date('2025-12-01') },
    { weight: '7.1', height: '65.0', head: '43.0', date: new Date('2026-01-01') }
];

export const MOCK_ACCOUNT_DATA = {
    userName: 'עידן כהן',
    userEmail: 'idan.cohen@gmail.com',
    userPhotoUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&h=300&fit=crop',
    family: {
        id: 'mock-fam',
        babyId: 'mock-baby',
        babyName: 'הראל',
        createdAt: new Date(),
        inviteCode: '1A2B3C',
        members: {
            'me': { name: 'עידן כהן', email: 'idan.cohen@gmail.com', role: 'admin', joinedAt: new Date() },
            'wife': { name: 'מיכל כהן', email: 'michal.cohen@gmail.com', role: 'admin', joinedAt: new Date() },
            'grandma': { name: 'סבתא רות', email: 'ruth.cohen@gmail.com', role: 'viewer', joinedAt: new Date() }
        }
    }
};
