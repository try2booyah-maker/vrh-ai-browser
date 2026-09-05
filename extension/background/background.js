/**
 * VRH.AI Background Service Worker (Manifest V3 ES Module)
 * Orchestrates autonomous agent lifecycle, CDP connections, and tab lifecycle events.
 */

import { agentRunner } from './agentRunner.js';
import { cdpController } from './cdpController.js';

// Open settings onboarding on fresh install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html?onboarding=true') });
  }
  console.log("[VRH.AI] Background service worker initialized.");
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

// Tab removal listener: Detach debugger and halt agent if target tab is closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    const state = agentRunner.getState();
    if (state.activeTabId === tabId) {
      console.warn(`[VRH.AI] Active agent tab ${tabId} closed. Stopping agent.`);
      await agentRunner.stop();
    } else {
      await cdpController.detach(tabId);
    }
  } catch (err) {
    console.error("[VRH.AI] Error handling tab removal:", err);
  }
});

// Main message router for runtime communications
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, type } = message;
  const msgType = action || type;

  switch (msgType) {
    case "AGENT_START": {
      agentRunner.start(message.goal, message.tabId)
        .then(() => sendResponse({ success: true, status: "started" }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }

    case "AGENT_PAUSE": {
      agentRunner.pause(message.reason || "Paused by user.");
      sendResponse({ success: true, status: "paused" });
      break;
    }

    case "AGENT_RESUME": {
      agentRunner.resume();
      sendResponse({ success: true, status: "resumed" });
      break;
    }

    case "AGENT_STOP": {
      agentRunner.stop()
        .then(() => sendResponse({ success: true, status: "stopped" }))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }

    case "GET_AGENT_STATE": {
      sendResponse({ success: true, state: agentRunner.getState() });
      break;
    }

    case "BACKGROUND_TASK": {
      console.log("[VRH.AI] Received background task:", message);
      sendResponse({ status: "Task received" });
      break;
    }

    default:
      // Allow other messages to pass through without error
      break;
  }

  return true;
});
