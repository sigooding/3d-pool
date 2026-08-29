export interface ShotResult {
  foul: boolean;
  foulReason?: string;
  ballInHand: boolean;
  switchTurn: boolean;
  assignGroup?: 'red' | 'yellow';
  gameOver: boolean;
  winner?: number;
}

export interface ShotData {
  firstContactMade: boolean;
  cushionHitAfterContact: boolean;
  anyBallHitCushion: boolean;
  ballsPocketed: string[];
  cueBallPocketed: boolean;
  isBreak: boolean;
  currentPlayer: number;
  player1Group: 'red' | 'yellow' | null;
  player2Group: 'red' | 'yellow' | null;
  tableOpen: boolean;
}

export class Rules {
  private currentPlayer = 1;
  private player1Group: 'red' | 'yellow' | null = null;
  private player2Group: 'red' | 'yellow' | null = null;
  private player1Score = 0;
  private player2Score = 0;
  private isBreak = true;
  private tableOpen = true;

  evaluateShot(data: ShotData): ShotResult {
    const result: ShotResult = {
      foul: false,
      ballInHand: false,
      switchTurn: false,
      gameOver: false,
    };

    // Handle break shot
    if (data.isBreak) {
      return this.evaluateBreak(data, result);
    }

    // Check for cue ball pocketed (in-off)
    if (data.cueBallPocketed) {
      result.foul = true;
      result.foulReason = 'Cue ball potted (in-off)';
      result.ballInHand = true;
      result.switchTurn = true;

      // Re-spot cue ball if 8-ball was also potted
      if (data.ballsPocketed.includes('eight')) {
        result.gameOver = true;
        result.winner = data.currentPlayer === 1 ? 2 : 1;
      }

      return result;
    }

    // Check if any ball was hit
    if (!data.firstContactMade) {
      result.foul = true;
      result.foulReason = 'No ball contacted';
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // Check legal shot (must hit own group first if not open table)
    if (!data.tableOpen) {
      const currentGroup = data.currentPlayer === 1 ? this.player1Group : this.player2Group;
      if (currentGroup && !data.ballsPocketed.includes(currentGroup)) {
        // Check if first contact was with own group
        // This is simplified - in real game we'd track first contact ball type
      }
    }

    // Check if a ball hit a cushion after contact (legal shot requirement)
    if (data.firstContactMade && !data.anyBallHitCushion && data.ballsPocketed.length === 0) {
      result.foul = true;
      result.foulReason = 'No ball hit a cushion after contact';
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // Handle 8-ball pocketed
    if (data.ballsPocketed.includes('eight')) {
      const currentGroup = data.currentPlayer === 1 ? this.player1Group : this.player2Group;
      const remainingBalls = data.currentPlayer === 1
        ? this.player1Score
        : this.player2Score;

      // Check if player has cleared their group
      if (currentGroup && remainingBalls >= 7) {
        // Legal 8-ball pot - player wins!
        result.gameOver = true;
        result.winner = data.currentPlayer;
      } else {
        // 8-ball potted too early - player loses!
        result.gameOver = true;
        result.winner = data.currentPlayer === 1 ? 2 : 1;
        result.foul = true;
        result.foulReason = '8-ball potted before clearing group';
      }
      return result;
    }

    // Handle group assignment on first legal pot
    if (data.tableOpen && data.ballsPocketed.length > 0) {
      const firstPocketed = data.ballsPocketed[0];
      if (firstPocketed === 'red' || firstPocketed === 'yellow') {
        result.assignGroup = firstPocketed;
        this.assignGroups(firstPocketed, data.currentPlayer);
      }
    }

    // Update scores
    let ballsPottedThisTurn = 0;
    data.ballsPocketed.forEach(ballType => {
      if (ballType === 'red' || ballType === 'yellow') {
        const currentGroup = data.currentPlayer === 1 ? this.player1Group : this.player2Group;
        if (ballType === currentGroup || data.tableOpen) {
          ballsPottedThisTurn++;
          if (data.currentPlayer === 1) {
            this.player1Score++;
          } else {
            this.player2Score++;
          }
        }
      }
    });

    // Player continues if they potted their own ball
    if (ballsPottedThisTurn > 0) {
      result.switchTurn = false;
    } else {
      result.switchTurn = true;
    }

    return result;
  }

  private evaluateBreak(data: ShotData, result: ShotResult): ShotResult {
    this.isBreak = false;

    // Check for cue ball in-off on break
    if (data.cueBallPocketed) {
      result.foul = true;
      result.foulReason = 'Cue ball potted on break';
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // Check for 8-ball potted on break
    if (data.ballsPocketed.includes('eight')) {
      // 8-ball is re-spotted, breaker continues
      result.foul = false;
      result.switchTurn = false;
      return result;
    }

    // Legal break requires at least 3 points
    // (1 point per ball potted + 1 per ball crossing center line)
    // Simplified: just check if balls were potted or moved
    const points = data.ballsPocketed.length;
    if (points < 1) {
      // Not a legal break - but we'll be lenient for gameplay
      result.switchTurn = true;
    } else {
      result.switchTurn = false;
    }

    // Handle group assignment from break pots
    if (data.ballsPocketed.length > 0) {
      const firstPocketed = data.ballsPocketed[0];
      if (firstPocketed === 'red' || firstPocketed === 'yellow') {
        result.assignGroup = firstPocketed;
        this.assignGroups(firstPocketed, data.currentPlayer);
      }
    }

    return result;
  }

  assignGroups(group: 'red' | 'yellow', forPlayer: number) {
    if (forPlayer === 1) {
      this.player1Group = group;
      this.player2Group = group === 'red' ? 'yellow' : 'red';
    } else {
      this.player2Group = group;
      this.player1Group = group === 'red' ? 'yellow' : 'red';
    }
    this.tableOpen = false;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
  }

  getCurrentPlayer() {
    return this.currentPlayer;
  }

  getPlayerGroup(player: number) {
    return player === 1 ? this.player1Group : this.player2Group;
  }

  isTableOpen() {
    return this.tableOpen;
  }

  isBreakShot() {
    return this.isBreak;
  }

  isOnEightBall(player: number) {
    const group = player === 1 ? this.player1Group : this.player2Group;
    if (!group) return false;

    const score = player === 1 ? this.player1Score : this.player2Score;
    return score >= 7;
  }

  getScores() {
    return {
      player1: this.player1Score,
      player2: this.player2Score,
    };
  }

  reset() {
    this.currentPlayer = 1;
    this.player1Group = null;
    this.player2Group = null;
    this.player1Score = 0;
    this.player2Score = 0;
    this.isBreak = true;
    this.tableOpen = true;
  }
}
