export interface ShotResult {
  foul: boolean;
  foulReason?: string;
  ballInHand: boolean;
  switchTurn: boolean;
  assignGroup?: 'red' | 'yellow';
  /** 8-ball went down on the break: put it back on the foot spot. */
  respotEight?: boolean;
  gameOver: boolean;
  winner?: number;
}

export interface ShotData {
  firstContactMade: boolean;
  /** Which ball the cue ball hit first, if any. */
  firstContactType: 'cue' | 'red' | 'yellow' | 'eight' | null;
  cushionHitAfterContact: boolean;
  anyBallHitCushion: boolean;
  ballsPocketed: string[];
  cueBallPocketed: boolean;
  isBreak: boolean;
  /** Object balls that crossed the centre line during the shot. */
  ballsOverCentreLine: number;
  /** Object balls that reached a cushion during the shot. */
  ballsToCushion: number;
  currentPlayer: number;
  player1Group: 'red' | 'yellow' | null;
  player2Group: 'red' | 'yellow' | null;
  tableOpen: boolean;
}

/**
 * A break is legal when the breaker pots a ball, or drives at least this many
 * object balls to a cushion.
 */
export const LEGAL_BREAK_CUSHION_BALLS = 3;

export class Rules {
  private currentPlayer = 1;
  private player1Group: 'red' | 'yellow' | null = null;
  private player2Group: 'red' | 'yellow' | null = null;
  /** Balls of each colour that are down. Groups are decided after the break,
   *  so pots are counted by colour and mapped to a player once groups exist. */
  private potted: { red: number; yellow: number } = { red: 0, yellow: 0 };
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

    // Legal shot: the cue ball must hit one of your own balls first
    // (the 8-ball once your group is cleared, anything at all while the table is open)
    if (!data.tableOpen) {
      const currentGroup = data.currentPlayer === 1 ? this.player1Group : this.player2Group;
      if (currentGroup && data.firstContactType) {
        const target = this.isOnEightBall(data.currentPlayer) ? 'eight' : currentGroup;
        if (data.firstContactType !== target) {
          result.foul = true;
          result.foulReason = `Hit ${data.firstContactType} first - must hit ${target} first`;
          result.ballInHand = true;
          result.switchTurn = true;
          return result;
        }
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

      // Check if player has cleared their group
      if (currentGroup && this.isOnEightBall(data.currentPlayer)) {
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

    // Record every red/yellow that went down this shot
    data.ballsPocketed.forEach(ballType => {
      if (ballType === 'red' || ballType === 'yellow') {
        this.potted[ballType]++;
      }
    });

    // First legally potted ball of the game decides the groups
    if (data.tableOpen) {
      const firstPocketed = data.ballsPocketed.find(b => b === 'red' || b === 'yellow');
      if (firstPocketed === 'red' || firstPocketed === 'yellow') {
        result.assignGroup = firstPocketed;
        this.assignGroups(firstPocketed, data.currentPlayer);
      }
    }

    // Player continues if they potted a ball of their own group
    const currentGroup = this.getPlayerGroup(data.currentPlayer);
    const ownPots = data.ballsPocketed.filter(ball => ball === currentGroup).length;
    result.switchTurn = ownPots === 0;

    return result;
  }

  private evaluateBreak(data: ShotData, result: ShotResult): ShotResult {
    this.isBreak = false;

    // Balls potted on the break stay down, but they do not decide the groups.
    const pots = data.ballsPocketed.filter(b => b === 'red' || b === 'yellow').length;
    data.ballsPocketed.forEach(ballType => {
      if (ballType === 'red' || ballType === 'yellow') {
        this.potted[ballType]++;
      }
    });

    // Check for cue ball in-off on break
    if (data.cueBallPocketed) {
      result.foul = true;
      result.foulReason = 'Cue ball potted on the break';
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // 8-ball down on the break is re-spotted, it is not a foul
    if (data.ballsPocketed.includes('eight')) {
      result.respotEight = true;
    }

    if (!data.firstContactMade) {
      result.foul = true;
      result.foulReason = 'Break missed the pack';
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // Legal break: pot something, or drive enough of the pack to a cushion.
    // (Counting balls over the centre line too - see the foul message - turned
    // out to be at the mercy of how the rack happens to break open.)
    if (pots === 0 && data.ballsToCushion < LEGAL_BREAK_CUSHION_BALLS) {
      result.foul = true;
      result.foulReason =
        `Illegal break - ${pots} potted, ${data.ballsToCushion} of ` +
        `${LEGAL_BREAK_CUSHION_BALLS} balls to a cushion`;
      result.ballInHand = true;
      result.switchTurn = true;
      return result;
    }

    // Legal break: table stays open and the breaker carries on
    result.foul = false;
    result.switchTurn = false;
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

  /** Balls of the player's group that are already down. */
  getPlayerScore(player: number) {
    const group = this.getPlayerGroup(player);
    return group ? this.potted[group] : 0;
  }

  isOnEightBall(player: number) {
    const group = this.getPlayerGroup(player);
    if (!group) return false;
    return this.potted[group] >= 7;
  }

  getScores() {
    return {
      player1: this.getPlayerScore(1),
      player2: this.getPlayerScore(2),
    };
  }

  reset() {
    this.currentPlayer = 1;
    this.player1Group = null;
    this.player2Group = null;
    this.potted = { red: 0, yellow: 0 };
    this.isBreak = true;
    this.tableOpen = true;
  }
}
