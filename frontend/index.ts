import { startAudio } from './webAudio';

import("backend").then(module => {
  module.greet();
});

const button = document.createElement("button");
button.innerHTML = "start audio worklet";
button.addEventListener("click", startAudio);
document.body.appendChild(button);