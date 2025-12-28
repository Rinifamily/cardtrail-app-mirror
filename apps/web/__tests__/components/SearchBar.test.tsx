import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '@/components/search/SearchBar';

vi.mock('@/hooks/useAutocomplete', () => ({
  useAutocomplete: () => ({
    data: [],
    isLoading: false,
  }),
}));

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar value="" onChange={() => {}} onSubmit={() => {}} />);

    const input = screen.getByPlaceholderText(/search for pokemon cards/i);
    expect(input).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();

    render(<SearchBar value="" onChange={handleChange} onSubmit={() => {}} />);

    const input = screen.getByPlaceholderText(/search for pokemon cards/i);
    fireEvent.change(input, { target: { value: 'Pikachu' } });

    expect(handleChange).toHaveBeenCalledWith('Pikachu');
  });

  it('calls onSubmit on Enter key', () => {
    const handleSubmit = vi.fn();

    render(
      <SearchBar value="Pikachu" onChange={() => {}} onSubmit={handleSubmit} />
    );

    const input = screen.getByPlaceholderText(/search for pokemon cards/i);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('shows clear button and handles click', () => {
    const handleChange = vi.fn();

    render(
      <SearchBar value="Pikachu" onChange={handleChange} onSubmit={() => {}} />
    );

    const clearButton = screen.getByLabelText(/clear search/i);
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(handleChange).toHaveBeenCalledWith('');
  });
});
