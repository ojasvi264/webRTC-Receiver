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
        const remoteOffer = new RTCSessionDescription(data.offer);
        const senderId = data.senderId;
        const mediaConfig = data.mediaConfig;
        const videoCodec = mediaConfig.videoCodec;
        const videoBitrate = mediaConfig.maxVideoBitrate;
        const audioCodec = mediaConfig.audioCodec;
        const audioBitrate = mediaConfig.maxAudioBitrate;
        
        console.log("Received offer from sender:", remoteOffer);
        console.log("Received media config:", mediaConfig);

        // Store PeerConnection for each sender
        let peerConnection = new RTCPeerConnection();
        peerConnections[senderId] = peerConnection;
        console.log("Created RTCPeerConnection for Sender:", senderId);
         // Set remote description

         // Handle local media streams
         peerConnection.ontrack = (event) => {
            console.log("here");
            if (event.track.kind === 'video') {
            console.log("Received remote stream from sender.", senderId);
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


         await peerConnection.setRemoteDescription(remoteOffer);
         console.log("Set remote description.");

         // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("Generated ICE Candidate:", event.candidate);
                signalingServer.send(JSON.stringify({ iceCandidate: event.candidate}));
            }
        };

        /*set bitrate and codec*/
        peerConnection.getTransceivers().forEach((transceiver) => {
            if (transceiver.receiver && transceiver.receiver.track) {
                const kind = transceiver.receiver.track.kind;
                const codecs = RTCRtpReceiver.getCapabilities(kind)?.codecs || [];
                const bitrateParams = transceiver.sender.getParameters();
                if (!bitrateParams.encodings) {
                  bitrateParams.encodings = [{}];
                }

                if (kind === "audio"){
                    //Set Audio Codec
                    const preferredAudioCodec = codecs.find(c => c.mimeType === audioCodec);
                    if(preferredAudioCodec){
                        transceiver.setCodecPreferences([preferredAudioCodec]);
                    }else {
                        console.warn(`Audio codec ${audioCodec} not found.`);
                    }
                }     if (kind === "video") {
                    //Set Video Codec
                    const preferredVideoCodec = codecs.find(c => c.mimeType === videoCodec);
                    if (preferredVideoCodec) {
                        transceiver.setCodecPreferences([preferredVideoCodec]);
                    }else {
                        console.warn(`Video codec ${videoCodec} not found.`);
                    }
                }
            }
        });

 
          // Create and send SDP answer
         const answer = await peerConnection.createAnswer();
         await peerConnection.setLocalDescription(answer);
         signalingServer.send(JSON.stringify({ answer: answer}));
         console.log("Sent SDP Answer.");
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
