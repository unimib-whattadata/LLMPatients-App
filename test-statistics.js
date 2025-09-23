// Test script to verify statistics calculation logic
function getSessionStatus(sessionNumber) {
  if (sessionNumber === 1) return "started";
  if (sessionNumber >= 11) return "completed";
  return "in-progress";
}

function calculateMetrics(sessions) {
  if (!sessions) return { inProgress: 0, completed: 0, averageProgress: 0 };
  
  // Count sessions that are either started or in-progress as "in progress"
  const inProgress = sessions.filter(s => {
    const status = getSessionStatus(s.sessionNumber);
    return status === "in-progress" || status === "started";
  }).length;
  const completed = sessions.filter(s => getSessionStatus(s.sessionNumber) === "completed").length;
  const averageProgress = Math.round(
    sessions.reduce((acc, session) => acc + (session.sessionNumber / 11) * 100, 0) / sessions.length
  );
  
  return { inProgress, completed, averageProgress };
}

// Test with current data
const testSessions = [
  { sessionNumber: 1 }
];

const metrics = calculateMetrics(testSessions);
console.log("Test Results:");
console.log("Sessions:", testSessions);
console.log("Session 1 status:", getSessionStatus(1));
console.log("Metrics:", metrics);

// Test with different scenarios
console.log("\n--- Different Scenarios ---");

const scenarios = [
  { name: "Only started sessions", sessions: [{ sessionNumber: 1 }, { sessionNumber: 1 }] },
  { name: "Mixed progress", sessions: [{ sessionNumber: 1 }, { sessionNumber: 5 }, { sessionNumber: 10 }] },
  { name: "Completed sessions", sessions: [{ sessionNumber: 11 }, { sessionNumber: 11 }] },
  { name: "All types", sessions: [{ sessionNumber: 1 }, { sessionNumber: 5 }, { sessionNumber: 11 }] }
];

scenarios.forEach(scenario => {
  const result = calculateMetrics(scenario.sessions);
  console.log(`\n${scenario.name}:`);
  console.log("  Sessions:", scenario.sessions.map(s => `#${s.sessionNumber}(${getSessionStatus(s.sessionNumber)})`).join(", "));
  console.log("  Metrics:", result);
});
