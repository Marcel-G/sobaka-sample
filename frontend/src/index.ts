import { SamplerNode } from "sobaka-sample-web-audio";

const startAudio = async () => {
  const context = new AudioContext();

  const node = await SamplerNode.register(context);

  node.connect(context.destination)

  return context;
};


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