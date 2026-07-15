import type {
  ArmyBalanceView,
  ArmyColor,
  EventParticipantView,
} from '../../shared/api';

export type EventParticipantRecord = EventParticipantView & {
  userId: string;
  activityXp: number;
  missionOutcome: 'notStarted' | 'failed' | 'partial' | 'success';
};

export type ArmyBalance = Record<ArmyColor, ArmyBalanceView>;

export function createEmptyArmyBalance(): ArmyBalance {
  return {
    green: { participantCount: 0, totalPower: 0 },
    blue: { participantCount: 0, totalPower: 0 },
  };
}

export function calculateArmyBalance(
  participants: readonly Pick<EventParticipantRecord, 'assignedArmy' | 'powerSnapshot'>[],
): ArmyBalance {
  const balance = createEmptyArmyBalance();

  for (const participant of participants) {
    const army = balance[participant.assignedArmy];
    army.participantCount += 1;
    army.totalPower = roundPower(army.totalPower + participant.powerSnapshot.total);
  }

  return balance;
}

export function chooseBalancedArmy(
  balance: ArmyBalance,
  nextTieArmy: ArmyColor = 'green',
): ArmyColor {
  if (balance.green.totalPower < balance.blue.totalPower) return 'green';
  if (balance.blue.totalPower < balance.green.totalPower) return 'blue';

  if (balance.green.participantCount < balance.blue.participantCount) return 'green';
  if (balance.blue.participantCount < balance.green.participantCount) return 'blue';

  return nextTieArmy;
}

export function getNextTieArmy(assignedArmy: ArmyColor): ArmyColor {
  return assignedArmy === 'green' ? 'blue' : 'green';
}

function roundPower(value: number) {
  return Math.round(value * 1_000) / 1_000;
}
