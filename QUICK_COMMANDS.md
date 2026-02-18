# ⚡ Quick Commands Reference

**תצ'יטשיט** - כל הפקודות שתצטרך לפני Launch

---

## 🏗️ **Build Commands**

```bash
# Development - Local testing
npm start
npx expo start

# iOS Simulator
npx expo run:ios

# Real device (via EAS)
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

---

## 🔥 **Firebase Commands**

```bash
# Deploy Firestore Rules
firebase deploy --only firestore:rules

# Deploy Firestore Indexes
firebase deploy --only firestore:indexes

# Deploy all
firebase deploy

# Check current project
firebase projects:list

# Switch project (if needed)
firebase use <project-id>
```

---

## 🧹 **Cleanup Commands**

```bash
# Clear Metro cache
npx expo start -c

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear iOS build
cd ios && rm -rf build Pods Podfile.lock
pod install --repo-update
cd ..

# Nuclear option (fresh start)
rm -rf node_modules package-lock.json ios/Pods ios/Podfile.lock
npm install
cd ios && pod install
cd ..
```

---

## 🔍 **Debugging Commands**

```bash
# Check for console.log
grep -r "console\." --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".claude" | grep -v ios_old | grep -v "logger.ts"

# Count console statements
grep -r "console\." --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".claude" | grep -v ios_old | grep -v "logger.ts" | wc -l

# Find TODO comments
grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" . | grep -v node_modules

# TypeScript type check
npx tsc --noEmit

# Find large files
find . -type f -size +1M -not -path "./node_modules/*" -not -path "./.git/*" | sort

# Check bundle size (after build)
npx expo export --platform ios
du -sh dist
```

---

## 📦 **Package Management**

```bash
# Add package
npm install <package-name>

# Add dev dependency
npm install -D <package-name>

# Update package
npm update <package-name>

# Check outdated packages
npm outdated

# Audit security
npm audit
npm audit fix
```

---

## 🎨 **Asset Commands**

```bash
# Generate app icons (if using expo-app-icon)
npx expo-app-icon

# Optimize images
# Install imagemagick first: brew install imagemagick
for img in assets/images/*.png; do
  convert "$img" -quality 85 -strip "$img"
done

# Generate splash screen (if using expo-splash-screen)
npx expo-splash-screen
```

---

## 📱 **EAS Commands**

```bash
# Login to EAS
eas login

# Check build status
eas build:list

# View build logs
eas build:view <build-id>

# Check credentials
eas credentials

# Update app version
# (Edit app.json manually, then:)
eas build --platform ios --profile production

# Submit to App Store (after build)
eas submit --platform ios --latest
```

---

## 🔐 **Security Checks**

```bash
# Check for hardcoded secrets
grep -r "apiKey\|API_KEY\|SECRET" --include="*.ts" --include="*.tsx" . | grep -v node_modules

# Check Firebase config (should be in firebaseConfig.ts only)
grep -r "AIzaSy" --include="*.ts" --include="*.tsx" . | grep -v node_modules

# Check for .env file exposure
cat .env 2>/dev/null && echo "⚠️ .env file exists - make sure it's in .gitignore"

# Verify .gitignore
git status --ignored
```

---

## 📊 **Analytics & Monitoring**

```bash
# View Crashlytics (via Firebase Console)
open https://console.firebase.google.com/project/baby-app-42b3b/crashlytics

# View Analytics
open https://console.firebase.google.com/project/baby-app-42b3b/analytics

# View Firestore
open https://console.firebase.google.com/project/baby-app-42b3b/firestore

# View Storage
open https://console.firebase.google.com/project/baby-app-42b3b/storage
```

---

## 🚀 **Pre-Launch Commands**

```bash
# 1. Clean build
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..

# 2. Type check
npx tsc --noEmit

# 3. Check console.log
grep -r "console\." --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".claude" | grep -v ios_old | grep -v "logger.ts"

# 4. Deploy Firebase
firebase deploy --only firestore:rules

# 5. Build production
eas build --platform ios --profile production

# 6. Submit
eas submit --platform ios --latest
```

---

## 🐛 **Emergency Fixes**

```bash
# Rollback Firestore Rules
firebase deploy --only firestore:rules

# Pull previous build from EAS
eas build:list
eas submit --platform ios --id <build-id>

# Reset local changes
git reset --hard HEAD
git clean -fd

# Restore from backup
git reflog
git reset --hard <commit-hash>
```

---

## 💡 **Useful One-Liners**

```bash
# Count lines of code
find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | xargs wc -l

# Find largest components
find components -name "*.tsx" -exec wc -l {} + | sort -rn | head -10

# Check build size
du -sh node_modules

# List all services
ls -la services/*.ts

# Find all console.log in one file
grep -n "console\." path/to/file.tsx
```

---

## 📝 **Git Workflow**

```bash
# Status
git status

# Add all changes
git add .

# Commit
git commit -m "fix: describe what you fixed"

# Push
git push origin main

# Create tag for release
git tag -a v1.0.8 -m "Release 1.0.8"
git push origin v1.0.8

# View commits
git log --oneline --graph --decorate

# Undo last commit (keep changes)
git reset --soft HEAD^
```

---

**💾 שמור את הקובץ הזה ב-bookmarks - תצטרך אותו הרבה!**
