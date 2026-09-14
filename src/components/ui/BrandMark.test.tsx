import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('renders the MG monogram when there is no logoUrl', () => {
    render(<BrandMark />);
    expect(screen.getByText('MG')).toBeInTheDocument();
  });

  it('renders the logo image when a logoUrl is given', () => {
    render(<BrandMark logoUrl="https://cdn.example.com/logo.png" />);
    expect(screen.getByRole('img', { name: 'Logo da oficina' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/logo.png',
    );
  });

  it('falls back to the monogram if the image fails to load', () => {
    render(<BrandMark logoUrl="https://cdn.example.com/broken.png" />);
    const img = screen.getByRole('img', { name: 'Logo da oficina' });

    fireEvent.error(img);

    expect(screen.getByText('MG')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['sm', 'md', 'lg'] as const)('renders the %s size without crashing', (size) => {
    render(<BrandMark size={size} />);
    expect(screen.getByText('MG')).toBeInTheDocument();
  });
});
