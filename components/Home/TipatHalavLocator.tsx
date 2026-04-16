import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Modal, Linking, Platform, Alert } from 'react-native';
import { MapPin, Search, Phone, Building2, X, AlertCircle, Navigation } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { TIPAT_HALAV_DATABASE } from '../../data/tipatHalavDatabase';

export interface TipatHalavStation {
    _id: number;
    city_name: string;
    street_name: string;
    house_number: string;
    phone: string;
    clinic_name: string;
    status?: string;
    zip_code?: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
}

const TipatHalavLocator: React.FC<Props> = ({ visible, onClose }) => {
    // If not visible, we can just return null or allow React to handle unmounting
    if (!visible) return null;

    const { theme, isDarkMode } = useTheme();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<TipatHalavStation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Tipat halav dataset ID from data.gov.il
    const RESOURCE_ID = 'b5c654ab-f4eb-4fa6-84d6-fcf9ae2f7ec8';

    const searchStations = async (query: string) => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);
        
        // Use the comprehensive local offline database derived from Excel
        setTimeout(() => {
            const cleanQuery = query.toLowerCase().trim();
            const localResults = TIPAT_HALAV_DATABASE.filter(s => 
                (s.city_name && s.city_name.includes(cleanQuery)) || 
                (s.street_name && s.street_name.includes(cleanQuery)) || 
                (s.clinic_name && s.clinic_name.includes(cleanQuery))
            );

            if (localResults.length > 0) {
                setResults(localResults.slice(0, 15)); // Limit to 15 for performance
                setError(null);
            } else {
                setResults([]);
                setError('לא מצאנו תחנות בחיפוש זה. נסה לחפש עיר אחרת.');
            }
            setLoading(false);
        }, 100); // Small 100ms artificial delay to give a smooth loading feel
    };

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            if (visible) {
                searchStations(searchQuery);
            }
        }, 600);
        return () => clearTimeout(handler);
    }, [searchQuery, visible]);

    const handleCall = async (phoneNum: string) => {
        if (!phoneNum) return;
        const formattedPhone = phoneNum.replace(/[^0-9*+]/g, '');
        const url = `tel:${formattedPhone}`;
        
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('חיוג אינו נתמך', 'המכשיר הזה לא תומך בהוצאת שיחות טלפון (כנראה סימולטור).');
            }
        } catch (e) {
            Alert.alert('חיוג אינו נתמך', 'המכשיר הזה לא תומך בהוצאת שיחות טלפון (כנראה סימולטור).');
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleNavigate = async (station: TipatHalavStation) => {
        const address = `${station.street_name} ${station.house_number}, ${station.city_name}`;
        const encodedAddress = encodeURIComponent(address);
        
        const wazeUrl = `waze://?q=${encodedAddress}`;
        const appleMapsUrl = `maps:0,0?q=${encodedAddress}`;
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        const geoUrl = `geo:0,0?q=${encodedAddress}`;

        try {
            if (Platform.OS === 'android') {
                // On Android, geo: opens the default maps app (Google Maps, Waze, etc.)
                const canOpenGeo = await Linking.canOpenURL(geoUrl).catch(() => false);
                if (canOpenGeo) {
                    await Linking.openURL(geoUrl);
                    return;
                }
                // Fallback to Google Maps web (always works)
                await Linking.openURL(googleMapsUrl);
                return;
            }

            // iOS: try Waze, then Apple Maps, then Google Maps web
            const canOpenWaze = await Linking.canOpenURL(wazeUrl).catch(() => false);
            if (canOpenWaze) {
                await Linking.openURL(wazeUrl);
                return;
            }

            const canOpenApple = await Linking.canOpenURL(appleMapsUrl).catch(() => false);
            if (canOpenApple) {
                await Linking.openURL(appleMapsUrl);
                return;
            }

            // Ultimate fallback to Google Maps Web
            await Linking.openURL(googleMapsUrl);
        } catch (e) {
            Alert.alert('שגיאה', 'לא ניתן לפתוח אפליקציית ניווט במכשיר זה');
        }

        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const healthColor = theme.actionColors.health.color;
    const healthLightColor = theme.actionColors.health.lightColor;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerIconCircle, { backgroundColor: healthColor }]}>
                    <MapPin size={24} color="#FFFFFF" strokeWidth={1.8} />
                </View>
                <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
                    מצאו את תחנת טיפת חלב הקרובה אליכם מתוך מאגר של מעל 1,800 תחנות ברחבי הארץ
                </Text>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Search size={20} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.textPrimary }]}
                    placeholder="חפש עיר, ישוב או רחוב..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign="right"
                />
            </View>

            {/* Results Count */}
            {results.length > 0 && (
                <View style={styles.resultsCountRow}>
                    <Text style={[styles.resultsCountText, { color: theme.textSecondary }]}>
                        נמצאו {results.length} תחנות
                    </Text>
                </View>
            )}

            {/* Content */}
            <View style={styles.listContainer}>
                {loading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={healthColor} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>מחפש תחנות...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centerContent}>
                        <AlertCircle size={40} color={theme.danger} />
                        <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
                    </View>
                ) : results.length > 0 ? (
                    <FlatList
                        data={results}
                        keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={[styles.stationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={styles.stationInfo}>
                                    <View style={styles.stationHeader}>
                                        <Building2 size={16} color={healthColor} style={{ marginLeft: 6 }} />
                                        <Text style={[styles.stationName, { color: theme.textPrimary }]}>
                                            {item.clinic_name || 'תחנת טיפת חלב'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.stationAddress, { color: theme.textSecondary }]}>
                                        {item.street_name} {item.house_number}, {item.city_name}
                                    </Text>
                                    {item.phone ? (
                                        <TouchableOpacity onPress={() => handleCall(item.phone)} activeOpacity={0.6}>
                                            <View style={styles.phoneRow}>
                                                <Phone size={12} color={healthColor} />
                                                <Text style={[styles.stationPhoneClickable, { color: healthColor }]}>
                                                    {item.phone}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                
                                <View style={styles.actionButtonsRow}>
                                    <TouchableOpacity 
                                        style={[styles.circularButton, { backgroundColor: healthLightColor }]}
                                        onPress={() => handleNavigate(item)}
                                    >
                                        <Navigation size={18} color={healthColor} />
                                    </TouchableOpacity>

                                    {item.phone ? (
                                        <TouchableOpacity 
                                            style={[styles.circularButton, { backgroundColor: healthLightColor, marginRight: 10 }]}
                                            onPress={() => handleCall(item.phone)}
                                        >
                                            <Phone size={18} color={healthColor} />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    />
                ) : searchQuery.length > 1 ? (
                    <View style={styles.centerContent}>
                        <MapPin size={40} color={theme.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>לא מצאנו תחנות ב"{searchQuery}"</Text>
                    </View>
                ) : (
                    <View style={styles.centerContent}>
                        <View style={[styles.emptyIconBg, { backgroundColor: healthLightColor }]}>
                            <Search size={32} color={healthColor} />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 16 }]}>
                            הכנס שם עיר או יישוב כדי למצוא את תחנת טיפת חלב הקרובה אליך
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    header: {
        alignItems: 'center' as const,
        marginBottom: 16,
    },
    headerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginBottom: 12,
    },
    headerDescription: {
        fontSize: 13,
        textAlign: 'center' as const,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    resultsCountRow: {
        alignItems: 'flex-end' as const,
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    resultsCountText: {
        fontSize: 13,
        fontWeight: '500' as const,
    },
    phoneRow: {
        flexDirection: 'row-reverse' as const,
        alignItems: 'center' as const,
        gap: 4,
        marginTop: 4,
    },
    stationPhoneClickable: {
        fontSize: 14,
        fontWeight: '600' as const,
        textDecorationLine: 'underline' as const,
    },
    searchContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        marginRight: 10,
        writingDirection: 'rtl',
    },
    listContainer: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
        fontWeight: '500',
    },
    errorText: {
        marginTop: 12,
        fontSize: 15,
        textAlign: 'center',
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    stationCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
        elevation: 1,
    },
    stationInfo: {
        flex: 1,
    },
    stationHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 4,
    },
    stationName: {
        fontSize: 16,
        fontWeight: '700',
    },
    stationAddress: {
        fontSize: 14,
        textAlign: 'right',
    },
    stationPhone: {
        fontSize: 14,
        textAlign: 'right',
        marginTop: 2,
    },
    actionButtonsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginRight: 16,
    },
    circularButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TipatHalavLocator;
