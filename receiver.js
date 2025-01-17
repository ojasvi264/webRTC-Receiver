const signalingServer = new WebSocket("ws://localhost:8080");
let localConnection = [];

signalingServer.onmessage = (message) => {
  console.log("Message received from signaling server:", message);
  const data = JSON.parse(message.data);

  if (data.offer) {
    console.log("Received an SDP Offer:", data.offer, data.senderId);
    handleOffer(data.offer, data.senderId);
  } else if (data.answer) {
    console.log("Received an SDP Answer:", data.answer, data.senderId);
    handleAnswer(data.answer, data.senderId);
  } else if (data.iceCandidate) {
    console.log("Received an ICE Candidate:", data.iceCandidate, data.senderId);
    handleICECandidate(data.iceCandidate, data.senderId);
  }
};

async function handleOffer(offer, senderId) {
  try {
    console.log("Handling received SDP Offer...");

    // Create a new RTCPeerConnection for Peer 2
    localConnection = new RTCPeerConnection();
    console.log("Created RTCPeerConnection for Peer 2.");

    // Handle incoming ICE candidates
    localConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE Candidate in response to Offer:", event.candidate);
        signalingServer.send(JSON.stringify({ iceCandidate: event.candidate, senderId: senderId}));
      }
    };

    // Inside the ontrack handler
    localConnection.ontrack = (event) => {
        if (event.track.kind === 'video') {
        console.log("Received remote stream from Peer 1.", senderId);
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

    // Set the remote description with the received SDP offer
    await localConnection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
    console.log("Set remote description with received Offer.");

    // Create an SDP answer and set it as the local description
    const answer = await localConnection.createAnswer();
    console.log("Generated SDP Answer:", answer);

    await localConnection.setLocalDescription(answer);
    console.log("Set local description with Answer.");

    // Send the answer to signaling server
    signalingServer.send(JSON.stringify({ answer: answer, senderId: senderId }));

    //Store the peer connection for this sender.
    localConnection[senderId] = localConnection;
    console.log("Sent SDP Answer to signaling server.");
  } catch (error) {
    console.error("Error during handleOffer:", error);
  }
}

// Handle the SDP Answer from Peer 1
function handleAnswer(answer) {
  try {
    console.log("Handling received SDP Answer...");
    localConnection
      .setRemoteDescription(new RTCSessionDescription(answer))
      .then(() => console.log("Set remote description with received Answer."))
      .catch((error) =>
        console.error("Error setting remote description:", error)
      );
  } catch (error) {
    console.error("Error during handleAnswer:", error);
  }
}

// Handle the ICE candidates received from Peer 1
function handleICECandidate(iceCandidate) {
  try {
    console.log("Adding received ICE Candidate...");
    localConnection
      .addIceCandidate(new RTCIceCandidate(iceCandidate))
      .then(() => console.log("Successfully added ICE Candidate."))
      .catch((error) => console.error("Error adding ICE Candidate:", error));
  } catch (error) {
    console.error("Error during handleICECandidate:", error);
  }
}
