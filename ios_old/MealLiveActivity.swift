//
//  MealLiveActivity.swift
//  CalmParentApp
//
//  Live Activity for tracking baby meals
//

import ActivityKit
import SharedAttributes
import WidgetKit
import SwiftUI

@available(iOS 16.2, *)
struct MealLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: MealActivityAttributes.self) { context in
            // Lock Screen UI
            MealLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // MARK: - Expanded View
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(context.attributes.babyEmoji)
                                .font(.title3)
                            Text(context.attributes.babyName)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        Text(context.state.mealType)
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        // Timer
                        if !context.state.isPaused {
                            Text(context.state.startTime, style: .timer)
                                .font(.title2)
                                .fontWeight(.bold)
                                .monospacedDigit()
                        } else {
                            Text("מושהה")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        // Progress
                        Text("\(Int(context.state.progress * 100))%")
                            .font(.caption)
                            .foregroundColor(.green)
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        ProgressView(value: context.state.progress)
                            .tint(.green)
                        
                        if !context.state.foodItems.isEmpty {
                            HStack {
                                ForEach(context.state.foodItems, id: \.self) { item in
                                    Text(item)
                                        .font(.caption2)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.orange.opacity(0.2))
                                        .cornerRadius(4)
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Text(context.attributes.babyEmoji)
                        .font(.caption2)
                    Image(systemName: "fork.knife")
                        .foregroundColor(.orange)
                }
            } compactTrailing: {
                if !context.state.isPaused {
                    Text(context.state.startTime, style: .timer)
                        .monospacedDigit()
                        .font(.caption2)
                } else {
                    Image(systemName: "pause.fill")
                        .font(.caption2)
                        .foregroundColor(.orange)
                }
            } minimal: {
                Image(systemName: "fork.knife")
                    .foregroundColor(.orange)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.2, *)
struct MealLockScreenView: View {
    let context: ActivityViewContext<MealActivityAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(context.attributes.babyEmoji)
                    .font(.title)
                
                VStack(alignment: .leading) {
                    Text(context.attributes.babyName)
                        .font(.headline)
                    Text(context.state.mealType)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status
                if context.state.isPaused {
                    Text("⏸️ מושהה")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            
            Divider()
            
            // Progress
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("התקדמות")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(Int(context.state.progress * 100))%")
                        .font(.headline)
                        .foregroundColor(.green)
                }
                
                ProgressView(value: context.state.progress)
                    .tint(.green)
            }
            
            // Timer
            HStack {
                Text("זמן")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                if !context.state.isPaused {
                    Text(context.state.startTime, style: .timer)
                        .font(.headline)
                        .monospacedDigit()
                } else {
                    Text(mealTimerText(start: context.state.startTime))
                        .font(.headline)
                        .monospacedDigit()
                }
            }
            
            // Food items
            if !context.state.foodItems.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("מה אכלנו")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    FlowLayout(spacing: 4) {
                        ForEach(context.state.foodItems, id: \.self) { item in
                            Text(item)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.2))
                                .cornerRadius(6)
                        }
                    }
                }
            }
        }
        .padding()
    }
}

// MARK: - Flow Layout Helper

@available(iOS 16.2, *)
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.frames[index].minX,
                                     y: bounds.minY + result.frames[index].minY),
                         proposal: .unspecified)
        }
    }
    
    struct FlowResult {
        var frames: [CGRect] = []
        var size: CGSize = .zero
        
        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0
            
            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                
                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }
                
                frames.append(CGRect(x: currentX, y: currentY, width: size.width, height: size.height))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
            }
            
            self.size = CGSize(width: maxWidth, height: currentY + lineHeight)
        }
    }
}

// MARK: - Helper Functions

@available(iOS 16.2, *)
func mealTimerText(start: Date) -> String {
    let elapsed = Date().timeIntervalSince(start)
    let minutes = Int(elapsed) / 60
    let seconds = Int(elapsed) % 60
    return String(format: "%02d:%02d", minutes, seconds)
}
