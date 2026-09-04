type ObjectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';

const VALID_OBJECT_FITS: readonly ObjectFit[] = ['fill', 'contain', 'cover', 'none', 'scale-down'];

export default function getObjectFitProperty(element: HTMLElement): ObjectFit {
    const fit = getComputedStyle(element).objectFit;
    return VALID_OBJECT_FITS.includes(fit as ObjectFit) ? (fit as ObjectFit) : 'cover';
}
