// Run: node scripts/seedDemo.js seed <email> <password>
// Run: node scripts/seedDemo.js clear <email> <password>

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, Timestamp, writeBatch, doc, query, where, getDocs, deleteDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyAdESrCDWktlnZGyDrSeqElw3WL7Q9MPUQ",
    authDomain: "baby-app-42b3b.firebaseapp.com",
    projectId: "baby-app-42b3b",
    storageBucket: "baby-app-42b3b.appspot.com",
    messagingSenderId: "16421819020",
    appId: "1:16421819020:web:2c87cd757d69fae199a1a9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const CHILDREN = [
    { name: 'נועם',  gender: 'male',   daysOld: 42,
      photo: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&h=300&fit=crop&crop=face' },
    { name: 'תמר',  gender: 'female',  daysOld: 180,
      photo: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=300&h=300&fit=crop&crop=face' },
    { name: 'ליאם', gender: 'male',    daysOld: 365,
      photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&h=300&fit=crop&crop=face' },
    { name: 'מיה',  gender: 'female',  daysOld: 90,
      photo: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=300&h=300&fit=crop&crop=face' },
];

function daysAgo(d, hour = 12, min = 0) {
    const t = new Date();
    t.setDate(t.getDate() - d);
    t.setHours(hour, min, 0, 0);
    return t;
}

function genEvents(childId, userId) {
    const events = [];
    for (let day = 30; day >= 0; day--) {
        // Feedings
        [1,4,7,10,13,16,19,22].forEach(h => {
            if (Math.random() > 0.15) {
                const breast = Math.random() > 0.4;
                const mins = 12 + Math.floor(Math.random() * 10);
                const ml = 70 + Math.floor(Math.random() * 6) * 10;
                const side = Math.random() > 0.5 ? 'ימין' : 'שמאל';
                events.push({ type:'food', subType: breast?'breast':'bottle',
                    note: breast ? `${side}: ${mins}:00` : `זמן: ${mins}:00 · ${ml}מ"ל`,
                    duration: mins*60, timestamp: daysAgo(day,h,Math.floor(Math.random()*30)),
                    userId, childId, isDemo: true });
            }
        });
        // Sleep
        [[9,55],[13,90],[20,480]].forEach(([h,base]) => {
            if (Math.random() > 0.1) events.push({
                type:'sleep', duration:(base+Math.floor(Math.random()*30))*60,
                note:'', timestamp:daysAgo(day,h,0), userId, childId, isDemo:true });
        });
        // Diapers
        [6,9,12,15,18,21].forEach(h => {
            if (Math.random() > 0.3) {
                const dirty = Math.random() > 0.55;
                events.push({ type:'diaper', subType:dirty?'dirty':'wet',
                    note:dirty?'מלוכלך':'רטוב',
                    timestamp:daysAgo(day,h,Math.floor(Math.random()*30)),
                    userId, childId, isDemo:true });
            }
        });
        // Supplements (2-3 per day)
        if (Math.random() > 0.2) {
            const supps = ['ויטמין D', 'אומגה 3', 'פרוביוטיקה', 'ברזל'];
            events.push({ type:'supplement', subType:'vitamin',
                name: supps[Math.floor(Math.random()*supps.length)],
                note: 'מנה יומית', timestamp:daysAgo(day,9,0),
                userId, childId, isDemo:true });
        }
        if (Math.random() > 0.4) {
            events.push({ type:'supplement', subType:'vitamin',
                name:'ויטמין D', note:'5 טיפות',
                timestamp:daysAgo(day,20,0), userId, childId, isDemo:true });
        }
    }
    return events;
}

function genGrowthMeasurements(childId, userId, birthWeight, birthHeight) {
    const measurements = [];
    // Monthly measurements for 12 months back
    for (let m = 6; m >= 0; m--) {
        const date = new Date();
        date.setMonth(date.getMonth() - m);
        date.setDate(1);
        measurements.push({
            babyId: childId, createdBy: userId, isDemo: true,
            date: Timestamp.fromDate(date),
            createdAt: Timestamp.fromDate(date),
            weight: parseFloat((birthWeight + m * 0.6 + Math.random() * 0.3).toFixed(2)),
            height: parseFloat((birthHeight + m * 2.5 + Math.random() * 0.5).toFixed(1)),
            headCircumference: parseFloat((32 + m * 0.8 + Math.random() * 0.2).toFixed(1)),
            notes: '',
        });
    }
    return measurements;
}

async function seed(email, password) {
    console.log('🔑 Signing in...');
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in:', user.uid);

    let totalEvents = 0;
    const birthWeights = [3.2, 3.5, 3.8, 3.1];
    const birthHeights = [50, 52, 51, 49];

    for (let i = 0; i < CHILDREN.length; i++) {
        const child = CHILDREN[i];
        const birthDate = new Date();
        birthDate.setDate(birthDate.getDate() - child.daysOld);

        // Create child - NOTE: field is photoUrl (not photoURL)
        const ref = await addDoc(collection(db, 'babies'), {
            name: child.name, lastName: 'לוי', gender: child.gender,
            birthDate: Timestamp.fromDate(birthDate), parentId: user.uid,
            photoUrl: child.photo,  // ← CORRECT field name
            createdAt: Timestamp.now(), isDemo: true,
            stats: {
                weight: (birthWeights[i] + child.daysOld/30 * 0.6).toFixed(2),
                height: (birthHeights[i] + child.daysOld/30 * 2.5).toFixed(1),
                headCircumference: (32 + child.daysOld/30 * 0.8).toFixed(1)
            },
            milestones:[], album:{}, vaccines:{}, customVaccines:[],
        });

        // Seed events in batches
        const events = genEvents(ref.id, user.uid);
        for (let j = 0; j < events.length; j += 450) {
            const batch = writeBatch(db);
            events.slice(j, j+450).forEach(e => {
                batch.set(doc(collection(db,'events')), {
                    ...e, timestamp: Timestamp.fromDate(e.timestamp), createdAt: Timestamp.now()
                });
            });
            await batch.commit();
        }
        totalEvents += events.length;

        // Seed growth measurements
        const growth = genGrowthMeasurements(ref.id, user.uid, birthWeights[i], birthHeights[i]);
        const gBatch = writeBatch(db);
        growth.forEach(g => gBatch.set(doc(collection(db,'growthMeasurements')), g));
        await gBatch.commit();

        console.log(`👶 ${child.name}: ${events.length} events, ${growth.length} growth measurements`);
    }

    console.log(`\n✅ Done! ${CHILDREN.length} children, ${totalEvents} events`);
    process.exit(0);
}

async function clear(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    const babies = await getDocs(query(collection(db,'babies'), where('parentId','==',user.uid), where('isDemo','==',true)));
    for (const d of babies.docs) await deleteDoc(d.ref);

    const events = await getDocs(query(collection(db,'events'), where('userId','==',user.uid), where('isDemo','==',true)));
    for (let i = 0; i < events.docs.length; i += 450) {
        const batch = writeBatch(db);
        events.docs.slice(i, i+450).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    const growth = await getDocs(query(collection(db,'growthMeasurements'), where('createdBy','==',user.uid), where('isDemo','==',true)));
    for (let i = 0; i < growth.docs.length; i += 450) {
        const batch = writeBatch(db);
        growth.docs.slice(i, i+450).forEach(d => batch.delete(d.ref));
        await batch.commit();
    }

    console.log(`🗑️ Cleared ${babies.size} children, ${events.size} events, ${growth.size} growth records`);
    process.exit(0);
}

const [,, action, email, password] = process.argv;
if (!email || !password) {
    console.log('Usage:');
    console.log('  node scripts/seedDemo.js seed  email@example.com password');
    console.log('  node scripts/seedDemo.js clear email@example.com password');
    process.exit(1);
}
(action === 'clear' ? clear : seed)(email, password).catch(e => { console.error(e.message); process.exit(1); });
