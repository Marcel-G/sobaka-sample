import { startAudio } from './webAudio';

let context: AudioContext | null = null;

const button = document.createElement("button");
button.innerHTML = "Start";
button.addEventListener("click", async () => {
  if (context) {
    context.close()
    context = null;
  } else {
    context = await startAudio()
  }
});
document.body.appendChild(button);