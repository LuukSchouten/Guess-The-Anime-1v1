# The Floor — Manual Anime Quiz

A two-player anime guessing game with manual host controls and a clean projector display. Voice recognition has been removed.

## Run it

1. Install Node.js 18 or newer.
2. In this folder run `npm install`.
3. Run `npm run dev`.
4. On the host laptop open `http://localhost:3000/game`.
5. Click **OPEN PROJECTOR** and move the new `/projector` window to the beamer screen. Press F11 on the projector window for fullscreen.

## Play

- Use the host laptop window to start the game and press **CORRECT**, **WRONG / PASS**, or **REVEAL ANSWER**. These controls do not appear in the projector window.
- Each player has a 60-second time bank for the selected category.
- The timer only runs during that player's guessing turns.
- Every wrong answer removes 3 seconds from the answering player's time bank.
- If a player misses, the opponent gets a chance at the same image.

Share only the projector window/display with the beamer, not the host controls window.

## Adding questions by placing images in folders

You no longer need to add titles or upload images through the game. Put image files directly into the matching folder under `public/anime/`:

- `public/anime/isekai/`
- `public/anime/shounen/`
- `public/anime/sport/`
- `public/anime/yaoi-yuri/`
- `public/anime/anime-landschappen/`
- `public/anime/emojis/`

The image filename without its extension is used as the correct answer. For example, `public/anime/isekai/Re-Zero.jpg` displays the image and gives the host the answer `Re-Zero`. Supported formats are JPG, JPEG, PNG, WEBP, GIF and AVIF. Use **Game setup → Refresh image folders** after adding files while the app is already running.

## Match rules

Select exactly one category before starting. Each player has an independent 60-second time bank for that category. A player's category timer only decreases while that player is actively guessing a question from that category; it pauses during the opponent's turn and between questions. A wrong answer gives the other player a chance at the same image. The match ends when all questions in the selected category have been used, or when either player's category time bank reaches zero, including from a 3-second wrong-answer penalty. The correct answer is shown on the host screen only and is not sent to the projector.

## Adding game questions

Every category uses image files only. Put images in `public/anime/<category>/`; the filename (without its extension) is the correct answer. Supported formats are JPG, JPEG, PNG, WEBP, GIF and AVIF. The `emojis` and `quotes` categories are also image-based; use an image that contains the emoji puzzle or quote.

Refresh the image folders from Game Setup after adding or changing files. Restart the development server if the file scanner does not pick up changes.
