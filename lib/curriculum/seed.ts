import type { Topic } from "@/lib/domain/types";

const t = (
  id: string,
  subjectId: Topic["subjectId"],
  title: string,
  order: number,
  prerequisites: string[],
  summary: string,
  requiredSections: string[] = [],
  requiredTasks: string[] = [],
): Topic => ({
  id, subjectId, title, summary, order, prerequisites,
  defaultMasteryPercent: 80, requiredSections, requiredTasks,
});

/**
 * Synthetic demo curriculum. Not tied to any official school syllabus.
 * Phase 1 covers Math in full; other subjects get their topics in later phases.
 */
export const TOPICS: Topic[] = [
  t("math-trig", "math", "Trigonometry", 1, [], "Angles, sine, cosine and tangent.",
    ["trig-intro", "trig-sin-cos", "trig-tan"], ["trig-drag-angle"]),
  t("math-triangles", "math", "Triangles", 2, ["math-trig"], "Triangle properties and congruence.",
    ["tri-intro", "tri-congruence"], ["tri-build"]),
  t("math-unit-circle", "math", "Unit Circle", 3, ["math-trig"], "Radians and circular functions."),
  t("math-algebra", "math", "Algebra", 4, ["math-triangles"], "Expressions, equations and identities."),
  t("math-geometry", "math", "Geometry", 5, ["math-triangles"], "Shapes, area and volume."),
  t("math-graphs", "math", "Graphs", 6, ["math-algebra"], "Plotting functions."),
  t("math-coordinate", "math", "Coordinate Geometry", 7, ["math-graphs", "math-geometry"], "Points, lines and distance."),
  t("math-vectors", "math", "Vectors", 8, ["math-coordinate"], "Magnitude, direction and operations."),
  t("math-calculus", "math", "Calculus", 9, ["math-graphs", "math-unit-circle"], "Limits and rates of change."),
  t("math-prob-stats", "math", "Probability and Statistics", 10, ["math-algebra"], "Chance, mean and spread."),
  t("chem-periodic", "chemistry", "Periodic Table", 1, [], "Elements and periodic trends."),
  t("phys-kinematics", "physics", "Kinematics", 1, [], "Motion, speed and acceleration.",
    ["phys-kin-motion", "phys-kin-equations", "phys-kin-projectile"], ["phys-kin-launch"]),
  t("phys-vectors", "physics", "Vectors in Physics", 2, ["phys-kinematics"], "Adding forces and velocities.",
    ["phys-vec-intro"], ["phys-vec-add"]),
  t("phys-newton", "physics", "Newton's Laws", 3, ["phys-vectors"], "Force, mass and acceleration.",
    ["phys-newton-intro"], ["phys-newton-push"]),
  t("bio-cells", "biology", "Cells", 1, [], "Cell structure and function."),
];
