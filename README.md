# Time Traveller — v1 prototype

A mobile-first history guessing game. Ten clues get progressively easier. Enter a specific year after each clue; any year in the target decade wins.

## Run locally
Open `index.html` in a browser. For service-worker/offline behaviour, serve the folder with a local web server rather than opening it as a file.

## Publish with GitHub Pages
1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. In repository Settings → Pages, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Open the Pages URL GitHub gives you.
6. On iPhone Safari, use Share → Add to Home Screen.

## Add more rounds
Edit `history-data.js`. Each round uses this structure:

```js
{
  id: "1453",
  year: 1453,
  title: "An empire falls",
  summary: "Shown after the round.",
  era: "medieval",
  clues: [
    "Hardest clue first.",
    "...",
    "Easiest clue last."
  ]
}
```

Rules for data:
- exactly 10 clues per round
- progressively easier from clue 1 to clue 10
- no explicit four-digit years in clue text
- factual and specific to the target year/context
- the accepted answer is always the target year's conventional decade

## Included in this prototype
- responsive mobile-first UI
- Pinpoint-style progressive clue stack
- decade-based winning rule
- qualitative cold/warm/very-hot feedback
- scoring that declines by clue
- exact-year bonus
- time bonus
- confetti animation
- random/unseen-round preference
- era modes
- device-local statistics
- offline cache/service worker
- 19 representative rounds spanning 1066–2020
