//
//  LiquidGlassComponents.swift
//  CalmParentApp
//
//  רכיבי Liquid Glass לשימוש באפליקציה
//

import SwiftUI

// MARK: - Glass Card View

/// כרטיס עם אפקט Liquid Glass
struct GlassCard<Content: View>: View {
    let content: Content
    var cornerRadius: CGFloat = 20
    var tint: Color? = nil
    var isInteractive: Bool = false
    
    init(
        cornerRadius: CGFloat = 20,
        tint: Color? = nil,
        isInteractive: Bool = false,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.tint = tint
        self.isInteractive = isInteractive
        self.content = content()
    }
    
    var body: some View {
        content
            .padding()
            .glassEffect(
                glassStyle,
                in: .rect(cornerRadius: cornerRadius)
            )
    }
    
    private var glassStyle: Glass {
        var glass = Glass.regular
        if let tint = tint {
            glass = glass.tint(tint)
        }
        if isInteractive {
            glass = glass.interactive()
        }
        return glass
    }
}

// MARK: - Glass Button

/// כפתור עם אפקט Liquid Glass
struct GlassButton: View {
    let title: String
    let icon: String?
    let action: () -> Void
    var tint: Color = .blue
    
    init(
        _ title: String,
        icon: String? = nil,
        tint: Color = .blue,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.tint = tint
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title2)
                }
                Text(title)
                    .font(.headline)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
        }
        .buttonStyle(.glass)
    }
}

// MARK: - Glass Prominent Button

/// כפתור בולט עם אפקט Liquid Glass
struct GlassProminentButton: View {
    let title: String
    let icon: String?
    let action: () -> Void
    
    init(
        _ title: String,
        icon: String? = nil,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title2)
                }
                Text(title)
                    .font(.headline)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
        }
        .buttonStyle(.glassProminent)
    }
}

// MARK: - Glass Container

/// מיכל לכמה אלמנטים עם Liquid Glass
struct GlassContainer<Content: View>: View {
    let spacing: CGFloat
    let content: Content
    
    init(spacing: CGFloat = 40, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }
    
    var body: some View {
        GlassEffectContainer(spacing: spacing) {
            content
        }
    }
}

// MARK: - Glass Badge

/// תג עם אפקט Liquid Glass
struct GlassBadge: View {
    let icon: String
    let color: Color
    let size: CGFloat
    
    init(icon: String, color: Color = .blue, size: CGFloat = 60) {
        self.icon = icon
        self.color = color
        self.size = size
    }
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.gradient)
                .frame(width: size, height: size)
            
            Image(systemName: icon)
                .font(.system(size: size * 0.5))
                .foregroundColor(.white)
        }
        .glassEffect(.regular.tint(color.opacity(0.3)), in: .circle)
    }
}

// MARK: - Glass Navigation Bar

/// סרגל ניווט עם Liquid Glass
struct GlassNavigationBar: View {
    let title: String
    let leftAction: (() -> Void)?
    let rightAction: (() -> Void)?
    var leftIcon: String = "chevron.right"
    var rightIcon: String = "ellipsis"
    
    init(
        title: String,
        leftIcon: String = "chevron.right",
        rightIcon: String = "ellipsis",
        leftAction: (() -> Void)? = nil,
        rightAction: (() -> Void)? = nil
    ) {
        self.title = title
        self.leftIcon = leftIcon
        self.rightIcon = rightIcon
        self.leftAction = leftAction
        self.rightAction = rightAction
    }
    
    var body: some View {
        HStack {
            if let leftAction = leftAction {
                Button(action: leftAction) {
                    Image(systemName: leftIcon)
                        .font(.title2)
                        .foregroundColor(.white)
                }
            }
            
            Spacer()
            
            Text(title)
                .font(.headline)
                .foregroundColor(.white)
            
            Spacer()
            
            if let rightAction = rightAction {
                Button(action: rightAction) {
                    Image(systemName: rightIcon)
                        .font(.title2)
                        .foregroundColor(.white)
                }
            }
        }
        .padding()
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 16))
    }
}

// MARK: - Glass Status Card

/// כרטיס סטטוס עם Liquid Glass (לבייביסיטר, מדיטציה וכו')
struct GlassStatusCard: View {
    let title: String
    let subtitle: String?
    let icon: String
    let iconColor: Color
    let status: String
    let statusColor: Color
    
    init(
        title: String,
        subtitle: String? = nil,
        icon: String,
        iconColor: Color = .blue,
        status: String,
        statusColor: Color = .green
    ) {
        self.title = title
        self.subtitle = subtitle
        self.icon = icon
        self.iconColor = iconColor
        self.status = status
        self.statusColor = statusColor
    }
    
    var body: some View {
        HStack(spacing: 16) {
            // אייקון
            ZStack {
                Circle()
                    .fill(iconColor.gradient)
                    .frame(width: 50, height: 50)
                
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.white)
            }
            
            // תוכן
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            // סטטוס
            Text(status)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(statusColor.opacity(0.2))
                .cornerRadius(8)
        }
        .padding()
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 16))
    }
}

// MARK: - Glass Timer Card

/// כרטיס טיימר עם Liquid Glass
struct GlassTimerCard: View {
    let title: String
    let time: String
    let icon: String
    var tint: Color = .blue
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 40))
                .foregroundColor(tint)
            
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)
            
            Text(time)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundColor(.primary)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .glassEffect(.regular.tint(tint.opacity(0.2)), in: .rect(cornerRadius: 20))
    }
}

// MARK: - Glass Bottom Sheet

/// Bottom Sheet עם Liquid Glass
struct GlassBottomSheet<Content: View>: View {
    @Binding var isPresented: Bool
    let content: Content
    
    init(isPresented: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self._isPresented = isPresented
        self.content = content()
    }
    
    var body: some View {
        ZStack(alignment: .bottom) {
            if isPresented {
                // רקע
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation {
                            isPresented = false
                        }
                    }
                
                // תוכן
                VStack(spacing: 0) {
                    // Handle
                    Capsule()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(width: 40, height: 5)
                        .padding(.top, 12)
                    
                    content
                        .padding()
                }
                .glassEffect(.regular, in: .rect(cornerRadii: .init(
                    topLeading: 20,
                    bottomLeading: 0,
                    bottomTrailing: 0,
                    topTrailing: 20
                )))
                .transition(.move(edge: .bottom))
            }
        }
        .animation(.spring(response: 0.3), value: isPresented)
    }
}

// MARK: - Glass Floating Action Button

/// כפתור צף עם Liquid Glass
struct GlassFloatingActionButton: View {
    let icon: String
    let action: () -> Void
    var tint: Color = .blue
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 60, height: 60)
        }
        .glassEffect(.regular.tint(tint.opacity(0.3)).interactive(), in: .circle)
        .shadow(color: tint.opacity(0.3), radius: 10, x: 0, y: 5)
    }
}

// MARK: - Previews

#Preview("Glass Card") {
    ZStack {
        LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()
        
        GlassCard(tint: .blue) {
            VStack {
                Text("שלום עולם")
                    .font(.title)
                Text("זה כרטיס Liquid Glass")
                    .font(.caption)
            }
        }
        .padding()
    }
}

#Preview("Glass Buttons") {
    ZStack {
        LinearGradient(colors: [.purple, .pink], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()
        
        VStack(spacing: 20) {
            GlassButton("כפתור רגיל", icon: "heart.fill") {
                print("Clicked!")
            }
            
            GlassProminentButton("כפתור בולט", icon: "star.fill") {
                print("Clicked!")
            }
        }
    }
}

#Preview("Glass Status Card") {
    ZStack {
        LinearGradient(colors: [.blue, .cyan], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()
        
        GlassStatusCard(
            title: "בייביסיטר פעילה",
            subtitle: "שרה כהן",
            icon: "person.fill",
            iconColor: .purple,
            status: "פעיל",
            statusColor: .green
        )
        .padding()
    }
}

#Preview("Glass Timer Card") {
    ZStack {
        LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing)
            .ignoresSafeArea()
        
        GlassTimerCard(
            title: "מדיטציה",
            time: "15:30",
            icon: "leaf.fill",
            tint: .green
        )
        .padding()
    }
}
