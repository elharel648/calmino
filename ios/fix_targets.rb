#!/usr/bin/env ruby
require 'xcodeproj'

project_path = 'CalmParentApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find targets
app_target = project.targets.find { |t| t.name == 'CalmParentApp' }
liveactivity_target = project.targets.find { |t| t.name == 'CalmParentLiveActivity' }

unless app_target && liveactivity_target
  puts "❌ Could not find targets!"
  exit 1
end

puts "Found targets:"
puts "  - CalmParentApp"
puts "  - CalmParentLiveActivity"

# Files to move from app to live activity
files_to_move = [
  'BabysitterShiftLiveActivity.swift',
  'SleepLiveActivity.swift',
  'CalmParentLiveActivity/CalmParentLiveActivityBundle.swift',
  'GlassComponents.swift'
]

# File that should be in both
shared_file = 'ActivityAttributes.swift'

puts "\nMoving files from CalmParentApp to CalmParentLiveActivity..."

files_to_move.each do |filename|
  # Find the file reference
  file_ref = project.files.find do |f|
    f.path&.include?(filename) || f.display_name == filename
  end

  if file_ref
    puts "  Processing: #{file_ref.display_name}"

    # Remove from app target
    build_file = app_target.source_build_phase.files.find { |bf| bf.file_ref == file_ref }
    if build_file
      app_target.source_build_phase.files.delete(build_file)
      puts "    ✓ Removed from CalmParentApp"
    end

    # Add to live activity target (if not already there)
    unless liveactivity_target.source_build_phase.files.any? { |bf| bf.file_ref == file_ref }
      liveactivity_target.source_build_phase.files << project.new(Xcodeproj::Project::Object::PBXBuildFile).tap do |build_file|
        build_file.file_ref = file_ref
      end
      puts "    ✓ Added to CalmParentLiveActivity"
    end
  else
    puts "    ⚠ File not found: #{filename}"
  end
end

# Ensure ActivityAttributes.swift is in both targets
puts "\nEnsuring ActivityAttributes.swift is in both targets..."
file_ref = project.files.find { |f| f.display_name == shared_file }

if file_ref
  # Check if in app target
  unless app_target.source_build_phase.files.any? { |bf| bf.file_ref == file_ref }
    app_target.source_build_phase.files << project.new(Xcodeproj::Project::Object::PBXBuildFile).tap do |build_file|
      build_file.file_ref = file_ref
    end
    puts "  ✓ Added to CalmParentApp"
  else
    puts "  ✓ Already in CalmParentApp"
  end

  # Check if in live activity target
  unless liveactivity_target.source_build_phase.files.any? { |bf| bf.file_ref == file_ref }
    liveactivity_target.source_build_phase.files << project.new(Xcodeproj::Project::Object::PBXBuildFile).tap do |build_file|
      build_file.file_ref = file_ref
    end
    puts "  ✓ Added to CalmParentLiveActivity"
  else
    puts "  ✓ Already in CalmParentLiveActivity"
  end
end

# Save the project
project.save

puts "\n✅ Project updated successfully!"
puts "\nNow run: npx expo run:ios"
