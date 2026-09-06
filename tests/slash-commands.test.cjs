/**
 * Slash Commands Parsing & Matching Test Suite (Phase 4.1)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Slash Commands Matching & Parsing (Phase 4.1)', () => {
  let modeValue = 'ask';
  let switchedTab = null;
  let chatPromptValue = '';

  function switchTab(tab) {
    switchedTab = tab;
  }

  const slashCommands = [
    { cmd: '/summarize', desc: 'Summarize current page', tab: 'summarize' },
    { cmd: '/write', desc: 'Compose or rewrite text in chat', action: () => { switchTab('chat'); chatPromptValue = 'Write: '; } },
    { cmd: '/translate', desc: 'Translate text in chat', action: () => { switchTab('chat'); chatPromptValue = 'Translate into English: '; } },
    { cmd: '/agent', desc: 'Switch to Agent mode', action: () => { modeValue = 'agent'; switchTab('chat'); } },
    { cmd: '/ask', desc: 'Switch to Ask mode', action: () => { modeValue = 'ask'; switchTab('chat'); } },
  ];

  function getMatchingSlashCommands(val) {
    if (val.startsWith('/') && val.length < 15) {
      return slashCommands.filter(c => c.cmd.startsWith(val.toLowerCase()));
    }
    return [];
  }

  function executeSlashCommand(input) {
    const text = (input || '').trim().toLowerCase();
    const matched = slashCommands.find(c => c.cmd === text);
    if (matched) {
      if (matched.tab) switchTab(matched.tab);
      if (matched.action) matched.action();
      return true;
    }
    return false;
  }

  it('should find prefix matches for slash commands incrementally', () => {
    assert.deepStrictEqual(getMatchingSlashCommands('/').map(c => c.cmd), [
      '/summarize', '/write', '/translate', '/agent', '/ask'
    ]);
    assert.deepStrictEqual(getMatchingSlashCommands('/s').map(c => c.cmd), ['/summarize']);
    assert.deepStrictEqual(getMatchingSlashCommands('/su').map(c => c.cmd), ['/summarize']);
    assert.deepStrictEqual(getMatchingSlashCommands('/w').map(c => c.cmd), ['/write']);
    assert.deepStrictEqual(getMatchingSlashCommands('/t').map(c => c.cmd), ['/translate']);
    assert.deepStrictEqual(getMatchingSlashCommands('/a').map(c => c.cmd), ['/agent', '/ask']);
    assert.deepStrictEqual(getMatchingSlashCommands('/ag').map(c => c.cmd), ['/agent']);
    assert.deepStrictEqual(getMatchingSlashCommands('/as').map(c => c.cmd), ['/ask']);
  });

  it('should handle case insensitivity during typing', () => {
    assert.deepStrictEqual(getMatchingSlashCommands('/SUM').map(c => c.cmd), ['/summarize']);
    assert.deepStrictEqual(getMatchingSlashCommands('/AGENT').map(c => c.cmd), ['/agent']);
  });

  it('should return empty matches for non-slash or unknown commands', () => {
    assert.deepStrictEqual(getMatchingSlashCommands('hello'), []);
    assert.deepStrictEqual(getMatchingSlashCommands(''), []);
    assert.deepStrictEqual(getMatchingSlashCommands('/unknowncommand'), []);
    assert.deepStrictEqual(getMatchingSlashCommands('/thiscommandiswaytoolongtoqualify'), []);
  });

  it('should execute tab switching for /summarize', () => {
    switchedTab = null;
    assert.strictEqual(executeSlashCommand('/summarize'), true);
    assert.strictEqual(switchedTab, 'summarize');
  });

  it('should execute direct chat actions for /write and /translate', () => {
    chatPromptValue = '';
    switchedTab = null;
    assert.strictEqual(executeSlashCommand('/write'), true);
    assert.strictEqual(switchedTab, 'chat');
    assert.strictEqual(chatPromptValue, 'Write: ');

    chatPromptValue = '';
    switchedTab = null;
    assert.strictEqual(executeSlashCommand('/translate'), true);
    assert.strictEqual(switchedTab, 'chat');
    assert.strictEqual(chatPromptValue, 'Translate into English: ');
  });

  it('should execute action callbacks for /agent and /ask', () => {
    modeValue = 'ask';
    assert.strictEqual(executeSlashCommand('/agent'), true);
    assert.strictEqual(modeValue, 'agent');

    assert.strictEqual(executeSlashCommand('/ask'), true);
    assert.strictEqual(modeValue, 'ask');
  });

  it('should return false for regular messages and not execute commands', () => {
    switchedTab = null;
    modeValue = 'ask';
    assert.strictEqual(executeSlashCommand('What is the weather today?'), false);
    assert.strictEqual(switchedTab, null);
    assert.strictEqual(modeValue, 'ask');
  });
});
