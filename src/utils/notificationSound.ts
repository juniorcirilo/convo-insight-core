let audio: HTMLAudioElement | null = null;

export const playNotificationSound = () => {
  if (!audio) {
    audio = new Audio("/notification.mp3");
    audio.volume = 0.5;
  }

  audio.currentTime = 0;
  audio.play().catch((error) => {
    console.error("Error playing notification sound:", error);
  });
};
