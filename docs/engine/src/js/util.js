export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function moveObjToStandardNotation(move) {
    return [move.from,move.to]
}
// Handle piece drop
// Utility to check if square is valid chess square (a1-h8)
export function isValidSquare(square) {
  return /^[a-h][1-8]$/.test(square);
}

export function optimisedClassRemoval(classList,class_) {
  if (classList.contains(class_)) {
    classList.remove(class_)
  }
}
export function canPromote(rank,file,piece) {
  return ((rank === 8 && file === 7) || (rank === 1 && file === 2)) && piece[1] === 'P'
}
