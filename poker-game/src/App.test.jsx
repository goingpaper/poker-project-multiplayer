import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders poker loading message', () => {
    const { asFragment, getByText } = render(<App />);
    expect(asFragment()).toMatchSnapshot();
    expect(getByText(/Open another tab here/i)).toBeInTheDocument();
  });
});
