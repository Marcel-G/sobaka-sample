import { startAudio } from './webAudio';

let context: AudioContext | null = null;

const button = document.createElement("button");
button.innerHTML = "Listen to a 100hz sine wave";
button.addEventListener("click", async () => {
  if (context) {
    context.close()
    context = null;
  } else {
    context = await startAudio()
  }
});
document.body.appendChild(button);