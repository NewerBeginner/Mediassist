# Mediassist
# 用药提醒APP

Mediassist is a medication reminder app prototype designed for people who need to manage multiple medicines, different dosing schedules, meal-related timing rules, and treatment-course progress.

The project focuses on a practical medication workflow: users can add medicines, define when each one should be taken, confirm doses independently, and delay one medicine without affecting others that share the same reminder time.

## Key Features

- Manage any number of medicines instead of being limited to a fixed set.
- Configure each medicine independently:
  - medicine name
  - dosage
  - color label
  - start date
  - treatment-course length
  - number of treatment courses
  - weekly repeat days
  - fixed reminder times
  - flexible reminder times
  - breakfast/lunch/dinner-before reminders
  - bedtime reminders
- Generate a daily medication timeline automatically.
- Confirm each medicine separately, even when several medicines are due at the same time.
- Delay a single medicine while keeping the others marked as taken.
- Track pending, confirmed, delayed, and overdue doses.
- Use color labels to make medicines easier to distinguish at a glance.
- Preserve user data locally in the Android prototype.

## Product Highlights

Many reminder tools treat one reminder as one all-or-nothing event. Mediassist is designed around a more realistic medication routine:

- One reminder can contain multiple medicines.
- Each medicine can be checked off independently.
- Meal-based medicines can follow breakfast, lunch, or dinner timing.
- Treatment progress is tracked per medicine rather than globally.
- The interface prioritizes the daily confirmation workflow instead of burying it behind setup screens.

This makes Mediassist especially useful when meals are delayed, medicines overlap, or users need to handle several dosing rules at once.

## Project Status

Mediassist currently includes:

- A browser-based HTML/CSS/JavaScript prototype for fast interaction testing.
- An Android Jetpack Compose prototype for mobile workflow validation.

The Android version currently supports local UI workflows, medicine management, dose confirmation, delay handling, and local persistence. System-level reminder integration is still under development.

## Current Limitations

- System-level reminders are not fully integrated yet.
- Notification pop-ups, vibration, ringtone playback, and lock-screen actions require additional Android permission handling and native scheduling work.
- The current reminder logic is still prototype-level and should be tested further across different Android versions and device manufacturers.
- Medical data is stored locally for prototype use; production-ready privacy, backup, and security design still need to be added.

## Planned Improvements

- Android notification permission flow.
- Scheduled reminders using Android alarm APIs.
- Notification channels with sound and vibration settings.
- Quick notification actions such as taken and delay.
- Lock-screen confirmation where supported by device settings.
- More robust local storage and data migration.
- Better handling of background restrictions on different Android devices.

## Medical Disclaimer / 医疗免责声明

**English:** Mediassist is a reminder and tracking tool only. It does not provide medical advice, diagnosis, dosage recommendations, or treatment decisions. Always follow the instructions of your physician, pharmacist, or qualified healthcare professional.

**中文：** Mediassist 仅作为用药提醒和记录工具，不提供医疗建议、诊断、剂量建议或治疗决策。请始终遵循医生、药师或合格医疗专业人员的指导。
