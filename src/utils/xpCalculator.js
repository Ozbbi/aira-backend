function calculateXp(correctCount, totalCount) {
  let xp = correctCount * 10;
  if (correctCount === totalCount && totalCount > 0) {
    xp += 25;
  }
  return xp;
}

function getLevelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function getXpForNextLevel(level) {
  return (level ** 2) * 50;
}

function getXpProgress(xp) {
  const currentLevel = getLevelFromXp(xp);
  const xpForCurrent = ((currentLevel - 1) ** 2) * 50;
  const xpForNext = getXpForNextLevel(currentLevel);
  const xpInCurrentLevel = xp - xpForCurrent;
  const xpNeededForNext = xpForNext - xpForCurrent;
  const percentage = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);

  return { currentLevel, xpInCurrentLevel, xpNeededForNext, percentage };
}

module.exports = { calculateXp, getLevelFromXp, getXpForNextLevel, getXpProgress };
