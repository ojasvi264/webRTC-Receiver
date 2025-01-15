const signalingServer = new WebSocket("ws://192.168.50.165:8080");
let localConnection;

signalingServer.onmessage = (message) => {
  console.log("Message received from signaling server:", message);
  const data = JSON.parse(message.data);

  if (data.offer) {
    console.log("Received an SDP Offer:", data.offer);
    handleOffer(data.offer);
  } else if (data.answer) {
    console.log("Received an SDP Answer:", data.answer);
    handleAnswer(data.answer);
  } else if (data.iceCandidate) {
    console.log("Received an ICE Candidate:", data.iceCandidate);
    handleICECandidate(data.iceCandidate);
  }
};

async function handleOffer(offer) {
  try {
    console.log("Handling received SDP Offer...");

    // Create a new RTCPeerConnection for Peer 2
    localConnection = new RTCPeerConnection();
    console.log("Created RTCPeerConnection for Peer 2.");

    // Handle incoming ICE candidates
    localConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Generated ICE Candidate in response to Offer:", event.candidate);
        signalingServer.send(JSON.stringify({ iceCandidate: event.candidate }));
      }
    };

    // Inside the ontrack handler
    localConnection.ontrack = (event) => {
      console.log("Received remote stream from Peer 1.");
      const remoteStream = event.streams[0];

        const videoElement = document.getElementById("video2");
        // Assign remote stream to video element
        videoElement.srcObject = remoteStream;
        console.log(remoteStream.getTracks());       // List all tracks
        console.log(remoteStream.getVideoTracks()); 

        console.log("Assigned remote stream to video element.", remoteStream);

        videoElement.onloadedmetadata = () => {
        
            videoElement.play().catch((error) => {
              console.error("Error playing video:", error);
            });
    
        };
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
    signalingServer.send(JSON.stringify({ answer: answer }));
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
