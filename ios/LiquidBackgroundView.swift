import SwiftUI

struct LiquidBackgroundView: View {
    // משתנים לשליטה באנימציה
    @State private var animate1 = false
    @State private var animate2 = false
    @State private var animate3 = false

    var body: some View {
        ZStack {
            // תוכן אחורי כדי שה"זכוכית" תבלנד עם משהו
            Color(red: 0.93, green: 0.94, blue: 0.98)
                .ignoresSafeArea()

            // שכבת בועות צבעוניות מאחור
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.45))
                    .frame(width: 320, height: 320)
                    .scaleEffect(animate1 ? 1.2 : 0.8)
                    .offset(x: animate1 ? -110 : 110, y: animate1 ? -60 : 160)
                    .blur(radius: 8)

                Circle()
                    .fill(Color.purple.opacity(0.45))
                    .frame(width: 360, height: 360)
                    .scaleEffect(animate2 ? 1.1 : 0.9)
                    .offset(x: animate2 ? 160 : -160, y: animate2 ? 110 : -110)
                    .blur(radius: 8)

                Circle()
                    .fill(Color.orange.opacity(0.35))
                    .frame(width: 260, height: 260)
                    .scaleEffect(animate3 ? 1.3 : 0.7)
                    .offset(x: animate3 ? -60 : 60, y: animate3 ? -210 : 60)
                    .blur(radius: 8)
            }
            .blur(radius: 60) // חיבור הצבעים למראה נוזלי
            .ignoresSafeArea()

            // שכבת זכוכית דינמית (Liquid Glass)
            GlassPanel()
                .padding(24)
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeInOut(duration: 7).repeatForever(autoreverses: true)) {
                animate1.toggle()
            }
            withAnimation(.easeInOut(duration: 5).repeatForever(autoreverses: true).delay(1)) {
                animate2.toggle()
            }
            withAnimation(.easeInOut(duration: 6).repeatForever(autoreverses: true).delay(2)) {
                animate3.toggle()
            }
        }
    }
}

// פאנל זכוכית שמבלנד עם הרקע ומדגיש את אפקט ה-Liquid Glass
private struct GlassPanel: View {
    @State private var hover = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(.ultraThinMaterial) // ליבה של הזכוכית
                .overlay(
                    // קווי מתאר רכים וחזקים לשילוב עומק
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.35), lineWidth: 1)
                        .blendMode(.overlay)
                )
                .background(
                    // Blur אחורי כדי להדגיש בלנד עם הבועות
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(Color.white.opacity(0.001))
                        .background(.ultraThinMaterial)
                        .blur(radius: 20)
                        .opacity(0.6)
                )
                .shadow(color: Color.black.opacity(0.12), radius: 20, x: 0, y: 10)
                .overlay(
                    // היילייט עדין למעלה
                    RoundedRectangle(cornerRadius: 28, style: .continuous)
                        .fill(
                            LinearGradient(colors: [Color.white.opacity(0.35), Color.white.opacity(0.05)], startPoint: .topLeading, endPoint: .bottomTrailing)
                        )
                        .mask(
                            RoundedRectangle(cornerRadius: 28, style: .continuous)
                                .stroke(lineWidth: 2)
                        )
                        .opacity(hover ? 0.9 : 0.6)
                        .blendMode(.plusLighter)
                )
                .scaleEffect(hover ? 1.02 : 1.0)
                .animation(.spring(response: 0.5, dampingFraction: 0.8), value: hover)

            // דוגמא לתוכן על הזכוכית
            VStack(spacing: 8) {
                Text("Liquid Glass")
                    .font(.title3)
                    .fontWeight(.semibold)
                Text("אפקט זכוכית דינמי שמגיב לרקע מאחוריו")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .onHover { isHovering in
            #if os(macOS)
            hover = isHovering
            #endif
        }
    }
}

// זה החלק שמאפשר לראות את התוצאה ישירות ב-Xcode (בלי להריץ סימולטור)
struct LiquidBackgroundView_Previews: PreviewProvider {
    static var previews: some View {
        LiquidBackgroundView()
    }
}
