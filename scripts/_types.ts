export interface ItemAutomation {
  name: string;
  identifier: string;
  aliases?: string[];
  type: string;
  version: string;
  authors: string[];
  factory?: boolean;
  monsterIdentifier?: string;
};

export interface MonsterAutomation {
  identifier: string;
  [automationName: string]: ItemAutomation | string;
}

export interface AutomationConfig {
  module: string;
  automations: {
    legacy: Record<string, ItemAutomation>;
    modern: Record<string, ItemAutomation>;
  },
  monsterAutomations: {
    legacy: Record<string, MonsterAutomation>;
    modern: Record<string, MonsterAutomation>;
  }
};
