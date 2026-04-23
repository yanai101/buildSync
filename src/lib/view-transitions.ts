type StartViewTransition = (updateCallback: () => void | Promise<void>) => {
	finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
	startViewTransition?: StartViewTransition;
};

export async function withViewTransition(
	update: () => void | Promise<void>,
): Promise<void> {
	const doc = document as ViewTransitionDocument;
	if (!doc.startViewTransition) {
		await update();
		return;
	}

	try {
		await doc.startViewTransition(() => Promise.resolve(update())).finished;
	} catch {
		await update();
	}
}
