export interface ConversationContext {
  getFormattedHistory(): string;
  addMessage(role: 'user' | 'assistant', content: string): void;
  clear(): void;
}