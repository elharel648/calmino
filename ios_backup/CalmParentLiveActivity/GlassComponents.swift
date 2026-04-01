//
//  GlassComponents.swift
//  CalmParentApp
//
//  רכיבי Glass Effect לשימוש באפליקציה - iOS 18 Compatible
//  Created: February 2026
//

import SwiftUI

// MARK: - Base Glass Effect View (UIKit Bridge)

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
        cornerRadius: CGFloat = 20,
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
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .fill(material)
                        .overlay(
                            RoundedRectangle(cornerRadius: cornerRadius)
                                .fill(tint.opacity(0.1))
                        )
                } else {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .fill(material)
                }
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
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
                        .font(.title3)
                }
                Text(title)
                    .font(.headline)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(
                Capsule()
                    .fill(material)
                    .overlay(
                        Capsule()
                            .fill(tint.opacity(0.3))
                    )
            )
            .overlay(
                Capsule()
                    .stroke(Color.white.opacity(0.3), lineWidth: 1)
            )
            .shadow(color: tint.opacity(0.3), radius: 8, x: 0, y: 4)
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
                        .font(.title2)
                }
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .background(
                Capsule()
                    .fill(.thickMaterial)
                    .overlay(
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [.blue.opacity(0.6), .purple.opacity(0.6)],
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
                            colors: [.white.opacity(0.5), .white.opacity(0.2)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
            )
            .shadow(color: .blue.opacity(0.4), radius: 15, x: 0, y: 8)
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
        content
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
                                colors: [color.opacity(0.6), color.opacity(0.3)],
                                center: .center,
                                startRadius: 0,
                                endRadius: size / 2
                            )
                        )
                )
                .overlay(
                    Circle()
                        .stroke(color.opacity(0.5), lineWidth: 2)
                )
                .frame(width: size, height: size)
            
            Image(systemName: icon)
                .font(.system(size: size * 0.45))
                .foregroundColor(.white)
        }
        .shadow(color: color.opacity(0.4), radius: 10, x: 0, y: 5)
    }
}

// MARK: - 6. Glass Navigation Bar

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
                        .frame(width: 40, height: 40)
                }
            } else {
                Spacer().frame(width: 40)
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
                        .frame(width: 40, height: 40)
                }
            } else {
                Spacer().frame(width: 40)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.regularMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        )
        .shadow(color: .black.opacity(0.1), radius: 10, x: 0, y: 5)
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
            ZStack {
                Circle()
                    .fill(.regularMaterial)
                    .overlay(
                        Circle()
                            .fill(
                                RadialGradient(
                                    colors: [iconColor.opacity(0.6), iconColor.opacity(0.3)],
                                    center: .center,
                                    startRadius: 0,
                                    endRadius: 25
                                )
                            )
                    )
                    .frame(width: 50, height: 50)
                
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(.white)
            }
            
            // Title & Subtitle
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
            
            // Status Badge
            Text(status)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    Capsule()
                        .fill(statusColor.opacity(0.2))
                )
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
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
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .fill(tint.opacity(0.1))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(
                            LinearGradient(
                                colors: [tint.opacity(0.3), Color.white.opacity(0.2)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        )
        .shadow(color: tint.opacity(0.2), radius: 10, x: 0, y: 5)
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
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture {
                        withAnimation(.spring(response: 0.3)) {
                            isPresented = false
                        }
                    }
                
                // Sheet
                VStack(spacing: 0) {
                    // Handle
                    Capsule()
                        .fill(Color.secondary.opacity(0.5))
                        .frame(width: 40, height: 5)
                        .padding(.top, 12)
                        .padding(.bottom, 8)
                    
                    // Content
                    content
                        .padding()
                }
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(.thickMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                        .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: -10)
                )
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: isPresented)
    }
}

// MARK: - 10. Glass Floating Action Button

struct GlassFloatingActionButton: View {
    let icon: String
    let action: () -> Void
    var tint: Color = .blue
    var size: CGFloat = 60
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size * 0.4))
                .foregroundColor(.white)
                .frame(width: size, height: size)
                .background(
                    Circle()
                        .fill(.regularMaterial)
                        .overlay(
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [tint.opacity(0.7), tint.opacity(0.4)],
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
                                        colors: [.white.opacity(0.5), tint.opacity(0.3)],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    lineWidth: 2
                                )
                        )
                )
                .shadow(color: tint.opacity(0.5), radius: 15, x: 0, y: 8)
        }
    }
}
