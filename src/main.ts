import Sora from "sora-js-sdk";
import type { ConnectionPublisher } from "sora-js-sdk";

const connectButton = document?.querySelector<HTMLButtonElement>("#connectButton")!; 
const disconnectButton = document?.querySelector<HTMLButtonElement>("#disconnectButton")!;
const localVideo = document?.querySelector<HTMLVideoElement>("#localVideo")!;
const remoteVideos = document?.querySelector<HTMLVideoElement>("#remoteVideos")!;

let sendrecv: ConnectionPublisher;

connectButton?.addEventListener("click", async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  const debug = true;
  const signalingUrl: string = import.meta.env.VITE_SORA_SIGNALING_URL;
  const channelId: string = import.meta.env.VITE_SORA_CHANNEL_ID;
  const metadata = {
    access_token: import.meta.env.VITE_SORA_ACCESS_TOKEN,
  }
  const options = {
    multistream: true,
  }

  const soraConnection = Sora.connection(signalingUrl, debug);
  sendrecv = soraConnection.sendrecv(channelId, metadata, options);

  sendrecv.on("track", (event) => {
    const stream = event.streams[0];
    const remoteVideoId = `remoteVideo-${stream.id}`;
    if (!document.querySelector(`#${remoteVideoId}`)) {
      const video = document.createElement("video");
      video.id = remoteVideoId;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      remoteVideos?.appendChild(video);
    }
  });

  sendrecv.on("removetrack", (event) => {
    const target = event.target as MediaStream;
    const remoteVideo = document.querySelector(`#remoteVideo-${target.id}`);
    if (remoteVideo) {
      remoteVideo.remove();
    }
  });

  await sendrecv.connect(stream);
  localVideo.srcObject = stream;

  connectButton.disabled = true;
  disconnectButton.disabled = false;
});

disconnectButton?.addEventListener("click", async () => {
  // sendrecv があるか確認
  if (!sendrecv) {
    return;
  }

  // 切断処理
  await sendrecv.disconnect();
  localVideo.srcObject = null;

  while (remoteVideos?.firstChild) {
    remoteVideos.removeChild(remoteVideos.firstChild);
  }

  connectButton.disabled = false;
  disconnectButton.disabled = true;
});
