export interface LessonSection { id: string; title: string; body: string[] }
export type SimulationKind = "unit-circle" | "projectile";
export interface TopicContent { sections: LessonSection[]; taskId: string; taskTitle: string; simulation: SimulationKind }

/** Original demo lesson text. Plain strings only; rendered as text, never as HTML. */
export const CONTENT: Record<string, TopicContent> = {
  "math-trig": {
    simulation: "unit-circle",
    taskId: "trig-drag-angle",
    taskTitle: "Explore the unit circle",
    sections: [
      { id: "trig-intro", title: "Right triangles",
        body: ["Trigonometry connects the angles of a triangle to the lengths of its sides.",
          "In a right triangle the longest side, opposite the right angle, is the hypotenuse. For any other angle θ, the side across from it is the opposite and the side touching it is the adjacent.",
          "The Pythagorean theorem links the sides: opposite² + adjacent² = hypotenuse²."] },
      { id: "trig-sin-cos", title: "Sine and cosine",
        body: ["Sine is opposite ÷ hypotenuse. Cosine is adjacent ÷ hypotenuse.",
          "Two values worth remembering: sin(30°) = 0.5 and cos(60°) = 0.5.",
          "On the unit circle (radius 1) the point at angle θ has coordinates (cos θ, sin θ)."] },
      { id: "trig-tan", title: "Tangent",
        body: ["Tangent is opposite ÷ adjacent, which is the same as sin θ ÷ cos θ.",
          "At 45° the opposite and adjacent sides are equal, so tan(45°) = 1.",
          "Tangent is undefined at 90°, where cos θ = 0 and we would divide by zero."] },
    ],
  },
  "phys-kinematics": {
    simulation: "projectile",
    taskId: "phys-kin-launch",
    taskTitle: "Launch a projectile at the target",
    sections: [
      { id: "phys-kin-motion", title: "Speed, velocity and acceleration",
        body: ["Speed is distance ÷ time. Velocity is speed with a direction. Acceleration is how fast velocity changes: a = Δv ÷ Δt.",
          "A car that covers 120 m in 8 s at a steady pace has a speed of 120 ÷ 8 = 15 m/s.",
          "Acceleration is measured in metres per second squared (m/s²)."] },
      { id: "phys-kin-equations", title: "Equations of motion",
        body: ["For constant acceleration a, starting speed u and time t: v = u + a·t and s = u·t + ½·a·t².",
          "Starting from rest (u = 0) with a = 3 m/s² for 4 s gives v = 12 m/s and s = ½ × 3 × 16 = 24 m.",
          "Near Earth’s surface, falling objects accelerate downward at about 9.8 m/s² when air resistance is small."] },
      { id: "phys-kin-projectile", title: "Projectile motion",
        body: ["A projectile moves sideways at a steady speed while gravity changes its vertical speed. The two directions can be studied separately.",
          "At the top of the path the vertical velocity is zero for a moment. On level ground with no air resistance, a launch angle of 45° gives the longest range.",
          "Range R = v²·sin(2θ) ÷ g, maximum height H = (v·sin θ)² ÷ (2g), and time of flight T = 2·v·sin θ ÷ g."] },
    ],
  },
};
