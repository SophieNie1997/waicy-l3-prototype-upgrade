# WAICY Lesson 3 Prototype Upgrade

Public student review site for WAICY Lesson 3.

## Pages

- `teacher-version/comparison.html`: A/B prototype comparison and guided breakdown.
- `teacher-version/teacher-version.html`: public-safe teacher upgrade demo.
- `student-original/website.html`: original student prototype from Lesson 2.

The deployed Vercel version uses `/api/generate-comic` as a backend proxy for image generation. The API key must be stored in Vercel as the `KKSJ_API_KEY` environment variable and must never be written into the HTML or browser JavaScript.

If the backend image request fails, the teacher demo falls back to a local browser-only canvas comic so students can still review the interaction safely at home.
