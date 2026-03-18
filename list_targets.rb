require 'xcodeproj'
project = Xcodeproj::Project.open('ios/CalmParentApp.xcodeproj')
project.targets.each { |t| puts t.name }
