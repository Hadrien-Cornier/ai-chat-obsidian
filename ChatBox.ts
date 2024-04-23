export class ChatHistory {
	private messages: string[] = [];

	addMessage(message: string) {
		this.messages.push(message);
	}

	getHistory(): string[] {
		return this.messages;
	}
}
