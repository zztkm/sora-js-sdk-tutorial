import Sora from "sora-js-sdk";
import type { ConnectionPublisher, ConnectionSubscriber } from "sora-js-sdk";
import { v4 as uuidv4 } from "uuid";

const connectButton =
	document?.querySelector<HTMLButtonElement>("#connectButton");
const disconnectButton =
	document?.querySelector<HTMLButtonElement>("#disconnectButton");
const localVideo = document?.querySelector<HTMLVideoElement>("#localVideo");
const remoteVideos = document?.querySelector<HTMLVideoElement>("#remoteVideos");
const signalingUrlDisplay = document?.querySelector<HTMLDivElement>(
	"#signalingUrlDisplay",
);
const channelIdDisplay =
	document?.querySelector<HTMLDivElement>("#channelIdDisplay");
const signalingUrlInput =
	document?.querySelector<HTMLInputElement>("#signalingUrlInput");
const watchChannelIdInput = document?.querySelector<HTMLInputElement>(
	"#watchChannelIdInput",
);
const watchButton = document?.querySelector<HTMLButtonElement>("#watchButton");

let sendonly: ConnectionPublisher;
const recvonlys: ConnectionSubscriber[] = [];

connectButton?.addEventListener("click", async () => {
	const stream = await navigator.mediaDevices.getUserMedia({
		video: true,
		audio: false,
	});
	const debug = true;
	const signalingUrl: string = signalingUrlInput?.value || "";
	const channelId: string = uuidv4(); // UUID で自動生成
	const metadata = {
		access_token: import.meta.env.VITE_SORA_ACCESS_TOKEN,
	};
	const options = {
		multistream: false,
	};

	if (signalingUrlDisplay) {
		signalingUrlDisplay.textContent = `Signaling URL: ${signalingUrl}`;
	}
	if (channelIdDisplay) {
		channelIdDisplay.textContent = `My Channel ID: ${channelId}`;
	}

	const soraConnection = Sora.connection(signalingUrl, debug);
	sendonly = soraConnection.sendonly(channelId, metadata, options);

	await sendonly.connect(stream);
	if (localVideo) {
		localVideo.srcObject = stream;
	}

	connectButton.disabled = true;
	if (disconnectButton) {
		disconnectButton.disabled = false;
	}
});

disconnectButton?.addEventListener("click", async () => {
	// sendrecv があるか確認
	if (!sendonly) {
		return;
	}

	// 切断処理
	await sendonly.disconnect();
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

watchButton?.addEventListener("click", async () => {
	const watchChannelId: string = watchChannelIdInput?.value || "";
	if (!watchChannelId) {
		alert("視聴先のチャネルIDを入力してください");
		return;
	}

	// watchChannelId に既に接続済みか確認
	if (recvonlys.some((recvonly) => recvonly.channelId === watchChannelId)) {
		alert(`チャネルID: ${watchChannelId} は既に視聴中です`);
		return;
	}

	const debug = true;
	const signalingUrl: string = signalingUrlInput?.value || "";
	const metadata = {
		access_token: import.meta.env.VITE_SORA_ACCESS_TOKEN,
	};
	const options = {
		multistream: false,
	};

	const soraConnection = Sora.connection(signalingUrl, debug);
	const recvonly = soraConnection.recvonly(watchChannelId, metadata, options);

	recvonly.on("track", (event) => {
		console.debug("track", event);
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

	recvonly.on("removetrack", (event) => {
		console.debug("removetrack", event);
		const target = event.target as MediaStream;
		const remoteVideo = document.querySelector(`#remoteVideo-${target.id}`);
		if (remoteVideo) {
			remoteVideo.remove();
		}
	});

	await recvonly.connect();

	// recvonlys に追加
	recvonlys.push(recvonly);
});
