export function updateLeaderboard(leaderboard: any) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (leaderboardList) {
        leaderboardList.innerHTML = Array.from(leaderboard).map((entry: any) => `
            <div class="leaderboard-entry">
                <span class="rank">#${entry.rank}</span>
                <span class="player-name">${entry.playerName}</span>
                <span class="level">Lv.${entry.level}</span>
                <span class="score">${entry.score}</span>
            </div>
        `).join('') || '<div class="empty">排行榜暂无数据</div>';
    }
}
