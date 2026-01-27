
import sys

path = '/Users/harel/APP/ios/CalmParentApp.xcodeproj/project.pbxproj'

def patch_settings():
    print(f"Reading {path}...")
    with open(path, 'r') as f:
        content = f.read()

    # Change ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS from NO to YES
    # This forces Xcode to verify and include the AppIcon set properly.
    if "ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = NO;" in content:
        print("Enabling ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS...")
        content = content.replace("ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = NO;", "ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = YES;")
    else:
        print("Setting already enabled or not found exactly as expected.")

    with open(path, 'w') as f:
        f.write(content)
    print("Done.")

if __name__ == "__main__":
    patch_settings()
