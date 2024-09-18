import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const secureWebSocketUrl = 'wss://your-secure-server-url-here';
      socketRef.current = new WebSocket(secureWebSocketUrl);

      socketRef.current.onopen = () => {
        setIsConnected(true);
        toast.success("WebSocket connected successfully");
      };

      socketRef.current.onmessage = (event) => {
        setTranscription(prevTranscription => prevTranscription + ' ' + event.data);
      };

      socketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast.error("WebSocket connection error");
      };

      socketRef.current.onclose = () => {
        setIsConnected(false);
        toast.info("WebSocket connection closed");
      };
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    if (!isConnected) {
      toast.error("WebSocket is not connected. Please try again later.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0);
        const dataArray = new Float32Array(1024);
        for (let i = 0; i < 1024; i++) {
          dataArray[i] = audioData[i];
        }
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(dataArray);
          console.log('Sent audio chunk of size:', dataArray.length);
        }
      };

      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Error accessing microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      // Stop the audio context and disconnect nodes
      const audioContext = new AudioContext();
      audioContext.close().then(() => {
        setIsRecording(false);
        toast.success("Recording stopped");
      });
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Speech to Text</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={toggleRecording}
            className={`w-full mb-4 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            disabled={!isConnected}
          >
            {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <div className="bg-gray-100 p-4 rounded-md min-h-[100px] max-h-[300px] overflow-y-auto">
            <p>{transcription || 'Transcription will appear here...'}</p>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            WebSocket Status: {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
