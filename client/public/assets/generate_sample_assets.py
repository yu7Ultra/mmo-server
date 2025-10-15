#!/usr/bin/env python3
"""
Generate enhanced game assets with professional visual quality.
Features improved shading, gradients, effects, and textures.
Based on open-source game art design principles.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import math
import random

ASSETS_DIR = os.path.dirname(os.path.abspath(__file__))

def create_character_sprite(filename, color):
    """Create an enhanced character sprite with shading and details"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Helper function to adjust colors
    def adjust_color(base_color, factor):
        return tuple(max(0, min(255, int(c * factor))) for c in base_color[:3]) + (255,)
    
    dark_color = adjust_color(color, 0.65)
    light_color = adjust_color(color, 1.35)
    
    # Shadow beneath character
    draw.ellipse([18, 56, 46, 62], fill=(0, 0, 0, 70))
    
    # Legs with shading
    draw.rectangle([23, 44, 29, 58], fill=dark_color)
    draw.rectangle([35, 44, 41, 58], fill=dark_color)
    draw.rectangle([24, 44, 28, 58], fill=color)
    draw.rectangle([36, 44, 40, 58], fill=color)
    draw.line([(26, 44), (26, 58)], fill=light_color, width=1)
    draw.line([(38, 44), (38, 58)], fill=light_color, width=1)
    
    # Body with gradient effect
    for y in range(20, 52, 2):
        gradient_factor = 0.95 + (y - 36) * 0.008
        body_color = adjust_color(color, gradient_factor)
        draw.ellipse([17, y, 47, y+4], fill=body_color)
    
    # Arms with shading
    draw.ellipse([10, 26, 22, 42], fill=dark_color)
    draw.ellipse([42, 26, 54, 42], fill=dark_color)
    draw.ellipse([11, 27, 21, 41], fill=color)
    draw.ellipse([43, 27, 53, 41], fill=color)
    draw.ellipse([12, 28, 18, 36], fill=light_color)
    draw.ellipse([46, 28, 52, 36], fill=light_color)
    
    # Head with shading
    head_color = adjust_color(color, 1.2)
    draw.ellipse([21, 8, 43, 30], fill=dark_color)
    draw.ellipse([22, 7, 42, 29], fill=head_color)
    
    # Highlights on head
    draw.ellipse([25, 10, 32, 17], fill=light_color)
    
    # Simple facial features
    # Eyes
    draw.ellipse([27, 15, 30, 18], fill=(40, 40, 40, 255))
    draw.ellipse([34, 15, 37, 18], fill=(40, 40, 40, 255))
    draw.point([(28, 16), (35, 16)], fill=(255, 255, 255, 200))
    
    # Mouth
    draw.arc([28, 18, 36, 23], 0, 180, fill=(40, 40, 40, 255), width=1)
    
    img.save(os.path.join(ASSETS_DIR, 'characters', filename))
    print(f"Created {filename}")

def create_skill_icon(filename, color, symbol):
    """Create a professional skill icon with glow effects"""
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer glow effect
    for i in range(8, 0, -1):
        alpha = int(40 * (8 - i) / 8)
        glow_color = color[:3] + (alpha,)
        draw.ellipse([4-i, 4-i, 60+i, 60+i], fill=glow_color)
    
    # Main circle with gradient
    for r in range(28, 0, -1):
        progress = r / 28
        color_factor = 0.5 + progress * 0.5
        circle_color = tuple(int(c * color_factor) for c in color[:3]) + (255,)
        center = 32
        draw.ellipse([center-r, center-r, center+r, center+r], fill=circle_color)
    
    # Inner highlight
    draw.ellipse([18, 14, 38, 30], fill=(255, 255, 255, 50))
    draw.ellipse([20, 16, 36, 28], fill=(255, 255, 255, 30))
    
    # Borders
    draw.ellipse([4, 4, 60, 60], outline=(255, 255, 255, 180), width=3)
    draw.ellipse([6, 6, 58, 58], outline=color[:3] + (255,), width=2)
    
    # Symbol
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 34)
    except:
        font = ImageFont.load_default()
    
    # Center the text
    bbox = draw.textbbox((0, 0), symbol, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    position = ((64 - text_width) // 2, (64 - text_height) // 2 - 4)
    
    # Text shadow for depth
    draw.text((position[0]+2, position[1]+2), symbol, fill=(0, 0, 0, 180), font=font)
    # Main text
    draw.text(position, symbol, fill=(255, 255, 255, 255), font=font)
    
    img.save(os.path.join(ASSETS_DIR, 'skills', filename))
    print(f"Created {filename}")

def create_ui_element(filename, width, height, color):
    """Create polished UI panel/button with gradients"""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if 'button' in filename:
        # Gradient background based on button state
        if 'hover' in filename:
            base_brightness = 110
            gradient_range = 50
        elif 'pressed' in filename:
            base_brightness = 60
            gradient_range = 25
        else:  # normal
            base_brightness = 85
            gradient_range = 40
        
        for y in range(height):
            progress = y / height
            if 'pressed' in filename:
                brightness = base_brightness + int(gradient_range * progress)
            else:
                brightness = base_brightness + int(gradient_range * (1 - progress))
            
            grad_color = (brightness, brightness, brightness + 15, 255)
            draw.line([(2, y), (width-3, y)], fill=grad_color)
        
        # Borders
        border_brightness = base_brightness + 40
        draw.rectangle([0, 0, width-1, height-1], outline=(border_brightness + 20, border_brightness + 20, border_brightness + 40, 255), width=2)
        draw.rectangle([1, 1, width-2, height-2], outline=(border_brightness + 50, border_brightness + 50, border_brightness + 70, 255), width=1)
        
        # Highlight effect
        if 'pressed' not in filename:
            highlight_alpha = 120 if 'hover' in filename else 80
            draw.line([(3, 3), (width-4, 3)], fill=(255, 255, 255, highlight_alpha), width=2)
    
    elif 'panel' in filename:
        # Semi-transparent panel
        draw.rectangle([0, 0, width-1, height-1], fill=(45, 50, 65, 235))
        draw.rectangle([0, 0, width-1, height-1], outline=(110, 130, 160, 255), width=3)
        draw.rectangle([3, 3, width-4, height-4], outline=(70, 85, 105, 255), width=1)
        # Inner shadow
        draw.line([(3, 4), (width-4, 4)], fill=(20, 25, 35, 100), width=2)
    
    elif 'progress-bar' in filename:
        if 'bg' in filename:
            draw.rectangle([0, 0, width-1, height-1], fill=(35, 35, 45, 255))
            draw.rectangle([0, 0, width-1, height-1], outline=(20, 20, 30, 255), width=2)
        else:
            # Gradient fill for progress bars
            for y in range(height):
                progress = y / height
                factor = 0.65 + progress * 0.7
                bar_color = tuple(int(c * factor) for c in color[:3]) + (255,)
                draw.line([(0, y), (width-1, y)], fill=bar_color)
            
            # Shine effect at top
            draw.rectangle([2, 2, width-3, height//3], fill=(255, 255, 255, 70))
            # Subtle border
            draw.rectangle([0, 0, width-1, height-1], outline=color[:3] + (100,), width=1)
    
    img.save(os.path.join(ASSETS_DIR, 'ui', filename))
    print(f"Created {filename}")

def create_item_icon(filename, color, shape='rect'):
    """Create detailed item icon with shading"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    def adjust_color(base_color, factor):
        return tuple(max(0, min(255, int(c * factor))) for c in base_color[:3]) + (255,)
    
    dark = adjust_color(color, 0.6)
    light = adjust_color(color, 1.4)
    
    if 'sword' in filename:
        # Blade with metallic look
        for x in range(8, 25):
            factor = 0.55 + (x - 8) / 34
            blade_color = adjust_color((230, 230, 240, 255), factor)
            draw.line([(x, 4), (x+8, 12)], fill=blade_color, width=1)
        
        # Handle
        draw.rectangle([4, 12, 8, 25], fill=dark)
        draw.rectangle([5, 13, 7, 24], fill=color)
        draw.line([(6, 13), (6, 24)], fill=light, width=1)
        
        # Guard/crossguard
        draw.rectangle([2, 11, 10, 14], fill=(190, 160, 60, 255))
        draw.line([(2, 12), (10, 12)], fill=(230, 200, 80, 255), width=1)
        
        # Edge highlight
        draw.line([(10, 5), (31, 13)], fill=(255, 255, 255, 220), width=1)
    
    elif 'potion' in filename:
        # Bottle outline
        draw.ellipse([10, 8, 22, 20], fill=dark)
        draw.rectangle([11, 14, 21, 26], fill=color)
        draw.ellipse([10, 24, 22, 28], fill=dark)
        
        # Liquid with shine effect
        draw.rectangle([12, 16, 20, 25], fill=light)
        draw.ellipse([13, 16, 19, 21], fill=(255, 255, 255, 180))
        
        # Cork/stopper
        draw.rectangle([13, 6, 19, 10], fill=(130, 90, 60, 255))
        draw.rectangle([14, 7, 18, 9], fill=(160, 120, 80, 255))
    
    elif 'armor' in filename or 'helmet' in filename or 'boots' in filename:
        if 'helmet' in filename:
            # Helmet dome
            draw.pieslice([8, 8, 24, 26], 180, 360, fill=dark)
            draw.pieslice([9, 9, 23, 25], 180, 360, fill=color)
            # Visor
            draw.rectangle([10, 19, 22, 23], fill=(40, 40, 50, 255))
            # Highlight
            draw.arc([11, 10, 21, 19], 180, 360, fill=light, width=2)
        else:
            # Armor/boots
            draw.ellipse([6, 8, 26, 28], fill=dark)
            draw.ellipse([7, 9, 25, 27], fill=color)
            # Details/rivets
            draw.line([(16, 11), (16, 26)], fill=light, width=2)
            draw.arc([11, 13, 21, 23], 0, 180, fill=dark, width=2)
            for y in [13, 18, 23]:
                draw.ellipse([14, y, 18, y+2], fill=light)
    
    elif 'ring' in filename or 'amulet' in filename:
        # Ring/amulet circle
        draw.ellipse([8, 8, 24, 24], outline=dark, width=4)
        draw.ellipse([10, 10, 22, 22], outline=color, width=3)
        # Gem/jewel
        draw.ellipse([13, 13, 19, 19], fill=light)
        draw.ellipse([13, 13, 16, 16], fill=(255, 255, 255, 255))
        # Shine
        draw.point([(14, 14)], fill=(255, 255, 255, 255))
    
    # Subtle border
    draw.rectangle([0, 0, 31, 31], outline=(70, 70, 75, 180), width=1)
    
    img.save(os.path.join(ASSETS_DIR, 'items', filename))
    print(f"Created {filename}")

def create_tile(filename, color):
    """Create textured environment tile"""
    img = Image.new('RGBA', (32, 32), color)
    draw = ImageDraw.Draw(img)
    
    # Seed randomness based on filename for consistency
    random.seed(hash(filename))
    
    def adjust_color(base_color, factor):
        return tuple(max(0, min(255, int(c * factor))) for c in base_color[:3]) + (255,)
    
    tile_type = filename.replace('.png', '')
    
    if tile_type == 'grass':
        # Grass texture with varied blades
        for _ in range(35):
            x = random.randint(0, 31)
            y = random.randint(0, 31)
            shade = random.choice([0.75, 0.85, 0.95, 1.0, 1.1, 1.15])
            blade_color = adjust_color(color, shade)
            length = random.randint(2, 5)
            draw.line([(x, y), (x + random.randint(-1, 1), y + length)], fill=blade_color, width=1)
    
    elif tile_type == 'stone':
        # Stone texture with cracks
        for _ in range(18):
            x1, y1 = random.randint(0, 31), random.randint(0, 31)
            x2, y2 = x1 + random.randint(-6, 6), y1 + random.randint(-6, 6)
            crack_color = adjust_color(color, 0.65)
            draw.line([(x1, y1), (x2, y2)], fill=crack_color, width=1)
        
        # Texture variation
        for _ in range(30):
            x, y = random.randint(0, 31), random.randint(0, 31)
            shade = random.uniform(0.8, 1.2)
            spot_color = adjust_color(color, shade)
            draw.point([(x, y)], fill=spot_color)
    
    elif tile_type == 'water':
        # Water ripples and waves
        for y in range(0, 32, 4):
            offset = (y // 4) % 3
            for x in range(offset, 32, 10):
                wave_color = adjust_color(color, 1.25)
                draw.ellipse([x, y, x+4, y+2], fill=wave_color)
                draw.ellipse([x+1, y, x+3, y+1], fill=(255, 255, 255, 60))
    
    elif tile_type == 'dirt':
        # Dirt particles and texture
        for _ in range(50):
            x, y = random.randint(0, 31), random.randint(0, 31)
            shade = random.uniform(0.65, 1.25)
            particle_color = adjust_color(color, shade)
            size = random.randint(1, 3)
            draw.ellipse([x, y, x+size, y+size], fill=particle_color)
    
    elif tile_type == 'sand':
        # Sandy texture
        for _ in range(60):
            x, y = random.randint(0, 31), random.randint(0, 31)
            shade = random.uniform(0.88, 1.12)
            grain_color = adjust_color(color, shade)
            if random.random() > 0.9:
                draw.ellipse([x, y, x+1, y+1], fill=grain_color)
            else:
                draw.point([(x, y)], fill=grain_color)
    
    elif tile_type == 'snow':
        # Snow with sparkles
        for _ in range(30):
            x, y = random.randint(0, 31), random.randint(0, 31)
            if random.random() > 0.75:
                # Sparkle
                draw.point([(x, y)], fill=(255, 255, 255, 255))
                draw.point([(x-1, y), (x+1, y), (x, y-1), (x, y+1)], fill=(255, 255, 255, 180))
            else:
                shade = random.uniform(0.94, 1.0)
                snow_color = adjust_color(color, shade)
                draw.point([(x, y)], fill=snow_color)
    
    img.save(os.path.join(ASSETS_DIR, 'environment', filename))
    print(f"Created {filename}")

def create_effect_sprite(filename, color):
    """Create enhanced effect/particle sprite"""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    effect_type = 'radial'
    if 'heal' in filename or 'level' in filename:
        effect_type = 'spark'
    
    if effect_type == 'radial':
        # Radial burst with gradient
        for i in range(14, 0, -1):
            alpha = int(255 * i / 14 * 0.85)
            effect_color = color[:3] + (alpha,)
            draw.ellipse([16-i, 16-i, 16+i, 16+i], fill=effect_color)
        
        # Bright core
        draw.ellipse([13, 13, 19, 19], fill=(255, 255, 255, 255))
        draw.ellipse([14, 14, 18, 18], fill=color[:3] + (255,))
    
    elif effect_type == 'spark':
        # Sparkle/star effect
        center = 16
        # Draw star points
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            x1 = center + int(10 * math.cos(rad))
            y1 = center + int(10 * math.sin(rad))
            x2 = center + int(5 * math.cos(rad))
            y2 = center + int(5 * math.sin(rad))
            draw.line([(x2, y2), (x1, y1)], fill=color[:3] + (200,), width=2)
            draw.ellipse([x1-2, y1-2, x1+2, y1+2], fill=color[:3] + (255,))
        
        # Center glow
        draw.ellipse([12, 12, 20, 20], fill=(255, 255, 255, 255))
        draw.ellipse([13, 13, 19, 19], fill=color[:3] + (255,))
    
    img.save(os.path.join(ASSETS_DIR, 'skills', filename))
    print(f"Created {filename}")

def main():
    # Create character sprites with enhanced shading
    create_character_sprite('player-red.png', (220, 85, 85, 255))
    create_character_sprite('player-blue.png', (85, 125, 220, 255))
    create_character_sprite('player-green.png', (85, 200, 105, 255))
    create_character_sprite('player-yellow.png', (220, 200, 85, 255))
    create_character_sprite('npc-merchant.png', (185, 145, 105, 255))
    create_character_sprite('enemy-skeleton.png', (235, 235, 245, 255))
    create_character_sprite('enemy-goblin.png', (125, 165, 95, 255))
    
    # Create professional skill icons with glow
    create_skill_icon('fireball.png', (255, 105, 25), '🔥')
    create_skill_icon('heal.png', (55, 255, 125), '❤')
    create_skill_icon('shield.png', (105, 155, 255), '🛡')
    create_skill_icon('dash.png', (255, 235, 55), '⚡')
    create_skill_icon('ice-spike.png', (155, 225, 255), '❄')
    create_skill_icon('poison.png', (155, 255, 105), '☠')
    
    # Create enhanced effect sprites
    create_effect_sprite('fire-effect.png', (255, 155, 35))
    create_effect_sprite('heal-effect.png', (105, 255, 155))
    create_effect_sprite('hit-effect.png', (255, 85, 85))
    create_effect_sprite('level-up.png', (255, 235, 105))
    
    # Create polished UI elements
    create_ui_element('panel-background.png', 320, 240, (45, 50, 65, 235))
    create_ui_element('button-normal.png', 120, 40, (85, 85, 100, 255))
    create_ui_element('button-hover.png', 120, 40, (110, 110, 130, 255))
    create_ui_element('button-pressed.png', 120, 40, (60, 60, 75, 255))
    create_ui_element('progress-bar-bg.png', 200, 20, (35, 35, 45, 255))
    create_ui_element('progress-bar-fill-hp.png', 200, 20, (105, 255, 105, 255))
    create_ui_element('progress-bar-fill-mana.png', 200, 20, (105, 150, 255, 255))
    create_ui_element('progress-bar-fill-xp.png', 200, 20, (255, 225, 105, 255))
    
    # Create detailed item icons
    create_item_icon('sword.png', (195, 195, 210, 255), 'sword')
    create_item_icon('potion-health.png', (255, 105, 105, 255), 'potion')
    create_item_icon('potion-mana.png', (105, 155, 255, 255), 'potion')
    create_item_icon('armor.png', (165, 165, 175, 255), 'armor')
    create_item_icon('helmet.png', (185, 185, 205, 255), 'helmet')
    create_item_icon('boots.png', (125, 95, 75, 255), 'boots')
    create_item_icon('ring.png', (255, 220, 55, 255), 'ring')
    create_item_icon('amulet.png', (205, 105, 255, 255), 'amulet')
    
    # Create textured environment tiles
    create_tile('grass.png', (90, 175, 90, 255))
    create_tile('stone.png', (125, 125, 130, 255))
    create_tile('water.png', (85, 135, 215, 255))
    create_tile('dirt.png', (145, 105, 75, 255))
    create_tile('sand.png', (225, 205, 155, 255))
    create_tile('snow.png', (242, 247, 255, 255))
    
    print("\n" + "=" * 70)
    print("✓ All enhanced assets created successfully!")
    print("=" * 70)
    print("\nEnhancements include:")
    print("  • Character sprites with detailed shading and facial features")
    print("  • Skill icons with professional glow effects and gradients")
    print("  • Polished UI elements with depth and highlights")
    print("  • Item icons with metallic shading and detailed designs")
    print("  • Environment tiles with realistic textures")
    print("  • Effect sprites with radial bursts and sparkle patterns")
    print("\nThese assets are significantly improved over basic placeholders")
    print("and suitable for game development and prototyping.")
    print("=" * 70)

if __name__ == '__main__':
    main()
