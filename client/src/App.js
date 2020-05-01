import React, { useEffect, useState, useRef } from 'react';
import socketIoClient from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';
import './App.css';

const ENDPOINT = '/';

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 50vh;
  margin-bottom: 3rem;
`;

function App() {
  const [yourID, setYourID] = useState('');
  const [enableMyVideo, setEnableMyVideo] = useState(true);
  const [enableMyAudio, setEnableMyAudio] = useState(true);
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState();
  const [videoTracks, setVideoTracks] = useState([]);
  const [audioTracks, setAudioTracks] = useState([]);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    socket.current = socketIoClient(ENDPOINT);

    activateMediaDevices();

    socket.current.on('yourID', (id) => {
      setYourID(id);
    });

    socket.current.on('allUsers', (users) => {
      setUsers(users);
    });

    socket.current.on('hey', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });
  }, []);

  const activateMediaDevices = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }

        setVideoTracks(stream.getVideoTracks());
        setAudioTracks(stream.getAudioTracks());

        console.log(stream.getVideoTracks());
        console.log(stream.getAudioTracks());
      });
  };

  const changeStatusMyVideo = () => {
    setEnableMyVideo(!enableMyVideo);
    if (enableMyVideo) {
      videoTracks.map((track) => track.stop());
    } else {
      activateMediaDevices();
    }
  };

  const changeStatusMyAudio = () => {
    setEnableMyAudio(!enableMyAudio);
    if (enableMyAudio) {
      audioTracks.map((track) => track.stop());
    } else {
      activateMediaDevices();
    }
  };

  const callPeer = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream
    });

    peer.on('signal', (data) => {
      socket.current.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: yourID
      });
    });

    peer.on('stream', (stream) => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream;
      }
    });

    socket.current.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
  };

  const acceptCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });

    peer.on('signal', (data) => {
      socket.current.emit('acceptCall', { signal: data, to: caller });
    });

    peer.on('stream', (stream) => {
      partnerVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
  };

  let UserVideo;
  if (stream) {
    UserVideo = <Video playsInline muted ref={userVideo} autoPlay />;
  }

  let PartnerVideo;
  if (callAccepted) {
    PartnerVideo = <Video playsInline ref={partnerVideo} autoPlay />;
  }

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Aceptar</button>
      </div>
    );
  }

  return (
    <Container>
      <Row>
        {UserVideo}
        {PartnerVideo}
      </Row>
      <Row>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return (
            <button key={key} onClick={() => callPeer(key)}>
              Llamar a {key}
            </button>
          );
        })}
      </Row>
      <Row>{incomingCall}</Row>
      <div>
        <h3>Mi Id: {yourID}</h3>
        <h5>Sockets:</h5>
        <ol>
          {Object.keys(users).map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ol>
        <button onClick={changeStatusMyVideo}>Pausar video</button>
        <button onClick={changeStatusMyAudio}>Sileciar micrófono</button>
      </div>
    </Container>
  );
}

export default App;
