// TEMP FILE - Babysitter Hours Update Plan
// This file documents the changes needed for per-day hours

## Changes Required:

### 1. State Update (DONE)
```typescript
const [availableHours, setAvailableHours] = useState<Record<string, { start: string; end: string }>>({
    '0': { start: '09:00', end: '18:00' },
    '1': { start: '09:00', end: '18:00' },
    // ... for all days
});
```

### 2. Display Summary (Quick Action Button)
Instead of showing global hours, show something like:
- "5 ימים • שעות משתנות" if hours differ
- "5 ימים • 09:00-18:00" if all hours are the same

### 3. Availability Modal UI
Show hours editor for EACH selected day (filter by availableDays)

### 4. RTL Fix for Reviews Card  
In MyReviewsScreen - add writingDirection: 'rtl' to card text

### 5. Add Style: dayHoursContainer, dayHoursLabel
