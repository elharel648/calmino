require 'xcodeproj'

project_path = 'ios/CalmParentApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)

files_to_remove = [
  'BabysitterShiftLiveActivity.swift',
  'MealLiveActivity.swift',
  'SleepLiveActivity.swift',
  'CalmParentWidgetLiveActivity.swift'
]

project.targets.each do |target|
  next unless target.name == 'CalmParentApp'
  
  target.source_build_phase.files_references.each do |ref|
    if files_to_remove.include?(ref.path) || files_to_remove.include?(File.basename(ref.path))
      target.source_build_phase.remove_file_reference(ref)
      puts "Removed #{ref.path} from target #{target.name}"
    end
  end
end

project.save
puts "Project saved."
