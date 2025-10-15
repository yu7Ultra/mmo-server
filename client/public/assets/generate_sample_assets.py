#!/usr/bin/env python3
"""
Generate sample placeholder assets for MMO game.
This creates basic colored sprites that can be replaced with real assets.
"""

from PIL import Image, ImageDraw, ImageFont
import os

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def create_character_sprite(filename, color):
    """Create a simple character sprite"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Body (circle)
    draw.ellipse([16, 20, 48, 52], fill=color)
    
    # Head (smaller circle)
    draw.ellipse([24, 8, 40, 24], fill=tuple(min(255, c + 30) for c in color[:3]) + (255,))
    
    # Arms
    draw.rectangle([12, 28, 20, 44], fill=color)
    draw.rectangle([44, 28, 52, 44], fill=color)
    
    # Legs
    draw.rectangle([24, 44, 32, 60], fill=color)
    draw.rectangle([32, 44, 40, 60], fill=color)
    
    img.save(os.path.join(ASSETS_DIR, 'characters', filename))
    print(f"Created {filename}")

def create_skill_icon(filename, color, symbol):
    """Create a skill icon"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle
    draw.ellipse([4, 4, 60, 60], fill=color, outline=(255, 255, 255, 255), width=2)
    
    # Symbol
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 32)
    except:
        font = ImageFont.load_default()
    
    # Center the text
    bbox = draw.textbbox((0, 0), symbol, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((64 - text_width) // 2, (64 - text_height) // 2 - 4)
    
    draw.text(position, symbol, fill=(255, 255, 255, 255), font=font)
    
    img.save(os.path.join(ASSETS_DIR, 'skills', filename))
    print(f"Created {filename}")

def create_ui_element(filename, width, height, color):
    """Create UI panel/button"""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Border
    draw.rectangle([0, 0, width-1, height-1], outline=(100, 100, 100, 255), width=2)
    
    # Fill
    draw.rectangle([2, 2, width-3, height-3], fill=color)
    
    img.save(os.path.join(ASSETS_DIR, 'ui', filename))
    print(f"Created {filename}")

def create_item_icon(filename, color, shape='rect'):
    """Create item icon"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if shape == 'rect':
        draw.rectangle([4, 8, 28, 24], fill=color, outline=(255, 255, 255, 255), width=1)
    elif shape == 'circle':
        draw.ellipse([8, 8, 24, 24], fill=color, outline=(255, 255, 255, 255), width=1)
    elif shape == 'triangle':
        draw.polygon([(16, 4), (28, 28), (4, 28)], fill=color, outline=(255, 255, 255, 255))
    
    img.save(os.path.join(ASSETS_DIR, 'items', filename))
    print(f"Created {filename}")

def create_tile(filename, color):
    """Create environment tile"""
    img = Image.new('RGBA', (32, 32), color)
    draw = ImageDraw.Draw(img)
    
    # Add grid lines
    for i in range(0, 32, 8):
        draw.line([(i, 0), (i, 32)], fill=tuple(max(0, c - 20) for c in color[:3]) + (255,), width=1)
        draw.line([(0, i), (32, i)], fill=tuple(max(0, c - 20) for c in color[:3]) + (255,), width=1)
    
    img.save(os.path.join(ASSETS_DIR, 'environment', filename))
    print(f"Created {filename}")

def create_effect_sprite(filename, color):
    """Create effect/particle sprite"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Multiple circles for effect
    for i, radius in enumerate([12, 8, 4]):
        alpha = 255 - (i * 60)
        effect_color = color[:3] + (alpha,)
        draw.ellipse([16-radius, 16-radius, 16+radius, 16+radius], fill=effect_color)
    
    img.save(os.path.join(ASSETS_DIR, 'skills', filename))
    print(f"Created {filename}")

def main():
    # Create character sprites
    create_character_sprite('player-red.png', (255, 80, 80, 255))
    create_character_sprite('player-blue.png', (80, 80, 255, 255))
    create_character_sprite('player-green.png', (80, 255, 80, 255))
    create_character_sprite('player-yellow.png', (255, 255, 80, 255))
    create_character_sprite('npc-merchant.png', (200, 150, 100, 255))
    create_character_sprite('enemy-skeleton.png', (220, 220, 220, 255))
    create_character_sprite('enemy-goblin.png', (120, 180, 80, 255))
    
    # Create skill icons
    create_skill_icon('fireball.png', (255, 100, 0, 255), '🔥')
    create_skill_icon('heal.png', (0, 255, 100, 255), '❤')
    create_skill_icon('shield.png', (100, 100, 255, 255), '🛡')
    create_skill_icon('dash.png', (255, 255, 0, 255), '⚡')
    create_skill_icon('ice-spike.png', (150, 200, 255, 255), '❄')
    create_skill_icon('poison.png', (150, 255, 100, 255), '☠')
    
    # Create effect sprites
    create_effect_sprite('fire-effect.png', (255, 150, 0))
    create_effect_sprite('heal-effect.png', (100, 255, 100))
    create_effect_sprite('hit-effect.png', (255, 50, 50))
    create_effect_sprite('level-up.png', (255, 255, 100))
    
    # Create UI elements
    create_ui_element('panel-background.png', 320, 240, (40, 40, 50, 220))
    create_ui_element('button-normal.png', 120, 40, (60, 60, 80, 255))
    create_ui_element('button-hover.png', 120, 40, (80, 80, 120, 255))
    create_ui_element('button-pressed.png', 120, 40, (50, 50, 70, 255))
    create_ui_element('progress-bar-bg.png', 200, 20, (40, 40, 40, 255))
    create_ui_element('progress-bar-fill-hp.png', 200, 20, (100, 255, 100, 255))
    create_ui_element('progress-bar-fill-mana.png', 200, 20, (100, 100, 255, 255))
    create_ui_element('progress-bar-fill-xp.png', 200, 20, (255, 200, 100, 255))
    
    # Create item icons
    create_item_icon('sword.png', (192, 192, 192), 'triangle')
    create_item_icon('potion-health.png', (255, 100, 100), 'circle')
    create_item_icon('potion-mana.png', (100, 100, 255), 'circle')
    create_item_icon('armor.png', (150, 150, 150), 'rect')
    create_item_icon('helmet.png', (180, 180, 200), 'circle')
    create_item_icon('boots.png', (120, 80, 60), 'rect')
    create_item_icon('ring.png', (255, 215, 0), 'circle')
    create_item_icon('amulet.png', (200, 100, 255), 'circle')
    
    # Create environment tiles
    create_tile('grass.png', (80, 160, 80, 255))
    create_tile('stone.png', (120, 120, 120, 255))
    create_tile('water.png', (80, 120, 200, 255))
    create_tile('dirt.png', (150, 100, 70, 255))
    create_tile('sand.png', (220, 200, 140, 255))
    create_tile('snow.png', (240, 240, 255, 255))
    
    print("\nAll sample assets created successfully!")
    print("Note: These are placeholder assets. Replace with proper sprites for production.")

if __name__ == '__main__':
    main()
