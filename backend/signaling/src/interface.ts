
// Message structure and protocol flow taken from y-webrtc/bin/server.js
export interface YWebRtcSubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  topics?: string[];
}
export interface YWebRtcPingMessage {
  type: 'ping';
}
export interface YWebRtcPublishMessage {
  type: 'publish';
  topic?: string;
  [k: string]: any;
}

export type YWebRTCMessage =
  | YWebRtcSubscriptionMessage
  | YWebRtcPublishMessage
  | YWebRtcPingMessage