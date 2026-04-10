export interface TipatHalavStation {
    _id: number;
    city_name: string;
    street_name: string;
    house_number: string;
    phone: string;
    clinic_name: string;
    status?: string;
}

export const TIPAT_HALAV_DATABASE: TipatHalavStation[] = [
    {
        "_id": 1,
        "city_name": "אבו גוש",
        "street_name": "הפול",
        "house_number": "6",
        "phone": "02-5342763",
        "clinic_name": "טיפת חלב אבו גוש",
        "status": "פעיל"
    },
    {
        "_id": 2,
        "city_name": "אבו סנאן",
        "street_name": "",
        "house_number": "",
        "phone": "04-9965339",
        "clinic_name": "טיפת חלב אבו סנאן א",
        "status": "פעיל"
    },
    {
        "_id": 3,
        "city_name": "אבו סנאן",
        "street_name": "",
        "house_number": "",
        "phone": "04-9964520",
        "clinic_name": "טיפת חלב אבו סנאן ג",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 4,
        "city_name": "אבו סנאן",
        "street_name": "",
        "house_number": "",
        "phone": "04-9966757",
        "clinic_name": "טיפת חלב אבו סנאן ד",
        "status": "פעיל"
    },
    {
        "_id": 5,
        "city_name": "אום בטין",
        "street_name": "",
        "house_number": "",
        "phone": "054-9191784",
        "clinic_name": "טיפת חלב אבוכף",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 6,
        "city_name": "אבו קורינאת (שבט)",
        "street_name": "",
        "house_number": "",
        "phone": "050-6244366",
        "clinic_name": "טיפת חלב אבוקרינאת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 7,
        "city_name": "באר שבע",
        "street_name": "שלשת בני עין חרוד",
        "house_number": "",
        "phone": "08-6233853",
        "clinic_name": "טיפת חלב אבורביע",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 8,
        "city_name": "פרדס חנה-כרכור",
        "street_name": "הגליל",
        "house_number": "15",
        "phone": "077-9400704",
        "clinic_name": "טיפת חלב אגוז כרכור",
        "status": "פעיל"
    },
    {
        "_id": 9,
        "city_name": "חיפה",
        "street_name": "אדמונד פלג",
        "house_number": "16",
        "phone": "077-2019181",
        "clinic_name": "טיפת חלב אדמונד פלג",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 10,
        "city_name": "רחובות",
        "street_name": "אהרוני ישראל",
        "house_number": "21",
        "phone": "08-9466544",
        "clinic_name": "טיפת חלב אהרוני",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 11,
        "city_name": "שבלי - אום אל-גנם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6769237",
        "clinic_name": "טיפת חלב אום אל גאנם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 12,
        "city_name": "אום אל-פחם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6313938",
        "clinic_name": "טיפת חלב אום אל פחם א",
        "status": "פעיל"
    },
    {
        "_id": 13,
        "city_name": "אום אל-פחם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6112303",
        "clinic_name": "טיפת חלב אום אל פחם ב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 14,
        "city_name": "אום אל-פחם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6114183",
        "clinic_name": "טיפת חלב אום אל פחם ו",
        "status": "פעיל"
    },
    {
        "_id": 15,
        "city_name": "מעלה עירון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6311954",
        "clinic_name": "טיפת חלב אומשרפה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 16,
        "city_name": "אופקים",
        "street_name": "שרת",
        "house_number": "7",
        "phone": "08-9922621",
        "clinic_name": "טיפת חלב אופקים",
        "status": "פעיל"
    },
    {
        "_id": 17,
        "city_name": "לוד",
        "street_name": "גולן",
        "house_number": "5",
        "phone": "08-9230133",
        "clinic_name": "טיפת חלב אורנים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 18,
        "city_name": "רחובות",
        "street_name": "טרומפלדור",
        "house_number": "11",
        "phone": "08-9410952",
        "clinic_name": "טיפת חלב אושיות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 19,
        "city_name": "אזור",
        "street_name": "שרת משה",
        "house_number": "73",
        "phone": "03-5586874",
        "clinic_name": "טיפת חלב אזור",
        "status": "פעיל"
    },
    {
        "_id": 20,
        "city_name": "נתניה",
        "street_name": "קריניצי",
        "house_number": "2",
        "phone": "09-8354334",
        "clinic_name": "טיפת חלב אזורים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 21,
        "city_name": "פתח תקווה",
        "street_name": "אחד העם",
        "house_number": "33",
        "phone": "03-9315212",
        "clinic_name": "טיפת חלב אחד העם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 22,
        "city_name": "נתניה",
        "street_name": "איכילוב",
        "house_number": "8",
        "phone": "09-8610904",
        "clinic_name": "טיפת חלב איכילוב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 23,
        "city_name": "נתניה",
        "street_name": "רותם",
        "house_number": "129",
        "phone": "09-8356928",
        "clinic_name": "טיפת חלב אירוסים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 24,
        "city_name": "אכסאל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6561450",
        "clinic_name": "טיפת חלב אכסאל מרכז",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 25,
        "city_name": "אטרש (שבט)",
        "street_name": "",
        "house_number": "",
        "phone": "08-6224910",
        "clinic_name": "טיפת חלב אל אטרש (מולדה)",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 26,
        "city_name": "כפר קאסם",
        "street_name": "",
        "house_number": "",
        "phone": "03-9071834",
        "clinic_name": "טיפת חלב אל אמל",
        "status": "פעיל"
    },
    {
        "_id": 27,
        "city_name": "אור עקיבא",
        "street_name": "הכרמל",
        "house_number": "10",
        "phone": "077-3361967",
        "clinic_name": "טיפת חלב אלה",
        "status": "פעיל"
    },
    {
        "_id": 28,
        "city_name": "הוואשלה (שבט)",
        "street_name": "",
        "house_number": "",
        "phone": "08-9724650",
        "clinic_name": "טיפת חלב אלהואשלה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 29,
        "city_name": "אור עקיבא",
        "street_name": "תלפיות",
        "house_number": "2",
        "phone": "077-7282635",
        "clinic_name": "טיפת חלב אלון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 30,
        "city_name": "ירושלים",
        "street_name": "שכ כפר עקב",
        "house_number": "",
        "phone": "02-5849428",
        "clinic_name": "טיפת חלב אלחנאן",
        "status": "פעיל"
    },
    {
        "_id": 31,
        "city_name": "טירת כרמל",
        "street_name": "אלמוג",
        "house_number": "3",
        "phone": "04-8571703",
        "clinic_name": "טיפת חלב אלמוג",
        "status": "פעיל"
    },
    {
        "_id": 32,
        "city_name": "אלעד",
        "street_name": "שמאי",
        "house_number": "4",
        "phone": "03-9087880",
        "clinic_name": "טיפת חלב אלעד א'",
        "status": "פעיל"
    },
    {
        "_id": 33,
        "city_name": "אלעד",
        "street_name": "רבי מאיר",
        "house_number": "11",
        "phone": "5400",
        "clinic_name": "טיפת חלב אלעד ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 34,
        "city_name": "ביר הדאג'",
        "street_name": "",
        "house_number": "",
        "phone": "08-8686540",
        "clinic_name": "טיפת חלב אלעזזמה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 35,
        "city_name": "אבו תלול",
        "street_name": "",
        "house_number": "",
        "phone": "08-6388318",
        "clinic_name": "טיפת חלב אלעסם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 36,
        "city_name": "פתח תקווה",
        "street_name": "נס ציונה",
        "house_number": "5",
        "phone": "03-9241885",
        "clinic_name": "טיפת חלב אם המושבות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 37,
        "city_name": "אעבלין",
        "street_name": "",
        "house_number": "",
        "phone": "04-9866024",
        "clinic_name": "טיפת חלב אעבלין א",
        "status": "פעיל"
    },
    {
        "_id": 38,
        "city_name": "אעבלין",
        "street_name": "",
        "house_number": "",
        "phone": "04-9502339",
        "clinic_name": "טיפת חלב אעבלין ב'",
        "status": "פעיל"
    },
    {
        "_id": 39,
        "city_name": "חדרה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6334433",
        "clinic_name": "טיפת חלב אקליפטוס",
        "status": "פעיל"
    },
    {
        "_id": 40,
        "city_name": "קרית שמונה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6434027",
        "clinic_name": "טיפת חלב ארזים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 41,
        "city_name": "חיפה",
        "street_name": "ארלוזורוב",
        "house_number": "92",
        "phone": "04-8623110",
        "clinic_name": "טיפת חלב ארלוזורוב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 42,
        "city_name": "אשדוד",
        "street_name": "שבי ציון",
        "house_number": "14",
        "phone": "08-8523739",
        "clinic_name": "טיפת חלב אשדוד א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 43,
        "city_name": "אשדוד",
        "street_name": "סטרומה",
        "house_number": "14",
        "phone": "08-8523707",
        "clinic_name": "טיפת חלב אשדוד ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 44,
        "city_name": "אשדוד",
        "street_name": "חטיבת הנגב",
        "house_number": "2",
        "phone": "5400",
        "clinic_name": "טיפת חלב אשדוד ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 45,
        "city_name": "אשדוד",
        "street_name": "השייטים",
        "house_number": "14",
        "phone": "08-8551181",
        "clinic_name": "טיפת חלב אשדוד ד'",
        "status": "פעיל"
    },
    {
        "_id": 46,
        "city_name": "אשדוד",
        "street_name": "נאות ספיר",
        "house_number": "13",
        "phone": "08-8552544",
        "clinic_name": "טיפת חלב אשדוד ה'",
        "status": "פעיל"
    },
    {
        "_id": 47,
        "city_name": "אשדוד",
        "street_name": "חורי חיים",
        "house_number": "5",
        "phone": "08-8553707",
        "clinic_name": "טיפת חלב אשדוד ו'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 48,
        "city_name": "אשדוד",
        "street_name": "שמאי",
        "house_number": "5",
        "phone": "5400",
        "clinic_name": "טיפת חלב אשדוד ז'",
        "status": "פעיל"
    },
    {
        "_id": 49,
        "city_name": "אשדוד",
        "street_name": "מבוא העירית",
        "house_number": "3",
        "phone": "08-8551113",
        "clinic_name": "טיפת חלב אשדוד ח'",
        "status": "פעיל"
    },
    {
        "_id": 50,
        "city_name": "אשדוד",
        "street_name": "כנרת",
        "house_number": "29",
        "phone": "5400",
        "clinic_name": "טיפת חלב אשדוד יא'",
        "status": "פעיל"
    },
    {
        "_id": 51,
        "city_name": "אשדוד",
        "street_name": "המלך שלמה",
        "house_number": "25",
        "phone": "08-8643326",
        "clinic_name": "טיפת חלב אשדוד יג'",
        "status": "פעיל"
    },
    {
        "_id": 52,
        "city_name": "באקה אל-גרביה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6382632",
        "clinic_name": "טיפת חלב באקה לוז",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 53,
        "city_name": "באר יעקב",
        "street_name": "יהודה",
        "house_number": "6",
        "phone": "5400",
        "clinic_name": "טיפת חלב באר יעקב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 54,
        "city_name": "בסמת טבעון",
        "street_name": "",
        "house_number": "",
        "phone": "04-9837866",
        "clinic_name": "טיפת חלב בוסמת טבעון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 55,
        "city_name": "בועיינה-נוג'ידאת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6730380",
        "clinic_name": "טיפת חלב בועיינה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 56,
        "city_name": "בוקעאתא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6981183",
        "clinic_name": "טיפת חלב בוקעתה",
        "status": "פעיל"
    },
    {
        "_id": 57,
        "city_name": "ביר אל-מכסור",
        "street_name": "",
        "house_number": "",
        "phone": "04-9866202",
        "clinic_name": "טיפת חלב ביר אל מקסור",
        "status": "פעיל"
    },
    {
        "_id": 58,
        "city_name": "ביר אל-מכסור",
        "street_name": "",
        "house_number": "",
        "phone": "04-9502842",
        "clinic_name": "טיפת חלב ביר אל מקסור מקמן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 59,
        "city_name": "בית אלפא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6070212",
        "clinic_name": "טיפת חלב בית אלפא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 60,
        "city_name": "בית ג'ן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6434431",
        "clinic_name": "טיפת חלב בית ג'אן א'+ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 61,
        "city_name": "בית ג'ן",
        "street_name": "",
        "house_number": "",
        "phone": "04-9803281",
        "clinic_name": "טיפת חלב בית ג'אן ב'",
        "status": "פעיל"
    },
    {
        "_id": 62,
        "city_name": "בית דגן",
        "street_name": "טרומפלדור",
        "house_number": "11",
        "phone": "03-9600847",
        "clinic_name": "טיפת חלב בית דגן",
        "status": "פעיל"
    },
    {
        "_id": 63,
        "city_name": "בית שמש",
        "street_name": "תלמוד בבלי",
        "house_number": "3",
        "phone": "073-3816633",
        "clinic_name": "טיפת חלב בית שולמית",
        "status": "פעיל"
    },
    {
        "_id": 64,
        "city_name": "בית שמש",
        "street_name": "רב חנן",
        "house_number": "19",
        "phone": "073-3816650",
        "clinic_name": "טיפת חלב בית תמר",
        "status": "פעיל"
    },
    {
        "_id": 65,
        "city_name": "רמלה",
        "street_name": "בן גוריון",
        "house_number": "37",
        "phone": "08-9248172",
        "clinic_name": "טיפת חלב בן גוריון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 66,
        "city_name": "בענה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9988464",
        "clinic_name": "טיפת חלב בענה",
        "status": "פעיל"
    },
    {
        "_id": 67,
        "city_name": "חולון",
        "street_name": "ארליך שמחה",
        "house_number": "2",
        "phone": "03-5540591",
        "clinic_name": "טיפת חלב בר-לב",
        "status": "פעיל"
    },
    {
        "_id": 68,
        "city_name": "בסמ\"ה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6253296",
        "clinic_name": "טיפת חלב ברטעה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 69,
        "city_name": "אשקלון",
        "street_name": "קרייתי",
        "house_number": "9",
        "phone": "08-6717770",
        "clinic_name": "טיפת חלב ברנע",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 70,
        "city_name": "חיפה",
        "street_name": "החי\"ל",
        "house_number": "2",
        "phone": "077-3441214",
        "clinic_name": "טיפת חלב בת גלים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 71,
        "city_name": "בית שמש",
        "street_name": "ירמיהו הנביא",
        "house_number": "5",
        "phone": "02-6311500",
        "clinic_name": "טיפת חלב בת שבע",
        "status": "פעיל"
    },
    {
        "_id": 72,
        "city_name": "רחובות",
        "street_name": "מקוב בתיה",
        "house_number": "16",
        "phone": "08-9451804",
        "clinic_name": "טיפת חלב בתיה מקוב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 73,
        "city_name": "ג'דיידה-מכר",
        "street_name": "",
        "house_number": "",
        "phone": "04-9562572",
        "clinic_name": "טיפת חלב ג'דידה-מכר",
        "status": "פעיל"
    },
    {
        "_id": 74,
        "city_name": "רמלה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב ג'ואריש",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 75,
        "city_name": "ג'ולס",
        "street_name": "",
        "house_number": "",
        "phone": "04-9562682",
        "clinic_name": "טיפת חלב ג'וליס",
        "status": "פעיל"
    },
    {
        "_id": 76,
        "city_name": "ג'לג'וליה",
        "street_name": "רח 131",
        "house_number": "24",
        "phone": "03-9396237",
        "clinic_name": "טיפת חלב ג'לג'וליה",
        "status": "פעיל"
    },
    {
        "_id": 77,
        "city_name": "ג'סר א-זרקא",
        "street_name": "עומר בן אלכטאב",
        "house_number": "15",
        "phone": "04-6361901",
        "clinic_name": "טיפת חלב ג'סר ב'",
        "status": "פעיל"
    },
    {
        "_id": 78,
        "city_name": "יאנוח-ג'ת",
        "street_name": "",
        "house_number": "",
        "phone": "04-9804645",
        "clinic_name": "טיפת חלב ג'ת (עכו)",
        "status": "פעיל"
    },
    {
        "_id": 79,
        "city_name": "ג'ת",
        "street_name": "",
        "house_number": "",
        "phone": "077-4030677",
        "clinic_name": "טיפת חלב ג'ת ריחן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 80,
        "city_name": "לוד",
        "street_name": "",
        "house_number": "8",
        "phone": "08-9246507",
        "clinic_name": "טיפת חלב גבעת הזיתים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 81,
        "city_name": "גבעת שמואל",
        "street_name": "אלעזר דוד",
        "house_number": "6",
        "phone": "03-5322664",
        "clinic_name": "טיפת חלב גבעת שמואל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 82,
        "city_name": "בית שמש",
        "street_name": "הנורית",
        "house_number": "2",
        "phone": "",
        "clinic_name": "טיפת חלב גבעת שרת א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 83,
        "city_name": "בת ים",
        "street_name": "בלפור",
        "house_number": "152",
        "phone": "03-5526771",
        "clinic_name": "טיפת חלב גלעד",
        "status": "פעיל"
    },
    {
        "_id": 84,
        "city_name": "ראשון לציון",
        "street_name": "רופין",
        "house_number": "5",
        "phone": "03-9657722",
        "clinic_name": "טיפת חלב גן נחום",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 85,
        "city_name": "לוד",
        "street_name": "צמרות",
        "house_number": "7",
        "phone": "08-9227239",
        "clinic_name": "טיפת חלב גני אביב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 86,
        "city_name": "זכרון יעקב",
        "street_name": "קבוץ גלויות",
        "house_number": "12",
        "phone": "04-6399158",
        "clinic_name": "טיפת חלב גפן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 87,
        "city_name": "חיפה",
        "street_name": "גולן שמחה",
        "house_number": "54",
        "phone": "077-7878625",
        "clinic_name": "טיפת חלב גרנד קניון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 88,
        "city_name": "דבוריה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6315639",
        "clinic_name": "טיפת חלב דבוריה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 89,
        "city_name": "נתניה",
        "street_name": "דרך דגניה",
        "house_number": "92",
        "phone": "09-8322714",
        "clinic_name": "טיפת חלב דגניה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 90,
        "city_name": "פרדס חנה-כרכור",
        "street_name": "עציון",
        "house_number": "",
        "phone": "077-7292652",
        "clinic_name": "טיפת חלב דובדבן נווה מרחב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 91,
        "city_name": "מודיעין-מכבים-רעות",
        "street_name": "הנביאים",
        "house_number": "23",
        "phone": "08-9707512",
        "clinic_name": "טיפת חלב דוכיפת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 92,
        "city_name": "דימונה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6559381",
        "clinic_name": "טיפת חלב דימונה א'",
        "status": "פעיל"
    },
    {
        "_id": 93,
        "city_name": "דימונה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6553750",
        "clinic_name": "טיפת חלב דימונה ה'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 94,
        "city_name": "דייר אל-אסד",
        "street_name": "",
        "house_number": "",
        "phone": "04-9881056",
        "clinic_name": "טיפת חלב דיר אלאסד",
        "status": "פעיל"
    },
    {
        "_id": 95,
        "city_name": "דייר חנא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6780616",
        "clinic_name": "טיפת חלב דיר חנא א",
        "status": "פעיל"
    },
    {
        "_id": 96,
        "city_name": "דייר חנא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6783224",
        "clinic_name": "טיפת חלב דיר חנא ב",
        "status": "פעיל"
    },
    {
        "_id": 97,
        "city_name": "שייח' דנון",
        "street_name": "",
        "house_number": "",
        "phone": "04-9820904",
        "clinic_name": "טיפת חלב דנון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 98,
        "city_name": "צפת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6970140",
        "clinic_name": "טיפת חלב דרום א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 99,
        "city_name": "צפת",
        "street_name": "הרצל",
        "house_number": "",
        "phone": "04-6921081",
        "clinic_name": "טיפת חלב דרום ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 100,
        "city_name": "עפולה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6596887",
        "clinic_name": "טיפת חלב דרוקר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 101,
        "city_name": "דריג'את",
        "street_name": "",
        "house_number": "",
        "phone": "08-9724655",
        "clinic_name": "טיפת חלב דריג'את",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 102,
        "city_name": "נוף הגליל",
        "street_name": "האדמו\"ר מבעלזא",
        "house_number": "5",
        "phone": "073-3495151",
        "clinic_name": "טיפת חלב האירוסים הר יונה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 103,
        "city_name": "בת ים",
        "street_name": "הבנים",
        "house_number": "7",
        "phone": "03-5512816",
        "clinic_name": "טיפת חלב הבנים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 104,
        "city_name": "ביתר עילית",
        "street_name": "חב\"ד",
        "house_number": "2",
        "phone": "073-3816611",
        "clinic_name": "טיפת חלב הגפן",
        "status": "פעיל"
    },
    {
        "_id": 105,
        "city_name": "ביתר עילית",
        "street_name": "חב\"ד",
        "house_number": "2",
        "phone": "02-5800106",
        "clinic_name": "טיפת חלב הדס",
        "status": "פעיל"
    },
    {
        "_id": 106,
        "city_name": "אילת",
        "street_name": "ברנע",
        "house_number": "",
        "phone": "08-6341071",
        "clinic_name": "טיפת חלב הדקל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 107,
        "city_name": "פתח תקווה",
        "street_name": "הרב משורר ישעיהו",
        "house_number": "8",
        "phone": "5400",
        "clinic_name": "טיפת חלב הדר גנים - המשורר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 108,
        "city_name": "רמת גן",
        "street_name": "החי\"ל",
        "house_number": "16",
        "phone": "03-6771286",
        "clinic_name": "טיפת חלב החייל",
        "status": "פעיל"
    },
    {
        "_id": 109,
        "city_name": "פתח תקווה",
        "street_name": "היבנר",
        "house_number": "3",
        "phone": "03-9213958",
        "clinic_name": "טיפת חלב היבנר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 110,
        "city_name": "בית שמש",
        "street_name": "הגליל",
        "house_number": "2",
        "phone": "073-3816600",
        "clinic_name": "טיפת חלב היובל",
        "status": "פעיל"
    },
    {
        "_id": 111,
        "city_name": "רמת גן",
        "street_name": "המעגל",
        "house_number": "24",
        "phone": "03-6701270",
        "clinic_name": "טיפת חלב המעגל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 112,
        "city_name": "ראשון לציון",
        "street_name": "הנחשול",
        "house_number": "26",
        "phone": "03-9614480",
        "clinic_name": "טיפת חלב הנחשול",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 113,
        "city_name": "חולון",
        "street_name": "י\"א באדר",
        "house_number": "2",
        "phone": "03-6512520",
        "clinic_name": "טיפת חלב הצפירה",
        "status": "פעיל"
    },
    {
        "_id": 114,
        "city_name": "קרית ביאליק",
        "street_name": "מרטין בובר",
        "house_number": "7",
        "phone": "04-8761327",
        "clinic_name": "טיפת חלב הקשת",
        "status": "פעיל"
    },
    {
        "_id": 115,
        "city_name": "נוף הגליל",
        "street_name": "עדעד",
        "house_number": "18",
        "phone": "04-6450979",
        "clinic_name": "טיפת חלב הר יונה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 116,
        "city_name": "בני ברק",
        "street_name": "הרצוג",
        "house_number": "20",
        "phone": "03-5704619",
        "clinic_name": "טיפת חלב הרצוג",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 117,
        "city_name": "מבשרת ציון",
        "street_name": "השלום",
        "house_number": "57",
        "phone": "5400",
        "clinic_name": "טיפת חלב השלום מבשרת ציון",
        "status": "פעיל"
    },
    {
        "_id": 118,
        "city_name": "בת ים",
        "street_name": "התבור",
        "house_number": "7",
        "phone": "03-5512327",
        "clinic_name": "טיפת חלב התבור",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 119,
        "city_name": "ביר הדאג'",
        "street_name": "",
        "house_number": "",
        "phone": "08-8547789",
        "clinic_name": "טיפת חלב ואדי אלנעם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 120,
        "city_name": "חמאם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6715184",
        "clinic_name": "טיפת חלב ואדי חמאם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 121,
        "city_name": "סלמה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6783430",
        "clinic_name": "טיפת חלב ואדי סלאמה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 122,
        "city_name": "קרית שמונה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9126601",
        "clinic_name": "טיפת חלב ורדים",
        "status": "פעיל"
    },
    {
        "_id": 123,
        "city_name": "נתניה",
        "street_name": "הרב אונטרמן יהודה",
        "house_number": "7",
        "phone": "09-8873774",
        "clinic_name": "טיפת חלב ותיקים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 124,
        "city_name": "רמת גן",
        "street_name": "המרגנית",
        "house_number": "10",
        "phone": "03-7513783",
        "clinic_name": "טיפת חלב ותיקים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 125,
        "city_name": "זכרון יעקב",
        "street_name": "קדושי השואה",
        "house_number": "8",
        "phone": "077-7292549",
        "clinic_name": "טיפת חלב זכרון מושבה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 126,
        "city_name": "מעלה עירון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6420737",
        "clinic_name": "טיפת חלב זלפה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 127,
        "city_name": "זרזיר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6515683",
        "clinic_name": "טיפת חלב זרזיר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 128,
        "city_name": "כעביה-טבאש-חג'אג'רה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9531360",
        "clinic_name": "טיפת חלב חג'אג'רה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 129,
        "city_name": "חוסנייה",
        "street_name": "",
        "house_number": "",
        "phone": "053-8887795",
        "clinic_name": "טיפת חלב חוסניה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 130,
        "city_name": "חורה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6518645",
        "clinic_name": "טיפת חלב חורה א'",
        "status": "פעיל"
    },
    {
        "_id": 131,
        "city_name": "חורה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6510980",
        "clinic_name": "טיפת חלב חורה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 132,
        "city_name": "חיפה",
        "street_name": "כורי",
        "house_number": "1",
        "phone": "04-8622973",
        "clinic_name": "טיפת חלב חורי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 133,
        "city_name": "חורפיש",
        "street_name": "",
        "house_number": "",
        "phone": "04-9979950",
        "clinic_name": "טיפת חלב חורפיש",
        "status": "פעיל"
    },
    {
        "_id": 134,
        "city_name": "קרית מוצקין",
        "street_name": "חיבת ציון",
        "house_number": "3",
        "phone": "077-9525795",
        "clinic_name": "טיפת חלב חיבת ציון",
        "status": "פעיל"
    },
    {
        "_id": 135,
        "city_name": "חיפה",
        "street_name": "הירדן",
        "house_number": "19",
        "phone": "077-3238322",
        "clinic_name": "טיפת חלב חליסה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 136,
        "city_name": "פרדס חנה-כרכור",
        "street_name": "המעלה",
        "house_number": "35",
        "phone": "077-3378842",
        "clinic_name": "טיפת חלב חרוב פרדס חנה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 137,
        "city_name": "בת ים",
        "street_name": "הנביאים",
        "house_number": "1/א",
        "phone": "03-5516865",
        "clinic_name": "טיפת חלב חרושת",
        "status": "פעיל"
    },
    {
        "_id": 138,
        "city_name": "באר שבע",
        "street_name": "טבנקין",
        "house_number": "9",
        "phone": "08-6411166",
        "clinic_name": "טיפת חלב טבנקין",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 139,
        "city_name": "טבריה",
        "street_name": "המגינים",
        "house_number": "34",
        "phone": "04-6724357",
        "clinic_name": "טיפת חלב טבריה תחנה א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 140,
        "city_name": "טבריה",
        "street_name": "ארליך",
        "house_number": "5",
        "phone": "04-6720726",
        "clinic_name": "טיפת חלב טבריה תחנה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 141,
        "city_name": "טבריה",
        "street_name": "ארליך",
        "house_number": "5",
        "phone": "04-6720831",
        "clinic_name": "טיפת חלב טבריה תחנה ג'",
        "status": "פעיל"
    },
    {
        "_id": 142,
        "city_name": "טבריה",
        "street_name": "שד אלנטאון",
        "house_number": "1",
        "phone": "04-6796183",
        "clinic_name": "טיפת חלב טבריה תחנה ד'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 143,
        "city_name": "טבריה",
        "street_name": "אבו חצירה",
        "house_number": "8",
        "phone": "04-6434251",
        "clinic_name": "טיפת חלב טבריה תחנה ו'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 144,
        "city_name": "טבריה",
        "street_name": "רמת אגוז",
        "house_number": "",
        "phone": "04-6796202",
        "clinic_name": "טיפת חלב טבריה תחנה ז'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 145,
        "city_name": "טובא-זנגריה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6800924",
        "clinic_name": "טיפת חלב טובא",
        "status": "פעיל"
    },
    {
        "_id": 146,
        "city_name": "טורעאן",
        "street_name": "בירות",
        "house_number": "2188",
        "phone": "04-6517808",
        "clinic_name": "טיפת חלב טורעאן א'",
        "status": "פעיל"
    },
    {
        "_id": 147,
        "city_name": "טורעאן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6411451",
        "clinic_name": "טיפת חלב טורעאן ב'",
        "status": "פעיל"
    },
    {
        "_id": 148,
        "city_name": "טייבה (בעמק)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6070069",
        "clinic_name": "טיפת חלב טייבה (בעמק)",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 149,
        "city_name": "טייבה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7991003",
        "clinic_name": "טיפת חלב טייבה א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 150,
        "city_name": "טייבה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7993062",
        "clinic_name": "טיפת חלב טייבה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 151,
        "city_name": "טייבה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7991971",
        "clinic_name": "טיפת חלב טייבה ד'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 152,
        "city_name": "בית שמש",
        "street_name": "",
        "house_number": "",
        "phone": "1700-504-121",
        "clinic_name": "טיפת חלב טיפת חלב ניידת מחוז ירושלים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 153,
        "city_name": "קרית יערים",
        "street_name": "הרי\"ף",
        "house_number": "7",
        "phone": "02-5341815",
        "clinic_name": "טיפת חלב טלזסטון",
        "status": "פעיל"
    },
    {
        "_id": 154,
        "city_name": "טמרה (יזרעאל)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6620114",
        "clinic_name": "טיפת חלב טמרה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 155,
        "city_name": "טמרה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9943139",
        "clinic_name": "טיפת חלב טמרה א' + ה'",
        "status": "פעיל"
    },
    {
        "_id": 156,
        "city_name": "טמרה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9948759",
        "clinic_name": "טיפת חלב טמרה ג",
        "status": "פעיל"
    },
    {
        "_id": 157,
        "city_name": "טמרה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9941242",
        "clinic_name": "טיפת חלב טמרה ו",
        "status": "פעיל"
    },
    {
        "_id": 158,
        "city_name": "יאנוח-ג'ת",
        "street_name": "",
        "house_number": "",
        "phone": "04-9976560",
        "clinic_name": "טיפת חלב יאנוח",
        "status": "פעיל"
    },
    {
        "_id": 159,
        "city_name": "יבנאל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6708740",
        "clinic_name": "טיפת חלב יבניאל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 160,
        "city_name": "מעלה אדומים",
        "street_name": "ככר יהלום",
        "house_number": "17",
        "phone": "5400",
        "clinic_name": "טיפת חלב יהלום",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 161,
        "city_name": "בני ברק",
        "street_name": "יואל",
        "house_number": "18",
        "phone": "03-6185662",
        "clinic_name": "טיפת חלב יואל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 162,
        "city_name": "באר שבע",
        "street_name": "רחבת הרב קוק",
        "house_number": "28",
        "phone": "08-6419677",
        "clinic_name": "טיפת חלב יונתן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 163,
        "city_name": "קרית אתא",
        "street_name": "יוספטל",
        "house_number": "56",
        "phone": "077-7840979",
        "clinic_name": "טיפת חלב יוספטל - קריית אתא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 164,
        "city_name": "חיפה",
        "street_name": "סילבר אבא הלל",
        "house_number": "8",
        "phone": "04-8233777",
        "clinic_name": "טיפת חלב יזרעאליה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 165,
        "city_name": "זמר",
        "street_name": "",
        "house_number": "",
        "phone": "09-8743303",
        "clinic_name": "טיפת חלב ימה",
        "status": "פעיל"
    },
    {
        "_id": 166,
        "city_name": "יפיע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6011847",
        "clinic_name": "טיפת חלב יפיע א'",
        "status": "פעיל"
    },
    {
        "_id": 167,
        "city_name": "יפיע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6010959",
        "clinic_name": "טיפת חלב יפיע ב'",
        "status": "פעיל"
    },
    {
        "_id": 168,
        "city_name": "ירוחם",
        "street_name": "נחל צין",
        "house_number": "67",
        "phone": "08-6580161",
        "clinic_name": "טיפת חלב ירוחם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 169,
        "city_name": "ירכא",
        "street_name": "אבו סנאן א\"ס",
        "house_number": "",
        "phone": "04-9568112",
        "clinic_name": "טיפת חלב ירכא א + ב",
        "status": "פעיל"
    },
    {
        "_id": 170,
        "city_name": "פתח תקווה",
        "street_name": "כ\"ט בנובמבר",
        "house_number": "4",
        "phone": "03-9342888",
        "clinic_name": "טיפת חלב כ\"ט בנובמבר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 171,
        "city_name": "כאבול",
        "street_name": "",
        "house_number": "",
        "phone": "077-6017629",
        "clinic_name": "טיפת חלב כאבול א",
        "status": "פעיל"
    },
    {
        "_id": 172,
        "city_name": "כאבול",
        "street_name": "",
        "house_number": "",
        "phone": "04-9940126",
        "clinic_name": "טיפת חלב כאבול ב",
        "status": "פעיל"
    },
    {
        "_id": 173,
        "city_name": "כאוכב אבו אל-היג'א",
        "street_name": "",
        "house_number": "",
        "phone": "04-9998872",
        "clinic_name": "טיפת חלב כאוכב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 174,
        "city_name": "כסרא-סמיע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6029949",
        "clinic_name": "טיפת חלב כיסרא ב'",
        "status": "פעיל"
    },
    {
        "_id": 175,
        "city_name": "חצור הגלילית",
        "street_name": "האשחר",
        "house_number": "2",
        "phone": "04-6937375",
        "clinic_name": "טיפת חלב כליל החורש",
        "status": "פעיל"
    },
    {
        "_id": 176,
        "city_name": "באר שבע",
        "street_name": "מארי קירי",
        "house_number": "16",
        "phone": "08-6599890",
        "clinic_name": "טיפת חלב כלניות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 177,
        "city_name": "כמאנה",
        "street_name": "",
        "house_number": "",
        "phone": "050-6242575",
        "clinic_name": "טיפת חלב כמאנה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 178,
        "city_name": "צפת",
        "street_name": "השבעה",
        "house_number": "323",
        "phone": "04-6920984",
        "clinic_name": "טיפת חלב כנען",
        "status": "פעיל"
    },
    {
        "_id": 179,
        "city_name": "כסיפה",
        "street_name": "שכ 24",
        "house_number": "",
        "phone": "08-9955098",
        "clinic_name": "טיפת חלב כסיפה א",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 180,
        "city_name": "כסיפה",
        "street_name": "שכ 13",
        "house_number": "",
        "phone": "08-6654201",
        "clinic_name": "טיפת חלב כסיפה ב",
        "status": "פעיל"
    },
    {
        "_id": 181,
        "city_name": "כסרא-סמיע",
        "street_name": "",
        "house_number": "",
        "phone": "04-9873070",
        "clinic_name": "טיפת חלב כסרא",
        "status": "פעיל"
    },
    {
        "_id": 182,
        "city_name": "כעביה-טבאש-חג'אג'רה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9536668",
        "clinic_name": "טיפת חלב כעבייה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 183,
        "city_name": "פתח תקווה",
        "street_name": "רבי עקיבא",
        "house_number": "13",
        "phone": "03-9306962",
        "clinic_name": "טיפת חלב כפר אברהם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 184,
        "city_name": "כפר ברא",
        "street_name": "",
        "house_number": "",
        "phone": "03-9021271",
        "clinic_name": "טיפת חלב כפר ברא",
        "status": "פעיל"
    },
    {
        "_id": 185,
        "city_name": "כפר חב\"ד",
        "street_name": "",
        "house_number": "",
        "phone": "03-9606993",
        "clinic_name": "טיפת חלב כפר חב\"ד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 186,
        "city_name": "כפר יאסיף",
        "street_name": "",
        "house_number": "",
        "phone": "04-9996098",
        "clinic_name": "טיפת חלב כפר יאסיף א' + ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 187,
        "city_name": "כפר יונה",
        "street_name": "הרצל",
        "house_number": "13",
        "phone": "09-8971168",
        "clinic_name": "טיפת חלב כפר יונה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 188,
        "city_name": "כפר כמא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6765660",
        "clinic_name": "טיפת חלב כפר כמא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 189,
        "city_name": "כפר כנא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6517277",
        "clinic_name": "טיפת חלב כפר כנא א'",
        "status": "פעיל"
    },
    {
        "_id": 190,
        "city_name": "כפר כנא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6411782",
        "clinic_name": "טיפת חלב כפר כנא ב'",
        "status": "פעיל"
    },
    {
        "_id": 191,
        "city_name": "כפר כנא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6419167",
        "clinic_name": "טיפת חלב כפר כנא ג'",
        "status": "פעיל"
    },
    {
        "_id": 192,
        "city_name": "כפר מנדא",
        "street_name": "",
        "house_number": "",
        "phone": "04-9864453",
        "clinic_name": "טיפת חלב כפר מנדא א",
        "status": "פעיל"
    },
    {
        "_id": 193,
        "city_name": "כפר מנדא",
        "street_name": "",
        "house_number": "",
        "phone": "04-9863614",
        "clinic_name": "טיפת חלב כפר מנדא ב",
        "status": "פעיל"
    },
    {
        "_id": 194,
        "city_name": "כפר מנדא",
        "street_name": "",
        "house_number": "",
        "phone": "04-9864708",
        "clinic_name": "טיפת חלב כפר מנדא ג",
        "status": "פעיל"
    },
    {
        "_id": 195,
        "city_name": "משהד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6519510",
        "clinic_name": "טיפת חלב כפר משהד",
        "status": "פעיל"
    },
    {
        "_id": 196,
        "city_name": "כפר קאסם",
        "street_name": "",
        "house_number": "",
        "phone": "03-9071834",
        "clinic_name": "טיפת חלב כפר קאסם א'",
        "status": "פעיל"
    },
    {
        "_id": 197,
        "city_name": "כפר תבור",
        "street_name": "נורית",
        "house_number": "1",
        "phone": "04-6766868",
        "clinic_name": "טיפת חלב כפר תבור",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 198,
        "city_name": "כרמיאל",
        "street_name": "חטיבת הראל",
        "house_number": "9",
        "phone": "04-9088000",
        "clinic_name": "טיפת חלב כרמיאל לאומית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 199,
        "city_name": "בני ברק",
        "street_name": "רבי עקיבא",
        "house_number": "86",
        "phone": "03-6162850",
        "clinic_name": "טיפת חלב לב העיר",
        "status": "פעיל"
    },
    {
        "_id": 200,
        "city_name": "חדרה",
        "street_name": "מבצע עזרא",
        "house_number": "1",
        "phone": "04-6337867",
        "clinic_name": "טיפת חלב לוטוס",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 201,
        "city_name": "בית שמש",
        "street_name": "נחל לכיש",
        "house_number": "32",
        "phone": "5400",
        "clinic_name": "טיפת חלב לכיש/עדן",
        "status": "פעיל"
    },
    {
        "_id": 202,
        "city_name": "בני ברק",
        "street_name": "הרב לנדא יעקב",
        "house_number": "4",
        "phone": "03-5704098",
        "clinic_name": "טיפת חלב לנדא",
        "status": "פעיל"
    },
    {
        "_id": 203,
        "city_name": "לקיה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6517479",
        "clinic_name": "טיפת חלב לקיה א'",
        "status": "פעיל"
    },
    {
        "_id": 204,
        "city_name": "לקיה",
        "street_name": "",
        "house_number": "",
        "phone": "054-9900954",
        "clinic_name": "טיפת חלב לקיה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 205,
        "city_name": "מבועים",
        "street_name": "",
        "house_number": "",
        "phone": "08-9930061",
        "clinic_name": "טיפת חלב מבועים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 206,
        "city_name": "מגאר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6780249",
        "clinic_name": "טיפת חלב מג'אר ג'משה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 207,
        "city_name": "מגאר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6783265",
        "clinic_name": "טיפת חלב מג'אר מנסורה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 208,
        "city_name": "מגאר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6786132",
        "clinic_name": "טיפת חלב מג'אר מרכזית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 209,
        "city_name": "מגאר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6784630",
        "clinic_name": "טיפת חלב מג'אר צפונית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 210,
        "city_name": "מגאר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6781059",
        "clinic_name": "טיפת חלב מג'אר ראסאלכביה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 211,
        "city_name": "מג'ד אל-כרום",
        "street_name": "",
        "house_number": "",
        "phone": "04-6447065",
        "clinic_name": "טיפת חלב מג'ד אל-כרום",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 212,
        "city_name": "מג'דל שמס",
        "street_name": "",
        "house_number": "",
        "phone": "04-6983183",
        "clinic_name": "טיפת חלב מג'דל שמס",
        "status": "פעיל"
    },
    {
        "_id": 213,
        "city_name": "מגדל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6720742",
        "clinic_name": "טיפת חלב מגדל",
        "status": "פעיל"
    },
    {
        "_id": 214,
        "city_name": "מעלה עירון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6311384",
        "clinic_name": "טיפת חלב מוסמוס",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 215,
        "city_name": "מוקייבלה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6407385",
        "clinic_name": "טיפת חלב מוקייבלה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 216,
        "city_name": "מזכרת בתיה",
        "street_name": "רקפת",
        "house_number": "3",
        "phone": "08-9340341",
        "clinic_name": "טיפת חלב מזכרת בתיה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 217,
        "city_name": "מזרעה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9829178",
        "clinic_name": "טיפת חלב מזרעה",
        "status": "פעיל"
    },
    {
        "_id": 218,
        "city_name": "חיפה",
        "street_name": "מימון הרב",
        "house_number": "31",
        "phone": "077-3224721",
        "clinic_name": "טיפת חלב מימון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 219,
        "city_name": "ים המלח - בתי מלון",
        "street_name": "",
        "house_number": "",
        "phone": "08-6263536",
        "clinic_name": "טיפת חלב מלון נבו",
        "status": "פעיל"
    },
    {
        "_id": 220,
        "city_name": "מנשית זבדה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6415120",
        "clinic_name": "טיפת חלב מנשית זבדה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 221,
        "city_name": "מסעדה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6983319",
        "clinic_name": "טיפת חלב מסעדה",
        "status": "פעיל"
    },
    {
        "_id": 222,
        "city_name": "בסמ\"ה",
        "street_name": "מועאוויה",
        "house_number": "",
        "phone": "04-6351858",
        "clinic_name": "טיפת חלב מעוויה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 223,
        "city_name": "מעיליא",
        "street_name": "",
        "house_number": "",
        "phone": "04-9979745",
        "clinic_name": "טיפת חלב מעיליא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 224,
        "city_name": "מעלות-תרשיחא",
        "street_name": "הארזים",
        "house_number": "1",
        "phone": "04-9077003",
        "clinic_name": "טיפת חלב מעלות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 225,
        "city_name": "רמת גן",
        "street_name": "שד ק\"ם",
        "house_number": "10",
        "phone": "03-6777686",
        "clinic_name": "טיפת חלב מעלות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 226,
        "city_name": "בת ים",
        "street_name": "המעפילים",
        "house_number": "16",
        "phone": "5400",
        "clinic_name": "טיפת חלב מעפילים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 227,
        "city_name": "בני ברק",
        "street_name": "הרב רבינוב",
        "house_number": "29",
        "phone": "03-5708223",
        "clinic_name": "טיפת חלב מצדה",
        "status": "פעיל"
    },
    {
        "_id": 228,
        "city_name": "מצפה רמון",
        "street_name": "",
        "house_number": "",
        "phone": "08-6588773",
        "clinic_name": "טיפת חלב מצפה רמון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 229,
        "city_name": "כפר מצר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6769512",
        "clinic_name": "טיפת חלב מצר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 230,
        "city_name": "בית שמש",
        "street_name": "אור החיים",
        "house_number": "2",
        "phone": "5400",
        "clinic_name": "טיפת חלב מרגלית",
        "status": "פעיל"
    },
    {
        "_id": 231,
        "city_name": "חיפה",
        "street_name": "מרגלית",
        "house_number": "1",
        "phone": "077-3245139",
        "clinic_name": "טיפת חלב מרגלית",
        "status": "פעיל"
    },
    {
        "_id": 232,
        "city_name": "מירון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6987898",
        "clinic_name": "טיפת חלב מרום הגליל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 233,
        "city_name": "צפת",
        "street_name": "הגליל",
        "house_number": "9",
        "phone": "04-6434301",
        "clinic_name": "טיפת חלב מרכז קליטה כנען",
        "status": "סגור"
    },
    {
        "_id": 234,
        "city_name": "ראשון לציון",
        "street_name": "התזמורת",
        "house_number": "30",
        "phone": "03-9412574",
        "clinic_name": "טיפת חלב נאות אשלים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 235,
        "city_name": "חולון",
        "street_name": "אורים",
        "house_number": "7",
        "phone": "03-6510397",
        "clinic_name": "טיפת חלב נאות רחל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 236,
        "city_name": "ראשון לציון",
        "street_name": "בן סרוק",
        "house_number": "3",
        "phone": "03-9410904",
        "clinic_name": "טיפת חלב נאות שיקמה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 237,
        "city_name": "נהריה",
        "street_name": "ויצמן",
        "house_number": "84",
        "phone": "04-9921902",
        "clinic_name": "טיפת חלב נהריה וייצמן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 238,
        "city_name": "בועיינה-נוג'ידאת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6730984",
        "clinic_name": "טיפת חלב נוג'ידאת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 239,
        "city_name": "פתח תקווה",
        "street_name": "ברוריה",
        "house_number": "1",
        "phone": "03-5433808",
        "clinic_name": "טיפת חלב נוה גן",
        "status": "פעיל"
    },
    {
        "_id": 240,
        "city_name": "חדרה",
        "street_name": "אהרונוביץ",
        "house_number": "16",
        "phone": "077-2031327",
        "clinic_name": "טיפת חלב נוה חיים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 241,
        "city_name": "לוד",
        "street_name": "רותם",
        "house_number": "11",
        "phone": "08-9255548",
        "clinic_name": "טיפת חלב נוה נוף",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 242,
        "city_name": "פתח תקווה",
        "street_name": "זייד אלכסנדר",
        "house_number": "34",
        "phone": "03-5254100",
        "clinic_name": "טיפת חלב נוה עוז",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 243,
        "city_name": "חיפה",
        "street_name": "אסא המלך",
        "house_number": "4",
        "phone": "077-9610225",
        "clinic_name": "טיפת חלב נווה דוד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 244,
        "city_name": "נתניה",
        "street_name": "הרצוג",
        "house_number": "14",
        "phone": "09-8344477",
        "clinic_name": "טיפת חלב נווה דוד",
        "status": "פעיל"
    },
    {
        "_id": 245,
        "city_name": "אשקלון",
        "street_name": "אקסודוס",
        "house_number": "12",
        "phone": "08-6780176",
        "clinic_name": "טיפת חלב נווה דקלים",
        "status": "פעיל"
    },
    {
        "_id": 246,
        "city_name": "פוריה - נווה עובד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6434317",
        "clinic_name": "טיפת חלב נווה עובד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 247,
        "city_name": "חולון",
        "street_name": "ביאליק",
        "house_number": "165/166",
        "phone": "03-6510398",
        "clinic_name": "טיפת חלב נווה רמז",
        "status": "פעיל"
    },
    {
        "_id": 248,
        "city_name": "בני ברק",
        "street_name": "נויפלד",
        "house_number": "15",
        "phone": "03-5709720",
        "clinic_name": "טיפת חלב נויפלד",
        "status": "פעיל"
    },
    {
        "_id": 249,
        "city_name": "נוף הגליל",
        "street_name": "נרקיסים",
        "house_number": "14",
        "phone": "04-6576784",
        "clinic_name": "טיפת חלב נוף הגליל א'-חרמון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 250,
        "city_name": "נוף הגליל",
        "street_name": "סביון",
        "house_number": "2א",
        "phone": "04-6564637",
        "clinic_name": "טיפת חלב נוף הגליל ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 251,
        "city_name": "מגדל העמק",
        "street_name": "שד הבנים",
        "house_number": "111",
        "phone": "04-6443808",
        "clinic_name": "טיפת חלב נוף העמק",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 252,
        "city_name": "מודיעין-מכבים-רעות",
        "street_name": "נחל צלמון",
        "house_number": "17",
        "phone": "08-9751553",
        "clinic_name": "טיפת חלב נחל צלמון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 253,
        "city_name": "נחף",
        "street_name": "",
        "house_number": "",
        "phone": "04-9988084",
        "clinic_name": "טיפת חלב נחף א' + ב'",
        "status": "פעיל"
    },
    {
        "_id": 254,
        "city_name": "ניין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6592103",
        "clinic_name": "טיפת חלב ניין",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 255,
        "city_name": "נאעורה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6070068",
        "clinic_name": "טיפת חלב נעורה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 256,
        "city_name": "נשר",
        "street_name": "הורדים",
        "house_number": "22",
        "phone": "04-8218214",
        "clinic_name": "טיפת חלב נשר, הורדים",
        "status": "פעיל"
    },
    {
        "_id": 257,
        "city_name": "נשר",
        "street_name": "התפוז",
        "house_number": "23",
        "phone": "077-5252172",
        "clinic_name": "טיפת חלב נשר, התפוז",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 258,
        "city_name": "נתיבות",
        "street_name": "מסעוד אלפסי",
        "house_number": "",
        "phone": "08-9932833",
        "clinic_name": "טיפת חלב נתיבות ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 259,
        "city_name": "נתיבות",
        "street_name": "הרב צבאן",
        "house_number": "",
        "phone": "08-9931213",
        "clinic_name": "טיפת חלב נתיבות ג'",
        "status": "פעיל"
    },
    {
        "_id": 260,
        "city_name": "סאג'ור",
        "street_name": "",
        "house_number": "",
        "phone": "04-9583250",
        "clinic_name": "טיפת חלב סאג'ור",
        "status": "פעיל"
    },
    {
        "_id": 261,
        "city_name": "בנימינה-גבעת עדה",
        "street_name": "דרך העצמאות",
        "house_number": "90",
        "phone": "077-7801427",
        "clinic_name": "טיפת חלב סביון בנימינה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 262,
        "city_name": "סולם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6420289",
        "clinic_name": "טיפת חלב סולם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 263,
        "city_name": "סח'נין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6741103",
        "clinic_name": "טיפת חלב סחנין א",
        "status": "פעיל"
    },
    {
        "_id": 264,
        "city_name": "סח'נין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6743551",
        "clinic_name": "טיפת חלב סחנין ב'",
        "status": "פעיל"
    },
    {
        "_id": 265,
        "city_name": "סח'נין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6743028",
        "clinic_name": "טיפת חלב סחנין ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 266,
        "city_name": "סח'נין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6438806",
        "clinic_name": "טיפת חלב סחנין ד'",
        "status": "פעיל"
    },
    {
        "_id": 267,
        "city_name": "נתניה",
        "street_name": "יוספטל",
        "house_number": "29",
        "phone": "09-8824926",
        "clinic_name": "טיפת חלב סלע",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 268,
        "city_name": "כסרא-סמיע",
        "street_name": "",
        "house_number": "",
        "phone": "04-9979869",
        "clinic_name": "טיפת חלב סמיע",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 269,
        "city_name": "ערערה",
        "street_name": "",
        "house_number": "",
        "phone": "077-9616867",
        "clinic_name": "טיפת חלב עארה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 270,
        "city_name": "באקה אל-גרביה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6382102",
        "clinic_name": "טיפת חלב עדן רוז",
        "status": "פעיל"
    },
    {
        "_id": 271,
        "city_name": "עוזייר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6517587",
        "clinic_name": "טיפת חלב עוזיר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 272,
        "city_name": "עיילבון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6784544",
        "clinic_name": "טיפת חלב עילבון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 273,
        "city_name": "עילוט",
        "street_name": "",
        "house_number": "",
        "phone": "04-6461702",
        "clinic_name": "טיפת חלב עילוט",
        "status": "פעיל"
    },
    {
        "_id": 274,
        "city_name": "אום אל-פחם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6316730",
        "clinic_name": "טיפת חלב עין אברהים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 275,
        "city_name": "עין מאהל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6470884",
        "clinic_name": "טיפת חלב עין מאהל א'",
        "status": "פעיל"
    },
    {
        "_id": 276,
        "city_name": "עין מאהל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6455537",
        "clinic_name": "טיפת חלב עין מאהל ב'",
        "status": "פעיל"
    },
    {
        "_id": 277,
        "city_name": "עין נקובא",
        "street_name": "",
        "house_number": "",
        "phone": "02-5332435",
        "clinic_name": "טיפת חלב עין נקובא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 278,
        "city_name": "עין קנייא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6984253",
        "clinic_name": "טיפת חלב עין קנייא",
        "status": "פעיל"
    },
    {
        "_id": 279,
        "city_name": "ראשון לציון",
        "street_name": "העינב",
        "house_number": "18",
        "phone": "03-9652211",
        "clinic_name": "טיפת חלב עינב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 280,
        "city_name": "דאלית אל-כרמל",
        "street_name": "",
        "house_number": "",
        "phone": "04-8395511",
        "clinic_name": "טיפת חלב עיר הכרמל - דליה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 281,
        "city_name": "דאלית אל-כרמל",
        "street_name": "",
        "house_number": "",
        "phone": "04-8396450",
        "clinic_name": "טיפת חלב עיר הכרמל - דליה ג'",
        "status": "פעיל"
    },
    {
        "_id": 282,
        "city_name": "עספיא",
        "street_name": "",
        "house_number": "",
        "phone": "04-8391813",
        "clinic_name": "טיפת חלב עיר הכרמל - עוספיה",
        "status": "פעיל"
    },
    {
        "_id": 283,
        "city_name": "עכו",
        "street_name": "בן עמי",
        "house_number": "49",
        "phone": "04-9559405",
        "clinic_name": "טיפת חלב עכו לאומית",
        "status": "פעיל"
    },
    {
        "_id": 284,
        "city_name": "רמת גן",
        "street_name": "פומבדיתא",
        "house_number": "11",
        "phone": "03-6742521",
        "clinic_name": "טיפת חלב עמידר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 285,
        "city_name": "עפולה",
        "street_name": "וולפסון",
        "house_number": "22",
        "phone": "04-6527615",
        "clinic_name": "טיפת חלב עפולה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 286,
        "city_name": "עפולה",
        "street_name": "שדה יצחק",
        "house_number": "1",
        "phone": "04-6490467",
        "clinic_name": "טיפת חלב עפולה עלית א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 287,
        "city_name": "עראבה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6749852",
        "clinic_name": "טיפת חלב עראבה א'",
        "status": "פעיל"
    },
    {
        "_id": 288,
        "city_name": "עראבה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6744184",
        "clinic_name": "טיפת חלב עראבה ג'",
        "status": "פעיל"
    },
    {
        "_id": 289,
        "city_name": "עראבה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6742650",
        "clinic_name": "טיפת חלב עראבה ד'",
        "status": "פעיל"
    },
    {
        "_id": 290,
        "city_name": "עראמשה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9807429",
        "clinic_name": "טיפת חלב עראמשה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 291,
        "city_name": "ערב אל נעים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6246143",
        "clinic_name": "טיפת חלב ערב אל נעים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 292,
        "city_name": "ערד",
        "street_name": "שאול המלך",
        "house_number": "24",
        "phone": "08-9957029",
        "clinic_name": "טיפת חלב ערד א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 293,
        "city_name": "ערד",
        "street_name": "שאול המלך",
        "house_number": "24",
        "phone": "08-9950989",
        "clinic_name": "טיפת חלב ערד ב'",
        "status": "פעיל"
    },
    {
        "_id": 294,
        "city_name": "ערערה",
        "street_name": "",
        "house_number": "ערערה",
        "phone": "04-6351106",
        "clinic_name": "טיפת חלב ערערה",
        "status": "פעיל"
    },
    {
        "_id": 295,
        "city_name": "פוריידיס",
        "street_name": "",
        "house_number": "",
        "phone": "077-9511745",
        "clinic_name": "טיפת חלב פוריידיס",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 296,
        "city_name": "חדרה",
        "street_name": "אלוף יקותיאל אדם",
        "house_number": "",
        "phone": "077-2101152",
        "clinic_name": "טיפת חלב פיקוס",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 297,
        "city_name": "באר שבע",
        "street_name": "שד הנשיא הרצוג חיים",
        "house_number": "2",
        "phone": "08-6279768",
        "clinic_name": "טיפת חלב פלח 5",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 298,
        "city_name": "פסוטה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9870530",
        "clinic_name": "טיפת חלב פסוטה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 299,
        "city_name": "פקיעין (בוקייעה)",
        "street_name": "",
        "house_number": "",
        "phone": "04-9978002",
        "clinic_name": "טיפת חלב פקיעין א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 300,
        "city_name": "פקיעין (בוקייעה)",
        "street_name": "",
        "house_number": "",
        "phone": "04-9972781",
        "clinic_name": "טיפת חלב פקיעין ב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 301,
        "city_name": "בני ברק",
        "street_name": "בגין מנחם",
        "house_number": "48",
        "phone": "03-6183470",
        "clinic_name": "טיפת חלב פרדס כץ",
        "status": "פעיל"
    },
    {
        "_id": 302,
        "city_name": "רחובות",
        "street_name": "פרשני אברהם",
        "house_number": "8",
        "phone": "08-9459553",
        "clinic_name": "טיפת חלב פרשני",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 303,
        "city_name": "אילת",
        "street_name": "סמ הרדוף",
        "house_number": "3",
        "phone": "08-6318353",
        "clinic_name": "טיפת חלב צאלים",
        "status": "פעיל"
    },
    {
        "_id": 304,
        "city_name": "נצרת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6565301",
        "clinic_name": "טיפת חלב צומת קשלה-ספאפרה",
        "status": "פעיל"
    },
    {
        "_id": 305,
        "city_name": "מעלה אדומים",
        "street_name": "הצפצפה",
        "house_number": "2",
        "phone": "5400",
        "clinic_name": "טיפת חלב צמח השדה",
        "status": "פעיל"
    },
    {
        "_id": 306,
        "city_name": "צנדלה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6401416",
        "clinic_name": "טיפת חלב צנדלה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 307,
        "city_name": "חיפה",
        "street_name": "המעפילים",
        "house_number": "1",
        "phone": "077-7570962",
        "clinic_name": "טיפת חלב ק. אליעזר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 308,
        "city_name": "בת ים",
        "street_name": "קדושי קהיר",
        "house_number": "4",
        "phone": "03-5063536",
        "clinic_name": "טיפת חלב קדושי קהיר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 309,
        "city_name": "ראשון לציון",
        "street_name": "סגל מרדכי יואל",
        "house_number": "6",
        "phone": "03-9468648",
        "clinic_name": "טיפת חלב קדמת ראשון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 310,
        "city_name": "קלנסווה",
        "street_name": "",
        "house_number": "",
        "phone": "09-8780387",
        "clinic_name": "טיפת חלב קלנסווה א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 311,
        "city_name": "קלנסווה",
        "street_name": "",
        "house_number": "",
        "phone": "09-8780271",
        "clinic_name": "טיפת חלב קלנסווה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 312,
        "city_name": "קרית אתא",
        "street_name": "פינסקר",
        "house_number": "11",
        "phone": "077-7292567",
        "clinic_name": "טיפת חלב קריית אתא - פינסקר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 313,
        "city_name": "קרית אתא",
        "street_name": "קבוץ גלויות",
        "house_number": "",
        "phone": "04-8448396",
        "clinic_name": "טיפת חלב קריית בנימין",
        "status": "פעיל"
    },
    {
        "_id": 314,
        "city_name": "רמת גן",
        "street_name": "כהן יעקב",
        "house_number": "27",
        "phone": "03-5349758",
        "clinic_name": "טיפת חלב קריניצי",
        "status": "פעיל"
    },
    {
        "_id": 315,
        "city_name": "קרית ארבע",
        "street_name": "",
        "house_number": "",
        "phone": "02-9961755",
        "clinic_name": "טיפת חלב קרית ארבע",
        "status": "פעיל"
    },
    {
        "_id": 316,
        "city_name": "ראשון לציון",
        "street_name": "שדה נחום",
        "house_number": "16",
        "phone": "03-9622236",
        "clinic_name": "טיפת חלב קרית גנים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 317,
        "city_name": "חיפה",
        "street_name": "השיירה",
        "house_number": "46",
        "phone": "04-8417830",
        "clinic_name": "טיפת חלב קרית חיים המזרחית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 318,
        "city_name": "חיפה",
        "street_name": "שד דגניה",
        "house_number": "30",
        "phone": "077-7041319",
        "clinic_name": "טיפת חלב קרית חיים המערבית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 319,
        "city_name": "קרית טבעון",
        "street_name": "החורש",
        "house_number": "1",
        "phone": "04-9832976",
        "clinic_name": "טיפת חלב קרית טבעון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 320,
        "city_name": "קרית ים",
        "street_name": "אלון",
        "house_number": "3",
        "phone": "077-9616784",
        "clinic_name": "טיפת חלב קרית ים א",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 321,
        "city_name": "קרית ים",
        "street_name": "שד ירושלים",
        "house_number": "71",
        "phone": "077-9400329",
        "clinic_name": "טיפת חלב קרית ים צפון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 322,
        "city_name": "רמלה",
        "street_name": "לנדאו חיים",
        "house_number": "4",
        "phone": "08-9219078",
        "clinic_name": "טיפת חלב קרית מנחם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 323,
        "city_name": "רחובות",
        "street_name": "סטולבוב",
        "house_number": "8",
        "phone": "08-9465910",
        "clinic_name": "טיפת חלב קרית משה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 324,
        "city_name": "נתניה",
        "street_name": "שד גולדה מאיר",
        "house_number": "6",
        "phone": "09-8359939",
        "clinic_name": "טיפת חלב קרית נורדאו",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 325,
        "city_name": "חיפה",
        "street_name": "שד ורבורג",
        "house_number": "114",
        "phone": "04-8759759",
        "clinic_name": "טיפת חלב קרית שמואל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 326,
        "city_name": "חולון",
        "street_name": "הר הצופים",
        "house_number": "6",
        "phone": "5400",
        "clinic_name": "טיפת חלב קרית שרת",
        "status": "פעיל"
    },
    {
        "_id": 327,
        "city_name": "כפר קרע",
        "street_name": "",
        "house_number": "",
        "phone": "077-2031350",
        "clinic_name": "טיפת חלב קרע ב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 328,
        "city_name": "כפר קרע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6358076",
        "clinic_name": "טיפת חלב קרע ג",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 329,
        "city_name": "רמלה",
        "street_name": "אחד במאי",
        "house_number": "10",
        "phone": "08-9229585",
        "clinic_name": "טיפת חלב קשתות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 330,
        "city_name": "ראמה",
        "street_name": "",
        "house_number": "",
        "phone": "04-3731370",
        "clinic_name": "טיפת חלב ראמה",
        "status": "פעיל"
    },
    {
        "_id": 331,
        "city_name": "ראש העין",
        "street_name": "הא באייר",
        "house_number": "22",
        "phone": "03-9380807",
        "clinic_name": "טיפת חלב ראש העין א'",
        "status": "פעיל"
    },
    {
        "_id": 332,
        "city_name": "ראש העין",
        "street_name": "הא באייר",
        "house_number": "22",
        "phone": "03-9021186",
        "clinic_name": "טיפת חלב ראש העין ד'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 333,
        "city_name": "רהט",
        "street_name": "",
        "house_number": "",
        "phone": "08-9918333",
        "clinic_name": "טיפת חלב רהט א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 334,
        "city_name": "רהט",
        "street_name": "",
        "house_number": "",
        "phone": "08-9918334",
        "clinic_name": "טיפת חלב רהט ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 335,
        "city_name": "רהט",
        "street_name": "",
        "house_number": "",
        "phone": "08-9910613",
        "clinic_name": "טיפת חלב רהט ד'",
        "status": "פעיל"
    },
    {
        "_id": 336,
        "city_name": "רהט",
        "street_name": "",
        "house_number": "",
        "phone": "08-6217963",
        "clinic_name": "טיפת חלב רהט ה'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 337,
        "city_name": "רומאנה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6411826",
        "clinic_name": "טיפת חלב רומאנה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 338,
        "city_name": "חיפה",
        "street_name": "שקמה",
        "house_number": "29",
        "phone": "04-8256140",
        "clinic_name": "טיפת חלב רוממה",
        "status": "פעיל"
    },
    {
        "_id": 339,
        "city_name": "רומת הייב",
        "street_name": "",
        "house_number": "",
        "phone": "04-6412470",
        "clinic_name": "טיפת חלב רומת הייב - פרוש",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 340,
        "city_name": "ריחאניה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6990192",
        "clinic_name": "טיפת חלב ריחאניה",
        "status": "פעיל"
    },
    {
        "_id": 341,
        "city_name": "ריינה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6577003",
        "clinic_name": "טיפת חלב ריינה א'",
        "status": "פעיל"
    },
    {
        "_id": 342,
        "city_name": "ריינה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6470645",
        "clinic_name": "טיפת חלב ריינה ב'",
        "status": "פעיל"
    },
    {
        "_id": 343,
        "city_name": "ריינה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6469005",
        "clinic_name": "טיפת חלב ריינה ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 344,
        "city_name": "בנימינה-גבעת עדה",
        "street_name": "ח\"י גבעת עדה",
        "house_number": "",
        "phone": "077-7850830",
        "clinic_name": "טיפת חלב רימון גבעת עדה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 345,
        "city_name": "באר שבע",
        "street_name": "קהירי",
        "house_number": "1",
        "phone": "08-6481257",
        "clinic_name": "טיפת חלב רמות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 346,
        "city_name": "רמלה",
        "street_name": "בוגנים אהרון",
        "house_number": "11",
        "phone": "08-9292229",
        "clinic_name": "טיפת חלב רמת דן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 347,
        "city_name": "חולון",
        "street_name": "רבי עקיבא",
        "house_number": "4",
        "phone": "5400",
        "clinic_name": "טיפת חלב רסקו",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 348,
        "city_name": "שגב-שלום",
        "street_name": "",
        "house_number": "",
        "phone": "08-6230762",
        "clinic_name": "טיפת חלב שגב שלום",
        "status": "פעיל"
    },
    {
        "_id": 349,
        "city_name": "שדרות",
        "street_name": "הגיא",
        "house_number": "10",
        "phone": "08-6899889",
        "clinic_name": "טיפת חלב שדרות א'",
        "status": "פעיל"
    },
    {
        "_id": 350,
        "city_name": "שדרות",
        "street_name": "ברית ערים",
        "house_number": "4",
        "phone": "08-6898171",
        "clinic_name": "טיפת חלב שדרות ב'",
        "status": "פעיל"
    },
    {
        "_id": 351,
        "city_name": "אילת",
        "street_name": "הנבטים",
        "house_number": "20",
        "phone": "08-6317236",
        "clinic_name": "טיפת חלב שחמון",
        "status": "פעיל"
    },
    {
        "_id": 352,
        "city_name": "שבלי - אום אל-גנם",
        "street_name": "",
        "house_number": "",
        "phone": "04-8148316",
        "clinic_name": "טיפת חלב שיבלי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 353,
        "city_name": "ראשון לציון",
        "street_name": "שיבת ציון",
        "house_number": "4",
        "phone": "03-9659665",
        "clinic_name": "טיפת חלב שיבת ציון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 354,
        "city_name": "ראשון לציון",
        "street_name": "עזרא",
        "house_number": "39",
        "phone": "03-9455566",
        "clinic_name": "טיפת חלב שיכון המזרח",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 355,
        "city_name": "בני ברק",
        "street_name": "עמרם גאון",
        "house_number": "4",
        "phone": "03-5742684",
        "clinic_name": "טיפת חלב שיכון ו'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 356,
        "city_name": "פתח תקווה",
        "street_name": "פרופ' טור",
        "house_number": "5",
        "phone": "03-9219847",
        "clinic_name": "טיפת חלב שיכון עובדי בילינסון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 357,
        "city_name": "פתח תקווה",
        "street_name": "החמישה",
        "house_number": "2",
        "phone": "03-9321292",
        "clinic_name": "טיפת חלב שיכון עממי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 358,
        "city_name": "חיפה",
        "street_name": "השלוח",
        "house_number": "35",
        "phone": "5400",
        "clinic_name": "טיפת חלב שילוח",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 359,
        "city_name": "נצרת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6453612",
        "clinic_name": "טיפת חלב שכ' ביר אל אמיר",
        "status": "פעיל"
    },
    {
        "_id": 360,
        "city_name": "נצרת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6463991",
        "clinic_name": "טיפת חלב שכ' הפועלים-תחנה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 361,
        "city_name": "נצרת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6012066",
        "clinic_name": "טיפת חלב שכ' מזרחית -תאופיק זיאד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 362,
        "city_name": "חולון",
        "street_name": "נחלת שלום",
        "house_number": "4",
        "phone": "03-5049684",
        "clinic_name": "טיפת חלב שכון עממי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 363,
        "city_name": "שלומי",
        "street_name": "אלבז נתן",
        "house_number": "5",
        "phone": "04-8311798",
        "clinic_name": "טיפת חלב שלומי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 364,
        "city_name": "אשקלון",
        "street_name": "ההסתדרות",
        "house_number": "8",
        "phone": "08-6766074",
        "clinic_name": "טיפת חלב שמשון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 365,
        "city_name": "שעב",
        "street_name": "",
        "house_number": "",
        "phone": "04-9883716",
        "clinic_name": "טיפת חלב שעב",
        "status": "פעיל"
    },
    {
        "_id": 366,
        "city_name": "רחובות",
        "street_name": "שבזי",
        "house_number": "14",
        "phone": "08-9458572",
        "clinic_name": "טיפת חלב שעריים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 367,
        "city_name": "שפרעם",
        "street_name": "",
        "house_number": "",
        "phone": "04-9865345",
        "clinic_name": "טיפת חלב שפרעם א",
        "status": "פעיל"
    },
    {
        "_id": 368,
        "city_name": "שפרעם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6432446",
        "clinic_name": "טיפת חלב שפרעם ב",
        "status": "פעיל"
    },
    {
        "_id": 369,
        "city_name": "שפרעם",
        "street_name": "",
        "house_number": "",
        "phone": "04-9500784",
        "clinic_name": "טיפת חלב שפרעם ד",
        "status": "פעיל"
    },
    {
        "_id": 370,
        "city_name": "רמת גן",
        "street_name": "שמעוני",
        "house_number": "8",
        "phone": "03-6311319",
        "clinic_name": "טיפת חלב שקמה",
        "status": "פעיל"
    },
    {
        "_id": 371,
        "city_name": "לוד",
        "street_name": "ספרן מאיר",
        "house_number": "1",
        "phone": "08-9231222",
        "clinic_name": "טיפת חלב שרת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 372,
        "city_name": "נתניה",
        "street_name": "בן אליעזר",
        "house_number": "57",
        "phone": "09-8652035",
        "clinic_name": "טיפת חלב תחנה ב'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 373,
        "city_name": "באר שבע",
        "street_name": "וינגייט",
        "house_number": "8",
        "phone": "08-6233875",
        "clinic_name": "טיפת חלב תחנה ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 374,
        "city_name": "באר שבע",
        "street_name": "שד ירושלים",
        "house_number": "32",
        "phone": "08-6109243",
        "clinic_name": "טיפת חלב תחנה ט'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 375,
        "city_name": "באר שבע",
        "street_name": "סנהדרין",
        "house_number": "113",
        "phone": "08-6413897",
        "clinic_name": "טיפת חלב תחנה י\"ד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 376,
        "city_name": "אל סייד",
        "street_name": "אל סייד",
        "house_number": "",
        "phone": "08-6633766",
        "clinic_name": "טיפת חלב תחנת אלסייד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 377,
        "city_name": "באר שבע",
        "street_name": "הוברמן",
        "house_number": "7",
        "phone": "08-6433511",
        "clinic_name": "טיפת חלב תחנת הוברמן",
        "status": "פעיל"
    },
    {
        "_id": 378,
        "city_name": "עפולה",
        "street_name": "ספיר",
        "house_number": "10",
        "phone": "04-6895061",
        "clinic_name": "טיפת חלב תחנת הפארק",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 379,
        "city_name": "ערערה-בנגב",
        "street_name": "",
        "house_number": "",
        "phone": "08-9953217",
        "clinic_name": "טיפת חלב תחנת ערוער",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 380,
        "city_name": "תל שבע",
        "street_name": "",
        "house_number": "",
        "phone": "08-6252882",
        "clinic_name": "טיפת חלב תל שבע",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 381,
        "city_name": "חולון",
        "street_name": "חזית חמש",
        "house_number": "5",
        "phone": "03-5048560",
        "clinic_name": "טיפת חלב תל-גיבורים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 382,
        "city_name": "תפרח",
        "street_name": "",
        "house_number": "",
        "phone": "08-9926056",
        "clinic_name": "טיפת חלב תפרח",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 383,
        "city_name": "מודיעין עילית",
        "street_name": "שד הרב מפוניבז'",
        "house_number": "12",
        "phone": "08-9315270",
        "clinic_name": "טיפת חלב אבי עזרי",
        "status": "פעיל"
    },
    {
        "_id": 384,
        "city_name": "אבן יהודה",
        "street_name": "אסותא",
        "house_number": "2",
        "phone": "09-8915222",
        "clinic_name": "טיפת חלב אבן יהודה כללית",
        "status": "פעיל"
    },
    {
        "_id": 385,
        "city_name": "גבע בנימין",
        "street_name": "הרדוף הנחלים",
        "house_number": "1",
        "phone": "02-6563535",
        "clinic_name": "טיפת חלב אדם גבע בנימין כללית",
        "status": "פעיל"
    },
    {
        "_id": 386,
        "city_name": "מסדה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6655300",
        "clinic_name": "טיפת חלב אזורית עמק הירדן",
        "status": "פעיל"
    },
    {
        "_id": 387,
        "city_name": "אחוזת ברק",
        "street_name": "",
        "house_number": "",
        "phone": "04-6421420",
        "clinic_name": "טיפת חלב אחוזת ברק",
        "status": "פעיל"
    },
    {
        "_id": 388,
        "city_name": "אבטין",
        "street_name": "",
        "house_number": "",
        "phone": "04-8870530",
        "clinic_name": "טיפת חלב איבטין",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 389,
        "city_name": "אייל",
        "street_name": "",
        "house_number": "",
        "phone": "09-7639100",
        "clinic_name": "טיפת חלב אייל",
        "status": "פעיל"
    },
    {
        "_id": 390,
        "city_name": "איילת השחר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6932871",
        "clinic_name": "טיפת חלב איילת השחר כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 391,
        "city_name": "אילניה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6766110",
        "clinic_name": "טיפת חלב אילניה",
        "status": "פעיל"
    },
    {
        "_id": 392,
        "city_name": "אלומות",
        "street_name": "",
        "house_number": "",
        "phone": "04-6750802",
        "clinic_name": "טיפת חלב אלומות",
        "status": "פעיל"
    },
    {
        "_id": 393,
        "city_name": "אלון הגליל",
        "street_name": "",
        "house_number": "",
        "phone": "04-9861614",
        "clinic_name": "טיפת חלב אלון הגליל",
        "status": "פעיל"
    },
    {
        "_id": 394,
        "city_name": "אלון מורה",
        "street_name": "",
        "house_number": "",
        "phone": "02-9973779",
        "clinic_name": "טיפת חלב אלון מורה",
        "status": "פעיל"
    },
    {
        "_id": 395,
        "city_name": "אלון שבות",
        "street_name": "מעלה מיכאל",
        "house_number": "11",
        "phone": "02-9939775",
        "clinic_name": "טיפת חלב אלון שבות כללית",
        "status": "פעיל"
    },
    {
        "_id": 396,
        "city_name": "אלונים",
        "street_name": "",
        "house_number": "",
        "phone": "04-9838111",
        "clinic_name": "טיפת חלב אלונים",
        "status": "פעיל"
    },
    {
        "_id": 397,
        "city_name": "אליקים",
        "street_name": "",
        "house_number": "",
        "phone": "04-9892823",
        "clinic_name": "טיפת חלב אליקים",
        "status": "פעיל"
    },
    {
        "_id": 398,
        "city_name": "אלעד",
        "street_name": "רבי פנחס בן יאיר",
        "house_number": "35",
        "phone": "03-9084240",
        "clinic_name": "טיפת חלב אלעד",
        "status": "פעיל"
    },
    {
        "_id": 399,
        "city_name": "אלפי מנשה",
        "street_name": "גלבוע",
        "house_number": "118",
        "phone": "09-7925227",
        "clinic_name": "טיפת חלב אלפי מנשה כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 400,
        "city_name": "אלקנה",
        "street_name": "",
        "house_number": "",
        "phone": "03-9077400",
        "clinic_name": "טיפת חלב אלקנה כללית",
        "status": "פעיל"
    },
    {
        "_id": 401,
        "city_name": "אמונים",
        "street_name": "",
        "house_number": "",
        "phone": "08-8521439",
        "clinic_name": "טיפת חלב אמונים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 402,
        "city_name": "קדימה-צורן",
        "street_name": "שד יצחק רבין צורן",
        "house_number": "38",
        "phone": "09-8930820",
        "clinic_name": "טיפת חלב אמיר צורן",
        "status": "פעיל"
    },
    {
        "_id": 403,
        "city_name": "אפרת",
        "street_name": "נצר ישי",
        "house_number": "1",
        "phone": "02-9931955",
        "clinic_name": "טיפת חלב אפרת כללית",
        "status": "פעיל"
    },
    {
        "_id": 404,
        "city_name": "ארבל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6793879",
        "clinic_name": "טיפת חלב ארבל",
        "status": "פעיל"
    },
    {
        "_id": 405,
        "city_name": "אריאל",
        "street_name": "בראון אורי",
        "house_number": "4",
        "phone": "03-9065200",
        "clinic_name": "טיפת חלב אריאל כללית",
        "status": "פעיל"
    },
    {
        "_id": 406,
        "city_name": "בארי",
        "street_name": "",
        "house_number": "",
        "phone": "08-9949444",
        "clinic_name": "טיפת חלב בארי",
        "status": "פעיל"
    },
    {
        "_id": 407,
        "city_name": "ביצרון",
        "street_name": "",
        "house_number": "",
        "phone": "08-8573095",
        "clinic_name": "טיפת חלב ביצרון",
        "status": "פעיל"
    },
    {
        "_id": 408,
        "city_name": "בית אל",
        "street_name": "דרך החלוצים",
        "house_number": "",
        "phone": "02-9975318",
        "clinic_name": "טיפת חלב בית אל כללית",
        "status": "פעיל"
    },
    {
        "_id": 409,
        "city_name": "בית אלפא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6533900",
        "clinic_name": "טיפת חלב בית אלפא כללית",
        "status": "פעיל"
    },
    {
        "_id": 410,
        "city_name": "בית השיטה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6536788",
        "clinic_name": "טיפת חלב בית השיטה",
        "status": "פעיל"
    },
    {
        "_id": 411,
        "city_name": "בית זית",
        "street_name": "",
        "house_number": "",
        "phone": "02-5346616",
        "clinic_name": "טיפת חלב בית זית",
        "status": "פעיל"
    },
    {
        "_id": 412,
        "city_name": "בית ניר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6874316",
        "clinic_name": "טיפת חלב בית ניר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 413,
        "city_name": "בית קמה",
        "street_name": "",
        "house_number": "",
        "phone": "08-9915222",
        "clinic_name": "טיפת חלב בית קמה",
        "status": "פעיל"
    },
    {
        "_id": 414,
        "city_name": "בית רימון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6509640",
        "clinic_name": "טיפת חלב בית רימון",
        "status": "פעיל"
    },
    {
        "_id": 415,
        "city_name": "ביתר עילית",
        "street_name": "רבי עקיבא",
        "house_number": "5",
        "phone": "02-5887555",
        "clinic_name": "טיפת חלב ביתר מקצועית",
        "status": "פעיל"
    },
    {
        "_id": 416,
        "city_name": "כפר סבא",
        "street_name": "בן גוריון",
        "house_number": "43",
        "phone": "09-7651265",
        "clinic_name": "טיפת חלב בן גוריון כללית",
        "status": "פעיל"
    },
    {
        "_id": 417,
        "city_name": "בני דקלים",
        "street_name": "כיסופים",
        "house_number": "16",
        "phone": "08-6712336",
        "clinic_name": "טיפת חלב בני דקלים",
        "status": "פעיל"
    },
    {
        "_id": 418,
        "city_name": "בני דרום",
        "street_name": "",
        "house_number": "",
        "phone": "08-8515543",
        "clinic_name": "טיפת חלב בני דרום",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 419,
        "city_name": "בני יהודה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6762017",
        "clinic_name": "טיפת חלב בני יהודה כללית",
        "status": "פעיל"
    },
    {
        "_id": 420,
        "city_name": "מודיעין עילית",
        "street_name": "רבי עקיבא",
        "house_number": "3",
        "phone": "08-9741988",
        "clinic_name": "טיפת חלב ברכפלד כללית",
        "status": "פעיל"
    },
    {
        "_id": 421,
        "city_name": "ברעם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6988119",
        "clinic_name": "טיפת חלב ברעם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 422,
        "city_name": "בת חפר",
        "street_name": "",
        "house_number": "",
        "phone": "09-8782138",
        "clinic_name": "טיפת חלב בת חפר",
        "status": "פעיל"
    },
    {
        "_id": 423,
        "city_name": "גבע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6535773",
        "clinic_name": "טיפת חלב גבע",
        "status": "פעיל"
    },
    {
        "_id": 424,
        "city_name": "ראש העין",
        "street_name": "גרטרוד עליון",
        "house_number": "4",
        "phone": "03-5310755",
        "clinic_name": "טיפת חלב גבע ראש העין",
        "status": "פעיל"
    },
    {
        "_id": 425,
        "city_name": "גבעת אבני",
        "street_name": "",
        "house_number": "",
        "phone": "04-6799193",
        "clinic_name": "טיפת חלב גבעת אבני",
        "status": "פעיל"
    },
    {
        "_id": 426,
        "city_name": "גבעת אלה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6515155",
        "clinic_name": "טיפת חלב גבעת אלה",
        "status": "פעיל"
    },
    {
        "_id": 427,
        "city_name": "גבעת זאב",
        "street_name": "האיילות",
        "house_number": "2",
        "phone": "02-5360400",
        "clinic_name": "טיפת חלב גבעת זאב גן האיילות",
        "status": "פעיל"
    },
    {
        "_id": 428,
        "city_name": "גבעת זאב",
        "street_name": "המכבים",
        "house_number": "48",
        "phone": "02-5360444",
        "clinic_name": "טיפת חלב גבעת זאב כללית",
        "status": "פעיל"
    },
    {
        "_id": 429,
        "city_name": "גבעת חיים (איחוד)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6369525",
        "clinic_name": "טיפת חלב גבעת חיים איחוד לב הפרדס",
        "status": "פעיל"
    },
    {
        "_id": 430,
        "city_name": "גבעת עוז",
        "street_name": "",
        "house_number": "",
        "phone": "04-6524888",
        "clinic_name": "טיפת חלב גבעת עוז",
        "status": "פעיל"
    },
    {
        "_id": 431,
        "city_name": "גברעם",
        "street_name": "",
        "house_number": "",
        "phone": "08-6770422",
        "clinic_name": "טיפת חלב גברעם",
        "status": "פעיל"
    },
    {
        "_id": 432,
        "city_name": "גבת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6549807",
        "clinic_name": "טיפת חלב גבת",
        "status": "פעיל"
    },
    {
        "_id": 433,
        "city_name": "גדות",
        "street_name": "",
        "house_number": "",
        "phone": "04-6939124",
        "clinic_name": "טיפת חלב גדות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 434,
        "city_name": "גדרה",
        "street_name": "שד בגין מנחם",
        "house_number": "14",
        "phone": "08-8681165",
        "clinic_name": "טיפת חלב גדרה הצעירה",
        "status": "פעיל"
    },
    {
        "_id": 435,
        "city_name": "גדרה",
        "street_name": "ויצמן",
        "house_number": "8",
        "phone": "08-8593322",
        "clinic_name": "טיפת חלב גדרה כללית",
        "status": "פעיל"
    },
    {
        "_id": 436,
        "city_name": "גזית",
        "street_name": "",
        "house_number": "",
        "phone": "04-6768807",
        "clinic_name": "טיפת חלב גזית כללית",
        "status": "פעיל"
    },
    {
        "_id": 437,
        "city_name": "גינוסר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6798866",
        "clinic_name": "טיפת חלב גינוסר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 438,
        "city_name": "גיניגר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6549104",
        "clinic_name": "טיפת חלב גיניגר",
        "status": "פעיל"
    },
    {
        "_id": 439,
        "city_name": "גן יבנה",
        "street_name": "הרצל",
        "house_number": "41",
        "phone": "08-8574131",
        "clinic_name": "טיפת חלב גן יבנה כללית",
        "status": "פעיל"
    },
    {
        "_id": 440,
        "city_name": "גן נר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6400483",
        "clinic_name": "טיפת חלב גן נר",
        "status": "פעיל"
    },
    {
        "_id": 441,
        "city_name": "געש",
        "street_name": "",
        "house_number": "",
        "phone": "09-9521152",
        "clinic_name": "טיפת חלב געש",
        "status": "פעיל"
    },
    {
        "_id": 442,
        "city_name": "גורנות הגליל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6641050",
        "clinic_name": "טיפת חלב גרנות",
        "status": "פעיל"
    },
    {
        "_id": 443,
        "city_name": "גשר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6758777",
        "clinic_name": "טיפת חלב גשר",
        "status": "פעיל"
    },
    {
        "_id": 444,
        "city_name": "גשר הזיו",
        "street_name": "",
        "house_number": "",
        "phone": "04-9958458",
        "clinic_name": "טיפת חלב גשר הזיו",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 445,
        "city_name": "דבירה",
        "street_name": "",
        "house_number": "",
        "phone": "08-9111222",
        "clinic_name": "טיפת חלב דביר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 446,
        "city_name": "הגושרים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6956278",
        "clinic_name": "טיפת חלב הגושרים",
        "status": "פעיל"
    },
    {
        "_id": 447,
        "city_name": "יבנה",
        "street_name": "הדקל",
        "house_number": "6",
        "phone": "08-9437528",
        "clinic_name": "טיפת חלב הדקל כללית",
        "status": "פעיל"
    },
    {
        "_id": 448,
        "city_name": "כפר סבא",
        "street_name": "עמק החולה",
        "house_number": "5",
        "phone": "09-7664422",
        "clinic_name": "טיפת חלב הדרים",
        "status": "פעיל"
    },
    {
        "_id": 449,
        "city_name": "הושעיה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6452262",
        "clinic_name": "טיפת חלב הושעיה",
        "status": "פעיל"
    },
    {
        "_id": 450,
        "city_name": "הזורעים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6793779",
        "clinic_name": "טיפת חלב הזורעים",
        "status": "פעיל"
    },
    {
        "_id": 451,
        "city_name": "אשקלון",
        "street_name": "סלע חיים",
        "house_number": "10",
        "phone": "08-6748222",
        "clinic_name": "טיפת חלב היובל כללית",
        "status": "פעיל"
    },
    {
        "_id": 452,
        "city_name": "היוגב",
        "street_name": "",
        "house_number": "",
        "phone": "04-9893679",
        "clinic_name": "טיפת חלב היוגב",
        "status": "פעיל"
    },
    {
        "_id": 453,
        "city_name": "גבעתיים",
        "street_name": "המעורר",
        "house_number": "24",
        "phone": "03-6790217",
        "clinic_name": "טיפת חלב המעורר",
        "status": "פעיל"
    },
    {
        "_id": 454,
        "city_name": "נתניה",
        "street_name": "ירמיהו",
        "house_number": "38",
        "phone": "09-8648800",
        "clinic_name": "טיפת חלב הנביאים כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 455,
        "city_name": "הרצליה",
        "street_name": "הנדיב",
        "house_number": "71",
        "phone": "09-9735500",
        "clinic_name": "טיפת חלב הנדיב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 456,
        "city_name": "הסוללים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6406511",
        "clinic_name": "טיפת חלב הסוללים",
        "status": "פעיל"
    },
    {
        "_id": 457,
        "city_name": "באר שבע",
        "street_name": "נחל קדרון",
        "house_number": "17",
        "phone": "08-6292896",
        "clinic_name": "טיפת חלב הפארק",
        "status": "פעיל"
    },
    {
        "_id": 458,
        "city_name": "הר אדר",
        "street_name": "האלון",
        "house_number": "239",
        "phone": "02-5706444",
        "clinic_name": "טיפת חלב הר אדר",
        "status": "פעיל"
    },
    {
        "_id": 459,
        "city_name": "חורה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6510178",
        "clinic_name": "טיפת חלב חורה ב' כללית",
        "status": "פעיל"
    },
    {
        "_id": 460,
        "city_name": "חספין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6763170",
        "clinic_name": "טיפת חלב חספין כללית",
        "status": "פעיל"
    },
    {
        "_id": 461,
        "city_name": "חפצי-בה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6534100",
        "clinic_name": "טיפת חלב חפציבה",
        "status": "פעיל"
    },
    {
        "_id": 462,
        "city_name": "חצרים",
        "street_name": "",
        "house_number": "",
        "phone": "08-6473339",
        "clinic_name": "טיפת חלב חצרים",
        "status": "פעיל"
    },
    {
        "_id": 463,
        "city_name": "חריש",
        "street_name": "דרך ארץ",
        "house_number": "35",
        "phone": "04-6255140",
        "clinic_name": "טיפת חלב חריש",
        "status": "פעיל"
    },
    {
        "_id": 464,
        "city_name": "טייבה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7796030",
        "clinic_name": "טיפת חלב טיפת חלב מרכז בריאות הילד טייבה",
        "status": "פעיל"
    },
    {
        "_id": 465,
        "city_name": "טירה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7931200",
        "clinic_name": "טיפת חלב טירה מרכז",
        "status": "פעיל"
    },
    {
        "_id": 466,
        "city_name": "טירה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7930906",
        "clinic_name": "טיפת חלב טירה צפון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 467,
        "city_name": "טירת צבי",
        "street_name": "",
        "house_number": "",
        "phone": "04-6078923",
        "clinic_name": "טיפת חלב טירת צבי",
        "status": "פעיל"
    },
    {
        "_id": 468,
        "city_name": "יגור",
        "street_name": "",
        "house_number": "",
        "phone": "04-9848119",
        "clinic_name": "טיפת חלב יגור",
        "status": "פעיל"
    },
    {
        "_id": 469,
        "city_name": "יד בנימין",
        "street_name": "",
        "house_number": "",
        "phone": "08-8591138",
        "clinic_name": "טיפת חלב יד בנימין כללית",
        "status": "פעיל"
    },
    {
        "_id": 470,
        "city_name": "יהוד",
        "street_name": "צבי ישי",
        "house_number": "19",
        "phone": "03-5395300",
        "clinic_name": "טיפת חלב יהוד כללית",
        "status": "פעיל"
    },
    {
        "_id": 471,
        "city_name": "יונתן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6960356",
        "clinic_name": "טיפת חלב יונתן כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 472,
        "city_name": "יזרעאל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6598000",
        "clinic_name": "טיפת חלב יזרעאל",
        "status": "פעיל"
    },
    {
        "_id": 473,
        "city_name": "יסוד המעלה",
        "street_name": "המייסדים",
        "house_number": "",
        "phone": "04-6605515",
        "clinic_name": "טיפת חלב יסוד המעלה כללית",
        "status": "פעיל"
    },
    {
        "_id": 474,
        "city_name": "יפעת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6548983",
        "clinic_name": "טיפת חלב יפעת",
        "status": "פעיל"
    },
    {
        "_id": 475,
        "city_name": "יפתח",
        "street_name": "",
        "house_number": "",
        "phone": "04-6952612",
        "clinic_name": "טיפת חלב יפתח",
        "status": "פעיל"
    },
    {
        "_id": 476,
        "city_name": "יקנעם עילית",
        "street_name": "הנוריות",
        "house_number": "2",
        "phone": "04-9090300",
        "clinic_name": "טיפת חלב יקנעם עילית",
        "status": "פעיל"
    },
    {
        "_id": 477,
        "city_name": "יקנעם עילית",
        "street_name": "עמק השלום",
        "house_number": "8",
        "phone": "04-6656222",
        "clinic_name": "טיפת חלב יקנעם עמק השלום",
        "status": "פעיל"
    },
    {
        "_id": 478,
        "city_name": "יראון",
        "street_name": "",
        "house_number": "",
        "phone": "04-6868312",
        "clinic_name": "טיפת חלב יראון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 479,
        "city_name": "כברי",
        "street_name": "",
        "house_number": "",
        "phone": "04-9952644",
        "clinic_name": "טיפת חלב כברי",
        "status": "פעיל"
    },
    {
        "_id": 480,
        "city_name": "הוד השרון",
        "street_name": "סוקולוב",
        "house_number": "46",
        "phone": "09-7470200",
        "clinic_name": "טיפת חלב ככר המושבה הוד השרון",
        "status": "פעיל"
    },
    {
        "_id": 481,
        "city_name": "רחובות",
        "street_name": "יונתן נתניהו",
        "house_number": "9",
        "phone": "08-9474255",
        "clinic_name": "טיפת חלב כפר גבירול",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 482,
        "city_name": "כפר גלעדי",
        "street_name": "",
        "house_number": "",
        "phone": "04-6946385",
        "clinic_name": "טיפת חלב כפר גלעדי",
        "status": "פעיל"
    },
    {
        "_id": 483,
        "city_name": "כפר החורש",
        "street_name": "",
        "house_number": "",
        "phone": "04-6558444",
        "clinic_name": "טיפת חלב כפר החורש",
        "status": "פעיל"
    },
    {
        "_id": 484,
        "city_name": "כפר ויתקין",
        "street_name": "",
        "house_number": "",
        "phone": "09-8666083",
        "clinic_name": "טיפת חלב כפר ויתקין",
        "status": "פעיל"
    },
    {
        "_id": 485,
        "city_name": "כפר ורדים",
        "street_name": "",
        "house_number": "",
        "phone": "04-9971187",
        "clinic_name": "טיפת חלב כפר ורדים כללית",
        "status": "פעיל"
    },
    {
        "_id": 486,
        "city_name": "כפר זיתים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6793794",
        "clinic_name": "טיפת חלב כפר זיתים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 487,
        "city_name": "כפר יחזקאל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6531876",
        "clinic_name": "טיפת חלב כפר יחזקאל",
        "status": "פעיל"
    },
    {
        "_id": 488,
        "city_name": "כפר סאלד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6907555",
        "clinic_name": "טיפת חלב כפר סאלד",
        "status": "סגור"
    },
    {
        "_id": 489,
        "city_name": "כפר סבא",
        "street_name": "הגליל",
        "house_number": "5",
        "phone": "09-7658111",
        "clinic_name": "טיפת חלב כפר סבא הגליל",
        "status": "פעיל"
    },
    {
        "_id": 490,
        "city_name": "כפר עזה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6809777",
        "clinic_name": "טיפת חלב כפר עזה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 491,
        "city_name": "כפר קיש",
        "street_name": "",
        "house_number": "",
        "phone": "04-6765317",
        "clinic_name": "טיפת חלב כפר קיש",
        "status": "פעיל"
    },
    {
        "_id": 492,
        "city_name": "כפר רופין",
        "street_name": "",
        "house_number": "",
        "phone": "04-6068201",
        "clinic_name": "טיפת חלב כפר רופין",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 493,
        "city_name": "קרית גת",
        "street_name": "שדרות אבני החושן",
        "house_number": "1",
        "phone": "",
        "clinic_name": "טיפת חלב כרמי גת",
        "status": "פעיל"
    },
    {
        "_id": 494,
        "city_name": "כרמי יוסף",
        "street_name": "",
        "house_number": "",
        "phone": "08-9145200",
        "clinic_name": "טיפת חלב כרמי יוסף",
        "status": "פעיל"
    },
    {
        "_id": 495,
        "city_name": "כרמיאל",
        "street_name": "החבצלת",
        "house_number": "2",
        "phone": "04-9883270",
        "clinic_name": "טיפת חלב כרמיאל חבצלת",
        "status": "פעיל"
    },
    {
        "_id": 496,
        "city_name": "כרמיאל",
        "street_name": "משעול הרקפות",
        "house_number": "41",
        "phone": "04-9900500",
        "clinic_name": "טיפת חלב כרמיאל מרכז",
        "status": "פעיל"
    },
    {
        "_id": 497,
        "city_name": "כרמיאל",
        "street_name": "חטיבת גבעתי",
        "house_number": "27",
        "phone": "04-9589170",
        "clinic_name": "טיפת חלב כרמיאל רמת רבין",
        "status": "פעיל"
    },
    {
        "_id": 498,
        "city_name": "ביתר עילית",
        "street_name": "הר\"ן",
        "house_number": "20",
        "phone": "02-5887000",
        "clinic_name": "טיפת חלב לב ביתר",
        "status": "פעיל"
    },
    {
        "_id": 499,
        "city_name": "רעננה",
        "street_name": "הנשר",
        "house_number": "1",
        "phone": "09-7705500",
        "clinic_name": "טיפת חלב לב הפארק",
        "status": "פעיל"
    },
    {
        "_id": 500,
        "city_name": "לביא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6799215",
        "clinic_name": "טיפת חלב לביא",
        "status": "פעיל"
    },
    {
        "_id": 501,
        "city_name": "להב",
        "street_name": "",
        "house_number": "",
        "phone": "08-9913490",
        "clinic_name": "טיפת חלב להב",
        "status": "פעיל"
    },
    {
        "_id": 502,
        "city_name": "להבים",
        "street_name": "",
        "house_number": "",
        "phone": "08-6681222",
        "clinic_name": "טיפת חלב להבים כללית",
        "status": "פעיל"
    },
    {
        "_id": 503,
        "city_name": "בית שאן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6061200",
        "clinic_name": "טיפת חלב מ.בריאות הילד בית שאן",
        "status": "פעיל"
    },
    {
        "_id": 504,
        "city_name": "מבוא חורון",
        "street_name": "",
        "house_number": "",
        "phone": "08-9726782",
        "clinic_name": "טיפת חלב מבוא חורון",
        "status": "פעיל"
    },
    {
        "_id": 505,
        "city_name": "מגדל העמק",
        "street_name": "האלה",
        "house_number": "2",
        "phone": "04-6141800",
        "clinic_name": "טיפת חלב מגדל העמק כללית",
        "status": "פעיל"
    },
    {
        "_id": 506,
        "city_name": "מגידו",
        "street_name": "",
        "house_number": "",
        "phone": "04-6525742",
        "clinic_name": "טיפת חלב מגידו",
        "status": "פעיל"
    },
    {
        "_id": 507,
        "city_name": "מגן",
        "street_name": "",
        "house_number": "",
        "phone": "08-9983203",
        "clinic_name": "טיפת חלב מגן",
        "status": "פעיל"
    },
    {
        "_id": 508,
        "city_name": "מולדת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6532294",
        "clinic_name": "טיפת חלב מולדת",
        "status": "פעיל"
    },
    {
        "_id": 509,
        "city_name": "רמת השרון",
        "street_name": "מוריה",
        "house_number": "31",
        "phone": "03-7607222",
        "clinic_name": "טיפת חלב מוריה",
        "status": "פעיל"
    },
    {
        "_id": 510,
        "city_name": "מזרע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6429809",
        "clinic_name": "טיפת חלב מזרע",
        "status": "פעיל"
    },
    {
        "_id": 511,
        "city_name": "מחולה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6480115",
        "clinic_name": "טיפת חלב מחולה",
        "status": "פעיל"
    },
    {
        "_id": 512,
        "city_name": "מחניים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6933777",
        "clinic_name": "טיפת חלב מחניים",
        "status": "פעיל"
    },
    {
        "_id": 513,
        "city_name": "מירב",
        "street_name": "",
        "house_number": "",
        "phone": "04-6539155",
        "clinic_name": "טיפת חלב מירב",
        "status": "פעיל"
    },
    {
        "_id": 514,
        "city_name": "מיתר",
        "street_name": "שדרות המייסדים",
        "house_number": "5",
        "phone": "08-9558222",
        "clinic_name": "טיפת חלב מיתר כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 515,
        "city_name": "מלכיה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6943698",
        "clinic_name": "טיפת חלב מלכיה",
        "status": "סגור"
    },
    {
        "_id": 516,
        "city_name": "מנרה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6908101",
        "clinic_name": "טיפת חלב מנרה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 517,
        "city_name": "מסד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6784814",
        "clinic_name": "טיפת חלב מסד",
        "status": "פעיל"
    },
    {
        "_id": 518,
        "city_name": "מסילות",
        "street_name": "",
        "house_number": "",
        "phone": "04-6066400",
        "clinic_name": "טיפת חלב מסילות",
        "status": "פעיל"
    },
    {
        "_id": 519,
        "city_name": "מעגן מיכאל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6399582",
        "clinic_name": "טיפת חלב מעגן מיכאל",
        "status": "פעיל"
    },
    {
        "_id": 520,
        "city_name": "מעונה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9979948",
        "clinic_name": "טיפת חלב מעונה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 521,
        "city_name": "מעלה אפרים",
        "street_name": "",
        "house_number": "",
        "phone": "02-5425400",
        "clinic_name": "טיפת חלב מעלה אפריים כללית",
        "status": "פעיל"
    },
    {
        "_id": 522,
        "city_name": "מעלה גלבוע",
        "street_name": "",
        "house_number": "",
        "phone": "04-6067506",
        "clinic_name": "טיפת חלב מעלה גלבוע",
        "status": "פעיל"
    },
    {
        "_id": 523,
        "city_name": "מעלה גמלא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6732658",
        "clinic_name": "טיפת חלב מעלה גמלא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 524,
        "city_name": "מעלות-תרשיחא",
        "street_name": "בן גוריון",
        "house_number": "4",
        "phone": "04-9578555",
        "clinic_name": "טיפת חלב מעלות תרשיחא",
        "status": "פעיל"
    },
    {
        "_id": 525,
        "city_name": "מצפה יריחו",
        "street_name": "",
        "house_number": "",
        "phone": "02-5353411",
        "clinic_name": "טיפת חלב מצפה יריחו כללית",
        "status": "פעיל"
    },
    {
        "_id": 526,
        "city_name": "מרום גולן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6960114",
        "clinic_name": "טיפת חלב מרום גולן (אזורית)",
        "status": "פעיל"
    },
    {
        "_id": 527,
        "city_name": "מרחביה (קיבוץ)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6598800",
        "clinic_name": "טיפת חלב מרחביה קיבוץ",
        "status": "פעיל"
    },
    {
        "_id": 528,
        "city_name": "אבשלום",
        "street_name": "",
        "house_number": "",
        "phone": "08-9985025",
        "clinic_name": "טיפת חלב מרכז אבשלום",
        "status": "פעיל"
    },
    {
        "_id": 529,
        "city_name": "באר טוביה",
        "street_name": "",
        "house_number": "",
        "phone": "08-8581008",
        "clinic_name": "טיפת חלב מרכז בריאות טל",
        "status": "פעיל"
    },
    {
        "_id": 530,
        "city_name": "אשקלון",
        "street_name": "ההסתדרות",
        "house_number": "23",
        "phone": "08-6830222",
        "clinic_name": "טיפת חלב מרכז הילד אשקלון כללית",
        "status": "פעיל"
    },
    {
        "_id": 531,
        "city_name": "נהורה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6622222",
        "clinic_name": "טיפת חלב מרכז נהורה",
        "status": "פעיל"
    },
    {
        "_id": 532,
        "city_name": "מרכז אזורי משגב",
        "street_name": "",
        "house_number": "",
        "phone": "04-9800180",
        "clinic_name": "טיפת חלב משגב כללית",
        "status": "פעיל"
    },
    {
        "_id": 533,
        "city_name": "משגב עם",
        "street_name": "",
        "house_number": "",
        "phone": "04-6953126",
        "clinic_name": "טיפת חלב משגב עם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 534,
        "city_name": "משמר הנגב",
        "street_name": "",
        "house_number": "",
        "phone": "08-9911208",
        "clinic_name": "טיפת חלב משמר הנגב",
        "status": "סגור"
    },
    {
        "_id": 535,
        "city_name": "משמר העמק",
        "street_name": "",
        "house_number": "",
        "phone": "04-9896110",
        "clinic_name": "טיפת חלב משמר העמק",
        "status": "פעיל"
    },
    {
        "_id": 536,
        "city_name": "מתן",
        "street_name": "הדר",
        "house_number": "84",
        "phone": "03-9028200",
        "clinic_name": "טיפת חלב מתן",
        "status": "פעיל"
    },
    {
        "_id": 537,
        "city_name": "יבנה",
        "street_name": "הרב אבוחצירא",
        "house_number": "1",
        "phone": "08-9436565",
        "clinic_name": "טיפת חלב נאות אשכול",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 538,
        "city_name": "נאות הכיכר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6555565",
        "clinic_name": "טיפת חלב נאות הכיכר",
        "status": "פעיל"
    },
    {
        "_id": 539,
        "city_name": "מודיעין עילית",
        "street_name": "ריטב\"א",
        "house_number": "7",
        "phone": "08-9285330",
        "clinic_name": "טיפת חלב נאות פסגה",
        "status": "פעיל"
    },
    {
        "_id": 540,
        "city_name": "נהלל",
        "street_name": "",
        "house_number": "",
        "phone": "04-6515012",
        "clinic_name": "טיפת חלב נהלל",
        "status": "פעיל"
    },
    {
        "_id": 541,
        "city_name": "באר שבע",
        "street_name": "יוהנה ז'בוטינסקי",
        "house_number": "30",
        "phone": "08-9113228",
        "clinic_name": "טיפת חלב נווה זאב כללית",
        "status": "פעיל"
    },
    {
        "_id": 542,
        "city_name": "הרצליה",
        "street_name": "היורה",
        "house_number": "3",
        "phone": "09-9705800",
        "clinic_name": "טיפת חלב נווה עמל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 543,
        "city_name": "אילות",
        "street_name": "",
        "house_number": "",
        "phone": "08-6355885",
        "clinic_name": "טיפת חלב נוף אדום אילות",
        "status": "פעיל"
    },
    {
        "_id": 544,
        "city_name": "נחלים",
        "street_name": "",
        "house_number": "",
        "phone": "03-9093398",
        "clinic_name": "טיפת חלב נחלים",
        "status": "פעיל"
    },
    {
        "_id": 545,
        "city_name": "ניצן",
        "street_name": "",
        "house_number": "",
        "phone": "08-6897199",
        "clinic_name": "טיפת חלב ניצן",
        "status": "פעיל"
    },
    {
        "_id": 546,
        "city_name": "ניצנה (קהילת חינוך)",
        "street_name": "",
        "house_number": "",
        "phone": "08-6561460",
        "clinic_name": "טיפת חלב ניצנה ב'",
        "status": "פעיל"
    },
    {
        "_id": 547,
        "city_name": "ניר דוד (תל עמל)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6488909",
        "clinic_name": "טיפת חלב ניר דוד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 548,
        "city_name": "נס ציונה",
        "street_name": "האירוסים",
        "house_number": "53",
        "phone": "08-9305420",
        "clinic_name": "טיפת חלב נס ציונה כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 549,
        "city_name": "עין המפרץ",
        "street_name": "",
        "house_number": "",
        "phone": "04-9852222",
        "clinic_name": "טיפת חלב נעמן",
        "status": "פעיל"
    },
    {
        "_id": 550,
        "city_name": "נען",
        "street_name": "",
        "house_number": "",
        "phone": "08-9442821",
        "clinic_name": "טיפת חלב נען",
        "status": "פעיל"
    },
    {
        "_id": 551,
        "city_name": "סאסא",
        "street_name": "",
        "house_number": "",
        "phone": "04-6988521",
        "clinic_name": "טיפת חלב סאסא",
        "status": "פעיל"
    },
    {
        "_id": 552,
        "city_name": "ספיר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6592223",
        "clinic_name": "טיפת חלב ספיר",
        "status": "פעיל"
    },
    {
        "_id": 553,
        "city_name": "ע'ג'ר",
        "street_name": "",
        "house_number": "",
        "phone": "04-6951211",
        "clinic_name": "טיפת חלב ע'ג'ר",
        "status": "פעיל"
    },
    {
        "_id": 554,
        "city_name": "עברון",
        "street_name": "",
        "house_number": "",
        "phone": "04-9857888",
        "clinic_name": "טיפת חלב עברון",
        "status": "פעיל"
    },
    {
        "_id": 555,
        "city_name": "עומר",
        "street_name": "רותם",
        "house_number": "10",
        "phone": "08-6253225",
        "clinic_name": "טיפת חלב עומר",
        "status": "פעיל"
    },
    {
        "_id": 556,
        "city_name": "עידן",
        "street_name": "",
        "house_number": "",
        "phone": "08-6581033",
        "clinic_name": "טיפת חלב עידן",
        "status": "פעיל"
    },
    {
        "_id": 557,
        "city_name": "עין גב",
        "street_name": "",
        "house_number": "",
        "phone": "04-6658105",
        "clinic_name": "טיפת חלב עין גב",
        "status": "פעיל"
    },
    {
        "_id": 558,
        "city_name": "עין גדי",
        "street_name": "",
        "house_number": "",
        "phone": "02-6594743",
        "clinic_name": "טיפת חלב עין גדי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 559,
        "city_name": "עין דור",
        "street_name": "",
        "house_number": "",
        "phone": "04-6770409",
        "clinic_name": "טיפת חלב עין דור",
        "status": "פעיל"
    },
    {
        "_id": 560,
        "city_name": "עין הנצי\"ב",
        "street_name": "",
        "house_number": "",
        "phone": "04-6062907",
        "clinic_name": "טיפת חלב עין הנציב",
        "status": "פעיל"
    },
    {
        "_id": 561,
        "city_name": "עין חרוד (איחוד)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6486716",
        "clinic_name": "טיפת חלב עין חרוד איחוד",
        "status": "פעיל"
    },
    {
        "_id": 562,
        "city_name": "עין חרוד (מאוחד)",
        "street_name": "",
        "house_number": "",
        "phone": "04-6485310",
        "clinic_name": "טיפת חלב עין חרוד מאוחד",
        "status": "פעיל"
    },
    {
        "_id": 563,
        "city_name": "עין יהב",
        "street_name": "",
        "house_number": "",
        "phone": "08-6581073",
        "clinic_name": "טיפת חלב עין יהב",
        "status": "פעיל"
    },
    {
        "_id": 564,
        "city_name": "עינת",
        "street_name": "",
        "house_number": "",
        "phone": "03-9385175",
        "clinic_name": "טיפת חלב עינת",
        "status": "פעיל"
    },
    {
        "_id": 565,
        "city_name": "עכו",
        "street_name": "שלמה בן-יוסף",
        "house_number": "8",
        "phone": "04-9911745",
        "clinic_name": "טיפת חלב עכו חומש",
        "status": "פעיל"
    },
    {
        "_id": 566,
        "city_name": "עכו",
        "street_name": "בורלא",
        "house_number": "42",
        "phone": "04-9810089",
        "clinic_name": "טיפת חלב עכו עמידר",
        "status": "פעיל"
    },
    {
        "_id": 567,
        "city_name": "עכו",
        "street_name": "יאנוש קורצ'אק",
        "house_number": "14",
        "phone": "04-9817941",
        "clinic_name": "טיפת חלב עכו צפון",
        "status": "פעיל"
    },
    {
        "_id": 568,
        "city_name": "עכו",
        "street_name": "שפירא",
        "house_number": "24",
        "phone": "04-9813650",
        "clinic_name": "טיפת חלב עכו קוטב",
        "status": "פעיל"
    },
    {
        "_id": 569,
        "city_name": "עלומים",
        "street_name": "",
        "house_number": "",
        "phone": "08-9937280",
        "clinic_name": "טיפת חלב עלומים",
        "status": "פעיל"
    },
    {
        "_id": 570,
        "city_name": "עלי",
        "street_name": "",
        "house_number": "",
        "phone": "02-9947070",
        "clinic_name": "טיפת חלב עלי כללית",
        "status": "פעיל"
    },
    {
        "_id": 571,
        "city_name": "עמינדב",
        "street_name": "",
        "house_number": "",
        "phone": "02-6438275",
        "clinic_name": "טיפת חלב עמינדב",
        "status": "פעיל"
    },
    {
        "_id": 572,
        "city_name": "עמנואל",
        "street_name": "",
        "house_number": "",
        "phone": "09-7921535",
        "clinic_name": "טיפת חלב עמנואל כללית",
        "status": "פעיל"
    },
    {
        "_id": 573,
        "city_name": "עמקה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9966680",
        "clinic_name": "טיפת חלב עמקה",
        "status": "פעיל"
    },
    {
        "_id": 574,
        "city_name": "עפרה",
        "street_name": "ט' באייר",
        "house_number": "",
        "phone": "02-9706888",
        "clinic_name": "טיפת חלב עפרה",
        "status": "פעיל"
    },
    {
        "_id": 575,
        "city_name": "קרית עקרון",
        "street_name": "מדעי שלום",
        "house_number": "14",
        "phone": "08-9415004",
        "clinic_name": "טיפת חלב עקרון",
        "status": "פעיל"
    },
    {
        "_id": 576,
        "city_name": "ערוגות",
        "street_name": "",
        "house_number": "",
        "phone": "08-8581904",
        "clinic_name": "טיפת חלב ערוגות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 577,
        "city_name": "עשרת",
        "street_name": "",
        "house_number": "",
        "phone": "08-8591766",
        "clinic_name": "טיפת חלב עשרת",
        "status": "פעיל"
    },
    {
        "_id": 578,
        "city_name": "עתלית",
        "street_name": "החרוב",
        "house_number": "62",
        "phone": "04-6675433",
        "clinic_name": "טיפת חלב עתלית",
        "status": "פעיל"
    },
    {
        "_id": 579,
        "city_name": "פארן",
        "street_name": "",
        "house_number": "",
        "phone": "08-6581075",
        "clinic_name": "טיפת חלב פארן",
        "status": "פעיל"
    },
    {
        "_id": 580,
        "city_name": "פסגות",
        "street_name": "",
        "house_number": "",
        "phone": "02-9973205",
        "clinic_name": "טיפת חלב פסגות",
        "status": "פעיל"
    },
    {
        "_id": 581,
        "city_name": "צוחר",
        "street_name": "",
        "house_number": "",
        "phone": "08-9118222",
        "clinic_name": "טיפת חלב צוחר",
        "status": "פעיל"
    },
    {
        "_id": 582,
        "city_name": "כוכב יאיר",
        "street_name": "שד הדקלים צור יגאל",
        "house_number": "",
        "phone": "09-7499800",
        "clinic_name": "טיפת חלב צור יגאל",
        "status": "פעיל"
    },
    {
        "_id": 583,
        "city_name": "צור יצחק",
        "street_name": "",
        "house_number": "",
        "phone": "09-8930800",
        "clinic_name": "טיפת חלב צור יצחק",
        "status": "פעיל"
    },
    {
        "_id": 584,
        "city_name": "צרופה",
        "street_name": "",
        "house_number": "",
        "phone": "04-9840667",
        "clinic_name": "טיפת חלב צרופה",
        "status": "פעיל"
    },
    {
        "_id": 585,
        "city_name": "צרעה",
        "street_name": "",
        "house_number": "",
        "phone": "02-9908520",
        "clinic_name": "טיפת חלב צרעה",
        "status": "פעיל"
    },
    {
        "_id": 586,
        "city_name": "יבנה",
        "street_name": "",
        "house_number": "",
        "phone": "08-8548300",
        "clinic_name": "טיפת חלב קבוצת יבנה כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 587,
        "city_name": "קבוצת יבנה",
        "street_name": "",
        "house_number": "",
        "phone": "08-8548300",
        "clinic_name": "טיפת חלב קבוצת יבנה כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 588,
        "city_name": "קדומים",
        "street_name": "",
        "house_number": "",
        "phone": "09-7921311",
        "clinic_name": "טיפת חלב קדומים כללית",
        "status": "פעיל"
    },
    {
        "_id": 589,
        "city_name": "רמת השרון",
        "street_name": "בית הלל",
        "house_number": "6",
        "phone": "03-7600813",
        "clinic_name": "טיפת חלב קדמה רמת השרון",
        "status": "פעיל"
    },
    {
        "_id": 590,
        "city_name": "קדרים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6986225",
        "clinic_name": "טיפת חלב קדרים",
        "status": "פעיל"
    },
    {
        "_id": 591,
        "city_name": "קוממיות",
        "street_name": "",
        "house_number": "",
        "phone": "08-6814406",
        "clinic_name": "טיפת חלב קוממיות",
        "status": "פעיל"
    },
    {
        "_id": 592,
        "city_name": "אור יהודה",
        "street_name": "אלעזר דוד",
        "house_number": "21",
        "phone": "03-5385200",
        "clinic_name": "טיפת חלב קנאור",
        "status": "פעיל"
    },
    {
        "_id": 593,
        "city_name": "נהריה",
        "street_name": "אירית",
        "house_number": "2",
        "phone": "04-8143806",
        "clinic_name": "טיפת חלב קניון נהריה",
        "status": "פעיל"
    },
    {
        "_id": 594,
        "city_name": "כפר סבא",
        "street_name": "יחזקאל",
        "house_number": "12",
        "phone": "09-7656101",
        "clinic_name": "טיפת חלב קפלן כפר סבא",
        "status": "פעיל"
    },
    {
        "_id": 595,
        "city_name": "קציר",
        "street_name": "",
        "house_number": "",
        "phone": "04-62535995",
        "clinic_name": "טיפת חלב קציר",
        "status": "סגור"
    },
    {
        "_id": 596,
        "city_name": "קצרין",
        "street_name": "",
        "house_number": "",
        "phone": "04-8707661",
        "clinic_name": "טיפת חלב קצרין כללית",
        "status": "פעיל"
    },
    {
        "_id": 597,
        "city_name": "קרית אונו",
        "street_name": "שלמה המלך",
        "house_number": "37",
        "phone": "03-5344995",
        "clinic_name": "טיפת חלב קרית אונו ב'",
        "status": "פעיל"
    },
    {
        "_id": 598,
        "city_name": "קרית גת",
        "street_name": "שד העצמאות",
        "house_number": "30",
        "phone": "08-6670333",
        "clinic_name": "טיפת חלב קרית גת מרכז הילד כללית",
        "status": "פעיל"
    },
    {
        "_id": 599,
        "city_name": "נתניה",
        "street_name": "שד לנטוס טום",
        "house_number": "26",
        "phone": "09-8821922",
        "clinic_name": "טיפת חלב קרית השרון נתניה",
        "status": "פעיל"
    },
    {
        "_id": 600,
        "city_name": "קרית מלאכי",
        "street_name": "המ\"ג",
        "house_number": "14",
        "phone": "08-8601250",
        "clinic_name": "טיפת חלב קרית מלאכי מומחים כללית",
        "status": "פעיל"
    },
    {
        "_id": 601,
        "city_name": "יהוד",
        "street_name": "דרך דיין משה",
        "house_number": "3",
        "phone": "03-5392300",
        "clinic_name": "טיפת חלב קרית סביונים",
        "status": "פעיל"
    },
    {
        "_id": 602,
        "city_name": "יהוד",
        "street_name": "דרך דיין משה",
        "house_number": "3",
        "phone": "",
        "clinic_name": "טיפת חלב קרית סביונים",
        "status": "פעיל"
    },
    {
        "_id": 603,
        "city_name": "מודיעין עילית",
        "street_name": "מסילת יוסף",
        "house_number": "34",
        "phone": "08-9740318",
        "clinic_name": "טיפת חלב קרית ספר כללית",
        "status": "פעיל"
    },
    {
        "_id": 604,
        "city_name": "קשת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6960518",
        "clinic_name": "טיפת חלב קשת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 605,
        "city_name": "ראש פינה",
        "street_name": "משעול האקליפטוס",
        "house_number": "1",
        "phone": "04-6958896",
        "clinic_name": "טיפת חלב ראש פינה כללית",
        "status": "פעיל"
    },
    {
        "_id": 606,
        "city_name": "רבבה",
        "street_name": "הר השומרון",
        "house_number": "",
        "phone": "03-5310710",
        "clinic_name": "טיפת חלב רבבה כללית",
        "status": "פעיל"
    },
    {
        "_id": 607,
        "city_name": "רוחמה",
        "street_name": "",
        "house_number": "",
        "phone": "08-6807100",
        "clinic_name": "טיפת חלב רוחמה",
        "status": "פעיל"
    },
    {
        "_id": 608,
        "city_name": "רכסים",
        "street_name": "האירוסים",
        "house_number": "2",
        "phone": "04-9846511",
        "clinic_name": "טיפת חלב רכסים כללית",
        "status": "פעיל"
    },
    {
        "_id": 609,
        "city_name": "קרית גת",
        "street_name": "נתיבות השלום",
        "house_number": "16",
        "phone": "08-9583330",
        "clinic_name": "טיפת חלב רמות דוד כללית",
        "status": "פעיל"
    },
    {
        "_id": 610,
        "city_name": "רמת דוד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6549000",
        "clinic_name": "טיפת חלב רמת דוד",
        "status": "פעיל"
    },
    {
        "_id": 611,
        "city_name": "רמת הכובש",
        "street_name": "",
        "house_number": "",
        "phone": "09-7474509",
        "clinic_name": "טיפת חלב רמת הכובש",
        "status": "פעיל"
    },
    {
        "_id": 612,
        "city_name": "רמת יוחנן",
        "street_name": "",
        "house_number": "",
        "phone": "04-8459223",
        "clinic_name": "טיפת חלב רמת יוחנן",
        "status": "פעיל"
    },
    {
        "_id": 613,
        "city_name": "רמת ישי",
        "street_name": "",
        "house_number": "",
        "phone": "04-9534957",
        "clinic_name": "טיפת חלב רמת ישי כללית",
        "status": "פעיל"
    },
    {
        "_id": 614,
        "city_name": "רעננה",
        "street_name": "משה וילנסקי",
        "house_number": "64",
        "phone": "09-7946240",
        "clinic_name": "טיפת חלב רעננה נווה זמר",
        "status": "פעיל"
    },
    {
        "_id": 615,
        "city_name": "רשפים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6065133",
        "clinic_name": "טיפת חלב רשפים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 616,
        "city_name": "שדה אילן",
        "street_name": "",
        "house_number": "",
        "phone": "04-6760104",
        "clinic_name": "טיפת חלב שדה אילן",
        "status": "פעיל"
    },
    {
        "_id": 617,
        "city_name": "שדה אליהו",
        "street_name": "",
        "house_number": "",
        "phone": "04-6096500",
        "clinic_name": "טיפת חלב שדה אליהו",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 618,
        "city_name": "שדה בוקר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6532837",
        "clinic_name": "טיפת חלב שדה בוקר מדרשה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 619,
        "city_name": "שדה יעקב",
        "street_name": "",
        "house_number": "",
        "phone": "04-9831247",
        "clinic_name": "טיפת חלב שדה יעקב",
        "status": "פעיל"
    },
    {
        "_id": 620,
        "city_name": "להבות חביבה",
        "street_name": "",
        "house_number": "",
        "phone": "04-6141780",
        "clinic_name": "טיפת חלב שדות",
        "status": "פעיל"
    },
    {
        "_id": 621,
        "city_name": "שדות ים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6364370",
        "clinic_name": "טיפת חלב שדות ים",
        "status": "פעיל"
    },
    {
        "_id": 622,
        "city_name": "כפר מימון",
        "street_name": "",
        "house_number": "",
        "phone": "08-6207225",
        "clinic_name": "טיפת חלב שדות נגב",
        "status": "פעיל"
    },
    {
        "_id": 623,
        "city_name": "שואבה",
        "street_name": "",
        "house_number": "",
        "phone": "02-5345016",
        "clinic_name": "טיפת חלב שואבה",
        "status": "פעיל"
    },
    {
        "_id": 624,
        "city_name": "שובל",
        "street_name": "",
        "house_number": "",
        "phone": "08-9916222",
        "clinic_name": "טיפת חלב שובל",
        "status": "פעיל"
    },
    {
        "_id": 625,
        "city_name": "שוהם",
        "street_name": "שד עמק איילון",
        "house_number": "30",
        "phone": "03-9724417",
        "clinic_name": "טיפת חלב שוהם כללית",
        "status": "פעיל"
    },
    {
        "_id": 626,
        "city_name": "שומריה",
        "street_name": "",
        "house_number": "",
        "phone": "08-9918129",
        "clinic_name": "טיפת חלב שומריה",
        "status": "פעיל"
    },
    {
        "_id": 627,
        "city_name": "רעננה",
        "street_name": "יפה אליעזר",
        "house_number": "8",
        "phone": "09-7477979",
        "clinic_name": "טיפת חלב שועלי רעננה",
        "status": "פעיל"
    },
    {
        "_id": 628,
        "city_name": "שילה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב שילה כללית",
        "status": "פעיל"
    },
    {
        "_id": 629,
        "city_name": "שלוחות",
        "street_name": "",
        "house_number": "",
        "phone": "04-6062121",
        "clinic_name": "טיפת חלב שלוחות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 630,
        "city_name": "שלומי",
        "street_name": "ז'בוטינסקי",
        "house_number": "",
        "phone": "04-9808516",
        "clinic_name": "טיפת חלב שלומי כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 631,
        "city_name": "שמשית",
        "street_name": "",
        "house_number": "3",
        "phone": "04-6021999",
        "clinic_name": "טיפת חלב שמשית",
        "status": "פעיל"
    },
    {
        "_id": 632,
        "city_name": "",
        "street_name": "יהלום",
        "house_number": "47",
        "phone": "03-9362925",
        "clinic_name": "טיפת חלב שערי תקווה",
        "status": "פעיל"
    },
    {
        "_id": 633,
        "city_name": "משמר השרון",
        "street_name": "",
        "house_number": "",
        "phone": "09-8661506",
        "clinic_name": "טיפת חלב שרונים",
        "status": "פעיל"
    },
    {
        "_id": 634,
        "city_name": "שריגים (לי-און)",
        "street_name": "שריגים",
        "house_number": "1",
        "phone": "02-9914008",
        "clinic_name": "טיפת חלב שריגים",
        "status": "פעיל"
    },
    {
        "_id": 635,
        "city_name": "שריד",
        "street_name": "",
        "house_number": "",
        "phone": "04-6546264",
        "clinic_name": "טיפת חלב שריד",
        "status": "פעיל"
    },
    {
        "_id": 636,
        "city_name": "תל יוסף",
        "street_name": "",
        "house_number": "",
        "phone": "04-6534952",
        "clinic_name": "טיפת חלב תל יוסף",
        "status": "פעיל"
    },
    {
        "_id": 637,
        "city_name": "תל מונד",
        "street_name": "",
        "house_number": "",
        "phone": "09-7779222",
        "clinic_name": "טיפת חלב תל מונד כללית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 638,
        "city_name": "תל עדשים",
        "street_name": "",
        "house_number": "",
        "phone": "04-6591871",
        "clinic_name": "טיפת חלב תל עדשים",
        "status": "פעיל"
    },
    {
        "_id": 639,
        "city_name": "כוכב יעקב",
        "street_name": "אהבת ישראל",
        "house_number": "2",
        "phone": "",
        "clinic_name": "טיפת חלב תל ציון -  כוכב יעקב כללית",
        "status": "פעיל"
    },
    {
        "_id": 640,
        "city_name": "תמרת",
        "street_name": "",
        "house_number": "",
        "phone": "04-6542663",
        "clinic_name": "טיפת חלב תמרת",
        "status": "פעיל"
    },
    {
        "_id": 641,
        "city_name": "אור יהודה",
        "street_name": "אופירה",
        "house_number": "1",
        "phone": "03-5387222",
        "clinic_name": "טיפת חלב אור יהודה",
        "status": "פעיל"
    },
    {
        "_id": 642,
        "city_name": "אורנית",
        "street_name": "",
        "house_number": "",
        "phone": "03-7214100",
        "clinic_name": "טיפת חלב אורנית מכבי",
        "status": "פעיל"
    },
    {
        "_id": 643,
        "city_name": "אלעד",
        "street_name": "רבנו ניסים גאון",
        "house_number": "1",
        "phone": "03-9765400",
        "clinic_name": "טיפת חלב אלעד מכבי",
        "status": "פעיל"
    },
    {
        "_id": 644,
        "city_name": "אלפי מנשה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7949200",
        "clinic_name": "טיפת חלב אלפי מנשה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 645,
        "city_name": "אפרת",
        "street_name": "",
        "house_number": "",
        "phone": "02-9932140",
        "clinic_name": "טיפת חלב אפרת מכבי",
        "status": "פעיל"
    },
    {
        "_id": 646,
        "city_name": "אריאל",
        "street_name": "הערבה",
        "house_number": "1",
        "phone": "03-9065050",
        "clinic_name": "טיפת חלב אריאל מכבי",
        "status": "פעיל"
    },
    {
        "_id": 647,
        "city_name": "בית שאן",
        "street_name": "שאול המלך",
        "house_number": "61",
        "phone": "04-6481180",
        "clinic_name": "טיפת חלב בית שאן",
        "status": "פעיל"
    },
    {
        "_id": 648,
        "city_name": "ביתר עילית",
        "street_name": "ישמח ישראל",
        "house_number": "1",
        "phone": "02-5725480",
        "clinic_name": "טיפת חלב ביתר עילית B",
        "status": "פעיל"
    },
    {
        "_id": 649,
        "city_name": "בני נצרים",
        "street_name": "",
        "house_number": "",
        "phone": "08-9496412",
        "clinic_name": "טיפת חלב בני נצרים",
        "status": "פעיל"
    },
    {
        "_id": 650,
        "city_name": "מודיעין עילית",
        "street_name": "שדרות יחזקאל",
        "house_number": "2",
        "phone": "08-9132111",
        "clinic_name": "טיפת חלב ברכפלד מכבי",
        "status": "פעיל"
    },
    {
        "_id": 651,
        "city_name": "גבעתיים",
        "street_name": "דרך בן גוריון דוד",
        "house_number": "182",
        "phone": "03-5734620",
        "clinic_name": "טיפת חלב גבעתיים",
        "status": "פעיל"
    },
    {
        "_id": 652,
        "city_name": "גדרה",
        "street_name": "פינס",
        "house_number": "5",
        "phone": "08-8621700",
        "clinic_name": "טיפת חלב גדרה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 653,
        "city_name": "גן יבנה",
        "street_name": "המגינים",
        "house_number": "56",
        "phone": "08-8574131",
        "clinic_name": "טיפת חלב גן יבנה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 654,
        "city_name": "מודיעין עילית",
        "street_name": "שד הרב מפוניבז'",
        "house_number": "9",
        "phone": "08-6258700",
        "clinic_name": "טיפת חלב גרין פארק מכבי",
        "status": "פעיל"
    },
    {
        "_id": 655,
        "city_name": "מודיעין עילית",
        "street_name": "נתיבות המשפט",
        "house_number": "90",
        "phone": "08-9142000",
        "clinic_name": "טיפת חלב הגבעה הדרומית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 656,
        "city_name": "הרצליה",
        "street_name": "סוקולוב",
        "house_number": "10",
        "phone": "09-99721300",
        "clinic_name": "טיפת חלב הרצליה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 657,
        "city_name": "חריש",
        "street_name": "דרך ארץ",
        "house_number": "52",
        "phone": "04-6164310",
        "clinic_name": "טיפת חלב חריש מכבי",
        "status": "פעיל"
    },
    {
        "_id": 658,
        "city_name": "טירה",
        "street_name": "",
        "house_number": "",
        "phone": "09-7909300",
        "clinic_name": "טיפת חלב טירה מכבי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 659,
        "city_name": "יבנה",
        "street_name": "גיבורי החיל",
        "house_number": "1",
        "phone": "08-9424050",
        "clinic_name": "טיפת חלב יבנה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 660,
        "city_name": "יקנעם עילית",
        "street_name": "שד יצחק רבין",
        "house_number": "9",
        "phone": "04-9936100",
        "clinic_name": "טיפת חלב יקנעם",
        "status": "פעיל"
    },
    {
        "_id": 661,
        "city_name": "כוכב יאיר",
        "street_name": "",
        "house_number": "",
        "phone": "09-7904300",
        "clinic_name": "טיפת חלב כוכב יאיר מכבי",
        "status": "פעיל"
    },
    {
        "_id": 662,
        "city_name": "כפר ורדים",
        "street_name": "אשכר",
        "house_number": "55",
        "phone": "04-9573132",
        "clinic_name": "טיפת חלב כפר ורדים מכבי",
        "status": "פעיל"
    },
    {
        "_id": 663,
        "city_name": "כפר סבא",
        "street_name": "רפפורט",
        "house_number": "3",
        "phone": "09-8868200",
        "clinic_name": "טיפת חלב כפר סבא הירוקה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 664,
        "city_name": "קרית גת",
        "street_name": "שדרות אבני החושן",
        "house_number": "1",
        "phone": "08-6629211",
        "clinic_name": "טיפת חלב כרמי גת",
        "status": "פעיל"
    },
    {
        "_id": 665,
        "city_name": "כרמיאל",
        "street_name": "החבצלת",
        "house_number": "3",
        "phone": "04-9027222",
        "clinic_name": "טיפת חלב כרמיאל מכבי",
        "status": "פעיל"
    },
    {
        "_id": 666,
        "city_name": "להבים",
        "street_name": "",
        "house_number": "",
        "phone": "08-6510230",
        "clinic_name": "טיפת חלב להבים מכבי",
        "status": "פעיל"
    },
    {
        "_id": 667,
        "city_name": "עלי זהב",
        "street_name": "תמר",
        "house_number": "",
        "phone": "03-7462050",
        "clinic_name": "טיפת חלב לשם",
        "status": "פעיל"
    },
    {
        "_id": 668,
        "city_name": "מגדל העמק",
        "street_name": "נחל הצבי",
        "house_number": "120",
        "phone": "3555",
        "clinic_name": "טיפת חלב מגדל העמק-מכבי",
        "status": "פעיל"
    },
    {
        "_id": 669,
        "city_name": "מודיעין-מכבים-רעות",
        "street_name": "עמק דותן",
        "house_number": "53",
        "phone": "08-9735666",
        "clinic_name": "טיפת חלב מודיעין",
        "status": "פעיל"
    },
    {
        "_id": 670,
        "city_name": "מיתר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6510034",
        "clinic_name": "טיפת חלב מיתר מכבי",
        "status": "פעיל"
    },
    {
        "_id": 671,
        "city_name": "מיתר",
        "street_name": "",
        "house_number": "",
        "phone": "08-6867230",
        "clinic_name": "טיפת חלב מיתרים",
        "status": "פעיל"
    },
    {
        "_id": 672,
        "city_name": "גבעת שמואל",
        "street_name": "אלעזר דוד",
        "house_number": "6",
        "phone": "03-7184230",
        "clinic_name": "טיפת חלב מכבי גבעת שמואל",
        "status": "פעיל"
    },
    {
        "_id": 673,
        "city_name": "הוד השרון",
        "street_name": "הבנים",
        "house_number": "14",
        "phone": "09-7478181",
        "clinic_name": "טיפת חלב מכבי הוד השרון",
        "status": "פעיל"
    },
    {
        "_id": 674,
        "city_name": "מרכז אזורי משגב",
        "street_name": "",
        "house_number": "",
        "phone": "04-8141816",
        "clinic_name": "טיפת חלב משגב מכבי",
        "status": "פעיל"
    },
    {
        "_id": 675,
        "city_name": "נאות מרדכי",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב נאות מרדכי מכבי",
        "status": "פעיל"
    },
    {
        "_id": 676,
        "city_name": "באר שבע",
        "street_name": "יוהנה ז'בוטינסקי",
        "house_number": "30",
        "phone": "08-6416622",
        "clinic_name": "טיפת חלב נווה זאב מכבי",
        "status": "פעיל"
    },
    {
        "_id": 677,
        "city_name": "בני יהודה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב ניידת טיפת חלב בני יהודה",
        "status": "פעיל"
    },
    {
        "_id": 678,
        "city_name": "חספין",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב ניידת טיפת חלב חספין",
        "status": "פעיל"
    },
    {
        "_id": 679,
        "city_name": "עתלית",
        "street_name": "הזית",
        "house_number": "63",
        "phone": "",
        "clinic_name": "טיפת חלב ניידת טיפת חלב עתלית",
        "status": "פעיל"
    },
    {
        "_id": 680,
        "city_name": "נס ציונה",
        "street_name": "נורדאו",
        "house_number": "31",
        "phone": "08-9408422",
        "clinic_name": "טיפת חלב נס ציונה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 681,
        "city_name": "עכו",
        "street_name": "דרך הארבעה",
        "house_number": "41",
        "phone": "04-9851158",
        "clinic_name": "טיפת חלב עכו מכבי",
        "status": "פעיל"
    },
    {
        "_id": 682,
        "city_name": "עלי",
        "street_name": "",
        "house_number": "",
        "phone": "02-9947313",
        "clinic_name": "טיפת חלב עלי מכבי",
        "status": "פעיל"
    },
    {
        "_id": 683,
        "city_name": "ירושלים",
        "street_name": "תורן חיים",
        "house_number": "45",
        "phone": "02-5940482",
        "clinic_name": "טיפת חלב פסגת זאב",
        "status": "פעיל"
    },
    {
        "_id": 684,
        "city_name": "צור יצחק",
        "street_name": "נחל איילון",
        "house_number": "20",
        "phone": "09-8868277",
        "clinic_name": "טיפת חלב צור יצחק",
        "status": "פעיל"
    },
    {
        "_id": 685,
        "city_name": "סעד",
        "street_name": "",
        "house_number": "",
        "phone": "08-6800412",
        "clinic_name": "טיפת חלב קיבוץ סעד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 686,
        "city_name": "קצרין",
        "street_name": "זויתן",
        "house_number": "128",
        "phone": "04-6164950",
        "clinic_name": "טיפת חלב קצרין מכבי",
        "status": "פעיל"
    },
    {
        "_id": 687,
        "city_name": "קרית אונו",
        "street_name": "ירושלים",
        "house_number": "39",
        "phone": "03-5304111",
        "clinic_name": "טיפת חלב קרית אונו",
        "status": "פעיל"
    },
    {
        "_id": 688,
        "city_name": "קרית גת",
        "street_name": "שד העצמאות",
        "house_number": "64",
        "phone": "08-6602611",
        "clinic_name": "טיפת חלב קרית גת מכבי",
        "status": "פעיל"
    },
    {
        "_id": 689,
        "city_name": "קרית מלאכי",
        "street_name": "בגין מנחם",
        "house_number": "1",
        "phone": "08-8501460",
        "clinic_name": "טיפת חלב קרית מלאכי מכבי",
        "status": "פעיל"
    },
    {
        "_id": 690,
        "city_name": "קרני שומרון",
        "street_name": "שדרות רחבעם",
        "house_number": "1",
        "phone": "09-8868260",
        "clinic_name": "טיפת חלב קרני שומרון מכבי",
        "status": "פעיל"
    },
    {
        "_id": 691,
        "city_name": "ראש העין",
        "street_name": "שייקה אופיר",
        "house_number": "1",
        "phone": "03-7462070",
        "clinic_name": "טיפת חלב ראש העין שפיר סנטר",
        "status": "פעיל"
    },
    {
        "_id": 692,
        "city_name": "רבבה",
        "street_name": "הררי קדם",
        "house_number": "2",
        "phone": "03-7462040",
        "clinic_name": "טיפת חלב רבבה מכבי",
        "status": "פעיל"
    },
    {
        "_id": 693,
        "city_name": "רכסים",
        "street_name": "הרקפות",
        "house_number": "7",
        "phone": "04-9847995",
        "clinic_name": "טיפת חלב רכסים מכבי",
        "status": "פעיל"
    },
    {
        "_id": 694,
        "city_name": "קרית גת",
        "street_name": "נתיבות שלום",
        "house_number": "16",
        "phone": "08-6867260",
        "clinic_name": "טיפת חלב רמות דוד מכבי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 695,
        "city_name": "רמת השרון",
        "street_name": "הנצח",
        "house_number": "3",
        "phone": "03-5484646",
        "clinic_name": "טיפת חלב רמת השרון",
        "status": "פעיל"
    },
    {
        "_id": 696,
        "city_name": "רמת ישי",
        "street_name": "מעלה הרדוף",
        "house_number": "32",
        "phone": "",
        "clinic_name": "טיפת חלב רמת ישי מכבי",
        "status": "פעיל"
    },
    {
        "_id": 697,
        "city_name": "רמת מגשימים",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב רמת מגשימים",
        "status": "פעיל"
    },
    {
        "_id": 698,
        "city_name": "רעננה",
        "street_name": "אחוזה",
        "house_number": "124",
        "phone": "09-7470777",
        "clinic_name": "טיפת חלב רעננה",
        "status": "פעיל"
    },
    {
        "_id": 699,
        "city_name": "שוהם",
        "street_name": "שד עמק איילון",
        "house_number": "30",
        "phone": "03-9724417",
        "clinic_name": "טיפת חלב שוהם מכבי",
        "status": "פעיל"
    },
    {
        "_id": 700,
        "city_name": "כפר ורדים",
        "street_name": "",
        "house_number": "",
        "phone": "04-9079107",
        "clinic_name": "טיפת חלב שלוחת מעלות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 701,
        "city_name": "שקף",
        "street_name": "",
        "house_number": "",
        "phone": "050-8806322",
        "clinic_name": "טיפת חלב שקף",
        "status": "פעיל"
    },
    {
        "_id": 702,
        "city_name": "תל מונד",
        "street_name": "השקד",
        "house_number": "4",
        "phone": "09-7774600",
        "clinic_name": "טיפת חלב תל מונד מכבי",
        "status": "פעיל"
    },
    {
        "_id": 703,
        "city_name": "תקוע",
        "street_name": "",
        "house_number": "",
        "phone": "02-9961391",
        "clinic_name": "טיפת חלב תקוע",
        "status": "פעיל"
    },
    {
        "_id": 704,
        "city_name": "אבן יהודה",
        "street_name": "המיסדים",
        "house_number": "41",
        "phone": "09-8917436",
        "clinic_name": "טיפת חלב אבן יהודה מאוחדת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 705,
        "city_name": "גבעת זאב",
        "street_name": "אגן האיילות",
        "house_number": "41",
        "phone": "02-9939775",
        "clinic_name": "טיפת חלב אגן איילות",
        "status": "פעיל"
    },
    {
        "_id": 706,
        "city_name": "גבע בנימין",
        "street_name": "סביון",
        "house_number": "52",
        "phone": "02-5855779",
        "clinic_name": "טיפת חלב אדם מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 707,
        "city_name": "אפרת",
        "street_name": "זית שמן",
        "house_number": "2",
        "phone": "02-5619888",
        "clinic_name": "טיפת חלב אפרת מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 708,
        "city_name": "מודיעין עילית",
        "street_name": "רבי יהודה הנשיא",
        "house_number": "7",
        "phone": "08-9743667",
        "clinic_name": "טיפת חלב ברכפלד מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 709,
        "city_name": "גבעת זאב",
        "street_name": "המכבים",
        "house_number": "48",
        "phone": "02-5360336",
        "clinic_name": "טיפת חלב גבעת זאב מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 710,
        "city_name": "גדרה",
        "street_name": "שד בגין מנחם",
        "house_number": "48",
        "phone": "08-8681165",
        "clinic_name": "טיפת חלב גדרה מאוחדת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 711,
        "city_name": "גן יבנה",
        "street_name": "העצמאות",
        "house_number": "8",
        "phone": "08-8687113",
        "clinic_name": "טיפת חלב גן יבנה מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 712,
        "city_name": "מודיעין עילית",
        "street_name": "שד הרב מפוניבז'",
        "house_number": "3",
        "phone": "08-6486266",
        "clinic_name": "טיפת חלב גרין פארק מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 713,
        "city_name": "הוד השרון",
        "street_name": "סוקולוב",
        "house_number": "46",
        "phone": "09-7619606",
        "clinic_name": "טיפת חלב הוד השרון מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 714,
        "city_name": "הרצליה",
        "street_name": "שד לנצט יעקב",
        "house_number": "6",
        "phone": "09-9706125",
        "clinic_name": "טיפת חלב הרצליה מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 715,
        "city_name": "חריש",
        "street_name": "דרך ארץ",
        "house_number": "32",
        "phone": "04-7743900",
        "clinic_name": "טיפת חלב חריש מאוחדת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 716,
        "city_name": "יהוד",
        "street_name": "הרצל",
        "house_number": "24",
        "phone": "03-5365626",
        "clinic_name": "טיפת חלב יהוד מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 717,
        "city_name": "כרמיאל",
        "street_name": "שד בית הכרם",
        "house_number": "16",
        "phone": "04-9087111",
        "clinic_name": "טיפת חלב כרמיאל מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 718,
        "city_name": "מודיעין-מכבים-רעות",
        "street_name": "לב העיר",
        "house_number": "16",
        "phone": "08-9737004",
        "clinic_name": "טיפת חלב מודיעין עזריאלי",
        "status": "פעיל"
    },
    {
        "_id": 719,
        "city_name": "מעלות-תרשיחא",
        "street_name": "הרב קוק",
        "house_number": "20",
        "phone": "04-9079111",
        "clinic_name": "טיפת חלב מעלות מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 720,
        "city_name": "מצפה יריחו",
        "street_name": "שירת הלויים",
        "house_number": "11",
        "phone": "02-5906330",
        "clinic_name": "טיפת חלב מצפה יריחו מאוחדת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 721,
        "city_name": "נס ציונה",
        "street_name": "השייטת",
        "house_number": "4",
        "phone": "08-9377661",
        "clinic_name": "טיפת חלב נס ציונה מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 722,
        "city_name": "עכו",
        "street_name": "בן עמי",
        "house_number": "39",
        "phone": "04-9017106",
        "clinic_name": "טיפת חלב עכו מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 723,
        "city_name": "קרית גת",
        "street_name": "משה ברזני",
        "house_number": "35",
        "phone": "08-6815314",
        "clinic_name": "טיפת חלב קרית גת מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 724,
        "city_name": "מודיעין עילית",
        "street_name": "אבני נזר",
        "house_number": "46",
        "phone": "08-9144321",
        "clinic_name": "טיפת חלב קרית ספר מאוחדת",
        "status": "פעיל"
    },
    {
        "_id": 725,
        "city_name": "כפר חסידים ב'",
        "street_name": "",
        "house_number": "",
        "phone": "04-9849211",
        "clinic_name": "טיפת חלב רכסים-כפר חסידים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 726,
        "city_name": "כוכב יעקב",
        "street_name": "אהבת ישראל",
        "house_number": "1",
        "phone": "02-9971360",
        "clinic_name": "טיפת חלב תל ציון מאוחדת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 727,
        "city_name": "איתמר",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב איתמר",
        "status": "פעיל"
    },
    {
        "_id": 728,
        "city_name": "אלקנה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב אלקנה לאומית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 729,
        "city_name": "אריאל",
        "street_name": "דרך הנחשונים",
        "house_number": "41",
        "phone": "",
        "clinic_name": "טיפת חלב אריאל לאומית",
        "status": "פעיל"
    },
    {
        "_id": 730,
        "city_name": "בית אל",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב בית אל לאומית",
        "status": "פעיל"
    },
    {
        "_id": 731,
        "city_name": "בית אריה",
        "street_name": "הזית",
        "house_number": "1",
        "phone": "",
        "clinic_name": "טיפת חלב בית אריה",
        "status": "פעיל"
    },
    {
        "_id": 732,
        "city_name": "מודיעין עילית",
        "street_name": "רבי שמעון בר יוחאי",
        "house_number": "1",
        "phone": "",
        "clinic_name": "טיפת חלב ברכפלד לאומית",
        "status": "פעיל"
    },
    {
        "_id": 733,
        "city_name": "גבעת זאב",
        "street_name": "קרית יערים",
        "house_number": "32",
        "phone": "",
        "clinic_name": "טיפת חלב גבעת זאב לאומית",
        "status": "פעיל"
    },
    {
        "_id": 734,
        "city_name": "קרני שומרון",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב גינות שומרון לאומית",
        "status": "פעיל"
    },
    {
        "_id": 735,
        "city_name": "גני תקווה",
        "street_name": "העמקים",
        "house_number": "20",
        "phone": "",
        "clinic_name": "טיפת חלב גני תקווה",
        "status": "פעיל"
    },
    {
        "_id": 736,
        "city_name": "מודיעין עילית",
        "street_name": "עיון התלמוד",
        "house_number": "1/2",
        "phone": "08-6217888",
        "clinic_name": "טיפת חלב גרין פארק לאומית",
        "status": "פעיל"
    },
    {
        "_id": 737,
        "city_name": "דולב",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב דולב",
        "status": "פעיל"
    },
    {
        "_id": 738,
        "city_name": "ברכה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב הר ברכה",
        "status": "פעיל"
    },
    {
        "_id": 739,
        "city_name": "הרצליה",
        "street_name": "הרצוג",
        "house_number": "13",
        "phone": "",
        "clinic_name": "טיפת חלב הרצליה",
        "status": "פעיל"
    },
    {
        "_id": 740,
        "city_name": "חורה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב חורה",
        "status": "פעיל"
    },
    {
        "_id": 741,
        "city_name": "חלמיש",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב חלמיש",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 742,
        "city_name": "חריש",
        "street_name": "דרך ארץ",
        "house_number": "39",
        "phone": "04-8800400",
        "clinic_name": "טיפת חלב חריש לאומית",
        "status": "פעיל"
    },
    {
        "_id": 743,
        "city_name": "טירה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב טירה לאומית",
        "status": "פעיל"
    },
    {
        "_id": 744,
        "city_name": "טלמון",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב טלמון",
        "status": "פעיל"
    },
    {
        "_id": 745,
        "city_name": "יבנה",
        "street_name": "שד דואני",
        "house_number": "20",
        "phone": "08-9325800",
        "clinic_name": "טיפת חלב יבנה לאומית",
        "status": "פעיל"
    },
    {
        "_id": 746,
        "city_name": "יצהר",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב יצהר",
        "status": "פעיל"
    },
    {
        "_id": 747,
        "city_name": "יקיר",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב יקיר",
        "status": "פעיל"
    },
    {
        "_id": 748,
        "city_name": "יקנעם עילית",
        "street_name": "ההרדופים",
        "house_number": "20",
        "phone": "",
        "clinic_name": "טיפת חלב יקנעם",
        "status": "פעיל"
    },
    {
        "_id": 749,
        "city_name": "כוכב השחר",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב כוכב השחר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 750,
        "city_name": "כוכב יאיר",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב כוכב יאיר לאומית",
        "status": "פעיל"
    },
    {
        "_id": 751,
        "city_name": "כוכב יעקב",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב כוכב יעקב",
        "status": "פעיל"
    },
    {
        "_id": 752,
        "city_name": "כפר סבא",
        "street_name": "ויצמן",
        "house_number": "83",
        "phone": "",
        "clinic_name": "טיפת חלב כפר סבא",
        "status": "פעיל"
    },
    {
        "_id": 753,
        "city_name": "כרמל",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב כרמל",
        "status": "פעיל"
    },
    {
        "_id": 754,
        "city_name": "נחליאל",
        "street_name": "אבני החושן",
        "house_number": "37",
        "phone": "08-6212700",
        "clinic_name": "טיפת חלב לאומית נחליאל (שלוחת טיפת חלב טלמון)",
        "status": "פעיל"
    },
    {
        "_id": 755,
        "city_name": "מעלה מכמש",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב מכמש",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 756,
        "city_name": "מעלה אפרים",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב מעלה אפרים לאומית",
        "status": "פעיל"
    },
    {
        "_id": 757,
        "city_name": "מעלה לבונה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב מעלה לבונה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 758,
        "city_name": "מצפה נטופה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב מצפה נטופה",
        "status": "פעיל"
    },
    {
        "_id": 759,
        "city_name": "טלמון",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב נריה",
        "status": "פעיל"
    },
    {
        "_id": 760,
        "city_name": "סוסיה",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב סוסיה",
        "status": "פעיל"
    },
    {
        "_id": 761,
        "city_name": "טנא",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב עומרים",
        "status": "פעיל"
    },
    {
        "_id": 762,
        "city_name": "עטרת",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב עטרת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 763,
        "city_name": "עמנואל",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב עמנואל לאומית",
        "status": "פעיל"
    },
    {
        "_id": 764,
        "city_name": "עתניאל",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב עתניאל",
        "status": "פעיל"
    },
    {
        "_id": 765,
        "city_name": "פדואל",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב פדואל",
        "status": "פעיל"
    },
    {
        "_id": 766,
        "city_name": "קדומים",
        "street_name": "יהלום",
        "house_number": "3",
        "phone": "",
        "clinic_name": "טיפת חלב קדומים לאומית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 767,
        "city_name": "קצרין",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב קצרין לאומית",
        "status": "פעיל"
    },
    {
        "_id": 768,
        "city_name": "קרית מלאכי",
        "street_name": "ז'בוטינסקי",
        "house_number": "22",
        "phone": "",
        "clinic_name": "טיפת חלב קרית מלאכי לאומית",
        "status": "פעיל"
    },
    {
        "_id": 769,
        "city_name": "רכסים",
        "street_name": "דרך הרב משקובסקי",
        "house_number": "1",
        "phone": "",
        "clinic_name": "טיפת חלב רכסים לאומית",
        "status": "פעיל"
    },
    {
        "_id": 770,
        "city_name": "קרית גת",
        "street_name": "נתיבות השלום",
        "house_number": "16",
        "phone": "08-6114400",
        "clinic_name": "טיפת חלב רמות דוד  לאומית",
        "status": "פעיל"
    },
    {
        "_id": 771,
        "city_name": "תל אביב - יפו",
        "street_name": "אחימאיר אבא",
        "house_number": "26",
        "phone": "03-7450400",
        "clinic_name": "טיפת חלב רמת אביב",
        "status": "פעיל"
    },
    {
        "_id": 772,
        "city_name": "שילה",
        "street_name": "",
        "house_number": "",
        "phone": "02-9941169",
        "clinic_name": "טיפת חלב שילה לאומית",
        "status": "פעיל"
    },
    {
        "_id": 773,
        "city_name": "גבע בנימין",
        "street_name": "",
        "house_number": "",
        "phone": "",
        "clinic_name": "טיפת חלב שער בנימין",
        "status": "פעיל"
    },
    {
        "_id": 774,
        "city_name": "קרית גת",
        "street_name": "שד מלכי ישראל",
        "house_number": "178",
        "phone": "",
        "clinic_name": "טיפת חלב שער דרום",
        "status": "פעיל"
    },
    {
        "_id": 775,
        "city_name": "שקד",
        "street_name": "שקד",
        "house_number": "",
        "phone": "04-6342440",
        "clinic_name": "טיפת חלב שקד",
        "status": "פעיל"
    },
    {
        "_id": 776,
        "city_name": "כוכב יעקב",
        "street_name": "אהבת אמת",
        "house_number": "19",
        "phone": "",
        "clinic_name": "טיפת חלב תל ציון לאומית",
        "status": "פעיל"
    },
    {
        "_id": 777,
        "city_name": "ירושלים",
        "street_name": "עק אל חלידיה",
        "house_number": "38",
        "phone": "02-6288187",
        "clinic_name": "טיפת חלב הסהר האדום - עקבת אל חלידיה",
        "status": "פעיל"
    },
    {
        "_id": 778,
        "city_name": "ירושלים",
        "street_name": "אל-חרירי",
        "house_number": "36",
        "phone": "02-6288172",
        "clinic_name": "טיפת חלב הסהר האדום - שער הפרחים",
        "status": "פעיל"
    },
    {
        "_id": 779,
        "city_name": "ירושלים",
        "street_name": "התומר",
        "house_number": "4",
        "phone": "02-5468251",
        "clinic_name": "טיפת חלב בית הכרם",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 780,
        "city_name": "ירושלים",
        "street_name": "הפסגה",
        "house_number": "42",
        "phone": "02-5457385",
        "clinic_name": "טיפת חלב בית וגן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 781,
        "city_name": "ירושלים",
        "street_name": "שג'רת אל דור",
        "house_number": "10",
        "phone": "02-5468033",
        "clinic_name": "טיפת חלב בית חנינה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 782,
        "city_name": "ירושלים",
        "street_name": "בני ברית",
        "house_number": "22",
        "phone": "02-5457980",
        "clinic_name": "טיפת חלב בני ברית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 783,
        "city_name": "ירושלים",
        "street_name": "יהודה",
        "house_number": "26",
        "phone": "02-5457794",
        "clinic_name": "טיפת חלב בקעה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 784,
        "city_name": "ירושלים",
        "street_name": "שח\"ל",
        "house_number": "83",
        "phone": "02-5456677",
        "clinic_name": "טיפת חלב גבעת מרדכי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 785,
        "city_name": "ירושלים",
        "street_name": "עמרם גאון",
        "house_number": "7",
        "phone": "02-5457780",
        "clinic_name": "טיפת חלב גבעת שאול",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 786,
        "city_name": "ירושלים",
        "street_name": "אליעזר הגדול",
        "house_number": "4",
        "phone": "02-5456681",
        "clinic_name": "טיפת חלב גוננים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 787,
        "city_name": "ירושלים",
        "street_name": "המור",
        "house_number": "3",
        "phone": "02-5456698",
        "clinic_name": "טיפת חלב גילה  א'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 788,
        "city_name": "ירושלים",
        "street_name": "שמחת כהן",
        "house_number": "3",
        "phone": "02-5483456",
        "clinic_name": "טיפת חלב הר חומה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 789,
        "city_name": "ירושלים",
        "street_name": "אגסי שמעון",
        "house_number": "10",
        "phone": "02-5456243",
        "clinic_name": "טיפת חלב הר נוף",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 790,
        "city_name": "ירושלים",
        "street_name": "פלוגת הכותל",
        "house_number": "7",
        "phone": "02-5468510",
        "clinic_name": "טיפת חלב הרובע היהודי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 791,
        "city_name": "ירושלים",
        "street_name": "אל מוקדסי",
        "house_number": "57",
        "phone": "02-5468622",
        "clinic_name": "טיפת חלב ואדי אל ג'וז א-טור",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 792,
        "city_name": "ירושלים",
        "street_name": "שמגר",
        "house_number": "6",
        "phone": "02-6402100",
        "clinic_name": "טיפת חלב כדורי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 793,
        "city_name": "ירושלים",
        "street_name": "חבקוק",
        "house_number": "6",
        "phone": "02-5468415",
        "clinic_name": "טיפת חלב מעלה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 794,
        "city_name": "ירושלים",
        "street_name": "נטר",
        "house_number": "42",
        "phone": "02-5457920",
        "clinic_name": "טיפת חלב מעלות דפנה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 795,
        "city_name": "ירושלים",
        "street_name": "גולדברג לאה",
        "house_number": "3",
        "phone": "02-5457378",
        "clinic_name": "טיפת חלב נוה יעקב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 796,
        "city_name": "ירושלים",
        "street_name": "",
        "house_number": "",
        "phone": "02-5612761",
        "clinic_name": "טיפת חלב סילואן",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 797,
        "city_name": "ירושלים",
        "street_name": "סנהדריה מורחבת",
        "house_number": "102",
        "phone": "02-5456427",
        "clinic_name": "טיפת חלב סנהדריה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 798,
        "city_name": "ירושלים",
        "street_name": "הרפוב הדומיניקנית",
        "house_number": "4",
        "phone": "02-5468252",
        "clinic_name": "טיפת חלב עיר גנים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 799,
        "city_name": "ירושלים",
        "street_name": "שד דיין משה",
        "house_number": "152",
        "phone": "02-5456554",
        "clinic_name": "טיפת חלב פסגת זאב מערב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 800,
        "city_name": "ירושלים",
        "street_name": "אלמדינה מונורה",
        "house_number": "172",
        "phone": "02-6733912",
        "clinic_name": "טיפת חלב צור באחר",
        "status": "פעיל"
    },
    {
        "_id": 801,
        "city_name": "ירושלים",
        "street_name": "צפת",
        "house_number": "23",
        "phone": "02-5456384",
        "clinic_name": "טיפת חלב צפת-נחלאות",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 802,
        "city_name": "ירושלים",
        "street_name": "סורוצקין",
        "house_number": "40",
        "phone": "02-5453741",
        "clinic_name": "טיפת חלב קרית הילד",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 803,
        "city_name": "ירושלים",
        "street_name": "גואטמאלה",
        "house_number": "20",
        "phone": "02-5457364",
        "clinic_name": "טיפת חלב קרית יובל",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 804,
        "city_name": "ירושלים",
        "street_name": "זכרון יעקב",
        "house_number": "6",
        "phone": "02-5457390",
        "clinic_name": "טיפת חלב רוממה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 805,
        "city_name": "ירושלים",
        "street_name": "שד גולדה מאיר",
        "house_number": "255",
        "phone": "02-5456426",
        "clinic_name": "טיפת חלב רמות ירושלים",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 806,
        "city_name": "ירושלים",
        "street_name": "ככר ארן זלמן",
        "house_number": "",
        "phone": "02-5456262",
        "clinic_name": "טיפת חלב רמת אשכול",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 807,
        "city_name": "ירושלים",
        "street_name": "האדמו\"ר מלובביץ",
        "house_number": "47",
        "phone": "02-5468026",
        "clinic_name": "טיפת חלב רמת שלמה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 808,
        "city_name": "ירושלים",
        "street_name": "דרך שועפאט",
        "house_number": "50",
        "phone": "02-5468530",
        "clinic_name": "טיפת חלב שועפט",
        "status": "פעיל"
    },
    {
        "_id": 809,
        "city_name": "ירושלים",
        "street_name": "קלרמון גנו",
        "house_number": "5",
        "phone": "02-5468614",
        "clinic_name": "טיפת חלב שיח ג'ראח",
        "status": "פעיל"
    },
    {
        "_id": 810,
        "city_name": "ירושלים",
        "street_name": "ברל לוקר",
        "house_number": "17",
        "phone": "02-5457369",
        "clinic_name": "טיפת חלב שכונת  פת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 811,
        "city_name": "ירושלים",
        "street_name": "ויס יעקב",
        "house_number": "4",
        "phone": "02-5468176",
        "clinic_name": "טיפת חלב תלפיות מזרח",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 812,
        "city_name": "תל אביב - יפו",
        "street_name": "בלפור",
        "house_number": "14",
        "phone": "03-7248400",
        "clinic_name": "טיפת חלב ב' - בלפור",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 813,
        "city_name": "תל אביב - יפו",
        "street_name": "בורלא יהודה",
        "house_number": "27",
        "phone": "03-7248150",
        "clinic_name": "טיפת חלב בורלא",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 814,
        "city_name": "תל אביב - יפו",
        "street_name": "דוידקה",
        "house_number": "18",
        "phone": "03-7248282",
        "clinic_name": "טיפת חלב ד' - דוידקה",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 815,
        "city_name": "תל אביב - יפו",
        "street_name": "דיזנגוף",
        "house_number": "258",
        "phone": "03-7248955",
        "clinic_name": "טיפת חלב דיזינגוף",
        "status": "פעיל"
    },
    {
        "_id": 816,
        "city_name": "תל אביב - יפו",
        "street_name": "בוגרשוב",
        "house_number": "14",
        "phone": "03-7240366",
        "clinic_name": "טיפת חלב ה' - בוגרשוב",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 817,
        "city_name": "תל אביב - יפו",
        "street_name": "ראשון לציון",
        "house_number": "3",
        "phone": "03-7248258",
        "clinic_name": "טיפת חלב ו' - תחנה מרכזית",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 818,
        "city_name": "תל אביב - יפו",
        "street_name": "הקשת",
        "house_number": "8",
        "phone": "03-7248222",
        "clinic_name": "טיפת חלב ח' - קרית שלום",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 819,
        "city_name": "תל אביב - יפו",
        "street_name": "עירית",
        "house_number": "17",
        "phone": "03-7248181",
        "clinic_name": "טיפת חלב ט\"ז - יפו ג'",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 820,
        "city_name": "תל אביב - יפו",
        "street_name": "דרך בר-לב חיים",
        "house_number": "195",
        "phone": "03-7248333",
        "clinic_name": "טיפת חלב ט' - נוה אליעזר",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 821,
        "city_name": "תל אביב - יפו",
        "street_name": "טבת",
        "house_number": "15",
        "phone": "03-7248311",
        "clinic_name": "טיפת חלב י\"א - שכונת עזרא",
        "status": "פעיל"
    },
    {
        "_id": 822,
        "city_name": "תל אביב - יפו",
        "street_name": "הערמון",
        "house_number": "8",
        "phone": "03-7248212",
        "clinic_name": "טיפת חלב י\"ד - עג'מי - מרכז הירש",
        "status": "פעיל"
    },
    {
        "_id": 823,
        "city_name": "תל אביב - יפו",
        "street_name": "ירושלמי",
        "house_number": "14",
        "phone": "03-7248161",
        "clinic_name": "טיפת חלב י\"ט - בבלי",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 824,
        "city_name": "תל אביב - יפו",
        "street_name": "שולמן",
        "house_number": "3",
        "phone": "03-7248262",
        "clinic_name": "טיפת חלב י' - ביצרון",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 825,
        "city_name": "תל אביב - יפו",
        "street_name": "פילדלפיה",
        "house_number": "6",
        "phone": "03-67248148",
        "clinic_name": "טיפת חלב כ\"ב - נוה שרת",
        "status": "תחנה סגורה זמנית"
    },
    {
        "_id": 826,
        "city_name": "תל אביב - יפו",
        "street_name": "למדן יצחק",
        "house_number": "20",
        "phone": "03-7248121",
        "clinic_name": "טיפת חלב כ\"ה - נאות אפקה",
        "status": "תחנה סגורה זמנית"
    }
];
