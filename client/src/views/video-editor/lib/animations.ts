import { defaultSpringConfig } from "video-editor/constants/animations";
import { clamp } from "lodash";

export function modifyAnimationEasing(easing?: string, config = defaultSpringConfig) {
  switch (easing) {
    case "spring":
      return `spring(${config.mass}, ${config.stiffness}, ${config.damping}, ${config.velocity})`;
    default:
      return easing || "linear";
  }
}

export function calculateSpringAnimationDuration({ damping, mass, stiffness } = defaultSpringConfig) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const duration = -Math.log(0.01) / (zeta * w0);
    return duration * 1000;
  }
  if (zeta === 1) {
    return (5 / w0) * 1000;
  }
  if (zeta > 1) {
    return (5 / (zeta * w0)) * 1000;
  }
  return 0;
}

export function visualizeSpringAnimation({ damping, mass, stiffness, velocity: speed } = defaultSpringConfig, height = 256, width = 640) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const initialDisplacement = 1;
  const points: Array<{ time: number; position: number }> = [];
  const timeStep = 0.01;

  const duration = calculateSpringAnimationDuration({ damping, mass, stiffness, velocity: speed });
  const seconds = (isFinite(duration) ? duration : 1000) / 1000;
  const totalTime = clamp(Math.round(seconds), 2, 100);

  let velocity = speed;
  let position = initialDisplacement;

  for (let t = 0; t <= totalTime; t += timeStep) {
    const acceleration = (-stiffness * position - damping * velocity) / mass;
    velocity += acceleration * timeStep;
    position += velocity * timeStep;
    points.push({ time: t, position });
  }

  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);

  const scaleX = canvas.width / totalTime;
  const scaleY = canvas.height / 4;

  points.forEach((point) => {
    const x = point.time * scaleX;
    const y = canvas.height / 2 - point.position * scaleY;
    ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#2463EB";
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, canvas.height);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.stroke();

  return canvas.toDataURL("image/png", 1);
}
