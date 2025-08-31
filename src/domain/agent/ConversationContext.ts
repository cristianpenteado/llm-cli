export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export class ConversationContext {
  private messages: Message[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 10) {
    this.maxHistory = maxHistory;
  }

  addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: new Date()
    });

    // Manter apenas o histórico mais recente
    if (this.messages.length > this.maxHistory) {
      this.messages.shift();
    }
  }

  getConversationHistory(): Message[] {
    return [...this.messages];
  }

  getFormattedHistory(): string {
    return this.messages
      .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
      .join('\n');
  }

  clear(): void {
    this.messages = [];
  }
}
