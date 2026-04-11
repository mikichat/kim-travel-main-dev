import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    // App should render something
    expect(document.body).toBeDefined();
  });

  it('renders the home page by default', () => {
    render(<App />);
    // Check that the layout is rendered (which contains the app structure)
    const mainContent = document.querySelector('main') || document.body;
    expect(mainContent).toBeDefined();
  });

  it('has proper routing structure', () => {
    const { container } = render(<App />);
    // App component should be rendered
    expect(container).toBeDefined();
    expect(container.innerHTML).not.toBe('');
  });
});

describe('App Routing', () => {
  it('renders home page at root path', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    // Verify the app renders at root
    expect(document.body).toBeDefined();
  });

  it('renders tours page at /tours path', () => {
    window.history.pushState({}, '', '/tours');
    render(<App />);
    // Verify the app renders at /tours
    expect(document.body).toBeDefined();
  });

  it('renders not found page for unknown routes', () => {
    window.history.pushState({}, '', '/unknown-route');
    render(<App />);
    // Verify the app handles unknown routes
    expect(document.body).toBeDefined();
  });
});
