/**
 * VRH.AI Background Service Worker (Manifest V3 ES Module)
 * Orchestrates autonomous agent lifecycle, CDP connections, alarms keepalive,
 * auto-reattachment listeners, and global graceful shutdown.
 */

import { agentRunner } from './agentRunner.js';
import { cdpController } from './cdpController.js';

const KEEPALIVE_ALARM_NAME = 'vrh_agent_keepalive';

// ══════════════════════════════════════════════════
// SERVICE WORKER KEEPALIVE HEARTBEAT
// ══════════════════════════════════════════════════
function startKeepalive() {
  chrome.alarms.create(KEEPALIVE_ALARM_NAME, { periodInMinutes: 0.25 });
}

function stopKeepalive() {
  chrome.alarms.clear(KEEPALIVE_ALARM_NAME);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === KEEPALIVE_ALARM_NAME) {
    const state = agentRunner.getState();
    if (state.isRunning) {
      // Keep service worker active during long LLM inferences or page loads
      await chrome.runtime.getPlatformInfo().catch(() => {});
    } else {
      stopKeepalive();
    }
  }
});

// ══════════════════════════════════════════════════
// EXTENSION INITIALIZATION & SETTINGS ONBOARDING
// ══════════════════════════════════════════════════
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html?onboarding=true') });
  }
  console.log("[VRH.AI] Autonomous Browser Agent Service Worker Initialized.");
});

// Configure side panel to open on action toolbar icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[VRH.AI] Failed to set sidePanel behavior:", error));

// Command listener for keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // Handled by sidePanel openPanelOnActionClick
  }
});

// ══════════════════════════════════════════════════
// DYNAMIC TAB & TARGET RE-ATTACHMENT
// ══════════════════════════════════════════════════

// 1. webNavigation.onCommitted: re-binds CDP sessions on cross-domain or redirect navigations
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  try {
    const state = agentRunner.getState();
    if (state.isRunning && state.activeTabId === details.tabId) {
      console.log(`[VRH.AI] Active tab ${details.tabId} committed navigation to ${details.url}. Ensuring CDP attachment.`);
      await cdpController.attach(details.tabId);
    }
  } catch (err) {
    console.warn("[VRH.AI] Error during webNavigation re-attachment:", err);
  }
});

// 2. debugger.onDetach: re-attaches if detached during an active task
chrome.debugger.onDetach.addListener(async (source, reason) => {
  try {
    const state = agentRunner.getState();
    if (state.isRunning && source.tabId === state.activeTabId) {
      console.warn(`[VRH.AI] Debugger unexpectedly detached during active task (reason: ${reason}). Re-attaching tab ${source.tabId}...`);
      await new Promise(r => setTimeout(r, 200));
      await cdpController.attach(source.tabId);
    }
  } catch (err) {
    console.error("[VRH.AI] Failed to auto-reattach debugger:", err);
  }
});

// 3. Tab removal listener: Detach debugger and halt agent if target tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const state = agentRunner.getState();
    if (state.activeTabId === tabId) {
      console.warn(`[VRH.AI] Active agent tab ${tabId} closed. Stopping agent.`);
      stopKeepalive();
      await agentRunner.stop();
    } else {
      await cdpController.detach(tabId);
    }
  } catch (err) {
    console.error("[VRH.AI] Error handling tab removal:", err);
  }
});

// ══════════════════════════════════════════════════
// GLOBAL GRACEFUL CLEANUP ENGINE
// ══════════════════════════════════════════════════
chrome.runtime.onSuspend.addListener(async () => {
  console.log("[VRH.AI] Extension suspending. Executing graceful cleanup...");
  stopKeepalive();
  await cdpController.detachAll().catch(() => {});
});

// ══════════════════════════════════════════════════
// MAIN RUNTIME MESSAGE ROUTER
// ══════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, type } = message;
  const msgType = action || type;

  switch (msgType) {
    case "AGENT_START": {
      startKeepalive();
      agentRunner.start(message.goal, message.tabId)
        .then(() => sendResponse({ success: true, status: "started" }))
        .catch((err) => {
          stopKeepalive();
          sendResponse({ success: false, error: err.message });
        });
      return true; // async response
    }

    case "AGENT_PAUSE": {
      agentRunner.pause(message.reason || "Paused by user.");
      sendResponse({ success: true, status: "paused" });
      break;
    }

    case "AGENT_RESUME": {
      startKeepalive();
      agentRunner.resume();
      sendResponse({ success: true, status: "resumed" });
      break;
    }

    case "AGENT_STOP":
    case "AGENT_EMERGENCY_STOP": {
      stopKeepalive();
      agentRunner.stop()
        .then(() => sendResponse({ success: true, status: "stopped" }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }

    case "GET_AGENT_STATE": {
      sendResponse({ success: true, state: agentRunner.getState() });
      break;
    }

    case "GET_AGENT_LOGS": {
      const state = agentRunner.getState();
      sendResponse({ success: true, logs: state.runLogs || [] });
      break;
    }

    case "GET_EXTRACTED_DATA": {
      const state = agentRunner.getState();
      sendResponse({ success: true, data: state.extractedData || [] });
      break;
    }

    default:
      break;
  }

  return true;
});
