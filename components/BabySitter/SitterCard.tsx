import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { User, Award, Star, MapPin, Heart } from 'lucide-react-native';
import { Sitter } from '../../hooks/useSitters';

interface SitterCardProps {
    sitter: Sitter;
    theme: any;
    isDarkMode: boolean;
    onPress: (sitter: Sitter) => void;
    isFavorite?: boolean;
    onToggleFavorite?: (sitterId: string) => void;
}

const SitterCard = ({ sitter, theme, isDarkMode, onPress, isFavorite, onToggleFavorite }: SitterCardProps) => {
    const [imageError, setImageError] = useState(false);

    const rating = typeof sitter.rating === 'number' && !isNaN(sitter.rating) && sitter.rating > 0
        ? Math.max(0, Math.min(5, sitter.rating)) : 0;

    const price = typeof sitter.pricePerHour === 'number' && !isNaN(sitter.pricePerHour) && sitter.pricePerHour > 0
        ? sitter.pricePerHour : 50;

    // Hide unrealistic distances (>100 km - babysitters search is local)
    const rawDistance = typeof sitter.distance === 'number' && !isNaN(sitter.distance) ? sitter.distance : null;
    const distance = rawDistance !== null && rawDistance > 0 && rawDistance <= 100 ? rawDistance : null;

    return (
        <TouchableOpacity
            style={[styles.sitterCard, {
                backgroundColor: theme.card,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            }]}
            onPress={() => onPress(sitter)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${sitter.name || 'סיטר'}, דירוג ${rating.toFixed(1)}, מחיר ${price} לשעה`}
        >
            <View style={styles.sitterCardTop}>
                {/* Photo */}
                <View style={styles.sitterPhotoWrapper}>
                    {sitter.photoUrl && !imageError ? (
                        <Image
                            source={{ uri: sitter.photoUrl }}
                            style={styles.sitterPhoto}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <View style={[styles.sitterPhotoPlaceholder, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        }]}>
                            <User size={26} color={theme.textSecondary} strokeWidth={1.5} />
                        </View>
                    )}
                    {sitter.isAvailable && (
                        <View style={[styles.availableDot, { borderColor: theme.card }]} />
                    )}
                </View>

                {/* Info - center */}
                <View style={styles.sitterInfo}>
                    {/* Name row */}
                    <View style={styles.sitterHeader}>
                        {onToggleFavorite && (
                            <TouchableOpacity
                                onPress={() => onToggleFavorite(sitter.id!)}
                                style={{ marginRight: 6, padding: 4 }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Heart
                                    size={18}
                                    color={isFavorite ? '#F43F5E' : theme.textSecondary}
                                    fill={isFavorite ? '#F43F5E' : 'transparent'}
                                    strokeWidth={isFavorite ? 0 : 1.5}
                                />
                            </TouchableOpacity>
                        )}
                        {sitter.isAvailableTonight && (
                            <View style={[styles.tonightBadge, { backgroundColor: 'rgba(200,128,106,0.15)' }]}>
                                <Text style={[styles.tonightText, { color: '#C8806A' }]}>פנוי/ה להערב</Text>
                            </View>
                        )}
                        {sitter.isVerified && (
                            <View style={[styles.verifiedDot, { backgroundColor: isDarkMode ? '#fff' : '#111' }]}>
                                <Award size={9} color={isDarkMode ? '#000' : '#fff'} strokeWidth={2.5} />
                            </View>
                        )}
                        <Text style={[styles.sitterName, { color: theme.textPrimary }]} numberOfLines={1}>
                            {sitter.name}
                        </Text>
                    </View>

                    {/* Rating + Experience */}
                    <View style={styles.sitterMeta}>
                        {rating > 0 ? (
                            <View style={styles.ratingBadge}>
                                <Star size={11} color="#FBBF24" fill="#FBBF24" strokeWidth={1.5} />
                                <Text style={[styles.ratingText, { color: theme.textPrimary }]}>
                                    {rating.toFixed(1)}
                                </Text>
                                {sitter.reviewCount > 0 && (
                                    <Text style={[styles.reviewCountText, { color: theme.textSecondary }]}>
                                        ({sitter.reviewCount})
                                    </Text>
                                )}
                            </View>
                        ) : null}
                        {rating > 0 && sitter.experience ? (
                            <View style={[styles.metaDot, { backgroundColor: theme.textSecondary }]} />
                        ) : null}
                        {sitter.experience ? (
                            <Text style={[styles.experienceText, { color: theme.textSecondary }]} numberOfLines={1}>
                                {sitter.experience}
                            </Text>
                        ) : null}
                    </View>

                    {/* City + Distance */}
                    {(sitter.city || distance) ? (
                        <View style={styles.sitterLocationRow}>
                            <MapPin size={10} color={theme.textSecondary} strokeWidth={2} />
                            {sitter.city ? (
                                <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                                    {sitter.city}
                                </Text>
                            ) : null}
                            {sitter.city && distance ? (
                                <Text style={[styles.locationText, { color: theme.textSecondary }]}>·</Text>
                            ) : null}
                            {distance ? (
                                <Text style={[styles.locationText, { color: theme.textSecondary }]}>
                                    {distance < 1 ? `${Math.round(distance * 1000)} מ'` : `${distance.toFixed(1)} ק"מ`}
                                </Text>
                            ) : null}
                        </View>
                    ) : null}
                </View>

                {/* Price - right side, clean */}
                <View style={styles.priceSection}>
                    <Text style={[styles.priceAmount, { color: theme.textPrimary }]}>{price} ₪</Text>
                    <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>לשעה</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    sitterCard: {
        borderRadius: 14,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: StyleSheet.hairlineWidth,
    },
    sitterCardTop: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    sitterPhotoWrapper: {
        position: 'relative',
        flexShrink: 0,
    },
    sitterPhoto: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    sitterPhotoPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    availableDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#C8806A',
        borderWidth: 2,
    },
    sitterInfo: {
        flex: 1,
        alignItems: 'flex-end',
    },
    sitterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    verifiedDot: {
        width: 17,
        height: 17,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sitterName: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    sitterMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        opacity: 0.4,
    },
    ratingBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 3,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
    },
    reviewCountText: {
        fontSize: 11,
        fontWeight: '400',
        opacity: 0.7,
    },
    experienceText: {
        fontSize: 12,
        fontWeight: '400',
    },
    sitterLocationRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 11,
        fontWeight: '400',
    },
    priceSection: {
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    priceAmount: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    priceLabel: {
        fontSize: 10,
        fontWeight: '400',
        opacity: 0.6,
    },
    tonightBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    tonightText: {
        fontSize: 10,
        fontWeight: '600',
    },
});

export default React.memo(SitterCard);
