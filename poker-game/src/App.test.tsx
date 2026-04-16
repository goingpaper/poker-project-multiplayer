import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayPage from './pages/PlayPage';

describe('App', () => {
  it('renders poker loading message on play route', () => {
    const { asFragment, getByText } = render(
      <MemoryRouter initialEntries={['/play/default']}>
        <Routes>
          <Route path="/play/:roomId" element={<PlayPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(asFragment()).toMatchSnapshot();
    expect(getByText(/Open another tab here/i)).toBeInTheDocument();
  });
});
