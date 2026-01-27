import os
import subprocess
import json

ICON_PATH = "/Users/harel/APP/assets/icon.png"
IOS_ICON_DIR = "/Users/harel/APP/ios/CalmParentApp/Images.xcassets/AppIcon.appiconset"
INFO_PLIST_PATH = "/Users/harel/APP/ios/CalmParentApp/Info.plist"

def run_command(command):
    try:
        subprocess.check_call(command, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {command}")
        print(e)

def generate_icons():
    print(f"Generating icons from {ICON_PATH} into {IOS_ICON_DIR}...")
    
    if not os.path.exists(IOS_ICON_DIR):
        os.makedirs(IOS_ICON_DIR)

    icons_config = [
        {"filename": "App-Icon-20x20@2x.png", "size": 40, "idiom": "iphone", "scale": "2x"},
        {"filename": "App-Icon-20x20@3x.png", "size": 60, "idiom": "iphone", "scale": "3x"},
        {"filename": "App-Icon-29x29@2x.png", "size": 58, "idiom": "iphone", "scale": "2x"},
        {"filename": "App-Icon-29x29@3x.png", "size": 87, "idiom": "iphone", "scale": "3x"},
        {"filename": "App-Icon-40x40@2x.png", "size": 80, "idiom": "iphone", "scale": "2x"},
        {"filename": "App-Icon-40x40@3x.png", "size": 120, "idiom": "iphone", "scale": "3x"},
        {"filename": "App-Icon-60x60@2x.png", "size": 120, "idiom": "iphone", "scale": "2x"},
        {"filename": "App-Icon-60x60@3x.png", "size": 180, "idiom": "iphone", "scale": "3x"},
        {"filename": "App-Icon-20x20@1x.png", "size": 20, "idiom": "ipad", "scale": "1x"},
        {"filename": "App-Icon-20x20@2x.png", "size": 40, "idiom": "ipad", "scale": "2x"},
        {"filename": "App-Icon-29x29@1x.png", "size": 29, "idiom": "ipad", "scale": "1x"},
        {"filename": "App-Icon-29x29@2x.png", "size": 58, "idiom": "ipad", "scale": "2x"},
        {"filename": "App-Icon-40x40@1x.png", "size": 40, "idiom": "ipad", "scale": "1x"},
        {"filename": "App-Icon-40x40@2x.png", "size": 80, "idiom": "ipad", "scale": "2x"},
        {"filename": "App-Icon-76x76@1x.png", "size": 76, "idiom": "ipad", "scale": "1x"},
        {"filename": "App-Icon-76x76@2x.png", "size": 152, "idiom": "ipad", "scale": "2x"},
        {"filename": "App-Icon-83.5x83.5@2x.png", "size": 167, "idiom": "ipad", "scale": "2x"},
        {"filename": "App-Icon-1024x1024@1x.png", "size": 1024, "idiom": "ios-marketing", "scale": "1x"}
    ]

    contents_json = {
        "images": [],
        "info": {"version": 1, "author": "antigravity"}
    }

    generated_files = set()

    for icon in icons_config:
        filename = icon["filename"]
        size = icon["size"]
        
        # Only generate file if not already generated
        if filename not in generated_files:
            output_path = os.path.join(IOS_ICON_DIR, filename)
            run_command(f"sips -z {size} {size} {ICON_PATH} --out {output_path}")
            generated_files.add(filename)
        
        contents_json["images"].append({
            "filename": filename,
            "idiom": icon["idiom"],
            "platform": "ios",
            "size": f"{size//int(icon['scale'][0])}x{size//int(icon['scale'][0])}",
            "scale": icon["scale"]
        })

    # Write Contents.json
    with open(os.path.join(IOS_ICON_DIR, "Contents.json"), "w") as f:
        json.dump(contents_json, f, indent=2)
    
    print("Icons generated and Contents.json updated.")

def update_plist():
    print(f"Updating Info.plist at {INFO_PLIST_PATH}...")
    # Add CFBundleIconName
    run_command(f"/usr/bin/plutil -replace CFBundleIconName -string 'AppIcon' {INFO_PLIST_PATH}")
    print("Info.plist updated.")

if __name__ == "__main__":
    generate_icons()
    update_plist()
