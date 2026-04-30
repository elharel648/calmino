//
//  GlassComponents.swift
//  CalmParentApp
//
//  רכיבי Glass Effect לשימוש באפליקציה - Premium iOS 18 Standard
//

import SwiftUI

// MARK: - Base Glass Effect View (UIKit Bridge - For specific legacy needs)

struct VisualEffectBlur: UIViewRepresentable {
    var blurStyle: UIBlurEffect.Style
    
    func makeUIView(context: Context) -> UIVisualEffectView {
        return UIVisualEffectView(effect: UIBlurEffect(style: blurStyle))
    }
    
    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: blurStyle)
    }
}

// MARK: - 1. Glass Card View

struct GlassCard<Content: View>: View {
    let content: Content
    var cornerRadius: CGFloat
    var material: Material
    var tint: Color?
    
    init(
        cornerRadius: CGFloat = 24,
        material: Material = .ultraThinMaterial,
        tint: Color? = nil,
        @ViewBuilder content: () -> Content
    ) {
        self.cornerRadius = cornerRadius
        self.material = material
        self.tint = tint
        self.content = content()
    }
    
    var body: some View {
        content
            .padding()
            .background {
                if let tint = tint {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(material)
                        .overlay(
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .fill(tint.opacity(0.1))
                        )
                } else {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(material)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.3), .white.opacity(0.05)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 0.5
                    )
            }
            .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 6)
    }
}

// MARK: - 2. Glass Button

struct GlassButton: View {
    let title: String
    let icon: String?
    let action: () -> Void
    var tint: Color = .blue
    var material: Material = .regular
    
    init(
        _ title: String,
        icon: String? = nil,
        tint: Color = .blue,
        material: Material = .regular,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.icon = icon
        self.tint = tint
        self.material = material
        self.action = action
    }
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title3.weight(.medium))
                }
                Text(title)
                    .font(.headline.weight(.semibold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity) // מבטיח כפתור מלא וקליקבילי
            .background(
                Capsule()
                    .fill(material)
                    .overlay(
                        Capsule()
                            .fill(tint.opacity(0.35))
                    )
            )
            .overlay(
                Capsule()
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.4), .white.opacity(0.1)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: tint.opacity(0.25), radius: 10, x: 0, y: 4)
            .contentShape(Capsule())
        }
    }
}

// MARK: - 3. Glass Prominent Button

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
            HStack(spacing: 8) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.title2.weight(.medium))
                }
                Text(title)
                    .font(.headline.weight(.bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(
                Capsule()
                    .fill(.thickMaterial)
                    .overlay(
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [.blue.opacity(0.65), .purple.opacity(0.65)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )
            )
            .overlay(
                Capsule()
                    .stroke(
                        LinearGradient(
                            colors: [.white.opacity(0.6), .white.opacity(0.15)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
            )
            .shadow(color: .blue.opacity(0.35), radius: 15, x: 0, y: 8)
            .contentShape(Capsule())
        }
    }
}

// MARK: - 4. Glass Container

struct GlassContainer<Content: View>: View {
    let spacing: CGFloat
    let content: Content
    
    init(spacing: CGFloat = 20, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }
    
    var body: some View {
        VStack(spacing: spacing) {
            content
        }
    }
}

// MARK: - 5. Glass Badge

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
                .fill(.regularMaterial)
                .overlay(
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [color.opacity(0.6), color.opacity(0.2)],
                                center: .center,
                                startRadius: 0,
                                endRadius: size / 2
                            )
                        )
                )
                .overlay(
                    Circle()
                        .stroke(
                            LinearGradient(
                                colors: [.white.opacity(0.5), color.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1.5
                        )
                )
                .frame(width: size, height: size)
            
            Image(systemName: icon)
                .font(.system(size: size * 0.45, weight: .semibold))
                .foregroundStyle(.white)
        }
        .shadow(color: color.opacity(0.3), radius: 12, x: 0, y: 6)
    }
}

// MARK: - 6. Glass Navigation Bar

struct GlassNavigationBar: View {
    let title: String
    let leftAction: (() -> Void)?
    let rightAction: (() -> Void)?
    var leftIcon: String = "chevron.right" // מותאם ל-RTL (חץ ימינה לחזרה)
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
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.1), in: Circle())
                }
            } else {
                Spacer().frame(width: 44)
            }
            
            Spacer()
            
            Text(title)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            
            Spacer()
            
            if let rightAction = rightAction {
                Button(action: rightAction) {
                    Image(systemName: rightIcon)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.white.opacity(0.1), in: Circle())
                }
            } else {
                Spacer().frame(width: 44)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Color.white.opacity(0.15), lineWidth: 0.5)
                )
        )
        .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
    }
}

// MARK: - 7. Glass Status Card

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
            // Icon Badge
            GlassBadge(icon: icon, color: iconColor, size: 48)
            
            // Title & Subtitle
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.primary)
                
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            // Status Badge
            Text(status)
                .font(.caption.weight(.bold))
                .foregroundStyle(statusColor)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    Capsule()
                        .fill(statusColor.opacity(0.15))
                        .overlay(
                            Capsule().stroke(statusColor.opacity(0.3), lineWidth: 0.5)
                        )
                )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
                )
        )
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

// MARK: - 8. Glass Timer Card

struct GlassTimerCard: View {
    let title: String
    let time: String
    let icon: String
    var tint: Color = .blue
    
    var body: some View {
        VStack(spacing: 16) {
            Group {
                if #available(iOS 17.0, *) {
                    Image(systemName: icon)
                        .font(.system(size: 44, weight: .medium))
                        .foregroundStyle(tint)
                        .symbolEffect(.pulse)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 44, weight: .medium))
                        .foregroundStyle(tint)
                }
            }
            
            Text(title)
                .font(.headline.weight(.medium))
                .foregroundStyle(.secondary)
            
            Text(time)
                .font(.system(size: 42, weight: .heavy, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(.primary)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(tint.opacity(0.08))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [tint.opacity(0.4), .white.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: tint.opacity(0.15), radius: 16, x: 0, y: 8)
    }
}

// MARK: - 9. Glass Bottom Sheet

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
                // Backdrop
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            isPresented = false
                        }
                    }
                
                // Sheet
                VStack(spacing: 0) {
                    // Handle
                    Capsule()
                        .fill(Color.secondary.opacity(0.4))
                        .frame(width: 40, height: 5)
                        .padding(.top, 12)
                        .padding(.bottom, 16)
                    
                    // Content
                    content
                        .padding(.horizontal)
                        .padding(.bottom, 32) // תוספת שוליים בטוחים למטה
                }
                .background(
                    RoundedRectangle(cornerRadius: 32, style: .continuous)
                        .fill(.thickMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 32, style: .continuous)
                                .stroke(Color.white.opacity(0.2), lineWidth: 0.5)
                        )
                        .shadow(color: .black.opacity(0.2), radius: 30, x: 0, y: -5)
                )
                .transition(.move(edge: .bottom))
            }
        }
        .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isPresented)
    }
}

// MARK: - 10. Glass Floating Action Button (FAB)

struct GlassFloatingActionButton: View {
    let icon: String
    let action: () -> Void
    var tint: Color = .blue
    var size: CGFloat = 64
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.4, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(.ultraThinMaterial)
                        .overlay(
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [tint.opacity(0.8), tint.opacity(0.5)],
                                        center: .center,
                                        startRadius: 0,
                                        endRadius: size / 2
                                    )
                                )
                        )
                        .overlay(
                            Circle()
                                .stroke(
                                    LinearGradient(
                                        colors: [.white.opacity(0.6), tint.opacity(0.2)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 1.5
                                )
                        )
                )
                .shadow(color: tint.opacity(0.4), radius: 16, x: 0, y: 8)
                .contentShape(Circle())
        }
    }
}
