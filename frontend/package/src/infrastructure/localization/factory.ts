import LocalizationService, { LocalizationServiceProps } from './class';

export default function localizationFactory(props: LocalizationServiceProps) {
    return new LocalizationService(props);
}
