import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;

const doctrineSource = readFileSync(resolve(root, 'src/server/core/doctrines.ts'), 'utf8');
const sharedSource = readFileSync(resolve(root, 'src/shared/api.ts'), 'utf8');
const resolverSource = readFileSync(resolve(root, 'src/server/core/resolver.ts'), 'utf8');
const commentSignalSource = readFileSync(resolve(root, 'src/server/core/commentSignals.ts'), 'utf8');
const territorySource = readFileSync(resolve(root, 'src/server/core/territories.ts'), 'utf8');
const campaignReportSource = readFileSync(resolve(root, 'src/server/core/campaignReport.ts'), 'utf8');
const dailyCycleSource = readFileSync(resolve(root, 'src/server/core/dailyCycle.ts'), 'utf8');
const participationSource = readFileSync(resolve(root, 'src/server/core/eventParticipation.ts'), 'utf8');
const progressionSource = readFileSync(resolve(root, 'src/server/core/playerProgression.ts'), 'utf8');
const progressionRulesSource = readFileSync(resolve(root, 'src/server/core/playerProgressionRules.ts'), 'utf8');
const rankSource = readFileSync(resolve(root, 'src/server/core/playerRanks.ts'), 'utf8');
const apiRouteSource = readFileSync(resolve(root, 'src/server/routes/api.ts'), 'utf8');
const schedulerSource = readFileSync(resolve(root, 'src/server/routes/scheduler.ts'), 'utf8');
const devvitConfig = JSON.parse(readFileSync(resolve(root, 'devvit.json'), 'utf8'));
const gameSource = readFileSync(resolve(root, 'src/client/game.ts'), 'utf8');
const gameHtmlSource = readFileSync(resolve(root, 'src/client/game.html'), 'utf8');
const gameSceneSource = readFileSync(resolve(root, 'src/client/scenes/Game.ts'), 'utf8');
const preloaderSource = readFileSync(resolve(root, 'src/client/scenes/Preloader.ts'), 'utf8');
const dailyCycleDocSource = readFileSync(resolve(root, '../docs/daily_event_cycle_ru.md'), 'utf8');
const battlefieldLocationSource = readFileSync(
  resolve(root, 'src/client/battlefieldLocations.ts'),
  'utf8',
);
const battlefieldLocations = JSON.parse(readFileSync(
  resolve(root, 'src/client/battlefield-locations.json'),
  'utf8',
));

const doctrineIds = ['STRIKE', 'HACK', 'VIRUS', 'PHANTOM', 'SHIELD', 'OVERLOAD', 'TRAP'];

for (const doctrineId of doctrineIds) {
  assert(sharedSource.includes(`"${doctrineId}"`), `shared contract is missing ${doctrineId}`);
  assert(doctrineSource.includes(`${doctrineId}: {`), `doctrine definition is missing ${doctrineId}`);
  assert(commentSignalSource.includes(`${doctrineId}: [`), `comment keyword mapping is missing ${doctrineId}`);
}

assert(sharedSource.includes('MVP_GAME_LOOP_STEPS'), 'MVP loop contract is missing');
assert(sharedSource.includes('type OrderRequest'), 'order request contract is missing');
assert(
  sharedSource.includes('sourceCommentId: string') &&
    apiRouteSource.includes("api.get('/eligible-comments'") &&
    dailyCycleSource.includes('loadEligibleComments(') &&
    gameSource.includes("fetch('/api/eligible-comments')"),
  'orders must require a server-validated teammate comment',
);
assert(sharedSource.includes('type BattleResultView'), 'battle result contract is missing');
assert(
  sharedSource.includes('type PersonalBattleRewardView') &&
    progressionSource.includes('newMedals') &&
    dailyCycleSource.includes('getProgressionLedgerEntry(') &&
    gameSource.includes('daily-reward__breakdown'),
  'daily report must expose the authoritative personal progression ledger',
);
assert(
  sharedSource.includes('type DailyLeaderboardResponse') &&
    dailyCycleSource.includes('getDailyLeaderboard(') &&
    apiRouteSource.includes("api.get('/battles/:battleId/leaderboard'") &&
    gameSource.includes('renderDailyLeaderboard('),
  'resolved daily battles must expose a paginated player leaderboard',
);
assert(
  sharedSource.includes('type PublicPlayerProfileResponse') &&
    dailyCycleSource.includes('getPublicPlayerProfile(') &&
    apiRouteSource.includes("api.get('/profiles/:username'") &&
    gameSource.includes("searchParams.get('profile')"),
  'public player profiles must have a shareable safe read model',
);
assert(
  sharedSource.includes('type SpySuspicionResponse') &&
    dailyCycleSource.includes('submitSpySuspicion(') &&
    dailyCycleSource.includes('getSpySuspicionLockKey(') &&
    apiRouteSource.includes("api.post('/spy/suspicions'") &&
    gameSource.includes('renderCounterintelligence('),
  'counterintelligence must be a private immutable battle-local action',
);
assert(
  sharedSource.includes('type PublicBattleResultResponse') &&
    dailyCycleSource.includes('getPublicBattleResult(') &&
    apiRouteSource.includes("api.get('/battles/:battleId/result'") &&
    gameSource.includes('renderPublicBattleResult('),
  'territory history must link to a public resolved battle report',
);
assert(
  sharedSource.includes('warRoomPermalinks') &&
    dailyCycleSource.includes('warRoomPermalinks: warRoom.threadPermalinks') &&
    gameSource.includes('renderBattleBriefing(') &&
    gameSource.includes('getBattlefieldLocation(territory, null).image'),
  'daily command center must show the exact battlefield and team war-room route',
);
assert(
  gameSource.includes('openDoctrineCodex()') &&
    gameSource.includes('/assets/doctrine-counters-pixel.png'),
  'the seven-doctrine codex must be accessible from the battle interface',
);
assert(
  sharedSource.includes('type GlobalLeaderboardResponse') &&
    dailyCycleSource.includes('getGlobalLeaderboard(') &&
    apiRouteSource.includes("api.get('/leaderboard/global'") &&
    gameSource.includes('renderGlobalLeaderboard()'),
  'career progression must have an accessible global leaderboard',
);
assert(resolverSource.includes('getDoctrineMatchup'), 'resolver does not use doctrine matchups');
assert(resolverSource.includes('getDominantDoctrine'), 'resolver does not choose dominant doctrine');
assert(resolverSource.includes('doctrine-tie'), 'equal doctrine votes do not use a battle-seed tie-break');
assert(resolverSource.includes('applyTerritoryWinner'), 'resolver does not update territory owner');
assert(!resolverSource.toLowerCase().includes('captain'), 'resolver must not depend on a captain');
assert(sharedSource.includes('type GlobalAffiliation = "gray"'), 'global player affiliation must be gray');
assert(sharedSource.includes('type EventParticipantView'), 'event participant contract is missing');
assert(participationSource.includes('chooseBalancedArmy'), 'balanced assignment policy is missing');
assert(participationSource.includes('totalPower'), 'army power totals are not calculated');
assert(dailyCycleSource.includes("affiliation: 'gray'"), 'stored player is not globally neutral');
assert(dailyCycleSource.includes('assignPlayerToDailyEvent'), 'daily event assignment is not wired');
assert(
  dailyCycleSource.includes('getParticipantFlairArmy'),
  'participant and spy cover flair selection is not centralized',
);
assert(
  dailyCycleSource.includes('coverArmy') && dailyCycleSource.includes('accepted: true'),
  'spy cover assignment is not activated automatically',
);
assert(
  !apiRouteSource.includes("api.post('/spy/respond'"),
  'daily cycle must not require a separate spy acceptance stage',
);
assert(
  !dailyCycleSource.includes('createIndexCommentText') &&
    !apiRouteSource.includes('createIndexCommentText'),
  'daily posts must not create a distribution/index comment',
);
assert(
  dailyCycleSource.includes('aiThread.distinguish(true)') &&
    apiRouteSource.includes('aiThread.distinguish(true)'),
  'the AI branch must be the pinned war-room comment',
);
assert(
  dailyCycleSource.includes('getRedditCommentTargetId(resultThreadId)'),
  'the daily result must be posted inside the AI branch',
);
assert(
  dailyCycleSource.includes('PENDING_FLAIR_SYNCS_KEY') &&
    dailyCycleSource.includes('retryPendingPlayerFlairs') &&
    dailyCycleSource.includes('getDesiredPlayerFlair') &&
    dailyCycleSource.includes('redis.hScan'),
  'failed flair changes must have a durable retry queue',
);
assert(
  !dailyCycleSource.includes('withRedditRateLimitRetry(() => reddit.setUserFlair'),
  'join must not block on long Reddit flair rate-limit sleeps',
);
assert(
  dailyCycleSource.indexOf('await saveResolvedBattleState(') <
    dailyCycleSource.indexOf('await resetParticipantFlairs('),
  'resolved state must be authoritative before neutral flair reconciliation',
);
assert(
  dailyCycleSource.includes('transaction.hSet(PENDING_FLAIR_SYNCS_KEY'),
  'resolved battle state and neutral flair tasks must be persisted atomically',
);
assert(
  schedulerSource.includes("scheduler.post('/retry-player-flairs'") &&
    devvitConfig.scheduler.tasks['retry-player-flairs']?.cron === '*/10 * * * *',
  'flair retry scheduler is not configured',
);
assert(
  schedulerSource.includes("scheduler.post('/reconcile-daily-cycle'") &&
    schedulerSource.includes('reconcileDailyCycle(now)') &&
    devvitConfig.scheduler.tasks['reconcile-daily-cycle']?.cron === '*/5 * * * *',
  'daily-cycle recovery must resolve an overdue battle before creating the next one',
);
assert(
  dailyCycleSource.includes('has not reached its resolution time'),
  'the resolver must not close a newly created battle before its cutoff',
);
assert(!gameSceneSource.includes('paperwork'), 'client preparation/paperwork stage is still present');
assert(!preloaderSource.includes('paper-blank'), 'removed preparation assets are still preloaded');
assert(
  !progressionSource.includes('STATUS_LABELS'),
  'temporary flair must not expose preparation/order statuses',
);
assert(
  dailyCycleDocSource.includes('ровно три верхнеуровневых комментария'),
  'canonical daily-cycle documentation is not updated',
);
assert(dailyCycleSource.includes('DAILY_EVENTS_KEY'), 'daily event history index is missing');
assert(dailyCycleSource.includes('TERRITORY_CAPTURES_KEY'), 'territory capture history is missing');
assert(sharedSource.includes('type GlobalMapResponse'), 'global map response contract is missing');
assert(dailyCycleSource.includes('getGlobalMapResponse'), 'global map read model is missing');
assert(dailyCycleSource.includes('ownershipChanged'), 'daily occupation status is not recorded');
assert(
  !dailyCycleSource.includes('if (!captureRecord)'),
  'daily occupation records must not be skipped when control is retained',
);
assert(
  dailyCycleSource.includes('saveResolvedBattleState'),
  'resolved battle and territory state are not persisted together',
);
assert(
  dailyCycleSource.includes('app:pending_resolution:') &&
    dailyCycleSource.includes('getOrCreatePendingBattleResolution({') &&
    dailyCycleSource.includes('exactBody: resultBody') &&
    dailyCycleSource.includes('authorName: resultThread.authorName'),
  'resolution retry must reuse one authoritative result and one official Reddit report',
);
assert(
  !dailyCycleSource.includes('transaction.set(CURRENT_BATTLE_KEY'),
  'resolving an old event must not overwrite the current event pointer',
);
assert(
  dailyCycleSource.includes("const CAMPAIGN_STATE_KEY = 'app:campaign_state'"),
  'completed campaign state must use a durable Redis key',
);
assert(
  dailyCycleSource.includes('selectCampaignTransition({'),
  'daily resolution must select and persist a campaign transition',
);
assert(
  dailyCycleSource.includes('NEXT OBJECTIVE //'),
  'daily result report must announce the next territory objective',
);
const createNextDailyBattleStart = dailyCycleSource.indexOf(
  'export async function createNextDailyBattle',
);
const ensureDailyBattleStart = dailyCycleSource.indexOf(
  'export async function ensureDailyBattle',
  createNextDailyBattleStart,
);
const createNextDailyBattleSource = dailyCycleSource.slice(
  createNextDailyBattleStart,
  ensureDailyBattleStart,
);
const campaignCompletionGate = createNextDailyBattleSource.indexOf(
  'const completedCampaign = await recoverCompletedCampaignState(now)',
);
const campaignReportRecovery = createNextDailyBattleSource.indexOf(
  'await ensureCampaignFinalReport(completedCampaign)',
  campaignCompletionGate,
);
const dailyPostSubmission = createNextDailyBattleSource.indexOf('reddit.submitCustomPost({');
assert(
  createNextDailyBattleStart >= 0 &&
    ensureDailyBattleStart > createNextDailyBattleStart &&
    campaignCompletionGate >= 0 &&
    campaignReportRecovery >= 0 &&
    dailyPostSubmission >= 0 &&
    campaignReportRecovery < dailyPostSubmission,
  'campaign completion and final-report recovery must gate daily Reddit post creation',
);
assert(
  dailyCycleSource.includes("from './campaignReport'") &&
    dailyCycleSource.includes('buildCampaignAggregate(') &&
    dailyCycleSource.includes('createCampaignNarrativePrompt(') &&
    dailyCycleSource.includes('createCampaignReportPublication('),
  'daily cycle must build and publish the final report through the campaign report module',
);
assert(apiRouteSource.includes("api.get('/global-map'"), 'global map API route is missing');
assert(gameSource.includes("fetch('/api/global-map')"), 'global map UI is not connected to the API');
assert(gameHtmlSource.includes('/assets/maps/world.webp'), 'global map image is not rendered in the UI');
assert(
  battlefieldLocationSource.includes('locationsById.get(territory.id)'),
  'daily battlefield does not use the exact global cell id',
);
assert(battlefieldLocations.length === 30, 'daily battlefield manifest must contain 30 locations');
assert(
  existsSync(resolve(root, 'public/assets/maps/world.webp')),
  'global world map asset is missing',
);
assert(dailyCycleSource.includes('saveParticipantProgression'), 'daily progression persistence is missing');
assert(progressionSource.includes('calculateDailyXp'), 'progression does not use progression rules');
assert(progressionSource.includes('getRankLevelForXp'), 'player power does not use rank rules');
assert(progressionRulesSource.includes('RANK_XP_THRESHOLDS'), 'rank XP thresholds are missing');
assert(rankSource.match(/emojiName: 'hva_rank_/g)?.length === 48, 'player rank list must contain 48 ranks');
assert(!resolverSource.includes('rewards:'), 'battle resolver must not own player progression');

const participation = await import(createTypeScriptModuleUrl(
  participationSource,
  'balanced assignment module',
));
const balance = participation.calculateArmyBalance([
  { assignedArmy: 'green', powerSnapshot: { total: 7 } },
  { assignedArmy: 'blue', powerSnapshot: { total: 2 } },
]);
assert(balance.green.totalPower === 7, 'green power total is incorrect');
assert(balance.blue.totalPower === 2, 'blue power total is incorrect');
assert(participation.chooseBalancedArmy(balance, 'green') === 'blue', 'weaker army must receive the player');
assert(
  participation.chooseBalancedArmy({
    green: { participantCount: 2, totalPower: 3 },
    blue: { participantCount: 1, totalPower: 3 },
  }, 'green') === 'blue',
  'lower participant count must break an equal-power tie',
);
assert(
  participation.chooseBalancedArmy({
    green: { participantCount: 1, totalPower: 3 },
    blue: { participantCount: 1, totalPower: 3 },
  }, 'blue') === 'blue',
  'deterministic tie rotation is not respected',
);

const rankModuleUrl = createTypeScriptModuleUrl(rankSource, 'player rank module');
const progressionRulesModuleUrl = createTypeScriptModuleUrl(
  progressionRulesSource.replaceAll("'./playerRanks'", `'${rankModuleUrl}'`),
  'progression rules module',
);
const progression = await import(createTypeScriptModuleUrl(
  progressionSource
    .replaceAll("'./playerRanks'", `'${rankModuleUrl}'`)
    .replaceAll("'./playerProgressionRules'", `'${progressionRulesModuleUrl}'`),
  'player progression module',
));
assert(progression.getPlayerPowerForXp(0).total === 1, 'rank 1 power is incorrect');
assert(progression.getPlayerPowerForXp(25).rankLevel === 2, 'rank thresholds do not affect player power');
const progressionUpdate = progression.applyDailyProgression({
  battleId: 'battle:test',
  userId: 'user:test',
  battleDate: '2026-07-14',
  appliedAt: '2026-07-14T21:00:00.000Z',
  activityXp: 0,
  divisionResult: 'victory',
  missionOutcome: 'notStarted',
  territoryCaptured: false,
});
assert(progressionUpdate.rewards.xp === 48, 'daily XP rules are not applied to player rewards');
assert(progressionUpdate.progression.totalParticipatedEvents === 1, 'participation history is not updated');
assert(progressionUpdate.ledger.xpAwarded === 48, 'progression ledger is inconsistent');
assert(progression.createPlayerFlair({}).text.includes('Gray'), 'default global flair is not neutral gray');
assert(
  progression.createPlayerFlair({ army: 'green' }).backgroundColor === '#178c45',
  'green participant flair color is incorrect',
);
assert(
  progression.createPlayerFlair({ army: 'blue' }).backgroundColor === '#2475d1',
  'blue participant flair color is incorrect',
);

const territories = await import(createTypeScriptModuleUrl(
  territorySource,
  'global territory module',
));
assert(territories.TERRITORIES.length === 30, 'global map must contain exactly 30 territories');
assert(
  new Set(territories.TERRITORIES.map((territory) => territory.id)).size === 30,
  'global territory ids must be unique',
);
assert(
  territories.TERRITORIES.every((territory) => (
    territory.column >= 1 &&
    territory.column <= 6 &&
    territory.row >= 1 &&
    territory.row <= 5
  )),
  'global territories must stay inside the 6 by 5 map',
);
assert(
  territories.getTerritoryById('signal-tower-7').id === 'c02-r02',
  'legacy territory ids must resolve to canonical cells',
);
assert(
  territories.selectActiveTerritory('battle:2026-07-15').id !==
    territories.selectActiveTerritory('battle:2026-07-16').id,
  'daily events must rotate to a new global cell',
);

assert(
  territories.getManhattanDistance(
    territories.getTerritoryById('c01-r01'),
    territories.getTerritoryById('c06-r05'),
  ) === 9,
  'Manhattan distance must use global-map rows and columns',
);
assert(
  territoryIds(territories.getOrthogonalNeighbors(
    territories.getTerritoryById('c01-r01'),
  )) === 'c01-r02,c02-r01',
  'corner cells must expose only two orthogonal neighbors',
);
assert(
  territoryIds(territories.getOrthogonalNeighbors(
    territories.getTerritoryById('c01-r03'),
  )) === 'c01-r02,c01-r04,c02-r03',
  'edge cells must expose three neighbors without horizontal wrap-around',
);
assert(
  territoryIds(territories.getOrthogonalNeighbors(
    territories.getTerritoryById('c03-r03'),
  )) === 'c02-r03,c03-r02,c03-r04,c04-r03',
  'center cells must expose four orthogonal neighbors',
);

const contestedInitialMap = createTerritorySnapshot('ai', {
  'c01-r01': 'green',
  'c02-r02': 'contested',
  'c05-r04': 'contested',
  'c06-r05': 'blue',
});
const contestedInitialTarget = territories.selectInitialTerritory(
  contestedInitialMap,
  'battle:initial-seed',
);
const repeatedContestedInitialTarget = territories.selectInitialTerritory(
  contestedInitialMap,
  'battle:initial-seed',
);
assert(
  contestedInitialTarget?.reason === 'unoccupied' &&
    contestedInitialTarget.territory.owner === 'contested' &&
    contestedInitialTarget.territory.id === repeatedContestedInitialTarget?.territory.id,
  'initial selection must prefer unoccupied cells and be deterministic',
);

const occupiedInitialMap = createTerritorySnapshot('ai', {
  'c01-r01': 'green',
  'c06-r05': 'blue',
});
const occupiedInitialTarget = territories.selectInitialTerritory(
  occupiedInitialMap,
  'battle:legacy-seed',
);
const repeatedOccupiedInitialTarget = territories.selectInitialTerritory(
  occupiedInitialMap,
  'battle:legacy-seed',
);
assert(
  occupiedInitialTarget?.reason === 'attack-human' &&
    ['green', 'blue'].includes(occupiedInitialTarget.territory.owner) &&
    occupiedInitialTarget.territory.id === repeatedOccupiedInitialTarget?.territory.id,
  'legacy initial selection must fall back to a deterministic human territory',
);

const closestUnoccupiedTransition = territories.selectCampaignTransition({
  battleId: 'battle:closest-unoccupied',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'green',
  activeTerritory: territoryWithOwner('c03-r03', 'green'),
  territories: createTerritorySnapshot('green', {
    'c03-r02': 'contested',
    'c05-r03': 'contested',
  }),
});
assert(
  closestUnoccupiedTransition.type === 'next-target' &&
    closestUnoccupiedTransition.target.reason === 'unoccupied' &&
    closestUnoccupiedTransition.target.territory.id === 'c03-r02' &&
    closestUnoccupiedTransition.target.distance === 1,
  'the closest unoccupied Manhattan ring must be selected first',
);

const humanAiPriorityTransition = territories.selectCampaignTransition({
  battleId: 'battle:human-ai-priority',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'green',
  activeTerritory: territoryWithOwner('c03-r03', 'green'),
  territories: createTerritorySnapshot('green', {
    'c03-r02': 'blue',
    'c04-r03': 'ai',
  }),
});
assert(
  humanAiPriorityTransition.type === 'next-target' &&
    humanAiPriorityTransition.target.reason === 'attack-ai' &&
    humanAiPriorityTransition.target.territory.id === 'c04-r03' &&
    humanAiPriorityTransition.target.distance === 1,
  'humans must prefer AI inside the nearest opponent ring',
);

const humanNearestRingTransition = territories.selectCampaignTransition({
  battleId: 'battle:human-nearest-ring',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'green',
  activeTerritory: territoryWithOwner('c03-r03', 'green'),
  territories: createTerritorySnapshot('green', {
    'c03-r02': 'blue',
    'c05-r03': 'ai',
  }),
});
assert(
  humanNearestRingTransition.type === 'next-target' &&
    humanNearestRingTransition.target.reason === 'attack-rival-human' &&
    humanNearestRingTransition.target.territory.id === 'c03-r02' &&
    humanNearestRingTransition.target.distance === 1,
  'humans must exhaust the nearest opponent ring before attacking farther AI cells',
);

const aiNearestHumanTransition = territories.selectCampaignTransition({
  battleId: 'battle:ai-nearest-human',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'ai',
  activeTerritory: territoryWithOwner('c03-r03', 'ai'),
  territories: createTerritorySnapshot('ai', {
    'c03-r02': 'green',
    'c05-r03': 'blue',
  }),
});
assert(
  aiNearestHumanTransition.type === 'next-target' &&
    aiNearestHumanTransition.target.reason === 'attack-human' &&
    aiNearestHumanTransition.target.territory.id === 'c03-r02' &&
    aiNearestHumanTransition.target.distance === 1,
  'AI must target the nearest human-controlled ring',
);

const deterministicTieInput = {
  battleId: 'battle:equal-distance-seed',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'ai',
  activeTerritory: territoryWithOwner('c03-r03', 'ai'),
  territories: createTerritorySnapshot('ai', {
    'c02-r03': 'green',
    'c03-r02': 'blue',
    'c03-r04': 'green',
    'c04-r03': 'blue',
  }),
};
const deterministicTieTarget = territories.selectCampaignTransition(deterministicTieInput);
const repeatedDeterministicTieTarget = territories.selectCampaignTransition(deterministicTieInput);
assert(
  deterministicTieTarget.type === 'next-target' &&
    repeatedDeterministicTieTarget.type === 'next-target' &&
    deterministicTieTarget.target.territory.id === repeatedDeterministicTieTarget.target.territory.id &&
    deterministicTieTarget.target.distance === 1,
  'equal-distance candidates must use a retry-safe deterministic seed',
);

const drawTerritory = territoryWithOwner('c03-r03', 'blue');
const drawTransition = territories.selectCampaignTransition({
  battleId: 'battle:draw-retry',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'draw',
  activeTerritory: drawTerritory,
  territories: createTerritorySnapshot('green', {
    'c03-r03': 'blue',
    'c06-r05': 'ai',
  }),
});
assert(
  territories.applyTerritoryWinner(drawTerritory, 'draw').owner === 'blue' &&
    drawTransition.type === 'next-target' &&
    drawTransition.target.reason === 'retry-draw' &&
    drawTransition.target.territory.id === drawTerritory.id &&
    drawTransition.target.territory.owner === 'blue' &&
    drawTransition.target.distance === 0,
  'a draw must preserve ownership and retry the same territory',
);

const twentyNineOfThirtyTransition = territories.selectCampaignTransition({
  battleId: 'battle:twenty-nine-of-thirty',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'green',
  activeTerritory: territoryWithOwner('c03-r03', 'green'),
  territories: createTerritorySnapshot('green', {
    'c06-r05': 'contested',
  }),
});
assert(
  twentyNineOfThirtyTransition.type === 'next-target' &&
    twentyNineOfThirtyTransition.target.territory.id === 'c06-r05',
  '29 of 30 controlled cells must not complete the campaign',
);

const completedCampaignTransition = territories.selectCampaignTransition({
  battleId: 'battle:thirty-of-thirty',
  completedAt: '2026-07-15T21:00:00.000Z',
  winner: 'green',
  activeTerritory: territoryWithOwner('c03-r03', 'blue'),
  territories: createTerritorySnapshot('green', {
    'c03-r03': 'blue',
  }),
});
assert(
  completedCampaignTransition.type === 'campaign-complete' &&
    completedCampaignTransition.completion.winner === 'green' &&
    completedCampaignTransition.completion.finalBattleId === 'battle:thirty-of-thirty' &&
    completedCampaignTransition.completion.report.status === 'pending',
  '30 of 30 controlled cells must complete the campaign with a pending final report',
);

const sharedModuleUrl = createTypeScriptModuleUrl(sharedSource, 'shared API module');
const campaignReport = await import(createTypeScriptModuleUrl(
  campaignReportSource.replaceAll("'../../shared/api'", `'${sharedModuleUrl}'`),
  'campaign report module',
));
const campaignBattles = [
  createCampaignBattle({
    id: 'battle:2026-07-02',
    battleDate: '2026-07-02',
    winner: 'blue',
    territoryId: 'c03-r03',
    previousOwner: 'green',
    newOwner: 'blue',
  }),
  createCampaignBattle({
    id: 'battle:2026-07-01',
    battleDate: '2026-07-01',
    winner: 'green',
    territoryId: 'c02-r02',
    previousOwner: 'contested',
    newOwner: 'green',
  }),
];
const aggregateFixture = {
  winner: 'blue',
  completedAt: '2026-07-02T21:00:00.000Z',
  battles: [
    ...campaignBattles,
    campaignBattles[1],
    createCampaignBattle({
      id: 'battle:2026-07-01-retry',
      battleDate: '2026-07-01',
      winner: 'ai',
      territoryId: 'c02-r02',
      previousOwner: 'green',
      newOwner: 'ai',
    }),
  ],
  captures: [],
  participants: [
    { battleId: 'battle:2026-07-01', userId: 'internal-user-1' },
    { battleId: 'battle:2026-07-01', userId: 'internal-user-2' },
    { battleId: 'battle:2026-07-01', userId: 'internal-user-1' },
    { battleId: 'battle:2026-07-02', userId: 'internal-user-1' },
    { battleId: 'battle:2026-07-02', userId: 'internal-user-3' },
    { battleId: 'battle:ignored', userId: 'internal-user-4' },
  ],
  orders: [
    createCampaignOrder('battle:2026-07-01', 'internal-user-1'),
    createCampaignOrder('battle:2026-07-01', 'internal-user-1'),
    createCampaignOrder('battle:2026-07-02', 'internal-user-1'),
    createCampaignOrder('battle:2026-07-02', 'internal-user-3'),
    createCampaignOrder('battle:ignored', 'internal-user-4'),
  ],
  players: [
    createCampaignPlayer('internal-user-1', 'Alpha', 100, 1, 2),
    createCampaignPlayer('internal-user-2', 'Bravo', 50, 0, 1),
    createCampaignPlayer('internal-user-3', undefined, 0, 0, 1),
  ],
};
const campaignAggregate = campaignReport.buildCampaignAggregate(aggregateFixture);
assert(
  campaignAggregate.resolvedDays === 2 &&
    campaignAggregate.timeline.map((day) => day.date).join(',') === '2026-07-01,2026-07-02' &&
    campaignAggregate.winnerCounts.green === 1 &&
    campaignAggregate.winnerCounts.blue === 1 &&
    campaignAggregate.territory.captures === 2 &&
    campaignAggregate.territory.recaptures === 1,
  'campaign report must aggregate each resolved day exactly once in date order',
);
assert(
  campaignAggregate.players.registeredProfiles === 3 &&
    campaignAggregate.players.uniqueParticipants === 3 &&
    campaignAggregate.players.uniqueSubmitters === 2 &&
    campaignAggregate.players.totalParticipations === 4 &&
    campaignAggregate.players.totalOrders === 3 &&
    campaignAggregate.timeline[0].participants === 2 &&
    campaignAggregate.timeline[0].submitters === 1 &&
    campaignAggregate.timeline[1].participants === 2 &&
    campaignAggregate.timeline[1].submitters === 2,
  'campaign report participation and submission totals are incorrect',
);
const campaignSummary = campaignReport.renderCampaignSummaryMarkdown(campaignAggregate);
assert(
  campaignSummary.includes('**Territory gains by side:** Green 1 · Blue 1 · AI 0') &&
    campaignSummary.includes('**XP distribution:**') &&
    campaignSummary.includes('**Streak distribution:**'),
  'campaign report must publish side captures plus XP and streak distributions',
);

const leaderboardPlayers = [
  createCampaignPlayer('internal-secret-xp', 'xp_first', 201, 0, 0),
  createCampaignPlayer('internal-secret-victories', 'victory_first', 200, 5, 1),
  createCampaignPlayer('internal-secret-events', 'event_first', 200, 4, 9),
  createCampaignPlayer('internal-secret-alpha', 'Alpha', 200, 4, 8),
  createCampaignPlayer('internal-secret-bravo', 'bravo', 200, 4, 8),
  ...Array.from({ length: 101 }, (_, index) => createCampaignPlayer(
    `internal-secret-filler-${String(index).padStart(3, '0')}`,
    `filler_${String(index).padStart(3, '0')}`,
    10,
    0,
    1,
  )),
];
const leaderboardInput = {
  winner: 'green',
  completedAt: '2026-07-15T21:00:00.000Z',
  battles: [],
  captures: [],
  participants: [],
  orders: [],
  players: leaderboardPlayers,
};
const leaderboardAggregate = campaignReport.buildCampaignAggregate(leaderboardInput);
const reversedLeaderboardAggregate = campaignReport.buildCampaignAggregate({
  ...leaderboardInput,
  players: [...leaderboardPlayers].reverse(),
});
assert(
  leaderboardAggregate.leaderboard.length === 100 &&
    leaderboardAggregate.leaderboard.slice(0, 5).map((player) => player.username).join(',') ===
      'xp_first,victory_first,event_first,Alpha,bravo' &&
    JSON.stringify(leaderboardAggregate.leaderboard) ===
      JSON.stringify(reversedLeaderboardAggregate.leaderboard),
  'Top 100 must be stable and ordered by XP, victories, events, then username',
);

const limitedPublication = campaignReport.createCampaignReportPublication(
  leaderboardAggregate,
  'Verified campaign epilogue.',
  { main: 500, appendix: 240 },
);
const serializedPublication = JSON.stringify(limitedPublication);
assert(
  !serializedPublication.includes('internal-secret-'),
  'campaign publication must never expose internal user ids',
);
assert(
  campaignReport.CAMPAIGN_REPORT_MAIN_LIMIT === 30_000 &&
    campaignReport.CAMPAIGN_REPORT_APPENDIX_LIMIT === 8_000 &&
    limitedPublication.mainBody.length <= 500 &&
    limitedPublication.appendixBodies.length > 0 &&
    limitedPublication.appendixBodies.every((body) => body.length <= 240),
  'campaign publication must honor main-post and comment chunk limits',
);

console.log('core verification passed');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function territoryIds(values) {
  return values.map((territory) => territory.id).join(',');
}

function createTerritorySnapshot(defaultOwner, overrides = {}) {
  return territories.TERRITORIES.map((territory) => ({
    ...territory,
    owner: overrides[territory.id] ?? defaultOwner,
  }));
}

function territoryWithOwner(id, owner) {
  return {
    ...territories.getTerritoryById(id),
    owner,
  };
}

function createCampaignBattle(input) {
  return {
    id: input.id,
    battleDate: input.battleDate,
    postPermalink: `https://reddit.com/r/humansvsai/comments/${input.id}`,
    result: {
      winner: input.winner,
      doctrines: { green: 'STRIKE', blue: 'HACK', ai: 'VIRUS' },
      scores: {
        green: { total: 10 },
        blue: { total: 8 },
        ai: { total: 7 },
      },
      activeTerritoryBefore: territoryWithOwner(input.territoryId, input.previousOwner),
      activeTerritoryAfter: territoryWithOwner(input.territoryId, input.newOwner),
    },
  };
}

function createCampaignOrder(battleId, userId) {
  return { battleId, userId, army: 'green', doctrineId: 'STRIKE' };
}

function createCampaignPlayer(userId, redditUsername, xp, victories, participatedEvents) {
  return {
    userId,
    redditUsername,
    rewards: {
      xp,
      rank: 'Signal Recruit',
      medals: ['First Contact'],
      streak: participatedEvents,
    },
    progression: {
      totalParticipatedEvents: participatedEvents,
      totalVictories: victories,
    },
  };
}

function createTypeScriptModuleUrl(source, label) {
  const build = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert(
    !build.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
    `${label} has TypeScript syntax errors`,
  );

  return `data:text/javascript;base64,${Buffer.from(build.outputText).toString('base64')}`;
}
