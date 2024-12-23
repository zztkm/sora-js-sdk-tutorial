import Sora from "sora-js-sdk";
import type { ConnectionPublisher } from "sora-js-sdk";
import { Logger } from "tslog";

// ログポジションを正しくするためのワークアラウンド
// https://github.com/fullstack-build/tslog/issues/302#issuecomment-2467630530
class MyLogger<T> extends Logger<T> {
    constructor(settings?: ISettingsParam<T>, logObj?: T) {
        super(settings, logObj);
        // @ts-ignore setting this private member as a workaround for https://github.com/fullstack-build/tslog/issues/302
        this.stackDepthLevel = 6
    }
}

const logger = new MyLogger({ name: "logger" });

const connectButton =
	document?.querySelector<HTMLButtonElement>("#connectButton");
const disconnectButton =
	document?.querySelector<HTMLButtonElement>("#disconnectButton");
const localVideo = document?.querySelector<HTMLVideoElement>("#localVideo");
const remoteVideos = document?.querySelector<HTMLVideoElement>("#remoteVideos");
const signalingUrlInput =
	document?.querySelector<HTMLInputElement>("#signalingUrl");
const channelIdInput = document?.querySelector<HTMLInputElement>("#channelId");

let sendrecv: ConnectionPublisher;

connectButton?.addEventListener("click", async () => {
	logger.info("connect button clicked");
	const stream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: false,
	});
	const debug = true;
	const signalingUrl: string = signalingUrlInput?.value || "";
	const channelId: string = channelIdInput?.value || "";
	const metadata = {
		access_token: import.meta.env.VITE_SORA_ACCESS_TOKEN,
	};
	const options = {
		multistream: true,
	};

	const soraConnection = Sora.connection(signalingUrl, debug);
	sendrecv = soraConnection.sendrecv(channelId, metadata, options);

	sendrecv.on("track", (event) => {
		logger.info("on track");
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
		logger.info("on removetrack");
		const target = event.target as MediaStream;
		const remoteVideo = document.querySelector(`#remoteVideo-${target.id}`);
		if (remoteVideo) {
			remoteVideo.remove();
		}
	});

	await sendrecv.connect(stream);
	if (localVideo) {
		localVideo.srcObject = stream;
	}

	connectButton.disabled = true;
	if (disconnectButton) {
		disconnectButton.disabled = false;
	}
});

disconnectButton?.addEventListener("click", async () => {
	logger.info("disconnectButton clicked");
	// sendrecv があるか確認
	if (!sendrecv) {
		return;
	}

	// 切断処理
	await sendrecv.disconnect();
	if (localVideo) {
		localVideo.srcObject = null;
	}

	while (remoteVideos?.firstChild) {
		remoteVideos.removeChild(remoteVideos.firstChild);
	}

	if (connectButton) {
		connectButton.disabled = false;
	}
	disconnectButton.disabled = true;
});
