/**
 * Skill configuration interfaces
 */

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'teleport';
  value?: number;
  multiplier?: number;
  element?: string;
  buffType?: string;
  duration?: number;
  target?: 'self' | 'target' | 'area';
  scaling?: {
    stat: string;
    multiplier: number;
  };
}

export interface SkillConfig {
  id: string;
  name: string;
  nameZh?: string;
  description: string;
  descriptionZh?: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'utility';
  level: number;
  cooldown: number;
  manaCost: number;
  range: number;
  effects: SkillEffect[];
  icon?: string;
  animation?: string;
  maxLevel?: number;
  requirements?: {
    level?: number;
    skills?: string[];
  };
}

export interface SkillsConfig {
  version: string;
  lastUpdated: string;
  skills: {
    [skillId: string]: SkillConfig;
  };
}
