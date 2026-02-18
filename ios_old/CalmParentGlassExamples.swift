//
//  CalmParentGlassExamples.swift
//  CalmParentApp
//
//  דוגמאות שימוש ב-Liquid Glass לאפליקציית Calm Parent
//

import SwiftUI

// MARK: - דף הבית עם Liquid Glass

struct CalmParentHomeView: View {
    @State private var showBottomSheet = false
    
    var body: some View {
        ZStack {
            // רקע גרדיאנט
            LinearGradient(
                colors: [.purple.opacity(0.6), .blue.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 20) {
                    // כותרת
                    Text("Calm Parent")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top)
                    
                    // כרטיסי סטטוס
                    GlassContainer(spacing: 30) {
                        VStack(spacing: 20) {
                            // בייביסיטר
                            GlassStatusCard(
                                title: "בייביסיטר",
                                subtitle: "שרה כהן - ₪50/שעה",
                                icon: "person.fill.checkmark",
                                iconColor: .purple,
                                status: "פעיל",
                                statusColor: .green
                            )
                            
                            // מדיטציה
                            GlassStatusCard(
                                title: "מדיטציה יומית",
                                subtitle: "15 דקות שקט",
                                icon: "leaf.fill",
                                iconColor: .green,
                                status: "השלם",
                                statusColor: .blue
                            )
                            
                            // שינה
                            GlassStatusCard(
                                title: "מעקב שינה",
                                subtitle: "7.5 שעות אתמול",
                                icon: "moon.stars.fill",
                                iconColor: .indigo,
                                status: "צפה",
                                statusColor: .orange
                            )
                        }
                    }
                    .padding()
                    
                    // כפתורי פעולה
                    GlassContainer(spacing: 20) {
                        VStack(spacing: 16) {
                            GlassProminentButton("התחל מדיטציה", icon: "leaf.fill") {
                                print("Start meditation")
                            }
                            
                            GlassButton("התחל משמרת בייביסיטר", icon: "person.badge.clock") {
                                print("Start babysitter shift")
                            }
                            
                            GlassButton("רשום שינה", icon: "moon.stars") {
                                print("Log sleep")
                            }
                        }
                    }
                    .padding()
                }
            }
            
            // כפתור צף
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    GlassFloatingActionButton(icon: "plus", tint: .purple) {
                        withAnimation {
                            showBottomSheet.toggle()
                        }
                    }
                    .padding()
                }
            }
            
            // Bottom Sheet
            GlassBottomSheet(isPresented: $showBottomSheet) {
                VStack(spacing: 20) {
                    Text("פעולה חדשה")
                        .font(.headline)
                    
                    ForEach(["התחל מדיטציה", "התחל משמרת", "רשום שינה"], id: \.self) { item in
                        Button(action: {
                            showBottomSheet = false
                        }) {
                            Text(item)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(12)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - מסך בייביסיטר עם Liquid Glass

struct BabysitterGlassView: View {
    @State private var isActive = false
    @State private var isPaused = false
    @State private var elapsedTime: TimeInterval = 3675 // 1:01:15
    
    var body: some View {
        ZStack {
            // רקע
            LinearGradient(
                colors: [.purple.opacity(0.6), .pink.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // כותרת
                GlassNavigationBar(
                    title: "בייביסיטר",
                    leftAction: {
                        print("Back")
                    },
                    rightAction: {
                        print("Menu")
                    }
                )
                
                Spacer()
                
                if isActive {
                    // טיימר גדול
                    GlassCard(cornerRadius: 30, tint: .purple.opacity(0.2)) {
                        VStack(spacing: 20) {
                            Text("שרה כהן")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            Text(formatTime(elapsedTime))
                                .font(.system(size: 64, weight: .bold, design: .rounded))
                                .monospacedDigit()
                            
                            Text("₪\(String(format: "%.2f", (elapsedTime / 3600) * 50))")
                                .font(.system(size: 32, weight: .bold))
                                .foregroundColor(.green)
                            
                            Text("₪50/שעה")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 40)
                    }
                    .padding()
                    
                    // כפתורי שליטה
                    GlassContainer(spacing: 20) {
                        HStack(spacing: 20) {
                            GlassButton(
                                isPaused ? "המשך" : "השהה",
                                icon: isPaused ? "play.fill" : "pause.fill",
                                tint: .orange
                            ) {
                                isPaused.toggle()
                            }
                            
                            GlassButton(
                                "סיים",
                                icon: "stop.fill",
                                tint: .red
                            ) {
                                isActive = false
                                elapsedTime = 0
                            }
                        }
                    }
                    .padding()
                    
                } else {
                    // התחל משמרת
                    VStack(spacing: 30) {
                        GlassBadge(icon: "person.fill.checkmark", color: .purple, size: 120)
                        
                        Text("אין משמרת פעילה")
                            .font(.title2)
                            .foregroundColor(.white)
                        
                        GlassProminentButton("התחל משמרת חדשה", icon: "play.fill") {
                            isActive = true
                        }
                    }
                }
                
                Spacer()
            }
        }
    }
    
    private func formatTime(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        let secs = Int(seconds) % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, secs)
    }
}

// MARK: - מסך מדיטציה עם Liquid Glass

struct MeditationGlassView: View {
    @State private var isActive = false
    @State private var selectedDuration = 15
    let durations = [5, 10, 15, 20, 30]
    
    var body: some View {
        ZStack {
            // רקע
            LinearGradient(
                colors: [.green.opacity(0.6), .mint.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // כותרת
                Text("מדיטציה")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.top)
                
                Spacer()
                
                if isActive {
                    // מדיטציה פעילה
                    GlassCard(cornerRadius: 30, tint: .green.opacity(0.2)) {
                        VStack(spacing: 30) {
                            GlassBadge(icon: "leaf.fill", color: .green, size: 100)
                            
                            Text("נשימה עמוקה...")
                                .font(.title2)
                                .foregroundColor(.primary)
                            
                            Text("15:00")
                                .font(.system(size: 64, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.primary)
                            
                            GlassButton("עצור", icon: "stop.fill", tint: .red) {
                                isActive = false
                            }
                        }
                        .padding(.vertical, 40)
                    }
                    .padding()
                    
                } else {
                    // בחירת משך
                    VStack(spacing: 24) {
                        GlassBadge(icon: "leaf.fill", color: .green, size: 100)
                        
                        Text("בחר משך מדיטציה")
                            .font(.title2)
                            .foregroundColor(.white)
                        
                        // כפתורי משך
                        GlassContainer(spacing: 16) {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                ForEach(durations, id: \.self) { duration in
                                    Button(action: {
                                        selectedDuration = duration
                                    }) {
                                        VStack {
                                            Text("\(duration)")
                                                .font(.title)
                                                .fontWeight(.bold)
                                            Text("דקות")
                                                .font(.caption)
                                        }
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 100)
                                        .glassEffect(
                                            selectedDuration == duration 
                                                ? .regular.tint(.green.opacity(0.3)).interactive()
                                                : .regular.interactive(),
                                            in: .rect(cornerRadius: 16)
                                        )
                                    }
                                }
                            }
                        }
                        .padding()
                        
                        GlassProminentButton("התחל מדיטציה", icon: "play.fill") {
                            isActive = true
                        }
                    }
                }
                
                Spacer()
            }
        }
    }
}

// MARK: - מסך שינה עם Liquid Glass

struct SleepTrackingGlassView: View {
    @State private var hoursSlept: Double = 7.5
    
    var body: some View {
        ZStack {
            // רקע
            LinearGradient(
                colors: [.indigo.opacity(0.6), .purple.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 24) {
                    // כותרת
                    Text("מעקב שינה")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.top)
                    
                    // כרטיס עיקרי
                    GlassCard(cornerRadius: 30, tint: .indigo.opacity(0.2)) {
                        VStack(spacing: 20) {
                            GlassBadge(icon: "moon.stars.fill", color: .indigo, size: 80)
                            
                            Text("\(String(format: "%.1f", hoursSlept)) שעות")
                                .font(.system(size: 48, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            
                            Text("השינה שלך אתמול")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Slider(value: $hoursSlept, in: 0...12, step: 0.5)
                                .tint(.indigo)
                                .padding(.horizontal)
                        }
                        .padding(.vertical, 30)
                    }
                    .padding()
                    
                    // סטטיסטיקות
                    GlassContainer(spacing: 16) {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                            // ממוצע שבועי
                            GlassCard(tint: .blue.opacity(0.2)) {
                                VStack {
                                    Text("7.2")
                                        .font(.title)
                                        .fontWeight(.bold)
                                    Text("ממוצע שבועי")
                                        .font(.caption)
                                }
                            }
                            
                            // איכות שינה
                            GlassCard(tint: .green.opacity(0.2)) {
                                VStack {
                                    Text("85%")
                                        .font(.title)
                                        .fontWeight(.bold)
                                    Text("איכות שינה")
                                        .font(.caption)
                                }
                            }
                            
                            // שיא
                            GlassCard(tint: .purple.opacity(0.2)) {
                                VStack {
                                    Text("9.5")
                                        .font(.title)
                                        .fontWeight(.bold)
                                    Text("שיא")
                                        .font(.caption)
                                }
                            }
                            
                            // רצף
                            GlassCard(tint: .orange.opacity(0.2)) {
                                VStack {
                                    Text("14")
                                        .font(.title)
                                        .fontWeight(.bold)
                                    Text("ימי רצף")
                                        .font(.caption)
                                }
                            }
                        }
                    }
                    .padding()
                    
                    // כפתורים
                    GlassProminentButton("שמור נתוני שינה", icon: "checkmark.circle.fill") {
                        print("Save sleep data")
                    }
                    .padding()
                }
            }
        }
    }
}

// MARK: - Previews

#Preview("Home") {
    CalmParentHomeView()
}

#Preview("Babysitter") {
    BabysitterGlassView()
}

#Preview("Meditation") {
    MeditationGlassView()
}

#Preview("Sleep Tracking") {
    SleepTrackingGlassView()
}
