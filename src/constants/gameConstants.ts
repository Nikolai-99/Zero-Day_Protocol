
export const COLORS = {
  PLAYER: '#DDDDDD',
  PLAYER_BULLET: '#FFB300', // Darker yellow/gold to match the 3D model
  PLAYER_BULLET_EMISSIVE: '#FF8F00', 
  ENEMY: '#333333', // Dark grey body
  ENEMY_OUTLINE: '#FFA500', // Orange
  ENEMY_CORE: '#FF6600', // Darker Orange for Core body
  ENEMY_TRIANGLE: '#00FFFF', // Cyan/Teal for Triangle
  ENEMY_SHIELD: '#FFFFFF', // White Shield
  ENEMY_BULLET: '#FF4500', // Orange Red
  ENEMY_BULLET_EMISSIVE: '#FF8800',
  BLOCK: '#00FFFF',
  BG: '#111111',
  
  // New Additions
  BULLET_HEAL: '#00FF00', // Green for heal
  BULLET_HEAL_EMISSIVE: '#55FF55',
  HEAL_EFFECT: '#00FF44',
  
  // Cursor (Brownish Glow)
  PLAYER_CURSOR: '#F5DEB3', // Wheat/Beige
  PLAYER_CURSOR_EMISSIVE: '#CD853F', // Peru/Brownish Orange glow
  
  // Glitch Palette: Now only White per request
  GLITCH_COLORS: ['#FFFFFF']
};

export const CONFIG = {
  PLAYER_SPEED: 16.8, // Increased by 20% (from 14 to 16.8) for even more snappy and responsive dodging
  PLAYER_FIRE_RATE: 100, // ms
  BULLET_SPEED: 48,
  ENEMY_SPEED: 7.0,
  ENEMY_FIRE_RATE: 1200, // ms
  FIELD_SIZE: 60,
};