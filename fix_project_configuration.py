import sys
import re

path = '/Users/harel/APP/ios/CalmParentApp.xcodeproj/project.pbxproj'

def patch_project():
    print(f"Reading {path}...")
    with open(path, 'r') as f:
        content = f.read()

    # IDs we will use (arbitrary but consistent)
    FILE_REF_ID = "F1ED42992F2954FD006D6F99"
    BUILD_FILE_ID = "F1ED42982F2954FD006D6F99"
    
    # 1. Add File Reference
    # Path relative to project root (which is where .xcodeproj is, usually ios/)
    # Actually checking other refs: "path = CalmParentApp/AppDelegate.mm;"
    # So we want "path = CalmParentLiveActivity/CalmParentLiveActivityLiveActivity.swift;"
    
    file_ref_entry = f'\t\t{FILE_REF_ID} /* CalmParentLiveActivityLiveActivity.swift */ = {{isa = PBXFileReference; fileEncoding = 4; lastKnownFileType = sourcecode.swift; path = CalmParentLiveActivity/CalmParentLiveActivityLiveActivity.swift; sourceTree = SOURCE_ROOT; }};'
    
    if FILE_REF_ID not in content:
        print("Adding PBXFileReference...")
        content = content.replace("/* Begin PBXFileReference section */", f"/* Begin PBXFileReference section */\n{file_ref_entry}")
    else:
        print("PBXFileReference already exists.")

    # 2. Add Build File
    build_file_entry = f'\t\t{BUILD_FILE_ID} /* CalmParentLiveActivityLiveActivity.swift in Sources */ = {{isa = PBXBuildFile; fileRef = {FILE_REF_ID} /* CalmParentLiveActivityLiveActivity.swift */; }};'
    
    if BUILD_FILE_ID not in content:
        print("Adding PBXBuildFile...")
        content = content.replace("/* Begin PBXBuildFile section */", f"/* Begin PBXBuildFile section */\n{build_file_entry}")
    else:
        print("PBXBuildFile already exists.")

    # 3. Add to Sources Build Phase of Extension
    # Target Sources Phase ID: F1ED42DB2F2954FD006D6F69
    # We look for the section definition
    sources_phase_id = "F1ED42DB2F2954FD006D6F69"
    
    # Regex to find the files array within this specific build phase
    # Pattern: ID /* Sources */ = { ... files = ( ... ); ... };
    
    # We'll use a simpler replace approach assuming standard formatting
    target_str = f"{sources_phase_id} /* Sources */ = " + "{"
    if target_str in content:
        print("Found Sources Build Phase.")
        # Find the files block inside this phase
        # We split by the target string, then look closely at the next "files = ("
        parts = content.split(target_str)
        if len(parts) > 1:
            pre_phase = parts[0]
            phase_content = parts[1]
            
            # Find the first "files = (" in this phase content
            if "files = (" in phase_content:
                phase_parts = phase_content.split("files = (", 1)
                phase_header = phase_parts[0]
                phase_body = phase_parts[1]
                
                # Check if already added
                if BUILD_FILE_ID not in phase_body:
                    print("Injecting file into Sources Build Phase...")
                    new_phase_body = f"\n\t\t\t\t{BUILD_FILE_ID} /* CalmParentLiveActivityLiveActivity.swift in Sources */," + phase_body
                    content = pre_phase + target_str + phase_header + "files = (" + new_phase_body
                else:
                    print("File already in Sources Build Phase.")
    else:
        print("Error: Could not find Sources Build Phase for Extension.")

    # 4. Add ASSETCATALOG_COMPILER_APPICON_NAME
    # We want to add this setting to the Debug and Release configurations of the App Target.
    # We'll rely on replacing the PRODUCT_BUNDLE_IDENTIFIER line which is usually present in the buildSettings.
    
    setting_key = "ASSETCATALOG_COMPILER_APPICON_NAME"
    setting_value = "AppIcon"
    injection_line = f"\t\t\t\t{setting_key} = {setting_value};"
    
    # This regex looks for PRODUCT_BUNDLE_IDENTIFIER = com.harel.calmparentapp; AND ensures we don't double insert
    # We only target the configurations that DO NOT have the icon setting yet.
    
    # However, simply replacing the line globally works because it only appears in the relevant configurations (Debug/Release for the App Target)
    # The Extension target has a different Bundle ID (com.harel.calmparentapp.CalmParentLiveActivity)
    
    target_bundle_id_line = "PRODUCT_BUNDLE_IDENTIFIER = com.harel.calmparentapp;"
    
    if target_bundle_id_line in content:
        print("Found App Target Bundle ID setting.")
        # Check if we already injected nearby
        if f"{setting_key} = {setting_value}" not in content:
            print("Injecting ASSETCATALOG_COMPILER_APPICON_NAME setting...")
            content = content.replace(target_bundle_id_line, f"{target_bundle_id_line}\n{injection_line}")
        else:
             # It might be elsewhere, let's allow the replace but be careful?
             # If it's already there, we might not need to do anything.
             # But it might be missing from ONE config.
             # Let's do a regex replace that only replaces if the setting is NOT immediately following.
             pass
             # Actually, simpler: replace line with line+setting, but then check if we created specific duplicates.
             # Xcode handles duplicate settings by taking the last one usually, but let's be cleaner.
             
             # Smart replace:
             content = content.replace(target_bundle_id_line, f"{target_bundle_id_line}\n{injection_line}")
             
             # Cleanup potential duplicates if we ran this multiple times
             double_injection = f"{injection_line}\n{injection_line}"
             while double_injection in content:
                 content = content.replace(double_injection, injection_line)
    
    else:
        print("Error: Could not find PRODUCT_BUNDLE_IDENTIFIER for App Target.")

    print(f"Writing changes to {path}...")
    with open(path, 'w') as f:
        f.write(content)
    print("Done.")

if __name__ == "__main__":
    patch_project()
