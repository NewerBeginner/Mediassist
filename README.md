# Mediassist
# 提醒吃药小助手
Mediassist is a medication reminder app concept designed for people who need to manage multiple medicines with different schedules, meal-related timing rules, and treatment courses.

The project currently includes a browser-based HTML prototype and an Android Jetpack Compose prototype. The goal is to validate the medication workflow first, then connect the Android version to system notifications, vibration, sound, and lock-screen actions.

## Main Features

- Add, edit, and remove custom medicines.
- Configure each medicine independently:
  - name
  - dosage
  - color tag
  - start date
  - course length
  - number of treatment courses
  - weekly repeat days
  - fixed reminder times
  - flexible one-off reminder times
  - meal-before reminders
  - bedtime reminders
- Generate a daily medication timeline automatically.
- Confirm each medicine separately, even when multiple medicines share the same reminder time.
- Delay a single medicine without changing the status of the others.
- Track whether each dose is pending, confirmed, delayed, or overdue.
- Preview system reminder preferences such as notification, vibration, sound, lock-screen actions, and strong full-screen alerts.

## What Makes It Different

Many reminder tools treat one reminder as a single all-or-nothing event. Mediassist is built around a more realistic medication workflow:

- A reminder can contain multiple medicines.
- Each medicine can be confirmed independently.
- One medicine can be delayed while the others are marked as taken.
- Meal-based medicines can follow breakfast, lunch, or dinner timing.
- Treatment course progress is tracked per medicine, not globally.
- Colors help users distinguish medicines quickly during daily confirmation.

This makes the app better suited for situations where schedules change, meals are delayed, or several medicines need to be handled at the same time.

## Current Project Status

- `index.html`, `styles.css`, and `app.js` contain the HTML prototype.
- The Android prototype currently focuses on UI and workflow validation.
- System-level reminders are planned for the next development stage.

## Planned Android Capabilities

- Scheduled reminders using Android alarm APIs.
- Notification channels with sound and vibration settings.
- Quick actions from notifications, such as taken and delay.
- Lock-screen confirmation where supported by the device and user settings.
- Local persistence for medicines, schedules, and dose history.

## Medical Disclaimer / 医疗免责声明

**English:** Mediassist is a reminder and tracking tool only. It does not provide medical advice, diagnosis, dosage recommendations, or treatment decisions. Always follow the instructions of your physician, pharmacist, or qualified healthcare professional.

**中文：** Mediassist 仅作为用药提醒和记录工具，不提供医疗建议、诊断、剂量建议或治疗决策。请始终遵循医生、药师或合格医疗专业人员的指导。
