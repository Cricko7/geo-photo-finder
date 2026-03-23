describe('Simple test', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });
  
  it('should have working environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});