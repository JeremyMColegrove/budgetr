import { toBlob } from 'html-to-image';

export interface ExportOptions {
    filename: string;
    excludeSelectorDataAttr?: string;
    pixelRatio?: number;
}

const DEFAULT_EXCLUDE_ATTR = 'data-export-ignore';

const canShareFiles = (file: File): boolean => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
        return false;
    }

    return navigator.canShare({ files: [file] });
};

export const exportNodeAsPng = async (
    node: HTMLElement,
    {
        filename,
        excludeSelectorDataAttr = DEFAULT_EXCLUDE_ATTR,
        pixelRatio = 2,
    }: ExportOptions
): Promise<void> => {
    const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio,
        filter: (target) => {
            if (!(target instanceof HTMLElement)) {
                return true;
            }

            return target.getAttribute(excludeSelectorDataAttr) !== 'true';
        },
    });

    if (!blob) {
        throw new Error('Unable to generate export image.');
    }

    const file = new File([blob], filename, { type: 'image/png' });

    if (canShareFiles(file)) {
        await navigator.share({ files: [file], title: filename });
        return;
    }
    throw new Error('Native share is not available in this browser.');
};
