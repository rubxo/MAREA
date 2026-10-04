import { colors, radii, spacing } from './tokens';

describe('Marea design tokens', () => {
  it('keeps the approved product palette', () => {
    expect(colors).toMatchObject({
      ink: '#121515',
      paper: '#F6F2EA',
      coral: '#FF604A',
      seaGlass: '#73BFAE',
      deepBlue: '#2448A8',
      danger: '#C5362F',
    });
  });

  it('uses a four-point spacing scale and restrained radii', () => {
    expect(Object.values(spacing).every((value) => value % 4 === 0)).toBe(true);
    expect(radii.card).toBeLessThanOrEqual(20);
  });
});
