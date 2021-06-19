import { startAudio } from './webAudio';

const button = document.createElement("button");
button.innerHTML = "start audio worklet";
button.addEventListener("click", startAudio);
document.body.appendChild(button);