// Run: node scripts/seedDemo.js <email> <password>
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
    { name: 'נועם',  gender: 'male',   daysOld: 42,  photo: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&h=300&fit=crop&crop=face' },
    { name: 'תמר',  gender: 'female',  daysOld: 180, photo: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=300&h=300&fit=crop&crop=face' },
    { name: 'ליאם', gender: 'male',    daysOld: 365, photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=300&h=300&fit=crop&crop=face' },
    { name: 'מיה',  gender: 'female',  daysOld: 90,  photo: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=300&h=300&fit=crop&crop=face' },
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
        [[9,55],[13,90],[20,480]].forEach(([h,base]) => {
            if (Math.random() > 0.1) events.push({ type:'sleep', duration:(base+Math.floor(Math.random()*30))*60,
                note:'', timestamp:daysAgo(day,h,0), userId, childId, isDemo:true });
        });
        [6,9,12,15,18,21].forEach(h => {
            if (Math.random() > 0.3) {
                const dirty = Math.random() > 0.55;
                events.push({ type:'diaper', subType:dirty?'dirty':'wet', note:dirty?'מלוכלך':'רטוב',
                    timestamp:daysAgo(day,h,Math.floor(Math.random()*30)), userId, childId, isDemo:true });
            }
        });
    }
    return events;
}

async function seed(email, password) {
    console.log('🔑 Signing in...');
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Signed in:', user.uid);

    let totalEvents = 0;
    for (const child of CHILDREN) {
        const birthDate = new Date();
        birthDate.setDate(birthDate.getDate() - child.daysOld);
        const ref = await addDoc(collection(db, 'babies'), {
            name: child.name, lastName: 'כהן', gender: child.gender,
            birthDate: Timestamp.fromDate(birthDate), parentId: user.uid,
            photoURL: child.photo, createdAt: Timestamp.now(), isDemo: true,
            stats: { weight: (3 + Math.random()*4).toFixed(1), height: (50+Math.random()*20).toFixed(1), headCircumference:'36' },
            milestones:[], album:{}, vaccines:{}, customVaccines:[],
        });
        const events = genEvents(ref.id, user.uid);
        for (let i = 0; i < events.length; i += 450) {
            const batch = writeBatch(db);
            events.slice(i, i+450).forEach(e => {
                batch.set(doc(collection(db,'events')), { ...e, timestamp: Timestamp.fromDate(e.timestamp), createdAt: Timestamp.now() });
            });
            await batch.commit();
        }
        totalEvents += events.length;
        console.log(`👶 ${child.name}: ${events.length} events`);
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
    console.log(`🗑️ Cleared ${babies.size} children, ${events.size} events`);
    process.exit(0);
}

const [,, action, email, password] = process.argv;
if (!email || !password) { console.log('Usage: node scripts/seedDemo.js [seed|clear] email password'); process.exit(1); }
(action === 'clear' ? clear : seed)(email, password).catch(e => { console.error(e.message); process.exit(1); });
