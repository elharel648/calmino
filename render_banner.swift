import Cocoa

let width: CGFloat = 1024
let height: CGFloat = 500

let iconUrl = URL(fileURLWithPath: "assets/icon.png")
guard let iconImage = NSImage(contentsOf: iconUrl) else {
    print("Could not load icon from assets/icon.png")
    exit(1)
}

let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()

// Calmino premium background F2F4F7
let bgColor = NSColor(calibratedRed: 1.0, green: 1.0, blue: 1.0, alpha: 1.0)
bgColor.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

// Draw logo in center
let logoSize: CGFloat = 300
let logoRect = NSRect(x: (width - logoSize) / 2,
                      y: (height - logoSize) / 2,
                      width: logoSize,
                      height: logoSize)

iconImage.draw(in: logoRect, from: NSRect.zero, operation: .sourceOver, fraction: 1.0)

image.unlockFocus()

guard let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let pngData = bitmap.representation(using: .png, properties: [:]) else {
    print("Could not generate PNG")
    exit(1)
}

let outUrl = URL(fileURLWithPath: "assets/feature_graphic.png")
try! pngData.write(to: outUrl)
print("Successfully created assets/feature_graphic.png!")
