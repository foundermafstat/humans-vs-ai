import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import {
  DOCTRINE_IDS,
  type BootstrapResponse,
  type DoctrineId,
  type OrderResponse,
} from '../shared/api';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scale: {
    // Keep a fixed game resolution but automatically scale it to fit within the available
    // web-view / device while maintaining aspect ratio.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [Boot, Preloader, MainMenu, MainGame, GameOver],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

let activeGame: Game | undefined;
let stateScreenElement: HTMLElement | undefined;

const DOCTRINE_CARD_TEXT: Record<DoctrineId, string> = {
  STRIKE: 'Assault. Breaks Hack, Virus, Phantom.',
  HACK: 'Exploit. Breaks Virus, Phantom, Shield.',
  VIRUS: 'Corruption. Breaks Phantom, Shield, Overload.',
  PHANTOM: 'Stealth. Breaks Shield, Overload, Trap.',
  SHIELD: 'Defense. Breaks Overload, Trap, Strike.',
  OVERLOAD: 'Swarm. Breaks Trap, Strike, Hack.',
  TRAP: 'Ambush. Breaks Strike, Hack, Virus.',
};

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function clearStateScreen() {
  stateScreenElement?.remove();
  stateScreenElement = undefined;
}

function startPhaserGame() {
  if (activeGame) return;

  clearStateScreen();
  activeGame = StartGame('game-container');
}

function stopPhaserGame() {
  activeGame?.destroy(true);
  activeGame = undefined;
}

function appendText(parent: HTMLElement, tagName: 'h1' | 'p', className: string, text: string) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.append(element);

  return element;
}

function createActionButton(label: string) {
  const button = document.createElement('button');
  button.className = 'game-state-screen__button';
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', startPhaserGame);

  return button;
}

function createDoctrineButton(doctrineId: DoctrineId, onSubmit: (doctrineId: DoctrineId) => void) {
  const button = document.createElement('button');
  button.className = 'game-state-screen__doctrine';
  button.type = 'button';
  button.innerHTML = `<strong>${doctrineId}</strong><span>${DOCTRINE_CARD_TEXT[doctrineId]}</span>`;
  button.addEventListener('click', () => onSubmit(doctrineId));

  return button;
}

async function submitDoctrineOrder(doctrineId: DoctrineId, panel: HTMLElement) {
  const buttons = panel.querySelectorAll<HTMLButtonElement>('button');
  buttons.forEach((button) => {
    button.disabled = true;
  });

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ doctrineId }),
    });
    const body: OrderResponse | { message?: string } = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        'message' in body && body.message ? body.message : 'Doctrine order failed.',
      );
      return;
    }

    await loadExpandedState();
  } catch {
    appendText(panel, 'p', 'game-state-screen__body', 'Doctrine order failed.');
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function appendBattleMeta(panel: HTMLElement, bootstrap: BootstrapResponse) {
  const territory = bootstrap.battle?.activeTerritory;
  if (!territory) return;

  appendText(
    panel,
    'p',
    'game-state-screen__meta',
    `Active territory: ${territory.name} / owner: ${territory.owner}`,
  );
}

function renderCountdownTimer(target: HTMLElement, bootstrap: BootstrapResponse) {
  if (!bootstrap.battle) return;

  const serverNowMs = new Date(bootstrap.serverNow).getTime();
  const clientStartedAtMs = Date.now();
  const resolvesAtMs = new Date(bootstrap.battle.resolvesAt).getTime();
  const updateCountdown = () => {
    const estimatedServerNowMs = serverNowMs + Date.now() - clientStartedAtMs;
    const secondsLeft = Math.ceil((resolvesAtMs - estimatedServerNowMs) / 1_000);

    target.textContent = formatDuration(secondsLeft);
  };

  updateCountdown();
  window.setInterval(updateCountdown, 1_000);
}

function renderStateScreen(bootstrap: BootstrapResponse) {
  const app = document.getElementById('app');
  if (!app) {
    startPhaserGame();
    return;
  }

  clearStateScreen();

  const screen = document.createElement('section');
  screen.className = 'game-state-screen';
  screen.setAttribute('aria-label', 'Daily battle state');

  const panel = document.createElement('div');
  panel.className = 'game-state-screen__panel';
  screen.append(panel);

  if (bootstrap.view === 'summary') {
    appendText(panel, 'h1', 'game-state-screen__title', 'Battle report');
    appendText(
      panel,
      'p',
      'game-state-screen__body',
      bootstrap.battle?.resultSummary ?? 'The AI has posted the result of the daily battle.',
    );
    if (bootstrap.battle?.result) {
      const result = bootstrap.battle.result;
      appendText(
        panel,
        'p',
        'game-state-screen__meta',
        `Green ${result.doctrines.green} / Blue ${result.doctrines.blue} / AI ${result.doctrines.ai}`,
      );
      if (bootstrap.user.rewards) {
        appendText(
          panel,
          'p',
          'game-state-screen__meta',
          `Rewards: ${bootstrap.user.rewards.xp} XP, ${bootstrap.user.rewards.rank}`,
        );
      }
    }

    if (bootstrap.battle) {
      const link = document.createElement('a');
      link.className = 'game-state-screen__button';
      link.href = bootstrap.battle.postPermalink;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open post';
      panel.append(link);
    }
  } else if (bootstrap.view === 'countdown') {
    appendText(panel, 'h1', 'game-state-screen__title', 'Daily battle is live');
    const timer = appendText(panel, 'p', 'game-state-screen__timer', '');
    appendBattleMeta(panel, bootstrap);
    if (bootstrap.user.order) {
      appendText(
        panel,
        'p',
        'game-state-screen__body',
        `Order locked: ${bootstrap.user.order.army.toUpperCase()} / ${bootstrap.user.order.doctrineId}. AI result posts at 21:00 ET.`,
      );
      if (bootstrap.user.spyOffer?.offered) {
        appendText(
          panel,
          'p',
          'game-state-screen__meta',
          bootstrap.user.spyOffer.accepted
            ? `Spy objective accepted: ${bootstrap.user.spyOffer.objective ?? 'classified'}`
            : 'Spy offer available in this battle.',
        );
      }
    } else {
      appendText(panel, 'p', 'game-state-screen__body', 'Choose one hidden doctrine. One order per daily battle.');
      const doctrineGrid = document.createElement('div');
      doctrineGrid.className = 'game-state-screen__doctrines';
      for (const doctrineId of DOCTRINE_IDS) {
        doctrineGrid.append(createDoctrineButton(doctrineId, (selectedDoctrineId) => {
          void submitDoctrineOrder(selectedDoctrineId, panel);
        }));
      }
      panel.append(doctrineGrid);
    }
    renderCountdownTimer(timer, bootstrap);
  } else {
    appendText(panel, 'h1', 'game-state-screen__title', 'Join humanity');
    appendText(panel, 'p', 'game-state-screen__body', 'Choose your side before the daily result is posted.');
    panel.append(createActionButton('Begin onboarding'));
  }

  app.append(screen);
  stateScreenElement = screen;
}

async function loadExpandedState() {
  try {
    const response = await fetch('/api/bootstrap');
    if (!response.ok) {
      startPhaserGame();
      return;
    }

    const bootstrap: BootstrapResponse = await response.json();
    renderStateScreen(bootstrap);
  } catch {
    startPhaserGame();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await document.fonts.load('16px "VT323"');
    await document.fonts.ready;
  } catch {
    // Start with the CSS fallback if the Google Fonts request is unavailable.
  }

  await loadExpandedState();
});

window.addEventListener('humans-vs-ai:player-joined', () => {
  stopPhaserGame();
  void loadExpandedState();
});
