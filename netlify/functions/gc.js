// netlify/functions/gc.js

exports.handler = async () => {
  try {
    // 1. Put your real TEAM url here
    // Example: https://web.gc.com/teams/123abc456
    const TEAM_URL = https://web.gc.com/teams/jwYFGs2kbEme/2026-winter-test-gc-10u;

    // 2. Fetch the team page
    const resp = await fetch(TEAM_URL);
    const html = await resp.text();

    // 3. Find the big JSON blob GC puts in the page
    const startTag = '<script id="__NEXT_DATA__" type="application/json">';
    const startIndex = html.indexOf(startTag);
    if (startIndex === -1) {
      return noGame("Could not find GC data on team page");
    }
    const endIndex = html.indexOf("</script>", startIndex);
    const jsonText = html.substring(startIndex + startTag.length, endIndex);
    const gcData = JSON.parse(jsonText);

    // Try to get where GC put the team data
    const pageProps =
      gcData?.props?.pageProps ||
      gcData?.pageProps ||
      gcData?.props ||
      {};

    // This is the part that can vary. We try several names.
    const games =
      pageProps.games ||
      pageProps.schedule ||
      pageProps.teamSchedule ||
      pageProps.events ||
      [];

    if (!Array.isArray(games) || games.length === 0) {
      return noGame("No games found for team");
    }

    // Define what we consider live and what we consider final
    const LIVE_STATUS = ["live", "in_progress", "in-progress", "started"];
    const FINAL_STATUS = ["final", "completed", "complete", "finished"];

    // Helper to read a status safely
    const getStatus = (g) =>
      (g.status || g.gameStatus || g.state || "").toLowerCase();

    // 4. First try to find a live game
    let chosen = games.find((g) => {
      const s = getStatus(g);
      return LIVE_STATUS.some((ls) => s.includes(ls));
    });

    // 5. If no live game, find the most recent final game
    if (!chosen) {
      // Filter to only final games
      const finals = games.filter((g) => {
        const s = getStatus(g);
        return FINAL_STATUS.some((fs) => s.includes(fs));
      });

      if (finals.length > 0) {
        // Sort finals by start or date so the newest is first
        finals.sort((a, b) => {
          const ta = new Date(a.startTime || a.gameTime || a.date || 0).getTime();
          const tb = new Date(b.startTime || b.gameTime || b.date || 0).getTime();
          return tb - ta;
        });
        chosen = finals[0];
      }
    }

    // 6. If still nothing, fall back to the latest game of any kind
    if (!chosen) {
      games.sort((a, b) => {
        const ta = new Date(a.startTime || a.gameTime || a.date || 0).getTime();
        const tb = new Date(b.startTime || b.gameTime || b.date || 0).getTime();
        return tb - ta;
      });
      chosen = games[0];
    }

    if (!chosen) {
      return noGame();
    }

    // 7. Pull data out of the chosen game
    const homeName =
      chosen.homeTeamName ||
      chosen.home_team_name ||
      chosen.homeTeam ||
      chosen.home ||
      "Home";

    const awayName =
      chosen.awayTeamName ||
      chosen.away_team_name ||
      chosen.awayTeam ||
      chosen.away ||
      "Away";

    const homeScore =
      chosen.homeTeamScore ??
      chosen.home_score ??
      chosen.homeScore ??
      chosen.homeRuns ??
      0;

    const awayScore =
      chosen.awayTeamScore ??
      chosen.away_score ??
      chosen.awayScore ??
      chosen.awayRuns ??
      0;

    const inning =
      chosen.inning ||
      chosen.currentInning ||
      chosen.gameInning ||
      "";
    const outs =
      chosen.outs ||
      chosen.currentOuts ||
      0;

    const isLive = (() => {
      const s = getStatus(chosen);
      return LIVE_STATUS.some((ls) => s.includes(ls));
    })();

    const isFinal = (() => {
      const s = getStatus(chosen);
      return FINAL_STATUS.some((fs) => s.includes(fs));
    })();

    const data = {
      active: isLive || isFinal,
      // your page shows "opponent at team" so we make home the team
      team: homeName,
      opponent: awayName,
      team_score: homeScore,
      opponent_score: awayScore,
      inning: isFinal ? "Final" : inning || "",
      outs: isFinal ? 0 : outs
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return noGame(err.message);
  }
};

function noGame(message = "No live game") {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      active: false,
      message
    })
  };
}
