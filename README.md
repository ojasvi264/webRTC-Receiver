# WebRTC Receiver
This is a Receiver side system, which will display live feed of senders(up to 6 in a single frame).

## Working Mechanism
1. Initially, [The signaling](https://github.com/ojasvi264/webRTC-Sender-SignalingServer) should be initialized with `cd server` and `node signalingServer.js`. 
2. Then you can connect this Receiver either serving locally or using file path.

> [!IMPORTANT]
> Since the first connection made to the **Signaling Server** is assigned as a * *Receiver* *. So connect the **Receiver** before making **Sender** connection.
