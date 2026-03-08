import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      showConnectionDialog: false,
      showRecorderPanel: false,
      showPublisherPanel: false,
      showSearchPanel: false,
      payloadFormat: 'json',
    });
  });

  it('starts with all panels closed', () => {
    const state = useUIStore.getState();
    expect(state.showConnectionDialog).toBe(false);
    expect(state.showRecorderPanel).toBe(false);
    expect(state.showPublisherPanel).toBe(false);
    expect(state.showSearchPanel).toBe(false);
  });

  it('toggles connection dialog', () => {
    useUIStore.getState().toggleConnectionDialog();
    expect(useUIStore.getState().showConnectionDialog).toBe(true);
    useUIStore.getState().toggleConnectionDialog();
    expect(useUIStore.getState().showConnectionDialog).toBe(false);
  });

  it('toggles recorder panel', () => {
    useUIStore.getState().toggleRecorderPanel();
    expect(useUIStore.getState().showRecorderPanel).toBe(true);
  });

  it('toggles publisher panel', () => {
    useUIStore.getState().togglePublisherPanel();
    expect(useUIStore.getState().showPublisherPanel).toBe(true);
  });

  it('toggles search panel', () => {
    useUIStore.getState().toggleSearchPanel();
    expect(useUIStore.getState().showSearchPanel).toBe(true);
  });

  it('sets payload format', () => {
    useUIStore.getState().setPayloadFormat('hex');
    expect(useUIStore.getState().payloadFormat).toBe('hex');
  });

  it('sets theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });
});
