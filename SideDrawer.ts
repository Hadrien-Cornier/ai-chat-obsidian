import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
// Define a new view by extending ItemView
export class SideDrawerView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}
	getViewType(): string {
		return 'ai-chat-side-drawer';
	}

	getDisplayText(): string {
		return 'AI Chat';
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl('h1', { text: 'Chat Started' });
	}

	async onClose() {
		// Clean up if necessary
	}
}
