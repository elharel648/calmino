/**
 * LiquidGlassDemo - Demo screen showcasing all Liquid Glass components
 * Use this to see all components in action
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ImageBackground,
} from 'react-native';
import {
    LiquidGlassCard,
    LiquidGlassButton,
    LiquidGlassModal,
    LiquidGlassTabBar,
    LiquidGlassTab,
} from './index';

const DEMO_TABS: LiquidGlassTab[] = [
    { id: 'home', label: 'בית' },
    { id: 'stats', label: 'סטטיסטיקות' },
    { id: 'settings', label: 'הגדרות' },
];

export const LiquidGlassDemo: React.FC = () => {
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('home');

    return (
        <ImageBackground
            source={{
                uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800',
            }}
            style={styles.container}
            blurRadius={0}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>✨ Liquid Glass Components</Text>
                    <Text style={styles.subtitle}>Apple iOS 18 Style</Text>
                </View>

                {/* Glass Cards */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Glass Cards</Text>

                    <LiquidGlassCard style={styles.card}>
                        <Text style={styles.cardTitle}>כרטיס רגיל</Text>
                        <Text style={styles.cardText}>
                            זהו כרטיס עם אפקט Liquid Glass מושלם
                        </Text>
                    </LiquidGlassCard>

                    <LiquidGlassCard
                        style={styles.card}
                        glowColor="rgba(0, 122, 255, 0.6)"
                    >
                        <Text style={styles.cardTitle}>כרטיס עם זוהר כחול</Text>
                        <Text style={styles.cardText}>
                            ניתן לשנות את צבע הזוהר לכל צבע שתרצה
                        </Text>
                    </LiquidGlassCard>

                    <LiquidGlassCard
                        style={styles.card}
                        glowColor="rgba(255, 45, 85, 0.6)"
                        intensity={100}
                    >
                        <Text style={styles.cardTitle}>כרטיס עם blur חזק</Text>
                        <Text style={styles.cardText}>
                            Intensity גבוה יותר = blur חזק יותר
                        </Text>
                    </LiquidGlassCard>
                </View>

                {/* Buttons */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Buttons</Text>

                    <LiquidGlassButton
                        title="כפתור ראשי"
                        variant="primary"
                        size="large"
                        onPress={() => logger.log('Primary pressed')}
                    />

                    <View style={styles.buttonRow}>
                        <LiquidGlassButton
                            title="משני"
                            variant="secondary"
                            size="medium"
                            onPress={() => logger.log('Secondary pressed')}
                            style={styles.buttonInRow}
                        />

                        <LiquidGlassButton
                            title="Accent"
                            variant="accent"
                            size="medium"
                            onPress={() => logger.log('Accent pressed')}
                            style={styles.buttonInRow}
                        />
                    </View>

                    <LiquidGlassButton
                        title="פתח Modal"
                        variant="primary"
                        size="medium"
                        onPress={() => setModalVisible(true)}
                    />
                </View>

                {/* Tab Bar */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Tab Bar</Text>

                    <LiquidGlassTabBar
                        tabs={DEMO_TABS}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />

                    <LiquidGlassCard style={styles.tabContent}>
                        <Text style={styles.cardTitle}>תוכן של Tab: {activeTab}</Text>
                        <Text style={styles.cardText}>
                            לחץ על הטאבים כדי לראות את האנימציה
                        </Text>
                    </LiquidGlassCard>
                </View>

                <View style={styles.spacer} />
            </ScrollView>

            {/* Modal Demo */}
            <LiquidGlassModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>🎉 Liquid Glass Modal</Text>
                    <Text style={styles.modalText}>
                        זהו modal עם אפקט זכוכית נוזלית מושלם!
                    </Text>
                    <Text style={styles.modalText}>
                        שים לב ל-blur של הרקע, ה-gradient, והגבולות המאירים.
                    </Text>

                    <LiquidGlassButton
                        title="סגור"
                        variant="primary"
                        size="large"
                        onPress={() => setModalVisible(false)}
                        style={styles.modalButton}
                    />
                </View>
            </LiquidGlassModal>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 60,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 8,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    card: {
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 8,
    },
    cardText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.7)',
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginVertical: 12,
    },
    buttonInRow: {
        flex: 1,
    },
    tabContent: {
        marginTop: 16,
    },
    spacer: {
        height: 40,
    },
    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        color: 'rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    modalButton: {
        marginTop: 24,
        width: '80%',
    },
});
