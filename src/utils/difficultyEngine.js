function pickDifficulty(user) {
  const level = user.level || 1;
  let minD, maxD;

  if (level <= 2) { minD = 1; maxD = 2; }
  else if (level <= 5) { minD = 2; maxD = 3; }
  else if (level <= 10) { minD = 3; maxD = 4; }
  else { minD = 4; maxD = 5; }

  // Adjust based on recent accuracy
  const history = user.accuracyHistory || [];
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    const avg = lastThree.reduce((a, b) => a + b, 0) / lastThree.length;

    if (avg < 60) {
      minD = Math.max(1, minD - 1);
      maxD = Math.max(1, maxD - 1);
    } else if (avg > 90) {
      minD = Math.min(5, minD + 1);
      maxD = Math.min(5, maxD + 1);
    }
  }

  return { minDifficulty: minD, maxDifficulty: maxD };
}

module.exports = { pickDifficulty };
