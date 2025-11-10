// netlify/functions/gc.js
exports.handler = async () => {
  // Later we can pull GameChanger data here.
  // For now we’ll just send back fake numbers so you can test.
  const data = {
    active: true,
    team: "Top Tier Indiana",
    opponent: "Bulls 10U",
    team_score: 5,
    opponent_score: 2,
    inning: "4",
    outs: 1
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  };
};
