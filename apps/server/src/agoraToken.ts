import agoraToken from 'agora-token';
const { RtcTokenBuilder, RtcRole } = agoraToken;

export function buildAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  userId: string,
): string {
  const expiry = 3600; // 1 hour
  return RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    channelName,
    userId,
    RtcRole.PUBLISHER,
    expiry,
    expiry,
  );
}
