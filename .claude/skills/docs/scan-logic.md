# Scan Validation Skill
Rules for processing barcode and QR scans in the Kiosk.

## QR Format
JSON: `{"id_card_number": "...", "bteg_id": 123}`. Fallback to plain string.

## Validation Chain
1. **Time Check:** Is there an active `mealTimeSlot`?
2. **Employee Check:** Find by `idcardNumber`. Must be `isActive: true`.
3. **Location Check:** Compare `userMealConfigs[currentSlot]` with `kioskConfig.diningHallId`. (Skip for 'Snack').
4. **Duplicate Check:** Query `mealLogs` for `[userId, mealType, today]`.
5. **Success:** Create record, play Success sound, show Green overlay.

## Audio Feedback
- Success: Web Audio C5+E5+G5.
- Error/Warning: Square wave patterns (A4).