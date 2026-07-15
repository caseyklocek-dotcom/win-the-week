import type { Service } from "./types";
import { sectionSongIds } from "./set";

export type ReadinessLevel = "incomplete" | "warning" | "ready";
export type ReadinessIssue = {
  id: string;
  label: string;
  detail: string;
  href: string;
  severity: "blocker" | "warning";
};

export type NextAction = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export function serviceSongCount(service: Service): number {
  const ids = new Set(service.setSections.flatMap((section) => sectionSongIds(section)));
  return ids.size;
}

export function serviceReadiness(service: Service, planningCenter = false) {
  const roles = service.teams.flatMap((team) => team.roles);
  const openRoles = planningCenter ? [] : roles.filter((role) => role.status === "no");
  const awaitingRoles = planningCenter ? [] : roles.filter((role) => role.status === "wait");
  const songCount = serviceSongCount(service);
  const issues: ReadinessIssue[] = [];

  if (!service.theme.trim() && !service.scripture.trim() && !service.oneThing.trim()) {
    issues.push({
      id: "heart",
      label: "Name the heart of the service",
      detail: "Add a theme, Scripture, or the one thing you want people to carry.",
      href: "/plan?tab=pray",
      severity: "blocker",
    });
  }
  if (!service.calendarPlan?.reviewedAt) {
    issues.push({
      id: "calendar",
      label: "Review your week",
      detail: "Check your real commitments and protect preparation time.",
      href: "/calendar?review=week",
      severity: "warning",
    });
  }
  if (songCount === 0) {
    issues.push({
      id: "set",
      label: "Build the set",
      detail: "Add at least one song or service element before sharing the plan.",
      href: "/set",
      severity: "blocker",
    });
  }
  if (openRoles.length > 0) {
    issues.push({
      id: "team-open",
      label: `Fill ${openRoles.length} open ${openRoles.length === 1 ? "role" : "roles"}`,
      detail: "Everyone should know who is carrying each part of the service.",
      href: "/team",
      severity: "blocker",
    });
  }
  if (awaitingRoles.length > 0) {
    issues.push({
      id: "team-waiting",
      label: `Follow up with ${awaitingRoles.length} ${awaitingRoles.length === 1 ? "person" : "people"}`,
      detail: "Their assignments are still awaiting confirmation.",
      href: "/team",
      severity: "warning",
    });
  }
  if (service.status.prep !== "done") {
    issues.push({
      id: "prep",
      label: "Finish preparation",
      detail: "Review rehearsal, transitions, and the final details.",
      href: "/rehearse",
      severity: "warning",
    });
  }

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const level: ReadinessLevel = blockerCount > 0 ? "incomplete" : warningCount > 0 ? "warning" : "ready";

  return { level, issues, blockerCount, warningCount, songCount, openRoles, awaitingRoles };
}

export function nextServiceAction(service: Service, planningCenter = false): NextAction {
  const readiness = serviceReadiness(service, planningCenter);
  const first = readiness.issues[0];
  if (first) return { id: first.id, label: first.label, detail: first.detail, href: first.href };
  return {
    id: "share",
    label: planningCenter ? "Review the finished plan" : "Share the week",
    detail: planningCenter
      ? "Everything needed for this service is in place."
      : "The plan is ready for your team.",
    href: planningCenter ? "/plan" : "/send",
  };
}

export function readinessLabel(level: ReadinessLevel) {
  if (level === "ready") return "Ready";
  if (level === "warning") return "Ready with warnings";
  return "Incomplete";
}
