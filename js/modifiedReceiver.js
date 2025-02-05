const signalingServer = new WebSocket("ws://localhost:8080");
signalingServer.onopen = () => {
    signalingServer.send(JSON.stringify({ role: "receiver" }));
    console.log("Connected to signaling server.");
};

// Object to manage multiple peer connections
let peerConnections = {};

signalingServer.onmessage = (message) => {
    console.log("Message received from signaling server:", message);
    const data = JSON.parse(message.data);

    if (data.offer) {
        console.log("Received an SDP Offer:");
        handleOffer(data);
    } else if (data.iceCandidate) {
        console.log("Received an ICE Candidate:", data);
        handleICECandidate(data.iceCandidate, data.senderId);
    }
};

async function handleOffer(data) {
    try {
        const senderId = data.senderId;
        const mediaConfig = data.mediaConfig;
        const senderName = data.senderName;

        const remoteOffer = new RTCSessionDescription(data.offer);
        
        // const videoBitrate = mediaConfig.maxVideoBitrate;
        // const audioBitrate = mediaConfig.maxAudioBitrate;
        
        console.log("Received offer from sender:", remoteOffer);
        console.log("Received media config:", mediaConfig);

        if (!peerConnections[senderId]) {
            peerConnections[senderId] = new RTCPeerConnection();
            console.log("Created RTCPeerConnection for Sender:", senderId);

            // Handle ICE candidates for this sender
            peerConnections[senderId].onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("Generated ICE Candidate:", event.candidate);
                    signalingServer.send(JSON.stringify({
                        iceCandidate: event.candidate,
                        senderId: senderId,
                        type: "receiverIceCandidate"
                    }));
                }
            };

            peerConnections[senderId].ontrack = (event) => {
                if (event.track.kind === 'video') {
                console.log("Received remote stream from sender.", senderId);
                const getSenderNamePTag = document.getElementById('senderName');
                getSenderNamePTag.innerText = senderName;
                const remoteStream = event.streams[0];
                    const videoElement = document.createElement('video');
                    videoElement.id = senderId;
                    videoElement.autoplay = true;
                    videoElement.muted = true;
                    videoElement.controls = true;
                    videoElement.style.cursor = 'pointer'; 
        
                    // Assign remote stream to video element
                    videoElement.srcObject = remoteStream;
                    videoElement.play();
        
                    //Append the video to the gallery
                    document.getElementById('videoGallery').appendChild(videoElement);
        
                }
            };

            let lastVideoBytesReceived = null;
            let lastVideoTimestamp = null;
            let lastAudioBytesReceived = null;
            let lastAudioTimestamp = null;
            async function checkReceiverStats(peerConnection) {
                const stats = await peerConnection.getStats();
                stats.forEach(report => {
                    if (report.type === "inbound-rtp" && report.kind === "audio") {
                        if (lastAudioTimestamp !== null && lastAudioBytesReceived !== null) {
                            const timeDiff = (report.timestamp - lastAudioTimestamp) / 1000; // Convert to seconds
                            const bytesDiff = report.bytesReceived - lastAudioBytesReceived;
                            const bitrate = (bytesDiff * 8) / timeDiff;

                            console.log("Incoming Audio Stream Stats:");
                            console.log(`- Bitrate: ${bitrate.toFixed(2)} bps (${(bitrate / 1000).toFixed(2)} kbps)`);
                            console.log(`- Packets Received: ${report.packetsReceived}`);
                            console.log(`- Concealed Samples: ${report.concealedSamples}`);
                            console.log(`- Total Samples Received: ${report.totalSamplesReceived}`);
                            console.log(`- Total Samples Duration: ${report.totalSamplesDuration.toFixed(2)} s`);
                        }
                        lastAudioBytesReceived = report.bytesReceived;
                        lastAudioTimestamp = report.timestamp;
                    }
            
                    if (report.type === "codec" && report.mimeType.startsWith("audio")) {
                        console.log(`Audio Codec Used: ${report.mimeType} (Payload Type: ${report.payloadType})`);
                    }

                    if (report.type === "inbound-rtp" && report.kind === "video") {
                        if (lastVideoTimestamp !== null && lastVideoBytesReceived !== null) {
                            const timeDiff = (report.timestamp - lastVideoTimestamp) / 1000; // Convert to seconds
                            const bytesDiff = report.bytesReceived - lastVideoBytesReceived;
                            const bitrate = (bytesDiff * 8) / timeDiff;

                            console.log("Incoming Video Stream Stats:");
                            console.log(`- Codec: Payload Type ${report.codecId}`);
                            console.log(`- Bytes Received: ${report.bytesReceived} bytes received`);
                            console.log(`- Bitrate: ${bitrate.toFixed(2)} bps (${(bitrate / 1000).toFixed(2)} kbps)`);
                            console.log(`- Frame Rate: ${report.framesPerSecond} FPS`);
                            console.log(`- Jitter: ${report.jitter} ms`);
                            console.log(`- Packets Lost: ${report.packetsLost}`);
                        }
                        // Update values for the next iteration
                        lastVideoBytesReceived = report.bytesReceived;
                        lastVideoTimestamp = report.timestamp;
                    }
            
                    if (report.type === "codec" && report.mimeType.startsWith("video")) {
                        console.log(`Video Codec Used: ${report.mimeType} (Payload Type: ${report.payloadType})`);
                    }
                });
            }
            
            // Call this function periodically to monitor stats
            setInterval(() => {
                checkReceiverStats(peerConnections[senderId]);
            }, 5000);
            

            await peerConnections[senderId].setRemoteDescription(remoteOffer);
            console.log("Set remote description for", senderId);

            // Create and send SDP answer
            const answer = await peerConnections[senderId].createAnswer();
            await peerConnections[senderId].setLocalDescription(answer);
            signalingServer.send(JSON.stringify({ answer: answer, senderId: senderId }));
            console.log("Sent SDP Answer to", senderId);
        }
    } catch (error) {
        console.error("Error during handleOffer:", error);
    }
}

// Handle ICE candidates
function handleICECandidate(iceCandidate, senderId) {
    try {
        if (peerConnections[senderId]) {
            console.log("Adding received ICE Candidate...");
            peerConnections[senderId]
                .addIceCandidate(new RTCIceCandidate(iceCandidate))
                .then(() => console.log("Successfully added ICE Candidate."))
                .catch((error) => console.error("Error adding ICE Candidate:", error));
        }else{
            console.log("senderId not found!");
        }
    } catch (error) {
        console.error("Error during handleICECandidate:", error);
    }
}
