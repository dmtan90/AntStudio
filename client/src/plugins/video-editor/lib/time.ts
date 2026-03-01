export function formatMediaDuration(duration: number, showMs = true) {
  let milliseconds: number | string = Math.floor(duration % 1000);
  let seconds: number | string = Math.floor((duration / 1000) % 60);
  let minutes: number | string = Math.floor((duration / (1000 * 60)) % 60);
  let hours: number | string = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;

  if (showMs) return minutes + ":" + seconds + "." + String(milliseconds).padEnd(3, "0");
  else return minutes + ":" + seconds;
}
