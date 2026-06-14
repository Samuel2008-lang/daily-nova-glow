---
name: Feedback via email mailto
description: Feedback opens user's email app addressed to developer hopeegbon28@gmail.com after a confirmation dialog. Do not save locally.
type: feature
---
Feedback flow:
- User taps Feedback → writes message
- A confirmation AlertDialog warns that the feedback will be sent via email to the developer
- On confirm, open `mailto:hopeegbon28@gmail.com?subject=DailyNova Feedback&body=<text>`
- Never save feedback to localStorage; never show "saved on device" copy
- Never reference Settings → Feedback Review (it has been removed)
