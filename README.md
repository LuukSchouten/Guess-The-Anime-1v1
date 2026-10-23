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
- Each turn is 10 seconds by default; adjust it in the settings (including 5 or 8 seconds).
- If Player 1 misses, Player 2 gets a turn on the same image. The game advances after a correct answer or after both players miss.
- Add image URLs or upload your own anime images in settings.

Share only the projector window/display with the beamer, not the host controls window.
